import { icon } from './icons.js';
import './uncertain-demo.css';

export function createUncertainDemo(root) {
  root.innerHTML = `<section class="uncertain-demo" aria-label="设计资料库操作区">
    <p class="uncertain-intro">确认练习 · 本页操作仅更新演示状态</p><h2>设计资料库</h2>
    <p>按钮的位置可以通过标题、顺序和附近文字说明。用途仍不清楚时，可以保留待确认。</p>
    <div class="uncertain-actions">
      <button id="uncertain-bookmark" aria-pressed="false">${icon('Heart')}</button>
      <button id="uncertain-tooltip" data-tooltip="打开资料目录">${icon('Menu')}</button>
      <button id="uncertain-conflict" data-tooltip="查看资料详情" data-original-title="删除资料">${icon('CircleHelp')}</button>
      <span id="uncertain-role" role="button">${icon('ArrowUpRight')}</span>
      <button id="uncertain-save">保存资料</button>
    </div>
    <div id="uncertain-clickable" tabindex="0" class="uncertain-clickable">下载资料目录</div>
    <p id="uncertain-feedback" role="status">还没有执行操作。定位只移动焦点，不会替你点击。</p>
    <details><summary>这组控件有什么问题</summary><p>收藏按钮没有命名线索；目录按钮有待确认的提示；问号按钮有两条互相矛盾的提示；箭头按钮缺少 Tab 入口。下载入口可以点击，却没有按钮语义。最后一项应交由网站维护者修复角色和键盘行为。</p></details>
  </section>`;
  const section = root.firstElementChild;
  function activate(target) {
    let feedback = '';
    if (target.id === 'uncertain-bookmark') {
      const pressed = target.getAttribute('aria-pressed') !== 'true';
      target.setAttribute('aria-pressed', String(pressed));
      feedback = pressed ? '已收藏设计资料。' : '已取消收藏。';
    } else if (target.id === 'uncertain-tooltip') feedback = '资料目录：设计规范、组件参考、调研记录。';
    else if (target.id === 'uncertain-conflict') feedback = '已打开资料详情。“删除资料”是过时提示，本页没有删除操作。';
    else if (target.id === 'uncertain-role') feedback = '已打开辅助阅读介绍。';
    else if (target.id === 'uncertain-clickable') feedback = '已准备资料目录。本练习不会下载文件。';
    else if (target.id === 'uncertain-save') feedback = '资料保存演示完成。';
    if (feedback) section.querySelector('#uncertain-feedback').textContent = feedback;
  }
  section.addEventListener('click', event => {
    const target = event.target.closest('[id^="uncertain-"]');
    if (target) activate(target);
  });
  section.querySelector('#uncertain-role').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event.currentTarget); }
  });
}
