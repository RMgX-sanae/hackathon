import { createDemo } from './demo.js';
import { createUncertainDemo } from './uncertain-demo.js';
import '../../ButtonVoice_MockPages/preview.js';
import '../../ButtonVoice_MockPages/preview.css';

export function createScenes(root, onStateChange) {
  const original = createDemo(root, onStateChange);
  let scene = 'original';
  let mount = null;
  const names = {
    original: '回声集 · 校园二手商城', campus: '南科生活 · 校园服务',
    shop: '柚子商店 · 电商', library: '山海图书馆 · 阅读服务', volunteer: '微光行动 · 志愿者工具',
    uncertain: '不确定控件 · 确认练习',
  };
  const toggleActions = new Set(['favorite', 'bookmark', 'pin']);

  function syncToggle(element) {
    if (toggleActions.has(element.dataset.demoAction)) {
      // The supplied fixture uses this class as its actual toggle state.
      element.setAttribute('aria-pressed', String(element.classList.contains('bv-is-active')));
    }
  }
  root.addEventListener('click', event => {
    const element = event.target.closest('[data-demo-action]');
    if (!element || !mount?.contains(element)) return;
    syncToggle(element);
    onStateChange(element);
  });

  function reset(next = scene) {
    scene = Object.hasOwn(names, next) ? next : 'original';
    window.clearTimeout(mount?._bvToastTimer);
    mount = null;
    root.classList.toggle('store-preview', scene === 'original');
    root.classList.toggle('mock-preview', scene !== 'original');
    root.setAttribute('aria-label', `${names[scene]}示例`);
    if (scene === 'original') original.reset();
    else if (scene === 'uncertain') createUncertainDemo(root);
    else {
      mount = document.createElement('div');
      root.replaceChildren(mount);
      window.ButtonVoicePreview.createPreview(mount, { template: scene });
      mount.querySelectorAll('[data-demo-action]').forEach(syncToggle);
    }
  }
  return { reset };
}
