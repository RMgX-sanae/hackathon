import { createAudit } from '../src/audit.js';
import { accessibleName, htmlSnapshot, proposedHTML } from '../src/scanner.js';
import { createSpeech } from '../src/speech.js';
import { icon, mountIcons } from '../src/icons.js';
import { suggestPageLabel } from './suggestions.js';
import { controlContext, createNavigator } from '../src/orientation.js';
import { createHeartPresets, bindHeartPreset, heartPresetMarkup } from '../src/presets.js';
import presetCss from '../src/presets.css?inline';
import css from './panel.css?inline';

export function launch(options = {}) {
  if (globalThis.__buttonvoiceExtension) globalThis.__buttonvoiceExtension.open();
  else globalThis.__buttonvoiceExtension = createPanel(options);
  return globalThis.__buttonvoiceExtension;
}

function createPanel({ root = document.documentElement, scopeLabel = '仅检查当前主页面', autoSpeak = false } = {}) {
  const host = document.createElement('buttonvoice-panel');
  host.id = 'buttonvoice-extension-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css + presetCss);
  shadow.adoptedStyleSheets = [sheet];
  shadow.innerHTML = `
    <p id="navigator-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
    <div id="outline" class="outline" aria-hidden="true" hidden></div>
    <button id="resume" class="resume" hidden><span data-icon="AudioLines"></span>返回 ButtonVoice</button>
    <section id="panel" class="panel" role="region" aria-labelledby="bv-title">
      <header class="header"><span class="mark" data-icon="AudioLines"></span><div><h1 id="bv-title">ButtonVoice</h1><p>当前网页的按钮名称检查</p></div><button id="minimize" class="icon-button" aria-label="收起检查面板" title="收起检查面板"><span data-icon="ArrowRight"></span></button></header>
      <div class="scope"><span data-icon="PanelsTopLeft"></span><span id="page-title"></span><span class="local">本地</span></div>
      <div class="body">
        <div class="scan-row"><button id="scan" class="primary"><span data-icon="ScanLine"></span>重新检查</button><span id="scope-note">仅检查当前主页面</span></div>
        <div class="guide" aria-label="键盘与语音引导"><div class="guide-actions"><button id="guide-prev" class="secondary" aria-keyshortcuts="Alt+Shift+ArrowLeft">上一个问题</button><button id="guide-next" class="secondary" aria-keyshortcuts="Alt+Shift+ArrowRight">下一个问题</button></div><button id="guide-describe" class="quiet" aria-keyshortcuts="Alt+Shift+I">朗读位置与上下文</button><label class="check-row"><input id="guide-autospeak" type="checkbox">Tab 聚焦与切换时自动朗读</label><button id="guide-browse" class="secondary">进入网页，按 Tab 浏览</button><details><summary>无需鼠标的操作方法</summary><p class="help">Tab 前进，Shift+Tab 后退。焦点落在网页按钮时，朗读当前名称、顺序和位置。Alt + Shift + 左右方向键：切换并聚焦问题对象。Alt + Shift + Enter：定位当前对象。Alt + Shift + U：返回确认面板。Alt + Shift + I：朗读位置。使用读屏软件时可关闭自动朗读。</p></details></div>
        <div class="metrics" aria-label="检查结果"><div><span>发现按钮</span><strong id="total">0</strong></div><div><span>名称缺失</span><strong id="missing" class="error">0</strong></div><div><span>有效修复</span><strong id="fixed" class="success">0</strong></div></div>
        <p id="summary" class="help"></p>
        ${heartPresetMarkup}
        <div id="issues" class="issues" role="group" aria-label="选择按钮问题"></div>
        <div id="empty" class="empty" hidden><span data-icon="CircleCheck"></span><h2>当前未发现名称缺失</h2><p>这次只检查了按钮的名称。其他无障碍要求仍需单独验证。</p></div>
        <section id="detail" class="detail" hidden aria-labelledby="issue-title">
          <div class="detail-title"><h2 id="issue-title"></h2><button id="locate" class="quiet" aria-keyshortcuts="Alt+Shift+Enter"><span data-icon="LocateFixed"></span>聚焦此对象</button></div>
          <p id="element" class="mono help"></p>
          <p id="context" class="context" tabindex="-1"></p>
          <p id="candidate-warning" class="warning" hidden>发现可能可点击的元素，但网页没有提供按钮语义。可定位或暂时跳过；需要网站维护者确认角色与键盘操作，不能仅补名称就算修复。</p>
          <p id="evidence" class="help"></p>
          <div id="candidate-options" hidden><label for="candidate-choice">选择一条线索作为草稿</label><select id="candidate-choice"></select></div>
          <div class="actual"><span>实际名称</span><strong id="actual"></strong></div>
          <p id="conflict" class="warning" hidden></p>
          <div class="label-row"><label for="label">确认按钮名称</label><span id="source" class="help"></span></div>
          <input id="label" type="text" maxlength="200" autocomplete="off" aria-describedby="reason input-error draft-note">
          <p id="reason" class="help"></p><p id="input-error" class="error" hidden></p>
          <label id="confirmation" class="check-row" hidden><input id="confirmed" type="checkbox" aria-describedby="input-error">我已了解当前用途，确认这个名称准确</label>
          <div class="edit-actions"><button id="apply" class="primary"><span data-icon="Check"></span>应用并复查</button><button id="undo" class="quiet"><span data-icon="RotateCcw"></span>撤销此项</button><button id="defer" class="quiet">暂时跳过</button></div>
          <p id="draft-note" class="help"></p>
          <div class="speech-title"><span data-icon="Volume2"></span><h3>听见名称的变化</h3></div>
          <div class="speech-grid"><div><p id="before-text"></p><button id="speak-before" class="secondary"><span data-icon="Play"></span>朗读修复前</button></div><div><p id="after-text"></p><button id="speak-after" class="secondary"><span data-icon="Play"></span><span id="after-caption">试听建议</span></button></div></div>
          <p id="voice" class="help" role="status"></p><p class="help">模拟名称朗读，不代表真实屏幕阅读器测试。</p>
          <details id="code"><summary>查看 HTML 前后变化</summary><p class="help">首次发现时</p><pre tabindex="0"><code id="before-html"></code></pre><p id="after-html-title" class="help"></p><pre tabindex="0"><code id="after-html"></code></pre><button id="copy" class="quiet"><span data-icon="Copy"></span>复制修复片段</button><textarea id="copy-fallback" aria-label="手动复制修复片段" readonly hidden></textarea></details>
        </section>
        <p id="status" class="status"></p>
      </div>
      <footer><p>修改仅在本页生效，刷新后恢复。</p><div><button id="undo-all" class="quiet">撤销本轮修改</button><button id="finish" class="quiet">撤销并退出</button></div></footer>
    </section>`;
  const $ = id => shadow.getElementById(id);
  $('scope-note').textContent = scopeLabel;
  $('guide-autospeak').checked = autoSpeak;
  mountIcons(shadow);
  const presets = createHeartPresets(suggestPageLabel);
  const audit = createAudit(root, presets.suggest, { includeCandidates: true });
  const stateAtRepair = new Map();
  let selectedId = null;
  let refreshTimer = null;
  let disposed = false;
  let epoch = 0;
  const speech = createSpeech(text => { if (!disposed) $('voice').textContent = text; });
  const announce = text => {
    $('status').textContent = text;
    $('navigator-status').textContent = '';
    requestAnimationFrame(() => { if (!disposed) $('navigator-status').textContent = text; });
  };
  const selected = () => audit.summary().records.find(record => record.id === selectedId);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  const spoken = name => name ? `${name}，按钮` : '按钮';
  const stateKey = element => JSON.stringify([
    element.getAttribute('aria-pressed'), element.getAttribute('aria-expanded'),
    element.closest('[data-demo-page]') && element.classList.contains('bv-is-active'),
  ]);

  function renderDetail() {
    const record = selected();
    $('detail').hidden = !record;
    if (!record) return;
    const pending = record.active && record.missing && !record.repair;
    const draft = record.draft.trim();
    $('issue-title').textContent = record.kind === 'candidate' ? '疑似可点击控件' : record.suggestion.title;
    const context = controlContext(record.element, root, audit.summary().records);
    $('context').textContent = context.text;
    $('candidate-warning').hidden = record.kind !== 'candidate';
    $('evidence').textContent = context.evidence.length ? `命名线索：${context.evidence.map(item => `${item.source}「${item.label}」`).join('；')}。上下文用于判断，不会自动变成名称。` : '没有可靠的命名文本。位置和关联标题只提供上下文，不等于按钮用途。';
    $('candidate-options').hidden = context.evidence.length < 2 || !record.missing;
    $('candidate-choice').innerHTML = '<option value="">请选择，尚未确认</option>' + context.evidence.map(item => `<option value="${esc(item.label)}">${esc(item.source)}：${esc(item.label)}</option>`).join('');
    $('candidate-choice').value = context.evidence.some(item => item.label === record.draft) ? record.draft : '';
    $('confirmation').hidden = !record.suggestion.requiresConfirmation || record.kind === 'candidate' || !record.missing;
    $('confirmed').checked = record.confirmed;
    $('label').disabled = record.kind === 'candidate';
    $('defer').disabled = !record.active || record.fixed;
    $('element').textContent = `<${record.element.tagName.toLowerCase()}>${record.element.id ? ` #${record.element.id}` : ''}`;
    $('actual').textContent = record.active ? record.name || '空名称' : '目标已移除或隐藏';
    $('actual').className = record.fixed ? 'success' : record.missing ? 'error' : '';
    $('conflict').hidden = !record.conflict;
    $('conflict').textContent = record.conflict;
    $('source').textContent = record.suggestion.source;
    if (shadow.activeElement !== $('label')) $('label').value = record.draft;
    $('reason').textContent = record.suggestion.reason;
    $('apply').disabled = !record.active || !record.missing;
    $('undo').disabled = !record.repair;
    $('locate').disabled = !record.active;
    $('draft-note').textContent = record.fixed ? '已写入网页并复查。如需改名，请先撤销此项。'
      : record.repair ? '存在本轮修改。请核对当前名称，必要时撤销后重新确认。'
        : !record.active ? '此按钮已不在当前检查范围内。'
          : record.missing ? '输入与试听只改变草稿，点击应用后才修改网页。' : '网页已有名称，已停止应用，避免覆盖。';
    $('before-text').textContent = `“${spoken(record.before.name)}”`;
    $('after-text').textContent = pending ? draft ? `“${spoken(draft)}”` : '填写名称后可试听' : `“${spoken(record.name)}”`;
    $('after-text').className = record.fixed ? 'success' : '';
    $('after-caption').textContent = record.fixed ? '朗读修复后' : pending ? '试听建议' : '朗读当前名称';
    $('speak-after').disabled = !record.active || (pending && !draft);
    $('before-html').textContent = record.before.html;
    $('after-html-title').textContent = pending ? '待应用预览，尚未写入网页' : '当前真实 HTML';
    $('after-html').textContent = !record.active ? '目标已移除或隐藏。' : pending
      ? draft ? proposedHTML(record.element, draft) : '请先填写名称。' : htmlSnapshot(record.element);
    $('copy').disabled = !record.active || (pending && !draft);
  }

  function render() {
    const state = audit.summary();
    presetUI.refresh();
    if (!state.issues.some(record => record.id === selectedId)) selectedId = state.issues[0]?.id || null;
    $('page-title').textContent = document.title || location.hostname || '本地页面';
    $('total').textContent = state.total;
    $('missing').textContent = state.missing;
    $('fixed').textContent = state.fixed;
    $('summary').textContent = `${state.pending} 项待处理。${state.candidates ? `另列出 ${state.candidates} 个疑似可点击控件，未计入按钮总数。` : ''}可用键盘切换并朗读上下文。`;
    const focusedId = shadow.activeElement?.closest('[data-issue]')?.dataset.issue;
    $('issues').innerHTML = state.issues.map(record => {
      const status = !record.active ? '当前未参与' : record.fixed ? '已修复' : record.deferred ? '已跳过，仍待确认' : record.kind === 'candidate' ? '语义待确认' : record.conflict ? '待核对' : record.missing ? '名称缺失' : '网页已有名称';
      return `<button class="issue" data-issue="${record.id}" aria-pressed="${record.id === selectedId}"><span class="${record.fixed ? 'success' : 'error'}">${icon(record.fixed ? 'CircleCheck' : 'CircleAlert')}</span><span><strong>${esc(record.kind === 'candidate' ? '疑似可点击控件' : record.suggestion.title)}</strong><small>${esc(record.element.tagName.toLowerCase())} · ${status}</small></span><span class="number">${record.id.replace('button-', '#')}</span></button>`;
    }).join('');
    if (focusedId) $('issues').querySelector(`[data-issue="${focusedId}"]`)?.focus({ preventScroll: true });
    $('empty').hidden = state.issues.length > 0;
    $('undo-all').disabled = !state.records.some(record => record.repair);
    renderDetail();
    positionOutline();
  }

  function refresh() {
    if (disposed) return;
    for (const record of audit.summary().records) {
      if (!record.repair || !record.element.isConnected) continue;
      const key = stateKey(record.element);
      if (stateAtRepair.get(record.element) === key) continue;
      const suggestion = presets.suggest(record.element);
      if ((suggestion.source === '示例页面规则' || (suggestion.syncState && record.repair.syncGroup === suggestion.syncGroup)) && suggestion.state !== record.draftState) audit.syncBusinessState(record.element);
      else {
        record.repair.verified = false;
        record.conflict = '按钮状态已变化，原名称需要重新确认。请撤销此项，再核对当前用途。';
      }
      stateAtRepair.set(record.element, key);
    }
    audit.review();
    render();
  }
  function scheduleRefresh() {
    if (disposed || refreshTimer !== null) return;
    refreshTimer = setTimeout(() => { refreshTimer = null; refresh(); }, 250);
  }
  function positionOutline() {
    const record = selected();
    $('outline').hidden = !record?.active;
    if (!record?.active) return;
    const bounds = record.element.getBoundingClientRect();
    Object.assign($('outline').style, { left: `${bounds.left - 4}px`, top: `${bounds.top - 4}px`, width: `${bounds.width + 8}px`, height: `${bounds.height + 8}px`, borderColor: record.fixed ? '#16804c' : '#db4262' });
  }
  function clearError() { $('input-error').hidden = true; $('label').removeAttribute('aria-invalid'); $('confirmed').removeAttribute('aria-invalid'); }
  function minimize() { speech.cancel(); $('panel').hidden = true; $('resume').hidden = false; }
  function open() {
    if (!host.isConnected) document.documentElement.append(host);
    $('panel').hidden = false;
    $('resume').hidden = true;
    refresh();
    $('scan').focus({ preventScroll: true });
  }
  const guide = createNavigator({
    root, records: () => audit.summary().records, selected,
    select: record => { selectedId = record.id; clearError(); render(); },
    openPanel: () => { open(); (selected()?.kind === 'candidate' ? $('context') : $('label')).focus(); },
    beforeFocus: minimize, announce, speech, autoSpeak: () => $('guide-autospeak').checked,
  });
  const presetUI = bindHeartPreset({ get: $, audit, presets, render, announce,
    onApplied: record => { if (record.repair) stateAtRepair.set(record.element, stateKey(record.element)); },
  });
  $('guide-prev').addEventListener('click', () => guide.move(-1));
  $('guide-next').addEventListener('click', () => guide.move(1));
  $('guide-describe').addEventListener('click', () => guide.describe(true));
  $('guide-autospeak').addEventListener('change', () => { if ($('guide-autospeak').checked) guide.describe(true); else { guide.stopAutoSpeech(); speech.cancel(); } });
  $('guide-browse').addEventListener('click', () => { $('guide-autospeak').checked = true; guide.locate(); positionOutline(); });
  $('confirmed').addEventListener('change', () => { const record = selected(); if (record) record.confirmed = $('confirmed').checked; clearError(); });
  $('candidate-choice').addEventListener('change', () => {
    const record = selected();
    if (!record || !$('candidate-choice').value) return;
    record.draft = $('candidate-choice').value; record.edited = true; record.confirmed = false;
    $('label').value = record.draft; clearError(); renderDetail();
  });
  $('defer').addEventListener('click', () => {
    const record = selected();
    if (!record) return;
    record.deferred = true; record.confirmed = false;
    guide.move(1); render();
    announce('已暂时跳过，仍保留为待确认，不计入修复。可从列表重新选择。');
  });

  $('scan').addEventListener('click', () => {
    clearError(); refresh();
    const { total, missing, fixed } = audit.summary();
    announce(`检查完成：${total} 个按钮，${missing} 个名称缺失，${fixed} 项本轮修复仍有效。`);
  });
  $('issues').addEventListener('click', event => {
    const item = event.target.closest('[data-issue]');
    if (!item) return;
    speech.cancel(); clearError();
    selectedId = item.dataset.issue;
    $('copy-fallback').hidden = true;
    render();
    $('detail').scrollIntoView({ block: 'start', behavior: 'instant' });
    guide.describe();
  });
  $('locate').addEventListener('click', () => { guide.locate(); positionOutline(); });
  $('label').addEventListener('input', () => {
    const record = selected();
    if (!record) return;
    record.draft = $('label').value;
    record.edited = true;
    record.confirmed = false;
    clearError(); renderDetail();
  });
  $('apply').addEventListener('click', () => {
    const record = selected();
    const result = audit.apply(record, $('label').value);
    if (record?.repair) stateAtRepair.set(record.element, stateKey(record.element));
    if (result.status === 'invalid') {
      $('input-error').textContent = result.message;
      $('input-error').hidden = false;
      const invalidField = result.code === 'confirmation-required' ? $('confirmed') : $('label');
      invalidField.setAttribute('aria-invalid', 'true');
      invalidField.focus();
    } else { clearError(); refresh(); if (result.status === 'fixed') $('speak-after').focus(); }
    announce(result.message);
  });
  $('undo').addEventListener('click', () => {
    const record = selected();
    const result = audit.undo(record);
    if (result.status === 'undone') stateAtRepair.delete(record.element);
    clearError(); render(); announce(result.message);
    (selected()?.missing ? $('label') : $('context')).focus();
  });
  $('undo-all').addEventListener('click', () => {
    const { undone, skipped } = audit.undoAll();
    for (const record of audit.summary().records) {
      if (!record.repair) stateAtRepair.delete(record.element);
    }
    render();
    announce(`已撤销 ${undone} 项。${skipped ? `${skipped} 项已被网页再次修改，保留网页的新值。` : '恢复应用前的命名属性。'}`);
  });
  $('speak-before').addEventListener('click', () => {
    const record = selected();
    if (record) speech.speak(spoken(record.before.name));
  });
  $('speak-after').addEventListener('click', () => {
    refresh();
    const record = selected();
    if (!record?.active) return;
    speech.speak(spoken(record.repair || !record.missing ? accessibleName(record.element) : record.draft.trim()));
  });
  $('copy').addEventListener('click', async () => {
    const record = selected();
    if (!record?.active) return;
    const token = epoch;
    const text = record.repair || !record.missing ? htmlSnapshot(record.element) : proposedHTML(record.element, record.draft);
    try {
      await navigator.clipboard.writeText(text);
      if (!disposed && token === epoch && selectedId === record.id) announce('已复制代码。复制不会修改网站服务器上的文件。');
    } catch {
      if (disposed || token !== epoch || selectedId !== record.id) return;
      $('copy-fallback').value = text;
      $('copy-fallback').hidden = false;
      $('copy-fallback').focus(); $('copy-fallback').select();
      announce('当前页面无法自动复制。已选中代码，请按 Command+C 或 Ctrl+C。');
    }
  });
  $('minimize').addEventListener('click', () => { minimize(); $('resume').focus(); });
  $('resume').addEventListener('click', open);
  function dispose() {
    if (disposed) return;
    audit.undoAll();
    disposed = true; epoch++;
    speech.dispose(); guide.dispose(); observer.disconnect();
    clearTimeout(refreshTimer);
    document.removeEventListener('scroll', positionOutline, true);
    window.removeEventListener('resize', scheduleRefresh);
    host.remove();
    delete globalThis.__buttonvoiceExtension;
  }
  $('finish').addEventListener('click', dispose);
  host.addEventListener('click', event => event.stopPropagation());
  host.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { minimize(); $('resume').focus(); }
  });
  const observer = new MutationObserver(scheduleRefresh);
  document.documentElement.append(host);
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['aria-label','aria-labelledby','aria-describedby','aria-controls','aria-hidden','aria-pressed','aria-expanded','role','hidden','inert','class','style','type','value','title','alt','id','tabindex','onclick','data-buttonvoice-label','data-tooltip','data-original-title'],
  });
  document.addEventListener('scroll', positionOutline, { capture: true, passive: true });
  window.addEventListener('resize', scheduleRefresh);
  open();
  return { open, dispose, get autoSpeak() { return $('guide-autospeak').checked; } };
}
