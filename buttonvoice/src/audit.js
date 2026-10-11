import { accessibleName, scanButtons, scanCandidates, htmlSnapshot, isExposed } from './scanner.js';
import { suggestLabel } from './suggestions.js';

const normalize = value => value.trim().replace(/\s+/g, ' ');

export function createAudit(root, suggest = suggestLabel, { includeCandidates = false } = {}) {
  const records = new Map();
  let scanned = false;

  function review() {
    scanned = true;
    const results = [...scanButtons(root), ...(includeCandidates ? scanCandidates(root) : [])]
      .sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const active = new Set(results.map(result => result.element));
    for (const result of results) {
      const { element, name, missing } = result;
      let record = records.get(element);
      const suggestion = suggest(element);
      if (!record) {
        record = {
          id: `button-${records.size + 1}`, element,
          before: Object.freeze({
            name, html: htmlSnapshot(element),
            attributes: Object.freeze(Object.fromEntries([...element.attributes].map(a => [a.name, a.value]))),
          }),
          hadIssue: missing || result.kind === 'candidate', repair: null, conflict: '', message: '',
          confirmed: false, deferred: false,
          draft: suggestion.label, edited: false, draftState: suggestion.state,
        };
        records.set(element, record);
      }
      if (record.draftState !== suggestion.state && suggestion.syncState && record.repair?.syncGroup === suggestion.syncGroup) syncBusinessState(element);
      if (record.draftState !== suggestion.state) {
        if (record.repair && suggestion.requiresConfirmation) {
          record.repair.verified = false;
          record.conflict = '按钮状态或命名线索已变化，请撤销此项后重新确认当前用途。';
        }
        record.draft = suggestion.requiresConfirmation && record.edited ? record.draft : record.repair?.labels[suggestion.state] || suggestion.label;
        record.draftState = suggestion.state;
        record.confirmed = false;
        if (!suggestion.requiresConfirmation) record.edited = false;
      }
      record.kind = result.kind || 'button';
      record.name = name;
      record.missing = missing;
      record.active = true;
      record.hadIssue ||= missing;
      record.suggestion = suggestion;
      record.fixed = Boolean(record.repair?.verified && name === record.repair.expected);
      if (record.fixed) record.conflict = '';
      if (record.repair?.verified && !record.fixed) {
        record.conflict = missing
          ? '名称再次缺失，之前的修复已失效。'
          : '实际名称已变化，之前的修复不再计入。请核对当前命名来源。';
      }
    }
    for (const record of records.values()) {
      if (!active.has(record.element)) {
        record.active = false;
        record.fixed = false;
      }
    }
    return summary();
  }

  function summary() {
    const ordered = [...records.values()].sort((a, b) => {
      if (!a.active || !b.active) return Number(b.active) - Number(a.active);
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    const active = ordered.filter(record => record.active);
    const buttons = active.filter(record => record.kind === 'button');
    return {
      scanned, total: buttons.length,
      missing: buttons.filter(record => record.missing).length,
      fixed: buttons.filter(record => record.fixed).length,
      candidates: active.filter(record => record.kind === 'candidate').length,
      pending: active.filter(record => record.missing || record.conflict || record.kind === 'candidate').length,
      conflicts: active.filter(record => record.conflict).length,
      records: ordered,
      issues: ordered.filter(record => record.hadIssue || record.conflict),
    };
  }

  function apply(record, value, automatic = false) {
    if (!record || !isExposed(record.element, root)) {
      return { status: 'skipped', message: '目标已移除或当前不向辅助技术暴露，请重新扫描。' };
    }
    if (record.kind === 'candidate') return { status: 'skipped', message: '此控件尚无按钮语义。仅补名称不能解决键盘和角色问题，已保留待网站维护者确认。' };
    const current = accessibleName(record.element);
    if (current) {
      review();
      return { status: 'skipped', message: `当前已有名称「${current}」，已跳过，未覆盖。` };
    }
    const suggestion = suggest(record.element);
    if (record.draftState !== suggestion.state) {
      review();
      return { status: 'invalid', message: '页面状态或命名线索已变化，请重新核对后确认。' };
    }
    if (automatic && (!suggestion.label || record.edited || suggestion.requiresConfirmation)) {
      return { status: 'skipped', message: '此项需要人工确认，未自动应用。' };
    }
    const label = normalize(automatic ? suggestion.label : value);
    if (!label) return { status: 'invalid', message: '名称不能只包含空白，请填写按钮的实际用途。' };
    if (suggestion.requiresConfirmation && !record.confirmed) return { status: 'invalid', code: 'confirmation-required', message: '请先勾选确认当前用途和名称。不能确定时，可以暂时跳过。' };

    const originalLabel = record.repair?.originalLabel || {
      present: record.element.hasAttribute('aria-label'), value: record.element.getAttribute('aria-label'),
    };
    record.element.setAttribute('aria-label', label);
    const actual = accessibleName(record.element);
    const verified = actual === label;
    record.repair = {
      expected: label, verified,
      syncGroup: suggestion.syncGroup,
      originalLabel,
      labels: { ...record.repair?.labels, [suggestion.state]: label },
    };
    record.conflict = verified ? '' : actual
      ? `复查未通过：实际名称是「${actual}」，与应用值不同。aria-labelledby 等命名来源可能优先；请检查原 DOM，现有属性未被删除。`
      : '复查未通过：实际名称仍为空。请检查 aria-labelledby 等命名来源，现有属性未被删除。';
    record.draft = label;
    record.deferred = false;
    record.edited = false;
    record.draftState = suggestion.state;
    review();
    return {
      status: verified ? 'fixed' : 'conflict',
      message: verified ? `已写入真实 DOM，并复查名称为「${actual}」。` : record.conflict,
    };
  }

  function applyAll() {
    review();
    let applied = 0;
    let skipped = 0;
    for (const record of records.values()) {
      if (!record.active || !record.missing || record.deferred) continue;
      const result = apply(record, '', true);
      if (result.status === 'fixed') applied++;
      else skipped++;
    }
    return { applied, skipped, ...review() };
  }

  function syncBusinessState(element) {
    const record = records.get(element);
    if (!record?.repair?.verified) return;
    // Only keep a label we still own in sync; never overwrite a concurrent edit.
    if (accessibleName(element) !== record.repair.expected ||
        element.getAttribute('aria-label') !== record.repair.expected) return;
    const suggestion = suggest(element);
    if (!suggestion.label) return;
    const label = record.repair.labels[suggestion.state] || suggestion.label;
    element.setAttribute('aria-label', label);
    record.repair.labels[suggestion.state] = label;
    record.repair.expected = label;
    record.repair.verified = accessibleName(element) === label;
    record.draft = label;
    record.edited = false;
    record.draftState = suggestion.state;
  }

  function reset() {
    // The demo restores its initial DOM and business state immediately after this.
    for (const record of records.values()) {
      record.element.classList.remove('bv-issue', 'bv-repaired', 'bv-selected');
    }
    records.clear();
    scanned = false;
  }

  function undo(record, reviewAfter = true) {
    if (!record?.repair) return { status: 'skipped', message: '此项没有本轮修改。' };
    if (record.element.getAttribute('aria-label') !== record.repair.expected) {
      return { status: 'skipped', message: '页面已再次修改该名称，未覆盖页面的新值。' };
    }
    const original = record.repair.originalLabel;
    if (original.present) record.element.setAttribute('aria-label', original.value);
    else record.element.removeAttribute('aria-label');
    record.repair = null;
    record.confirmed = false;
    record.conflict = '';
    record.edited = false;
    record.draft = suggest(record.element).label;
    if (reviewAfter) review();
    return { status: 'undone', message: '已撤销此项修改，恢复应用前的命名属性。' };
  }

  function undoAll() {
    let undone = 0;
    let skipped = 0;
    for (const record of records.values()) {
      if (!record.repair) continue;
      if (undo(record, false).status === 'undone') undone++;
      else skipped++;
    }
    review();
    return { undone, skipped };
  }

  return { review, summary, apply, applyAll, syncBusinessState, reset, undo, undoAll };
}
