import { Heart } from 'lucide';

const normalizePath = value => value.replace(/[\s,]/g, '').toLowerCase();
const heartPaths = new Set(Heart.filter(([tag]) => tag === 'path').map(([, attrs]) => normalizePath(attrs.d)));
heartPaths.add(normalizePath('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'));

export function hasHeartIcon(element) {
  for (const svg of element.querySelectorAll('svg')) {
    if (svg.classList.contains('lucide-heart') || svg.dataset.lucide === 'heart' || svg.dataset.icon === 'heart') return true;
    for (const use of svg.querySelectorAll('use')) {
      const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
      if (!href.startsWith('#')) continue;
      const symbol = document.getElementById(href.slice(1));
      if (symbol && [...symbol.querySelectorAll('path')].some(path => heartPaths.has(normalizePath(path.getAttribute('d') || '')))) return true;
    }
    if ([...svg.querySelectorAll('path')].some(path => heartPaths.has(normalizePath(path.getAttribute('d') || '')))) return true;
  }
  return false;
}

export function createHeartPresets(baseSuggest) {
  let meaning = '';
  return {
    set(value) { meaning = ['favorite', 'like'].includes(value) ? value : ''; },
    get meaning() { return meaning; },
    suggest(element) {
      if (!meaning || !hasHeartIcon(element)) return baseSuggest(element);
      const registered = ['campus', 'shop', 'library', 'volunteer'].includes(element.closest('[data-demo-page]')?.dataset.demoPage);
      const knownState = element.hasAttribute('aria-pressed') || registered;
      const pressed = element.hasAttribute('aria-pressed') ? element.getAttribute('aria-pressed') === 'true' : registered && element.classList.contains('bv-is-active');
      const action = meaning === 'favorite' ? '收藏' : '点赞';
      const item = element.closest('article')?.querySelector('h2,h3,h4')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) || '';
      return {
        label: `${pressed ? '取消' : ''}${action}${item}`, title: `爱心 · ${action}`, source: '爱心含义预设',
        reason: `依据：识别到支持的爱心 SVG，你选择将它解释为“${action}”。${knownState ? '名称可跟随页面提供的选中状态变化。' : '页面未提供选中状态，执行操作后需重新核对。'}单项仍可改名或跳过。`,
        state: JSON.stringify(['heart', meaning, pressed, item]), requiresConfirmation: true,
        syncGroup: `heart:${meaning}`, syncState: knownState, candidates: [],
      };
    },
  };
}

export const heartPresetMarkup = `<details class="heart-preset"><summary id="heart-summary">爱心图标的含义预设</summary>
  <p>爱心可能表示收藏或点赞。先选含义，再确认这批按钮用途一致。</p>
  <label for="heart-meaning">本页爱心表示</label><select id="heart-meaning"><option value="">逐项确认，不使用预设</option><option value="favorite">收藏 / 取消收藏</option><option value="like">点赞 / 取消点赞</option></select>
  <p id="heart-count"></p><label class="check-row"><input id="heart-confirmed" type="checkbox">我确认这批爱心都表示所选含义</label>
  <button id="heart-apply" type="button" disabled>应用到这批爱心按钮</button>
  <details class="preset-notes"><summary>哪些按钮会参与？</summary><p>只处理识别到的未命名爱心，跳过已有名称、手动编辑和暂时跳过的项目。同页含义不一致时，请逐项处理。</p><p>目前能识别部分常见爱心图标，未识别到的按钮仍可单独确认。</p></details>
</details>`;

export function bindHeartPreset({ get, audit, presets, render, announce, onApplied = () => {} }) {
  let confirmationKey = '';
  const targets = () => audit.summary().records.filter(record => record.active && record.kind === 'button' && record.missing && !record.edited && !record.deferred && hasHeartIcon(record.element));
  const key = () => JSON.stringify(targets().map(record => [record.id, record.suggestion.state]));
  function refresh() {
    const total = targets().length;
    const completed = audit.summary().records.filter(record => record.active && record.repair?.verified && record.repair.syncGroup?.startsWith('heart:')).length;
    get('heart-summary').textContent = `爱心含义预设 · ${total} 个待命名`;
    get('heart-count').textContent = total
      ? `${total} 个未命名爱心可使用预设。选择只生成草稿，确认后才应用。`
      : completed ? `本轮已命名并复查 ${completed} 个爱心，当前没有可批量处理的爱心。` : '当前没有可批量处理的爱心。其他项目可在列表中逐项确认。';
    if (confirmationKey !== key()) { confirmationKey = ''; get('heart-confirmed').checked = false; }
    get('heart-confirmed').disabled = !presets.meaning || !total;
    get('heart-apply').disabled = !presets.meaning || !total || !get('heart-confirmed').checked;
  }
  get('heart-meaning').addEventListener('change', () => {
    presets.set(get('heart-meaning').value); confirmationKey = '';
    audit.review(); render();
    announce(presets.meaning ? '已生成爱心按钮的名称草稿。确认这批按钮含义一致后才会写入网页。' : '已关闭爱心含义预设，恢复逐项确认。');
  });
  get('heart-confirmed').addEventListener('change', () => { confirmationKey = get('heart-confirmed').checked ? key() : ''; refresh(); });
  get('heart-apply').addEventListener('click', () => {
    audit.review();
    if (!presets.meaning || !confirmationKey || confirmationKey !== key()) {
      render(); announce('这批按钮或状态已变化，请重新核对后勾选确认。'); get('heart-confirmed').focus(); return;
    }
    let applied = 0;
    for (const record of targets()) {
      record.confirmed = true;
      if (audit.apply(record, record.suggestion.label).status === 'fixed') applied++;
      onApplied(record);
    }
    confirmationKey = ''; render();
    announce(`已应用并复查 ${applied} 个爱心按钮。其他问题仍保留待确认。`);
    get('heart-meaning').focus();
  });
  function reset() { presets.set(''); confirmationKey = ''; get('heart-meaning').value = ''; refresh(); }
  return { refresh, reset };
}
