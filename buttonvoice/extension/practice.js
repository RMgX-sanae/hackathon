import '../../ButtonVoice_MockPages/preview.js';
import '../../ButtonVoice_MockPages/preview.css';
import { launch } from './content.js';
import { icon } from '../src/icons.js';
import { createUncertainDemo } from '../src/uncertain-demo.js';

const root = document.getElementById('practice-root');
function reset() {
  const scene = document.getElementById('scene').value;
  if (scene === 'uncertain') {
    window.clearTimeout(root._bvToastTimer);
    root.classList.remove('bv-preview');
    createUncertainDemo(root);
  } else if (scene === 'plain') {
    window.clearTimeout(root._bvToastTimer);
    root.classList.remove('bv-preview');
    root.innerHTML = `<section class="plain-page"><h2>设计资料库</h2><p>整理常用资料，方便下次查阅。</p><div class="plain-toolbar"><button id="plain-bookmark" type="button" aria-pressed="false">${icon('Heart')}</button><button id="plain-open" type="button" data-tooltip="展开资料目录">${icon('Menu')}</button><button type="button" id="plain-save">保存资料</button></div><p id="plain-feedback" role="status">这是一个没有登记按钮用途的普通网页示例。</p><p class="plain-note">第一个按钮用于收藏资料，但只有图标；需要你确认名称。第二个按钮有网页提示文本，可以参考后确认。第三个按钮已经有可见文字。</p></section>`;
  } else window.ButtonVoicePreview.createPreview(root, { template: scene });
}
root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.id === 'plain-bookmark') {
    const pressed = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(pressed));
    document.getElementById('plain-feedback').textContent = pressed ? '已收藏资料。' : '已取消收藏。';
  } else if (button?.id === 'plain-open') document.getElementById('plain-feedback').textContent = '资料目录：设计规范、组件参考、调研记录。';
  else if (button?.id === 'plain-save') document.getElementById('plain-feedback').textContent = '已完成本地保存演示。';
});
document.getElementById('check').addEventListener('click', launch);
document.getElementById('scene').addEventListener('change', reset);
document.getElementById('reset-page').addEventListener('click', reset);
reset();
