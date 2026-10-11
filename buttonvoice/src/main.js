import './styles.css';
import { createAudit } from './audit.js';
import { createScenes } from './scenes.js';
import { createSpeech } from './speech.js';
import { accessibleName, htmlSnapshot, proposedHTML } from './scanner.js';
import { icon, mountIcons } from './icons.js';
import { controlContext, createNavigator } from './orientation.js';
import { suggestLabel } from './suggestions.js';
import { createHeartPresets, bindHeartPreset, heartPresetMarkup } from './presets.js';
import './presets.css';

const $ = id => document.getElementById(id);
const preview = $('preview');
const presets = createHeartPresets(suggestLabel);
const audit = createAudit(preview, presets.suggest, { includeCandidates: true });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selectedId = null;
let epoch = 0;
let reviewQueued = false;
const animations = new Set();
const announce = text => {
  $('announcement').textContent = '';
  requestAnimationFrame(() => { $('announcement').textContent = text; });
};
const speech = createSpeech(text => { $('voice-status').textContent = text; });
const demo = createScenes(preview, element => {
  audit.syncBusinessState(element);
  if (audit.summary().scanned) refresh();
});
mountIcons();

const selected = () => audit.summary().records.find(record => record.id === selectedId);
const escaped = text => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const spoken = name => name ? `${name}，按钮` : '按钮';

function animateFeedback(element, event) {
  if (reducedMotion.matches || !event?.detail) return;
  const animation = element.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
  animations.add(animation);
  animation.onfinish = () => animations.delete(animation);
}

function renderCodesAndSpeech(record) {
  const draft = $('suggested-name').value.trim();
  const actualHTML = record.active ? htmlSnapshot(record.element) : '目标当前不在扫描范围内。';
  const hasApplied = Boolean(record.repair);
  const pending = !record.fixed && record.missing && !hasApplied;
  $('before-html').textContent = record.before.html;
  $('after-html-label').textContent = pending ? '待应用的修改预览，尚未写入' : '当前真实 DOM';
  $('after-html').textContent = pending
    ? draft ? proposedHTML(record.element, draft) : '请先确认用途并填写名称。'
    : actualHTML;
  $('speech-before').textContent = `“${spoken(record.before.name)}”`;
  let afterName = record.name;
  if (record.missing && !hasApplied) afterName = draft;
  $('speech-after').textContent = afterName || hasApplied ? `“${spoken(afterName)}”` : '填写建议后可试听';
  $('speech-after').classList.toggle('verified', record.fixed);
  $('speak-after-label').textContent = record.fixed ? '朗读修复后' : hasApplied || !record.missing ? '朗读当前名称' : '试听建议效果';
  $('speak-after').disabled = !record.active || (!hasApplied && record.missing && !draft);
  $('draft-status').textContent = record.fixed ? '已应用到真实 DOM，并重新计算确认。'
    : !record.active ? '目标已移除或隐藏，本次不参与名称检测。'
      : !record.missing ? '当前已有名称，应用修复会跳过，避免覆盖。'
        : hasApplied ? '已写入 aria-label，但复查未通过。请检查冲突信息。'
          : record.edited ? '你已编辑建议，尚未应用到网页。点击“应用修复”确认。' : '尚未应用。确认名称后，再修改网页。';
  $('apply').disabled = !record.active || !record.missing;
  $('copy').disabled = !record.active || (pending && !draft);
}

