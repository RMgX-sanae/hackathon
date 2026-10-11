import { accessibleName, isExposed } from './scanner.js';
import { getRole } from 'dom-accessibility-api';

const compact = value => (value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
const landmarkNames = { HEADER: '页眉', NAV: '导航区', MAIN: '主内容区', ASIDE: '侧栏', FOOTER: '页脚', FORM: '表单', DIALOG: '对话框' };

export function namingEvidence(element) {
  const entries = [
    ['网站声明', element.getAttribute('data-buttonvoice-label')],
    ['网页提示', element.getAttribute('data-tooltip')],
    ['网页提示', element.getAttribute('data-original-title')],
    ['元素提示', element.getAttribute('title')],
  ];
  const candidates = [];
  for (const [source, raw] of entries) {
    const label = compact(raw);
    if (label && !candidates.some(item => item.label === label)) candidates.push({ source, label });
  }
  return candidates;
}

export function controlContext(element, root, records = []) {
  let region = null;
  let heading = '';
  for (let parent = element.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
    if (!heading && parent.matches('article, section, li, form, dialog, [role="group"], [role="region"]')) {
      const title = [...parent.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].find(node => isExposed(node, root));
      heading = compact(title?.textContent);
    }
    if (!region && parent.matches('header,nav,main,aside,footer,form,dialog,section[aria-label],section[aria-labelledby],[role="navigation"],[role="dialog"],[role="region"]')) region = parent;
    if (parent === root) break;
  }
  const regionText = region ? compact(accessibleName(region)) || landmarkNames[region.tagName] || '页面区域' : '当前页面';
  const active = records.filter(record => record.active);
  const index = active.findIndex(record => record.element === element);
  const neighbor = direction => {
    for (let cursor = index + direction; index >= 0 && cursor >= 0 && cursor < active.length; cursor += direction) {
      if (active[cursor].name) return compact(active[cursor].name);
    }
    return '';
  };
  const rect = element.getBoundingClientRect();
  const vertical = rect.bottom <= 0 ? '视口上方' : rect.top >= innerHeight ? '视口下方'
    : rect.top + rect.height / 2 < innerHeight / 3 ? '视口上部'
      : rect.top + rect.height / 2 > innerHeight * 2 / 3 ? '视口下部' : '视口中部';
  const horizontal = rect.left + rect.width / 2 < innerWidth / 3 ? '左侧'
    : rect.left + rect.width / 2 > innerWidth * 2 / 3 ? '右侧' : '中间';
  const states = [];
  if (element.disabled || element.getAttribute('aria-disabled') === 'true') states.push('当前不可用');
  if (element.hasAttribute('aria-pressed')) states.push(element.getAttribute('aria-pressed') === 'true' ? '已按下' : '未按下');
  if (element.hasAttribute('aria-expanded')) states.push(element.getAttribute('aria-expanded') === 'true' ? '已展开' : '未展开');
  const descriptions = (element.getAttribute('aria-describedby') || '').split(/\s+/).map(id => compact(document.getElementById(id)?.textContent)).filter(Boolean);
  const controlled = (element.getAttribute('aria-controls') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean);
  const controlledNames = controlled.map(node => compact(accessibleName(node)) || compact(node.querySelector('h1,h2,h3,h4,[role="heading"]')?.textContent)).filter(Boolean);
  const brokenRefs = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).some(id => !compact(document.getElementById(id)?.textContent));
  const before = neighbor(-1), after = neighbor(1);
  const parts = [
    index >= 0 ? `页面第 ${index + 1} 个检查对象，共 ${active.length} 个` : '',
    regionText, heading ? `关联标题：${heading}` : '', `${vertical}${horizontal}`, ...states,
    before ? `前一个有名称的按钮：${before}` : '', after ? `后一个有名称的按钮：${after}` : '',
    descriptions.length ? `页面说明：${descriptions.join('；')}` : '',
    controlledNames.length ? `关联控制区域：${controlledNames.join('；')}` : '',
    brokenRefs ? '命名引用缺失或为空，写入新名称后可能仍有冲突' : '',
  ].filter(Boolean);
  return { text: parts.join('。') + '。', region: regionText, heading, states, evidence: namingEvidence(element), index, total: active.length, position: `${vertical}${horizontal}` };
}

