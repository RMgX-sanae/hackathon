const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };

(async () => {
  const extension = path.resolve('release/ButtonVoice');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'buttonvoice-navigation-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: 'chromium', executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    viewport: { width: 1440, height: 1100 },
    args: [`--load-extension=${extension}`, `--disable-extensions-except=${extension}`],
  });
  context.setDefaultTimeout(10000);
  const errors = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('chrome://extensions');
    const id = await page.locator('extensions-item').filter({ hasText: 'ButtonVoice 按钮失语症' }).getAttribute('id');
    await page.goto(`chrome-extension://${id}/practice.html`);
    await page.locator('#scene').selectOption('uncertain');
    await page.locator('#check').click();
    const panel = page.locator('buttonvoice-panel');
    check('扩展单独列出非语义可点击控件', (await panel.locator('#summary').textContent()).includes('1 个疑似可点击控件') && await panel.locator('#total').textContent() === '7');
    await page.keyboard.press('Alt+Shift+Enter');
    check('扩展快捷键聚焦网页按钮且不激活', await page.locator('#uncertain-bookmark').evaluate(el => el === document.activeElement && el.getAttribute('aria-pressed') === 'false'));
    const live = panel.locator('#navigator-status');
    check('面板收起后读屏通知仍暴露', await live.evaluate(el => !el.closest('[hidden]') && el.textContent.includes('焦点已到达')));
    await page.keyboard.press('Alt+Shift+U');
    check('可从网页焦点返回 Shadow DOM 确认面板', await panel.locator('#label').evaluate(el => el.getRootNode().activeElement === el));
    await panel.locator('#label').fill('收藏设计资料');
    await panel.locator('#apply').click();
    check('未确认的错误直接聚焦确认选项', await panel.locator('#confirmed').evaluate(el => el.getRootNode().activeElement === el && el.getAttribute('aria-invalid') === 'true'));
    await panel.locator('#confirmed').check();
    await panel.locator('#apply').click();
    check('修复完成后的焦点保留在可操作控件', await panel.locator('#speak-after').evaluate(el => el.getRootNode().activeElement === el));
    await page.locator('#uncertain-bookmark').click();
    await page.waitForFunction(() => document.querySelector('buttonvoice-panel').shadowRoot.getElementById('fixed').textContent === '0');
    check('通用按钮状态变化后原修复不再计数', (await panel.locator('#conflict').textContent()).includes('状态'));
    await panel.locator('#undo').click();
    check('撤销后返回输入位置且恢复原属性', await page.locator('#uncertain-bookmark').getAttribute('aria-label') === null && await panel.locator('#label').evaluate(el => el.getRootNode().activeElement === el));
    await panel.locator('.issue').filter({ hasText: '命名线索存在分歧' }).click();
    await panel.locator('#candidate-choice').selectOption('查看资料详情');
    await panel.locator('#confirmed').check();
    await panel.locator('#apply').click();
    check('冲突线索经选择和确认后才能生效', await page.locator('#uncertain-conflict').getAttribute('aria-label') === '查看资料详情');
    await panel.locator('.issue').filter({ hasText: '疑似可点击控件' }).click();
    await page.keyboard.press('Alt+Shift+Enter');
    await page.keyboard.press('Alt+Shift+U');
    check('疑似控件可定位并返回上下文说明', await panel.locator('#context').evaluate(el => el.getRootNode().activeElement === el));
    await panel.locator('#defer').click();
    check('跳过疑似控件仍保留待确认', await panel.locator('.issue').filter({ hasText: '已跳过，仍待确认' }).count() === 1);
    await panel.locator('.issue').filter({ hasText: '网页提示文本' }).click();
    await page.screenshot({ path: 'test-results/extension-confirmation.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    const box = await panel.locator('#panel').boundingBox();
    check('新确认面板在窄窗口内完整容纳', box.x >= 0 && box.x + box.width <= 390 && await panel.locator('.body').evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: 'test-results/extension-confirmation-narrow.png' });
    await panel.locator('#finish').click();
    await page.goto(pathToFileURL(path.join(extension, 'welcome.html')).href);
    check('安装说明直接打开文件也能加载样式', await page.locator('body').evaluate(el => getComputedStyle(el.parentElement).backgroundColor === 'rgb(11, 16, 32)'));
    check('新扩展流程无脚本错误', errors.length === 0);
    await fs.writeFile('test-results/extension-navigation-report.json', JSON.stringify({ checks, errors }, null, 2));
    console.log(`${checks.length} extension navigation checks passed`);
  } finally { await context.close(); await fs.rm(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
