const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(process.env.BUTTONVOICE_URL || 'http://127.0.0.1:5174');
    await page.locator('#scan').click();
    check('原示例仍为真实的 8 个按钮、4 项名称缺失', await page.locator('#total-count').textContent() === '8' && await page.locator('#missing-count').textContent() === '4');
    await page.keyboard.press('Alt+Shift+Enter');
    check('快捷键聚焦目标且不激活收藏', await page.locator('#demo-favorite').evaluate(el => document.activeElement === el && el.getAttribute('aria-pressed') === 'false'));
    await page.keyboard.press('Alt+Shift+U');
    check('从网页可直接返回名称确认输入框', await page.locator('#suggested-name').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Alt+Shift+ArrowRight');
    check('键盘切换到另一个真实目标', await page.evaluate(() => document.getElementById('preview').contains(document.activeElement) && document.activeElement.id !== 'demo-favorite'));
    await page.keyboard.press('Alt+Shift+ArrowLeft');
    check('键盘可反向返回同一对象', await page.locator('#demo-favorite').evaluate(el => el === document.activeElement));

    await page.evaluate(() => {
      const fixture = document.createElement('section');
      fixture.id = 'orientation-fixture';
      fixture.setAttribute('aria-label', '资料操作区');
      fixture.innerHTML = `<h2>设计资料库</h2><button>前往目录</button>
        <button id="context-target" data-tooltip="收藏设计资料" aria-pressed="false" aria-describedby="context-help"><span aria-hidden="true">♡</span></button>
        <p id="context-help">这份资料属于交互设计分类。</p>
        <span id="role-target" role="button"><span aria-hidden="true">+</span></span>
        <div id="click-candidate" onclick="this.dataset.activated='yes'" style="cursor:pointer">打开附件</div>
        <button id="conflicting-target" data-tooltip="查看资料" data-original-title="删除资料"><span aria-hidden="true">?</span></button>
        <button>保存资料</button>`;
      document.getElementById('preview').append(fixture);
    });
    await page.locator('#scan').click();
    check('非语义可点击元素单独报告', (await page.locator('#scan-summary').textContent()).includes('1 个疑似可点击控件'));
    await page.locator('.issue-item').filter({ hasText: '网页提示文本' }).click();
    const context = await page.locator('#context').textContent();
    check('定位信息包含关联标题、顺序、邻居和状态', context.includes('设计资料库') && context.includes('前往目录') && context.includes('未按下') && context.includes('页面第'));
    check('说明文本保留为上下文而非名称', context.includes('交互设计分类') && await page.locator('#suggested-name').inputValue() === '收藏设计资料');
    await page.locator('#apply').click();
    check('候选名称未确认不能应用', await page.locator('#context-target').getAttribute('aria-label') === null && (await page.locator('#input-error').textContent()).includes('勾选'));
    await page.locator('#confirmed').check();
    await page.locator('#suggested-name').fill('收藏此资料');
    check('编辑名称后取消旧确认', !(await page.locator('#confirmed').isChecked()));
    await page.locator('#confirmed').check();
    await page.locator('#context-target').evaluate(el => el.setAttribute('aria-pressed', 'true'));
    await page.locator('#scan').click();
    check('网页状态变化后取消旧确认', !(await page.locator('#confirmed').isChecked()));
    await page.locator('#suggested-name').fill('取消收藏设计资料');
    await page.locator('#confirmed').check();
    await page.locator('#apply').click();
    check('确认后名称进入真实 DOM', await page.locator('#context-target').getAttribute('aria-label') === '取消收藏设计资料');

    await page.locator('.issue-item').filter({ hasText: '命名线索存在分歧' }).click();
    check('冲突线索不预选名称', await page.locator('#suggested-name').inputValue() === '' && await page.locator('#candidate-options').isVisible());
    await page.locator('#candidate-choice').selectOption('查看资料');
    check('选择线索只形成草稿', await page.locator('#suggested-name').inputValue() === '查看资料' && !(await page.locator('#confirmed').isChecked()) && await page.locator('#conflicting-target').getAttribute('aria-label') === null);
    const missing = await page.locator('#missing-count').textContent();
    await page.locator('#defer').click();
    check('跳过保留缺失数量和待确认状态', await page.locator('#missing-count').textContent() === missing && await page.locator('.issue-item').filter({ hasText: '已跳过，仍待确认' }).count() === 1);
    await page.locator('.issue-item').filter({ hasText: '疑似可点击控件' }).click();
    check('可疑控件不允许仅补名称伪装修复', !(await page.locator('#apply').isEnabled()) && await page.locator('#candidate-warning').isVisible());
    await page.keyboard.press('Alt+Shift+Enter');
    check('可疑控件可以无鼠标定位且不会激活', await page.locator('#click-candidate').evaluate(el => el === document.activeElement && !el.dataset.activated && el.getAttribute('tabindex') === '-1'));
    await page.keyboard.press('Alt+Shift+U');
    check('返回工具时撤掉临时 tabindex', await page.locator('#click-candidate').getAttribute('tabindex') === null && await page.locator('#context').evaluate(el => el === document.activeElement));
    await page.locator('.issue-item').filter({ hasText: '用途需要确认' }).click();
    await page.keyboard.press('Alt+Shift+Enter');
    check('缺少 tabindex 的 role=button 也能接收定位焦点', await page.locator('#role-target').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Alt+Shift+U');
    check('返回可编辑按钮的确认输入框', await page.locator('#suggested-name').evaluate(el => el === document.activeElement));
    await page.locator('#guide-autospeak').check();
    await page.waitForTimeout(300);
    check('语音引导有真实播放或明确不可用状态', /播放|语音|音色/.test(await page.locator('#voice-status').textContent()));
    await page.locator('#guide-autospeak').uncheck();
    await fs.mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/accessibility-guide-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    check('新增引导和确认控件在窄屏无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('新流程无脚本错误', errors.length === 0);
    await fs.writeFile('test-results/accessibility-guide-report.json', JSON.stringify({ checks, errors, context, scope: 'Keyboard focus, DOM semantics and browser speech state; not a manual VoiceOver/NVDA session.' }, null, 2));
    console.log(`${checks.length} accessibility guide checks passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
