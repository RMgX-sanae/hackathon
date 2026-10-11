import { build } from 'vite';
import { cp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const project = fileURLToPath(new URL('..', import.meta.url));
const source = join(project, '..', 'ButtonVoice_MockPages');
const outDir = join(project, 'release', 'ButtonVoice-Demo');
await build({ configFile: false, root: project, publicDir: false, build: {
  outDir, emptyOutDir: true, target: ['safari16.4', 'chrome120'],
  lib: { entry: join(project, 'src/fixture-demo.js'), name: 'ButtonVoiceDemo', formats: ['iife'], fileName: () => 'buttonvoice-demo.js' },
} });
await cp(source, outDir, { recursive: true });
const html = await readFile(join(source, 'index.html'), 'utf8');
await writeFile(join(outDir, 'index.html'), html.replace('</body>', '<script src="buttonvoice-demo.js"></script>\n</body>'));
const licenses = [];
for (const [name, file] of [['dom-accessibility-api', 'LICENSE.md'], ['lucide', 'LICENSE']]) {
  licenses.push(`${name}\n${await readFile(join(project, 'node_modules', name, file), 'utf8')}`);
}
await writeFile(join(outDir, 'THIRD-PARTY-NOTICES.txt'), licenses.join('\n\n'));
await writeFile(join(outDir, '演示说明.txt'), `ButtonVoice 现场演示\n\n解压后双击 index.html，用 Safari 或 Chrome 打开。请保留整个文件夹。无需启动服务器或安装扩展。\n\n1. 点击“测试声音”，确认扬声器或耳机能听到中文。\n2. 选择左侧场景，点击“开启 ButtonVoice”。只检查当前场景。\n3. 选择问题，点击“朗读修复前”，听到“按钮”。\n4. 确认名称并应用，点击“朗读修复后”，听见具体用途。\n5. 爱心可选择收藏或点赞，勾选确认后批量应用。状态变化时名称跟随更新。\n6. 点击“进入网页，按 Tab 浏览”，之后 Tab 前进、Shift+Tab 后退，自动读出按钮当前名称和位置。可关闭“Tab 聚焦与切换时自动朗读”。切换场景保留开关选择。\n7. Alt + Shift + 左右方向键聚焦问题对象，Alt + Shift + U 返回面板，Alt + Shift + I 朗读完整上下文。\n8. 切换场景或点击“重置”开始新一轮。面板挡住网页时，可用右上角收起按钮。\n\nSafari 若跳过按钮，请在设置的“高级”中开启“按下 Tab 键以高亮显示网页上的每一项”。\n\n这是内置检查面板的本地演示页，不代表 Safari 扩展安装。原始素材另存未改动。语音是名称变化模拟，不等于真实读屏器测试。\n`);
const archive = join(project, 'release', 'ButtonVoice-Demo.zip');
await rm(archive, { force: true });
execFileSync('zip', ['-q', '-r', archive, 'ButtonVoice-Demo', '-x', '*.DS_Store'], { cwd: join(project, 'release') });
console.log(`演示入口：${join(outDir, 'index.html')}\n演示包：${archive}`);
