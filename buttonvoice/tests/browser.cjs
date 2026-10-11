const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const baseURL = process.env.BUTTONVOICE_URL || 'http://127.0.0.1:5174';
const checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };

async function counts(page) {
  return page.evaluate(() => ['total-count', 'missing-count', 'fixed-count'].map(id => Number(document.getElementById(id).textContent)));
}

async function buttonAX(page, id) {
  const cdp = await page.context().newCDPSession(page);
  const { result } = await cdp.send('Runtime.evaluate', { expression: `document.getElementById(${JSON.stringify(id)})` });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId });
  const button = nodes.find(node => node.role?.value === 'button');
  await cdp.detach();
  return { role: button?.role?.value, name: button?.name?.value, ignored: button?.ignored, properties: button?.properties };
}

(async () => {
  await fs.mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const errors = [];
  const remoteRequests = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(baseURL).origin) remoteRequests.push(request.url());
    });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    check('初始无问题高亮', await page.locator('#preview .bv-issue').count() === 0);
    check('图片已在本地加载', await page.locator('.product-image').evaluate(image => image.complete && image.naturalWidth > 0));
    await page.locator('#scan').focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await counts(page), [8, 4, 0]);
    check('真实初次扫描得到 8 个按钮、4 个名称缺失', true);
    check('高亮未给按钮命名', await page.locator('#demo-favorite').getAttribute('aria-label') === null);
    const axBefore = await buttonAX(page, 'demo-favorite');
    check('Chromium 可访问性树中原按钮名称为空', axBefore.role === 'button' && axBefore.name === '' && !axBefore.ignored);
    const originalHTML = await page.locator('#before-html').textContent();
    await page.locator('.issue-item').filter({ hasText: '商品收藏' }).click();
    check('选中问题未触发收藏', await page.locator('#demo-favorite').getAttribute('aria-pressed') === 'false');
    await page.locator('#locate').click();
    check('定位只转移焦点，不触发操作', await page.locator('#demo-favorite').evaluate(el => el === document.activeElement && el.getAttribute('aria-pressed') === 'false'));

    await page.locator('#suggested-name').fill('   ');
    await page.locator('#apply').click();
    check('空白输入被阻止，DOM 未修改', await page.locator('#input-error').isVisible() && await page.locator('#demo-favorite').getAttribute('aria-label') === null);
    await page.locator('#suggested-name').fill('收藏这副耳机');
    check('编辑建议不会修改 DOM', await page.locator('#demo-favorite').getAttribute('aria-label') === null);
    check('未应用时标为试听建议', await page.locator('#speak-after-label').textContent() === '试听建议效果');
    await page.locator('#apply').focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await counts(page), [8, 3, 1]);
    check('键盘单修修改真实 DOM', await page.locator('#demo-favorite').getAttribute('aria-label') === '收藏这副耳机');
    const axAfter = await buttonAX(page, 'demo-favorite');
    check('Chromium 可访问性树确认名称改变', axAfter.name === '收藏这副耳机');
    check('原始 HTML 快照保持不变', await page.locator('#before-html').textContent() === originalHTML);
    await page.locator('#demo-favorite').focus();
    await page.keyboard.press('Space');
    check('收藏状态改变后名称同步', await page.locator('#demo-favorite').getAttribute('aria-label') === '取消收藏');
    await page.keyboard.press('Space');
    check('恢复状态时保留该状态的自定义标签', await page.locator('#demo-favorite').getAttribute('aria-label') === '收藏这副耳机');
    await page.locator('#scan').click();
    assert.deepEqual(await counts(page), [8, 3, 1]);
    check('复查不累计且不覆盖快照', await page.locator('#before-html').textContent() === originalHTML);
    await page.locator('#fix-all').click();
    assert.deepEqual(await counts(page), [8, 0, 4]);
    check('批量修复保留已命名按钮', await page.locator('#demo-favorite').getAttribute('aria-label') === '收藏这副耳机');
    await page.locator('#demo-menu').click();
    check('菜单展开后名称同步', await page.locator('#demo-menu').getAttribute('aria-label') === '收起导航菜单');
    await page.locator('#demo-cart').click();
    check('购物车展开后名称同步', await page.locator('#demo-cart').getAttribute('aria-label') === '收起购物车');
    await page.locator('#copy').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    check('复制当前真实 HTML', copied.includes('aria-label="收藏这副耳机"'));
    await page.locator('#reset').click();
    check('重置恢复命名、业务状态和未扫描状态', await page.locator('#demo-favorite').getAttribute('aria-label') === null && await page.locator('#demo-menu').getAttribute('aria-expanded') === 'false' && await page.locator('#total-count').textContent() === '未扫描');

    // Finish three full scan → single repair → batch → reset cycles in total.
    for (let round = 2; round <= 3; round++) {
      await page.locator('#scan').click();
      assert.deepEqual(await counts(page), [8, 4, 0]);
      await page.locator('#apply').click();
      assert.deepEqual(await counts(page), [8, 3, 1]);
      await page.locator('#fix-all').click();
      assert.deepEqual(await counts(page), [8, 0, 4]);
      await page.locator('#reset').click();
      check(`第 ${round} 轮完整彩排及重置`, await page.locator('#preview .bv-issue, #preview .bv-repaired').count() === 0 && await page.locator('#total-count').textContent() === '未扫描');
    }

    // Adding an unknown button proves discovery is not a prearranged problem list.
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'unknown-test-button';
      button.innerHTML = '<span aria-hidden="true">?</span>';
      document.getElementById('preview').append(button);
    });
    await page.locator('#scan').click();
    assert.deepEqual(await counts(page), [9, 5, 0]);
    await page.locator('#fix-all').click();
    assert.deepEqual(await counts(page), [9, 1, 4]);
    check('未知用途不进入自动批修，仍显示剩余问题', (await page.locator('#announcement').textContent()).includes('仍有 1 项'));
    await page.locator('.issue-item').filter({ hasText: '用途需要确认' }).click();
    check('缺少依据时允许保留待确认', (await page.locator('#suggestion-reason').textContent()).includes('暂时跳过'));
    await page.locator('#suggested-name').fill('查看活动说明');
    await page.locator('#confirmed').check();
    await page.locator('#apply').click();
    assert.deepEqual(await counts(page), [9, 0, 5]);
    check('人工填写并确认后可单项修复未知用途', await page.locator('#unknown-test-button').getAttribute('aria-label') === '查看活动说明');
    await page.locator('#reset').click();
    await page.reload({ waitUntil: 'networkidle' });
    check('刷新可以重新开始', await page.locator('#total-count').textContent() === '未扫描');

    // Local browser fixtures cover semantic edge cases outside the main demo.
    const semantic = await page.evaluate(async () => {
      const { scanButtons, accessibleName } = await import('/src/scanner.js');
      const { createAudit } = await import('/src/audit.js');
      const { suggestLabel } = await import('/src/suggestions.js');
      const fixture = document.createElement('section');
      fixture.style.cssText = 'position:absolute;left:-10000px;top:0;width:400px;';
      fixture.innerHTML = `
        <button id="f-text">保存修改</button>
        <button id="f-aria" aria-label="关闭详情"></button>
        <span id="f-ref" style="position:absolute;clip-path:inset(50%)">打开设置</span><button id="f-labelled" aria-labelledby="f-ref"></button>
        <span id="f-hidden-ref" hidden>隐藏但有效的名称</span><button id="f-hidden-labelled" aria-labelledby="f-hidden-ref"></button>
        <button id="f-img"><img alt="查看照片"></button>
        <button id="f-icon"><svg aria-hidden="true"><title>装饰图标</title></svg></button>
        <button id="f-empty" aria-label=" ">可见文本</button><button id="f-whitespace" aria-label=" "></button>
        <button id="f-title" aria-label=" " title="原生提示名称"></button>
        <span id="f-description">只有描述</span><button id="f-described" aria-describedby="f-description"></button>
        <div id="f-role" role="button" tabindex="0">打开筛选</div><div id="f-role-empty" role="button" tabindex="0"></div>
        <input id="f-input-button" type="button" value="执行操作"><input id="f-input-empty" type="button" value="">
        <input id="f-submit" type="submit"><input id="f-reset" type="reset"><input id="f-input-image" type="image" alt="发送图片"><input id="f-image-default" type="image">
        <label for="f-native">原生关联标签</label><input id="f-native" type="button">
        <button id="f-priority" aria-label="低优先级名称" aria-labelledby="f-ref"></button>
        <div hidden><button id="f-hidden"></button></div>
        <div aria-hidden="true"><button id="f-aria-hidden" aria-hidden="false"></button></div>
        <div style="display:none"><button id="f-display"></button></div>
        <div style="visibility:hidden"><button id="f-visibility"></button><button id="f-visible-override" style="visibility:visible">可见覆盖</button></div>
        <div inert><button id="f-inert"></button></div>
        <div style="content-visibility:hidden"><button id="f-content-hidden"></button></div>
        <details><summary>摘要</summary><button id="f-details"></button></details>
        <button id="f-disabled" disabled>已禁用</button><button id="f-opacity" style="opacity:0">仍暴露给辅助技术</button>
      `;
      document.body.append(fixture);
      const results = scanButtons(fixture);
      const names = Object.fromEntries(results.map(result => [result.element.id, result.name]));
      const sample = document.createElement('button');
      sample.dataset.action = 'search';
      fixture.append(sample);
      const audit = createAudit(fixture);
      audit.review();
      const record = audit.summary().records.find(item => item.element === sample);
      sample.setAttribute('aria-label', '外部已修复');
      const stale = audit.apply(record, '不应覆盖');
      const staleName = accessibleName(sample);
      sample.remove();
      const removed = audit.apply(record, '不能写入已移除目标');

      const conflict = document.createElement('button');
      const emptyReference = document.createElement('span');
      emptyReference.id = 'f-empty-reference';
      conflict.dataset.action = 'search';
      conflict.setAttribute('aria-labelledby', emptyReference.id);
      fixture.append(emptyReference, conflict);
      audit.review();
      const conflictRecord = audit.summary().records.find(item => item.element === conflict);
      const conflictResult = audit.apply(conflictRecord, '搜索商品');
      const conflictPreserved = conflict.hasAttribute('aria-labelledby') && !conflictRecord.fixed;
      const conflictActualName = accessibleName(conflict);
      const unknown = document.createElement('button');
      unknown.className = 'search';
      unknown.innerHTML = '<svg aria-hidden="true"></svg>';
      fixture.append(unknown);
      const unknownSuggestion = suggestLabel(unknown);
      fixture.remove();
      return { names, stale, staleName, removed, conflictResult, conflictPreserved, conflictActualName, unknownSuggestion };
    });
    const expectedNames = {
      'f-text': '保存修改', 'f-aria': '关闭详情', 'f-labelled': '打开设置', 'f-hidden-labelled': '隐藏但有效的名称',
      'f-img': '查看照片', 'f-icon': '', 'f-empty': '可见文本', 'f-whitespace': '', 'f-title': '原生提示名称',
      'f-described': '', 'f-role': '打开筛选', 'f-role-empty': '', 'f-input-button': '执行操作', 'f-input-empty': '',
      'f-input-image': '发送图片', 'f-native': '原生关联标签', 'f-priority': '打开设置', 'f-disabled': '已禁用',
      'f-opacity': '仍暴露给辅助技术', 'f-visible-override': '可见覆盖',
    };
    for (const [id, name] of Object.entries(expectedNames)) check(`名称计算边界：${id}`, semantic.names[id] === name);
    for (const id of ['f-submit', 'f-reset', 'f-image-default']) check(`原生默认名称：${id}`, Boolean(semantic.names[id]));
    for (const id of ['f-hidden', 'f-aria-hidden', 'f-display', 'f-visibility', 'f-inert', 'f-content-hidden', 'f-details']) check(`隐藏状态排除：${id}`, !(id in semantic.names));
    check('应用前复查并跳过外部已命名目标', semantic.stale.status === 'skipped' && semantic.staleName === '外部已修复');
    check('应用前跳过已移除目标', semantic.removed.status === 'skipped');
    check('保留命名来源冲突，不伪造修复成功', semantic.conflictResult.status === 'conflict' && semantic.conflictPreserved && semantic.conflictActualName === '');
    check('不从未经登记的类名或图标猜测用途', semantic.unknownSuggestion.label === '');

    // Tool controls are named; the intentionally broken preview is excluded.
    const toolMissing = await page.evaluate(async () => {
      const { scanButtons } = await import('/src/scanner.js');
      return scanButtons(document.body).filter(result => !document.getElementById('preview').contains(result.element) && result.missing).map(result => result.element.outerHTML);
    });
    check('工具自身没有名称缺失按钮', toolMissing.length === 0);

    await page.locator('#scan').click();
    await page.locator('#apply').click();
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    const widths = [320, 390, 768, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      check(`${width}px 布局无横向溢出`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 390) await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    }
    const contrast = await page.evaluate(() => {
      const rgb = text => text.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = color => rgb(color).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      return ['#scan', '#apply', '.store-contact', '.demo-warning', '.subtitle', '.speech-disclaimer'].map(selector => {
        const element = document.querySelector(selector);
        const style = getComputedStyle(element);
        let ancestor = element, background;
        while (ancestor) {
          background = getComputedStyle(ancestor).backgroundColor;
          if (!background.endsWith(', 0)') && background !== 'transparent') break;
          ancestor = ancestor.parentElement;
        }
        return { selector, ratio: ratio(style.color, background) };
      });
    });
    for (const item of contrast) check(`文字对比度 ${item.selector} >= 4.5:1`, item.ratio >= 4.5);

    // Missing local voice, late voiceschanged, failure, replay, and reset cancellation.
    const fallbackPage = await context.newPage();
    await fallbackPage.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], addEventListener() {}, cancel() {}, speak() { throw new Error('No local voice'); },
      } });
    });
    await fallbackPage.goto(baseURL, { waitUntil: 'networkidle' });
    await fallbackPage.locator('#scan').click();
    await fallbackPage.locator('#speak-before').click();
    check('无本地语音时保留文字对比', (await fallbackPage.locator('#voice-status').textContent()).includes('文字对比仍可使用'));
    await fallbackPage.locator('#apply').click();
    await fallbackPage.locator('#fix-all').click();
    assert.deepEqual(await counts(fallbackPage), [8, 0, 4]);
    check('无语音时扫描及完整修复仍可完成', true);

    const speechChecks = await page.evaluate(async () => {
      const { createSpeech } = await import('/src/speech.js');
      const original = window.speechSynthesis;
      let eventCallback, voiceList = [], cancellations = 0, utterance, lastStatus;
      const statuses = [];
      const fake = { getVoices: () => voiceList, addEventListener: (type, callback) => { eventCallback = callback; },
        cancel: () => { cancellations++; }, speak: value => { utterance = value; } };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: fake });
      // A real platform voice is required by SpeechSynthesisUtterance.voice's setter.
      const localVoice = original?.getVoices().find(voice => voice.localService && /^zh/.test(voice.lang));
      const service = createSpeech(status => { statuses.push(status); lastStatus = status; });
      voiceList = original?.getVoices() || [];
      eventCallback();
      let lateCallbackIgnored = true, replayCancelled = true, errorHandled = true;
      if (localVoice) {
        service.speak('按钮');
        const oldCallback = utterance.onend;
        service.speak('加入收藏，按钮');
        replayCancelled = cancellations >= 2;
        utterance.onerror();
        errorHandled = lastStatus.includes('暂不可用');
        service.speak('按钮');
        service.cancel();
        lastStatus = 'RESET';
        oldCallback();
        lateCallbackIgnored = lastStatus === 'RESET';
      }
      service.cancel();
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: original });
      return { lateCallbackIgnored, replayCancelled, errorHandled, available: Boolean(localVoice), statuses };
    });
    check('语音加载与失败处理', speechChecks.errorHandled && speechChecks.statuses.length >= 2);
    check('重播取消旧队列，重置屏蔽旧回调', speechChecks.replayCancelled && speechChecks.lateCallbackIgnored);
    check('运行时没有向外部 HTTP 服务发送请求', remoteRequests.length === 0);
    check('浏览器未报告脚本错误', errors.length === 0);

    const report = { date: new Date().toISOString(), browser: await browser.version(), checks: checks.length,
      passed: checks, axBefore, axAfter, contrast, semantic, speechChecks, errors, remoteRequests,
      notVerified: ['真实屏幕阅读器 VoiceOver/NVDA 的端到端使用', '语音音质与中文发音的人工听测', '真实手机与 Safari/Firefox 浏览器'] };
    await fs.writeFile('test-results/report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: checks.length, browser: report.browser, cycles: 3, errors, remoteRequests, report: 'test-results/report.json' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
