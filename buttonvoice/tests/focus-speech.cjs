const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const checks = [], errors = [];
  const check = (label, value) => { assert.ok(value, label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  // Record requests to the speech engine; real audible playback is checked separately.
  await page.addInitScript(() => {
    window.focusSpeechLog = { texts: [], cancellations: 0 };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ localService: true, lang: 'zh-CN' }],
      addEventListener() {}, removeEventListener() {},
      cancel() { window.focusSpeechLog.cancellations++; },
      speak(utterance) { window.focusSpeechLog.texts.push(utterance.text); utterance.onstart?.(); },
    } });
  });
  const texts = () => page.evaluate(() => window.focusSpeechLog.texts);
  const latest = async () => (await texts()).at(-1);
  const settle = () => page.waitForTimeout(260);
  try {
    await page.goto(process.env.BUTTONVOICE_URL || 'http://127.0.0.1:5174');
    await page.locator('#scene-select').selectOption('uncertain');
    await page.locator('#scan').click();
    await page.locator('#guide-browse').click();
    await settle();
    check('进入浏览自动启用朗读，并且只播报一次', await page.locator('#guide-autospeak').isChecked() && (await texts()).length === 1);
    check('焦点到达按钮但没有激活收藏', await page.locator('#uncertain-bookmark').evaluate(el => el === document.activeElement && el.getAttribute('aria-pressed') === 'false'));
    await page.keyboard.press('Tab');
    await settle();
    check('真实 Tab 切换自动读名称和位置，不把建议当成名称', /未命名按钮.*第 2 个.*设计资料库.*视口/.test(await latest()) && !(await latest()).includes('打开资料目录'));
    await page.keyboard.press('Shift+Tab');
    await settle();
    check('Shift+Tab 反向切换也会自动朗读', (await latest()).includes('第 1 个'));
    const beforeRapid = (await texts()).length;
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await settle();
    check('快速连按只播报最终焦点', (await texts()).length === beforeRapid + 1 && (await latest()).includes('第 3 个'));
    await page.keyboard.press('Tab');
    await settle();
    check('已有名称的正常按钮也会自动朗读', (await latest()).startsWith('保存资料，按钮'));
    const beforePanel = await page.evaluate(() => ({ ...focusSpeechLog, texts: [...focusSpeechLog.texts] }));
    await page.locator('#suggested-name').focus();
    await settle();
    check('离开网页按钮停止旧朗读，面板输入框不触发播报', (await texts()).length === beforePanel.texts.length && await page.evaluate(() => focusSpeechLog.cancellations) > beforePanel.cancellations);
    await page.locator('#uncertain-save').evaluate(el => el.setAttribute('aria-label', '保存当前设计资料'));
    await page.locator('#uncertain-save').focus();
    await settle();
    check('重新聚焦读取当前 DOM 名称', (await latest()).startsWith('保存当前设计资料，按钮'));
    await page.locator('#guide-autospeak').uncheck();
    const disabledCount = (await texts()).length;
    await page.locator('#uncertain-bookmark').focus();
    await page.keyboard.press('Tab');
    await settle();
    check('关闭开关后 Tab 保持正常且不再播报', (await texts()).length === disabledCount && await page.locator('#uncertain-tooltip').evaluate(el => el === document.activeElement));
    await page.locator('#guide-browse').click();
    const beforeRemoval = (await texts()).length;
    await page.locator('#uncertain-tooltip').evaluate(el => { el.focus(); el.remove(); });
    await settle();
    check('目标移除后不会继续播报已排队的内容', (await texts()).length === beforeRemoval);
    await page.locator('#guide-autospeak').uncheck();
    await page.evaluate(async () => {
      const { launch } = await import('/extension/content.js');
      window.focusPanel = launch({ root: document.getElementById('preview'), autoSpeak: true });
    });
    const panel = page.locator('buttonvoice-panel');
    await panel.locator('#guide-browse').click();
    await settle();
    const beforePanelTab = (await texts()).length;
    await page.keyboard.press('Tab');
    await settle();
    check('共用扩展面板同样支持实际 Tab 自动朗读', (await texts()).length === beforePanelTab + 1 && (await latest()).startsWith('未命名按钮'));
    await page.keyboard.press('Alt+Shift+U');
    await panel.locator('#guide-autospeak').uncheck();
    await page.evaluate(async () => {
      const autoSpeak = focusPanel.autoSpeak;
      focusPanel.dispose();
      const { launch } = await import('/extension/content.js');
      window.focusPanel = launch({ root: document.getElementById('preview'), autoSpeak });
    });
    check('重建面板可保留关闭朗读的选择', !(await panel.locator('#guide-autospeak').isChecked()));
    await page.evaluate(() => window.focusPanel.dispose());
    const disposedCount = (await texts()).length;
    await page.locator('#uncertain-save').focus();
    await settle();
    check('退出后移除自动朗读监听', (await texts()).length === disposedCount);
    check('新增朗读流程没有脚本错误', errors.length === 0);
    await fs.writeFile('test-results/focus-speech-report.json', JSON.stringify({ checks, errors, speechRequests: await texts(), scope: 'Real keyboard focus with a recording speech engine; not an audible or screen-reader test.' }, null, 2));
    console.log(`${checks.length} focus speech checks passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
