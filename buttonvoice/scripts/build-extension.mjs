import { build } from 'vite';
import { mkdir, copyFile, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const project = fileURLToPath(new URL('..', import.meta.url));
const root = join(project, 'extension');
const outDir = join(project, 'release', 'ButtonVoice');
const common = { configFile: false, root, base: './', publicDir: false };

await build({
  ...common,
  build: {
    outDir, emptyOutDir: true, target: 'chrome120',
    lib: { entry: join(root, 'inject.js'), name: 'ButtonVoice', formats: ['iife'], fileName: () => 'content.js' },
  },
});
await build({
  ...common,
  build: {
    outDir, emptyOutDir: false, target: 'chrome120',
    rolldownOptions: { input: {
      popup: join(root, 'popup.html'),
      practice: join(root, 'practice.html'),
    } },
  },
});
await copyFile(join(root, 'manifest.json'), join(outDir, 'manifest.json'));
await copyFile(join(root, 'README.txt'), join(outDir, 'README.txt'));
// Keep the guide plain HTML/CSS so it can be opened from disk before installation.
await copyFile(join(root, 'welcome.html'), join(outDir, 'welcome.html'));
await copyFile(join(root, 'pages.css'), join(outDir, 'pages.css'));
await cp(join(root, 'icons'), join(outDir, 'icons'), { recursive: true });
const notices = [];
for (const [name, license] of [['dom-accessibility-api', 'LICENSE.md'], ['lucide', 'LICENSE']]) {
  notices.push(`${name}\n${await readFile(resolve(project, 'node_modules', name, license), 'utf8')}`);
}
await writeFile(join(outDir, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n\n'));
await mkdir(join(project, 'release'), { recursive: true });
// Re-create the archive so removed build assets cannot remain in an older ZIP.
const archive = join(project, 'release', 'ButtonVoice-Chrome-Edge.zip');
const { rm } = await import('node:fs/promises');
await rm(archive, { force: true });
execFileSync('zip', ['-q', '-r', archive, 'ButtonVoice', '-x', '*.DS_Store'], { cwd: join(project, 'release') });
console.log(`扩展文件夹：${outDir}\n安装包：${archive}`);