function renderDetail(record) {
  $('detail').hidden = !record;
  if (!record) return;
  $('element-type').textContent = record.element.tagName === 'INPUT'
    ? `<input type="${record.element.type}">` : record.element.tagName === 'BUTTON' ? '<button>' : `<${record.element.tagName.toLowerCase()} role="button">`;
  $('detail-title').textContent = record.kind === 'candidate' ? '疑似可点击控件' : record.suggestion.title;
  const context = controlContext(record.element, preview, audit.summary().records);
  $('context').textContent = context.text;
  $('candidate-warning').hidden = record.kind !== 'candidate';
  $('evidence').textContent = context.evidence.length ? `命名线索：${context.evidence.map(item => `${item.source}「${item.label}」`).join('；')}。上下文不会自动作为名称。` : '没有额外命名文本。位置和关联标题只提供上下文，不等于按钮用途。';
  $('candidate-options').hidden = context.evidence.length < 2 || !record.missing;
  $('candidate-choice').innerHTML = '<option value="">请选择，尚未确认</option>' + context.evidence.map(item => `<option value="${escaped(item.label)}">${escaped(item.source)}：${escaped(item.label)}</option>`).join('');
  $('candidate-choice').value = context.evidence.some(item => item.label === record.draft) ? record.draft : '';
  $('confirmation').hidden = !record.suggestion.requiresConfirmation || record.kind === 'candidate' || !record.missing;
  $('confirmed').checked = record.confirmed;
  $('suggested-name').disabled = record.kind === 'candidate';
  $('defer').disabled = !record.active || record.fixed;
  $('undo').disabled = !record.repair;
  $('issue-description').textContent = record.fixed ? '本轮名称缺失已修复。其他无障碍要求仍需另外检查。'
    : !record.active ? '此元素目前不向辅助技术暴露，已从本次计数中排除。'
      : record.missing ? '缺少可访问名称。辅助技术可能只读出“按钮”，无法说明用途。'
        : '未发现名称缺失。非空名称并不代表其他无障碍要求已通过。';
  $('current-name').textContent = record.active ? record.name || '空名称' : '未参与本次检测';
  $('current-name').className = record.missing ? 'name-empty' : 'name-present';
  if (document.activeElement !== $('suggested-name')) $('suggested-name').value = record.draft;
  $('suggestion-tag').textContent = record.repair?.verified ? '已应用并复查' : record.suggestion.requiresConfirmation ? '需确认用途' : '已登记的示例规则';
  $('suggestion-reason').textContent = record.suggestion.reason;
  $('repair-conflict').hidden = !record.conflict;
  $('repair-conflict').textContent = record.conflict;
  $('locate').disabled = !record.active;
  renderCodesAndSpeech(record);
}

function render() {
  const state = audit.summary();
  presetUI.refresh();
  $('total-count').textContent = state.scanned ? state.total : '未扫描';
  $('missing-count').textContent = state.scanned ? state.missing : '未扫描';
  $('fixed-count').textContent = state.scanned ? state.fixed : '未扫描';
  $('scan-label').textContent = state.scanned ? '重新扫描' : '开始无障碍扫描';
  $('empty-state').hidden = state.scanned;
  $('audit-content').hidden = !state.scanned;
  $('preview-hint').textContent = state.scanned ? '选中问题可定位对应按钮' : '扫描后显示问题位置';
  $('console-status').textContent = !state.scanned ? '等待扫描' : state.pending ? `${state.pending} 项待处理` : '未发现名称缺失';
  $('console-status').className = `status-tag ${state.scanned ? state.pending ? 'error' : 'success' : ''}`;
  if (!state.scanned) return;

  if (!state.issues.some(record => record.id === selectedId)) {
    selectedId = state.issues.find(record => record.element.dataset.action === 'favorite')?.id || state.issues[0]?.id || null;
  }
  const focusedIssue = document.activeElement?.closest('[data-record-id]')?.dataset.recordId;
  $('issues-list').classList.toggle('many-issues', state.issues.length > 4);
  $('issues-list').innerHTML = state.issues.map(record => {
    const status = !record.active ? '当前未参与' : record.fixed ? '已修复' : record.deferred ? '已跳过，仍待确认' : record.kind === 'candidate' ? '语义待确认' : record.conflict ? '待核对' : record.missing ? '名称缺失' : '已有名称';
    const tone = record.fixed ? 'fixed' : record.missing || record.conflict ? 'problem' : 'neutral';
    return `<button type="button" class="issue-item ${tone}" data-record-id="${record.id}" aria-pressed="${record.id === selectedId}"><span class="issue-icon">${icon(record.fixed ? 'CircleCheck' : 'CircleAlert')}</span><span class="issue-copy"><strong>${escaped(record.kind === 'candidate' ? '疑似可点击控件' : record.suggestion.title)}</strong><small>${status}</small></span><span class="issue-number">${record.id.replace('button-', '#')}</span></button>`;
  }).join('');
  if (focusedIssue) $('issues-list').querySelector(`[data-record-id="${focusedIssue}"]`)?.focus({ preventScroll: true });
  $('issues-title').textContent = state.issues.length ? '本轮问题与修复记录' : '名称检测结果';
  $('scan-summary').textContent = `${state.total} 个按钮中，${state.total - state.missing} 个未发现名称缺失。${state.candidates ? `另有 ${state.candidates} 个疑似可点击控件待确认，未计入按钮总数。` : ''}${state.conflicts ? `另有 ${state.conflicts} 项命名变化或冲突待核对。` : ''}`;
  $('fix-all').disabled = !state.records.some(record => record.active && record.missing && record.suggestion.label && !record.edited && !record.suggestion.requiresConfirmation && !record.deferred);
  for (const record of state.records) {
    record.element.classList.toggle('bv-issue', record.active && (record.missing || Boolean(record.conflict)));
    record.element.classList.toggle('bv-repaired', record.active && record.fixed);
    record.element.classList.toggle('bv-selected', record.active && record.id === selectedId);
  }
  renderDetail(selected());
}

