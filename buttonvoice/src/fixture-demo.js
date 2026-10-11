import { launch } from '../extension/content.js';
import { createSpeech } from './speech.js';
import { icon } from './icons.js';
import css from './fixture-demo.css?inline';

const root = document.getElementById('demo-root');
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);
const toolbar = document.createElement('section');
toolbar.className = 'bv-demo-toolbar';
toolbar.setAttribute('aria-label', 'ButtonVoice 演示工具');
toolbar.innerHTML = `<div><strong>ButtonVoice 现场演示</strong><p id="bv-demo-status" role="status">选择左侧场景，然后开启检查面板。</p></div><div class="bv-demo-actions"><button id="bv-demo-sound" type="button">${icon('Volume2')}测试声音</button><button id="bv-demo-start" class="bv-demo-primary" type="button">${icon('ScanLine')}开启 ButtonVoice</button></div>`;
document.querySelector('.shell-main').before(toolbar);
const status = toolbar.querySelector('#bv-demo-status');
const sound = createSpeech(text => { status.textContent = text; });
let panel;
function openPanel() {
  sound.cancel();
  panel = launch({ root, scopeLabel: '仅检查当前模拟场景', autoSpeak: panel?.autoSpeak ?? true });
}
toolbar.querySelector('#bv-demo-start').addEventListener('click', openPanel);
toolbar.querySelector('#bv-demo-sound').addEventListener('click', () => {
  sound.speak('这是 ButtonVoice 的声音测试。开启检查面板后，可以听见按钮修复前后的名称，也可以朗读按钮的位置与上下文。');
});
for (const button of document.querySelectorAll('[data-select], #reset')) {
  button.addEventListener('click', () => {
    sound.cancel();
    if (!document.getElementById('buttonvoice-extension-host')) return;
    panel.dispose();
    openPanel();
  });
}
for (const id of ['wide', 'mobile']) {
  document.getElementById(id).addEventListener('click', () => {
    if (document.getElementById('buttonvoice-extension-host')) panel.open();
  });
}
