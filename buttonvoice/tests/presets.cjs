const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };

(async () => {
  const extension = path.resolve('release/ButtonVoice');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'buttonvoice-presets-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: 'chromium', executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    viewport: { width: 1440, height: 1000 }, args: [`--load-extension=${extension}`, `--disable-extensions-except=${extension}`],
  });
  context.setDefaultTimeout(10000);
  const errors = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.BUTTONVOICE_URL || 'http://127.0.0.1:5174');
    await page.locator('#scene-select').selectOption('uncertain');
    await page.evaluate(() => {
      const source = document.getElementById('uncertain-bookmark');
      const second = source.cloneNode(true); second.id = 'second-heart';
      const named = source.cloneNode(true); named.id = 'named-heart'; named.setAttribute('aria-label', '已有的收藏名称');
      source.parentElement.append(second, named);
    });
    await page.locator('#scan').click();
    await page.locator('#heart-summary').click();
    check('识别两枚未命名爱心并跳过已有名称', (await page.locator('#heart-count').textContent()).startsWith('2 个'));
    await page.locator('#heart-meaning').selectOption('like');
    check('选择点赞预设只产生草稿', await page.locator('#suggested-name').inputValue() === '点赞' && await page.locator('#uncertain-bookmark').getAttribute('aria-label') === null);
    check('批量含义未确认时不能应用', !(await page.locator('#heart-apply').isEnabled()));
    await page.locator('#heart-confirmed').check();
    await page.locator('#uncertain-bookmark').evaluate(el => el.setAttribute('aria-pressed', 'true'));
    await page.locator('#scan').click();
    check('任一目标状态变化会取消整组旧确认', !(await page.locator('#heart-confirmed').isChecked()) && !(await page.locator('#heart-apply').isEnabled()));
    await page.locator('#heart-confirmed').check();
    await page.locator('#heart-apply').click();
    check('批量应用依据各按钮当前状态生成名称', await page.locator('#uncertain-bookmark').getAttribute('aria-label') === '取消点赞' && await page.locator('#second-heart').getAttribute('aria-label') === '点赞');
    check('有意义的现有名称保持原样', await page.locator('#named-heart').getAttribute('aria-label') === '已有的收藏名称');
    check('批量结果由实际复查计数', await page.locator('#fixed-count').textContent() === '2');
    await page.locator('#uncertain-bookmark').click();
    await page.waitForFunction(() => document.getElementById('uncertain-bookmark').getAttribute('aria-label') === '点赞');
    check('相同预设内切换状态会同步名称', await page.locator('#fixed-count').textContent() === '2');
    await page.locator('#heart-meaning').selectOption('favorite');
    check('改选其他含义不会静默改写已应用名称', await page.locator('#second-heart').getAttribute('aria-label') === '点赞' && await page.locator('#fixed-count').textContent() === '0');

    await page.goto('chrome://extensions');
    const id = await page.locator('extensions-item').filter({ hasText: 'ButtonVoice 按钮失语症' }).getAttribute('id');
    await page.goto(`chrome-extension://${id}/practice.html`);
    await page.locator('#scene').selectOption('shop');
    await page.locator('#check').click();
    const panel = page.locator('buttonvoice-panel');
    await panel.locator('#heart-summary').click();
    check('扩展可识别 SVG use 引用的爱心形状', (await panel.locator('#heart-count').textContent()).startsWith('2 个'));
    await panel.locator('#heart-meaning').selectOption('favorite');
    await panel.locator('#heart-confirmed').check();
    await panel.locator('#heart-apply').click();
    const flower = page.locator('[data-demo-id="shop-heart-1"]');
    check('扩展按预设为同类图标生成具体名称', await flower.getAttribute('aria-label') === '收藏日光陶瓷花瓶' && await panel.locator('#fixed').textContent() === '2');
    await flower.click();
    await page.waitForFunction(() => document.querySelector('[data-demo-id="shop-heart-1"]').getAttribute('aria-label') === '取消收藏日光陶瓷花瓶');
    check('扩展预设跟随已登记的选中状态', await panel.locator('#fixed').textContent() === '2');
    const cssUnknown = await page.evaluate(async () => {
      const target = document.querySelector('[data-demo-id="shop-heart-2"]');
      return target.getAttribute('aria-label');
    });
    check('第二个对象单独命名，不复用第一个商品名', cssUnknown === '收藏落日氛围台灯');
    check('预设流程没有脚本错误', errors.length === 0);
    await page.screenshot({ path: 'test-results/heart-presets-extension.png' });
    await fs.writeFile('test-results/heart-presets-report.json', JSON.stringify({ checks, errors }, null, 2));
    console.log(`${checks.length} heart preset checks passed`);
  } finally { await context.close(); await fs.rm(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