function refresh() { audit.review(); render(); }
function clearInputError() { $('input-error').hidden = true; $('suggested-name').removeAttribute('aria-invalid'); $('confirmed').removeAttribute('aria-invalid'); }
const guide = createNavigator({
  root: preview, records: () => audit.summary().records, selected,
  select: record => { selectedId = record.id; clearInputError(); render(); },
  openPanel: () => { (selected()?.kind === 'candidate' ? $('context') : $('suggested-name')).focus(); },
  beforeFocus: () => {}, announce, speech, autoSpeak: () => $('guide-autospeak').checked,
});
$('heart-presets').innerHTML = heartPresetMarkup;
const presetUI = bindHeartPreset({ get: $, audit, presets, render, announce });
$('guide-prev').addEventListener('click', () => guide.move(-1));
$('guide-next').addEventListener('click', () => guide.move(1));
$('guide-describe').addEventListener('click', () => guide.describe(true));
$('guide-autospeak').addEventListener('change', () => { if ($('guide-autospeak').checked) guide.describe(true); else { guide.stopAutoSpeech(); speech.cancel(); } });
$('guide-browse').addEventListener('click', () => { $('guide-autospeak').checked = true; guide.locate(); });
$('confirmed').addEventListener('change', () => { const record = selected(); if (record) record.confirmed = $('confirmed').checked; clearInputError(); });
$('candidate-choice').addEventListener('change', () => {
  const record = selected();
  if (!record || !$('candidate-choice').value) return;
  record.draft = $('candidate-choice').value; record.edited = true; record.confirmed = false;
  $('suggested-name').value = record.draft; clearInputError(); renderDetail(record);
});
$('defer').addEventListener('click', () => {
  const record = selected();
  if (!record) return;
  record.deferred = true; record.confirmed = false;
  guide.move(1); render();
  announce('已暂时跳过，仍保留为待确认，不计入修复。可从列表重新选择。');
});
$('undo').addEventListener('click', () => {
  const result = audit.undo(selected());
  clearInputError(); render(); announce(result.message);
  (selected()?.missing ? $('suggested-name') : $('context')).focus();
});

