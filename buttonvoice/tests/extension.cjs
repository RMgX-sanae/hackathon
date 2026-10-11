const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'release/ButtonVoice');
const checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
const waitFor = async (page, predicate) => page.waitForFunction(predicate);

(async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(extension, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  check('权限限于主动访问当前页和脚本注入', !manifest.host_permissions && !manifest.content_scripts);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'buttonvoice-tests-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: 'chromium',
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    viewport: { width: 1440, height: 1000 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const errors = [], remote = [];
  context.setDefaultTimeout(10000);
  try {
    // Read the installed extension from Chrome's own management UI, without a fixed ID.
    const manager = await context.newPage();
    await manager.goto('chrome://extensions');
    const card = manager.locator('extensions-item').filter({ hasText: manifest.name });
    await card.waitFor();
    const id = await card.getAttribute('id');
    check('生产安装包成功加载为 Manifest V3 扩展', Boolean(id));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
    await page.goto(`chrome-extension://${id}/practice.html`);
    await page.locator('#scene').selectOption('plain');
    await page.locator('#check').click();
    const panel = page.locator('buttonvoice-panel');
    check('原页面按钮被扫描且工具自身未被计入', await panel.locator('#total').textContent() === '5' && await panel.locator('#missing').textContent() === '2');
    check('未知图标需要人工填写', await panel.locator('#label').inputValue() === '' && !(await panel.locator('#speak-after').isEnabled()));
    await panel.locator('#label').fill('   ');
    await panel.locator('#apply').click();
    check('空白名称被阻止', await panel.locator('#input-error').isVisible() && await page.locator('#plain-bookmark').getAttribute('aria-label') === null);
    await panel.locator('#label').fill('收藏设计资料');
    const before = await panel.locator('#before-html').textContent();
    check('草稿与试听不会写入页面', await page.locator('#plain-bookmark').getAttribute('aria-label') === null && (await panel.locator('#after-html-title').textContent()).includes('尚未'));
    await panel.locator('#confirmed').check();
    await panel.locator('#apply').click();
    check('应用写入真实 DOM 并计入有效修复', await page.locator('#plain-bookmark').getAttribute('aria-label') === '收藏设计资料' && await panel.locator('#fixed').textContent() === '1');
    const cdp = await context.newCDPSession(page);
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.getElementById("plain-bookmark")' });
    const ax = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId });
    check('浏览器可访问性树取得真实新名称', ax.nodes.some(node => node.role?.value === 'button' && node.name?.value === '收藏设计资料'));
    await cdp.detach();
    await page.locator('#plain-bookmark').click();
    await waitFor(page, () => document.querySelector('buttonvoice-panel').shadowRoot.getElementById('conflict').textContent.includes('状态已变化'));
    check('未知按钮切换状态后要求重新确认', await panel.locator('#fixed').textContent() === '0');
    await panel.locator('#undo').click();
    check('撤销恢复原来没有标签的状态', await page.locator('#plain-bookmark').getAttribute('aria-label') === null);
    await panel.locator('#label').fill('取消收藏设计资料');
    await panel.locator('#confirmed').check();
    await panel.locator('#apply').click();
    check('首次发现快照保持不变', await panel.locator('#before-html').textContent() === before);
    // Simulate a later website update; this fixture mutation is not an extension action.
    await page.locator('#plain-bookmark').evaluate(el => el.setAttribute('aria-label', '网站提供的新名称'));
    await panel.locator('#scan').click();
    await panel.locator('#undo').click();
    check('撤销不会覆盖网站后续改名', await page.locator('#plain-bookmark').getAttribute('aria-label') === '网站提供的新名称' && (await panel.locator('#status').textContent()).includes('未覆盖'));
    await panel.locator('.issue').filter({ hasText: '网页提示文本' }).click();
    check('页面 tooltip 仅作为待确认候选', await panel.locator('#label').inputValue() === '展开资料目录' && await page.locator('#plain-open').getAttribute('aria-label') === null);
    await panel.locator('#confirmed').check();
    await panel.locator('#apply').click();
    await page.locator('#check').click();
    check('再次打开复用一个面板', await page.locator('buttonvoice-panel').count() === 1);
    await panel.locator('#finish').click();
    check('退出撤销自有修改并保留网站新值', await panel.count() === 0 && await page.locator('#plain-open').getAttribute('aria-label') === null && await page.locator('#plain-bookmark').getAttribute('aria-label') === '网站提供的新名称');

    await page.locator('#scene').selectOption('shop');
    await page.locator('#check').click();
    const favorite = page.locator('[data-demo-action="favorite"]').first();
    const actionNames = await page.locator('[data-demo-action]').evaluateAll(els => els.map(el => ({ action: el.dataset.demoAction, id: el.dataset.demoId })));
    // Choose the real item discovered in the DOM; expected title describes the fixture business action.
    const favoriteAction = actionNames.find(item => /favorite/.test(item.action));
    assert.ok(favoriteAction, 'shop fixture has favorite action');
    await panel.locator('.issue').filter({ hasText: '日光陶瓷花瓶' }).click();
    await panel.locator('#apply').click();
    await favorite.click();
    await waitFor(page, () => [...document.querySelectorAll('[data-demo-action="favorite"]')].some(el => el.getAttribute('aria-label')?.startsWith('取消收藏')));
    check('登记示例收藏状态变化后名称同步', (await favorite.getAttribute('aria-label')).startsWith('取消收藏') && await panel.locator('#fixed').textContent() === '1');
    await panel.locator('#speak-after').click();
    await page.waitForTimeout(4000);
    const speechStatus = await panel.locator('#voice').textContent();
    check('显示真实语音状态并保留文字对比', /播放|语音|音色/.test(speechStatus) && (await panel.locator('#after-text').textContent()).includes('取消收藏'));
    await panel.locator('#locate').click();
    check('定位收起面板且没有再次激活按钮', !(await panel.locator('#panel').isVisible()) && await favorite.evaluate(el => document.activeElement === el && el.classList.contains('bv-is-active')));
    await panel.locator('#resume').click();
    await panel.locator('#speak-after').scrollIntoViewIfNeeded();
    await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/extension-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.locator('#scan').click();
    const box = await panel.locator('#panel').boundingBox();
    check('窄窗口中面板不横向溢出', box.x >= 0 && box.x + box.width <= 390);
    await page.screenshot({ path: path.join(root, 'test-results/extension-narrow.png') });
    await panel.locator('#finish').click();
    await page.reload();
    check('刷新不保留修复和检查面板', await page.locator('buttonvoice-panel').count() === 0 && await page.locator('[aria-label="取消收藏日光陶瓷花瓶"]').count() === 0);
    await page.goto(`chrome-extension://${id}/popup.html`);
    check('受保护扩展页面不能直接检查', !(await page.locator('#inspect').isEnabled()) && (await page.locator('#status').textContent()).includes('不能直接检查'));
    check('扩展体验流程无外部 HTTP 请求', remote.length === 0);
    check('扩展体验流程无脚本错误', errors.length === 0);
    const report = { browser: await context.browser().version(), checks, errors, remote, speechStatus, scope: 'Installed extension pages and shared panel behavior. Toolbar activeTab injection is verified separately through the native browser UI.' };
    await fs.writeFile(path.join(root, 'test-results/extension-report.json'), JSON.stringify(report, null, 2));
    console.log(`${checks.length} extension checks passed. Speech: ${speechStatus}`);
  } finally {
    await context.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
