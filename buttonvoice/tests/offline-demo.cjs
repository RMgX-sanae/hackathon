const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const checks = [], errors = [], external = [];
  const check = (label, value) => { assert.ok(value, label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  try {
    await page.goto(pathToFileURL(path.resolve('release/ButtonVoice-Demo/index.html')).href);
    await page.locator('#bv-demo-start').click();
    const panel = page.locator('buttonvoice-panel');
    check('双击文件即可加载面板，无需本地服务器', await panel.locator('#panel').isVisible());
    check('只扫描校园场景的 9 个按钮和 5 个名称缺失', await panel.locator('#total').textContent() === '9' && await panel.locator('#missing').textContent() === '5');
    const menu = page.locator('#demo-root [data-demo-action="menu"]');
    await panel.locator('#apply').click();
    check('修复写入场景真实 DOM', await menu.getAttribute('aria-label') === '打开导航菜单' && await panel.locator('#fixed').textContent() === '1');
    await page.locator('#reset').click();
    check('重置清除修改和旧问题记录', await page.locator('#demo-root [data-demo-action="menu"]').getAttribute('aria-label') === null && await panel.locator('#fixed').textContent() === '0' && await panel.locator('#issues button').count() === 5);
    await page.locator('[data-select="shop"]').click();
    check('切换场景清空上一轮记录', !(await panel.locator('#issues').textContent()).includes('当前未参与') && await panel.locator('#fixed').textContent() === '0');
    await panel.locator('#heart-summary').click();
    await panel.locator('#heart-meaning').selectOption('favorite');
    await panel.locator('#heart-confirmed').check();
    await panel.locator('#heart-apply').click();
    const heart = page.locator('[data-demo-id="shop-heart-1"]');
    check('离线场景支持爱心含义预设', await heart.getAttribute('aria-label') === '收藏日光陶瓷花瓶');
    await heart.click();
    await page.waitForFunction(() => document.querySelector('[data-demo-id="shop-heart-1"]').getAttribute('aria-label') === '取消收藏日光陶瓷花瓶');
    check('原素材的收藏交互仍同步名称', await panel.locator('#fixed').textContent() === '2');
    await page.locator('[data-select="library"]').click();
    await panel.locator('#finish').click();
    await page.locator('#bv-demo-start').click();
    check('退出后可重新开始，面板不重复', await panel.count() === 1 && await panel.locator('#fixed').textContent() === '0');
    check('离线演示无外部请求或脚本错误', external.length === 0 && errors.length === 0);
    await fs.writeFile('test-results/offline-demo-report.json', JSON.stringify({ checks, errors, external, manualSafari: 'Native Safari file URL: local Chinese voice start/end, campus 9/5 to 9/4 with 1 repair, actual accessible name updated.' }, null, 2));
    console.log(`${checks.length} offline demo checks passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