$('scan').addEventListener('click', event => {
  clearInputError();
  refresh();
  const state = audit.summary();
  announce(`扫描完成：${state.total} 个按钮，${state.missing} 个名称缺失，${state.fixed} 个本轮修复仍有效。${state.conflicts ? `另有 ${state.conflicts} 项待核对。` : ''}`);
  animateFeedback(preview, event);
});
$('issues-list').addEventListener('click', event => {
  const button = event.target.closest('[data-record-id]');
  if (!button) return;
  speech.cancel();
  selectedId = button.dataset.recordId;
  clearInputError();
  $('copy-fallback').hidden = true;
  render();
  guide.describe();
});
$('locate').addEventListener('click', guide.locate);
$('suggested-name').addEventListener('input', () => {
  const record = selected();
  if (!record) return;
  record.draft = $('suggested-name').value;
  record.edited = true;
  record.confirmed = false;
  clearInputError();
  $('confirmed').checked = false;
  renderCodesAndSpeech(record);
  $('fix-all').disabled = !audit.summary().records.some(item => item.active && item.missing && item.suggestion.label && !item.edited && !item.suggestion.requiresConfirmation && !item.deferred);
});
$('apply').addEventListener('click', event => {
  const record = selected();
  const result = audit.apply(record, $('suggested-name').value);
  if (result.status === 'invalid') {
    $('input-error').textContent = result.message;
    $('input-error').hidden = false;
    const invalidField = result.code === 'confirmation-required' ? $('confirmed') : $('suggested-name');
    invalidField.setAttribute('aria-invalid', 'true');
    invalidField.focus();
  } else {
    clearInputError();
    refresh();
    if (result.status === 'fixed') { animateFeedback(record.element, event); $('speak-after').focus(); }
  }
  announce(result.message);
});
$('fix-all').addEventListener('click', event => {
  clearInputError();
  const state = audit.applyAll();
  render();
  announce(`本次应用并验证 ${state.applied} 项。${state.pending ? `仍有 ${state.pending} 项待处理或人工确认。` : '当前未发现按钮名称缺失。'}本轮有效修复 ${state.fixed} 项。`);
  animateFeedback(preview, event);
});
$('copy').addEventListener('click', async () => {
  const record = selected();
  if (!record) return;
  const token = epoch;
  const recordId = record.id;
  const text = record.repair || !record.missing ? htmlSnapshot(record.element) : proposedHTML(record.element, $('suggested-name').value);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
    await navigator.clipboard.writeText(text);
    if (token !== epoch || selectedId !== recordId) return;
    announce(record.repair || !record.missing ? '已复制当前真实 HTML。' : '已复制待应用的 HTML 预览，网页尚未修改。');
  } catch {
    if (token !== epoch || selectedId !== recordId) return;
    $('copy-fallback').value = text;
    $('copy-fallback').hidden = false;
    $('copy-fallback').focus();
    $('copy-fallback').select();
    announce('浏览器未允许自动复制，已选中代码。请按 Command+C 或 Ctrl+C 复制。');
  }
});
$('speak-before').addEventListener('click', () => {
  const record = selected();
  if (record) speech.speak(spoken(record.before.name));
});
$('speak-after').addEventListener('click', () => {
  refresh();
  const record = selected();
  if (!record?.active) return;
  const name = record.repair || !record.missing ? accessibleName(record.element) : $('suggested-name').value.trim();
  speech.speak(spoken(name));
});
function resetScene(scene) {
  guide.stopAutoSpeech();
  epoch++;
  reviewQueued = false;
  speech.cancel();
  for (const animation of animations) animation.cancel();
  animations.clear();
  observer.disconnect();
  audit.reset();
  presetUI.reset();
  demo.reset(scene);
  selectedId = null;
  $('issues-list').replaceChildren();
  $('detail').hidden = true;
  $('copy-fallback').hidden = true;
  $('code-details').open = false;
  clearInputError();
  render();
  observer.observe(preview, observationOptions);
  speech.refresh();
  announce('已恢复当前示例的原始命名与交互状态，扫描记录和语音队列已清空。');
}
$('reset').addEventListener('click', () => resetScene());
$('scene-select').addEventListener('change', () => {
  resetScene($('scene-select').value);
  announce('已切换示例。点击“开始无障碍扫描”，检测当前实际显示的按钮。');
});

// Keep counts truthful when the live preview changes, without observing the tool UI.
const observationOptions = {
  subtree: true, childList: true, characterData: true, attributes: true,
  attributeFilter: ['aria-label', 'aria-labelledby', 'aria-hidden', 'aria-pressed', 'aria-expanded',
    'hidden', 'inert', 'role', 'type', 'value', 'alt', 'title', 'style', 'id', 'data-action',
    'aria-describedby', 'aria-controls', 'tabindex', 'onclick', 'data-buttonvoice-label', 'data-tooltip', 'data-original-title'],
};
const observer = new MutationObserver(() => {
  if (!audit.summary().scanned || reviewQueued) return;
  const token = epoch;
  reviewQueued = true;
  queueMicrotask(() => {
    if (token !== epoch) return;
    reviewQueued = false;
    refresh();
  });
});
observer.observe(preview, observationOptions);
window.addEventListener('pagehide', () => speech.cancel());
render();