// Navigation changes focus only. It never activates the website's control.
export function createNavigator({ root, records, selected, select, openPanel, beforeFocus, announce, speech, autoSpeak }) {
  const temporaryTabs = new Map();
  let focusTimer;
  let focusSpeech = false;
  function stopAutoSpeech() {
    clearTimeout(focusTimer);
    if (focusSpeech) speech.cancel();
    focusSpeech = false;
  }
  function readFocused(event) {
    stopAutoSpeech();
    if (!autoSpeak()) return;
    const element = event.target;
    if (!(element instanceof Element) || !isExposed(element, root)) return;
    const candidate = records().find(record => record.active && record.element === element)?.kind === 'candidate';
    if (getRole(element) !== 'button' && !candidate) return;
    // Give rapid Tab presses time to settle, then read the live name, never a draft.
    focusTimer = setTimeout(() => {
      if (!autoSpeak() || document.activeElement !== element || !isExposed(element, root)) return;
      const name = accessibleName(element);
      const context = controlContext(element, root, records());
      const text = [
        candidate ? '疑似可点击控件，按钮语义待确认' : name ? `${name}，按钮` : '未命名按钮',
        context.index >= 0 ? `第 ${context.index + 1} 个，共 ${context.total} 个检查对象` : '',
        context.heading || context.region, context.position, ...context.states,
      ].filter(Boolean).join('。') + '。';
      announce(text);
      focusSpeech = speech.speak(text);
    }, 180);
  }
  function restore(element) {
    if (!temporaryTabs.has(element)) return;
    const original = temporaryTabs.get(element);
    if (element.getAttribute('tabindex') === '-1') {
      if (original === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', original);
    }
    temporaryTabs.delete(element);
  }
  function describe(forceSpeech = false, prefix = '') {
    stopAutoSpeech();
    const record = records().find(record => record.active && record.element === document.activeElement) || selected();
    if (!record?.active) { announce('当前没有可定位的对象，请先扫描或选择另一个。'); return; }
    const name = record.kind === 'candidate' ? '疑似可点击控件，尚未确认按钮语义' : record.name || '名称缺失的按钮';
    const text = `${prefix}${name}。${controlContext(record.element, root, records()).text}按 Alt、Shift 和 U 返回确认面板。`;
    announce(text);
    if (forceSpeech || autoSpeak()) focusSpeech = speech.speak(text) && document.activeElement === record.element;
  }
  function locate() {
    const record = selected() || records().find(record => record.active && record.kind === 'button' && !record.element.disabled);
    if (!record?.active) return;
    const element = record.element;
    if (element.disabled) { openPanel(); describe(false, '此控件已禁用，焦点保留在工具中。'); return; }
    beforeFocus();
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
      temporaryTabs.set(element, null);
      element.setAttribute('tabindex', '-1');
      element.addEventListener('blur', () => restore(element), { once: true });
    }
    element.focus({ preventScroll: true });
    describe(false, document.activeElement === element ? '焦点已到达，尚未激活。' : '页面阻止了焦点转移，请返回面板。');
  }
  function move(direction, focusTarget = false) {
    const all = records().filter(record => record.active && (record.hadIssue || record.kind === 'candidate' || record.conflict));
    const available = all.filter(record => !record.deferred);
    if (!available.length) { openPanel(); announce(all.length ? '其余项目都已暂时跳过，仍保留为待确认。可从列表重新选择。' : '当前没有待查看的问题。'); return; }
    const index = available.findIndex(record => record.id === selected()?.id);
    const next = available[(index < 0 ? direction > 0 ? 0 : available.length - 1 : index + direction + available.length) % available.length];
    select(next);
    if (focusTarget) locate();
    else { openPanel(); describe(); }
  }
  function back() { openPanel(); describe(false, '已返回确认面板。'); }
  function keydown(event) {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const actions = { ArrowRight: () => move(1, true), ArrowLeft: () => move(-1, true), Enter: locate, KeyU: back, KeyI: () => describe(true) };
    const action = actions[event.code];
    if (!action) return;
    event.preventDefault(); event.stopPropagation(); action();
  }
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('focusin', readFocused, true);
  document.addEventListener('focusout', stopAutoSpeech, true);
  window.addEventListener('blur', stopAutoSpeech);
  function dispose() {
    stopAutoSpeech();
    document.removeEventListener('keydown', keydown, true);
    document.removeEventListener('focusin', readFocused, true);
    document.removeEventListener('focusout', stopAutoSpeech, true);
    window.removeEventListener('blur', stopAutoSpeech);
    for (const element of temporaryTabs.keys()) restore(element);
  }
  return { describe, locate, move, back, dispose, stopAutoSpeech };
}
