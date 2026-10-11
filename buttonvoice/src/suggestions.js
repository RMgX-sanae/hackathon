import { namingEvidence } from './orientation.js';

export function genericSuggestion(element) {
  const candidates = namingEvidence(element);
  const conflict = candidates.length > 1;
  const heading = element.closest('article,section,li,form')?.querySelector('h1,h2,h3,h4,h5,h6')?.textContent.trim() || '';
  return {
    label: conflict ? '' : candidates[0]?.label || '',
    title: conflict ? '命名线索存在分歧' : candidates.length ? '网页提示文本' : '用途需要确认',
    state: JSON.stringify([candidates, element.getAttribute('aria-pressed'), element.getAttribute('aria-expanded'), heading, element.getAttribute('aria-controls')]),
    source: conflict ? '需要核对多条线索' : candidates[0]?.source || '缺少命名依据',
    reason: conflict ? '多条线索不一致，暂不预选名称。请结合区域与状态确认；无法确定时可跳过。'
      : candidates.length ? '这是页面提供的候选名称，需要结合上下文确认后应用。' : '只找到位置和上下文，无法确认实际用途。可以暂时跳过，交给网站维护者确认。',
    candidates, requiresConfirmation: true,
  };
}

export function suggestLabel(element) {
  if (element.dataset.demoAction) return suggestMockLabel(element);
  const action = element.dataset.action;
  const expanded = element.getAttribute('aria-expanded') === 'true';
  const pressed = element.getAttribute('aria-pressed') === 'true';
  const rules = {
    search: { label: '搜索商品', title: '商品搜索', state: 'search', reason: '依据：示例页面登记的商品搜索操作。' },
    favorite: {
      label: pressed ? '取消收藏' : '加入收藏', title: '商品收藏', state: `favorite:${pressed}`,
      reason: `依据：示例页面登记的收藏操作，当前${pressed ? '已收藏' : '未收藏'}。`,
    },
    menu: {
      label: expanded ? '收起导航菜单' : '打开导航菜单', title: '导航菜单', state: `menu:${expanded}`,
      reason: `依据：示例页面登记的导航操作，菜单当前${expanded ? '已展开' : '已收起'}。`,
    },
    cart: {
      label: expanded ? '收起购物车' : '查看购物车', title: '购物车', state: `cart:${expanded}`,
      reason: `依据：示例页面登记的购物车操作，面板当前${expanded ? '已展开' : '已收起'}。`,
    },
    notifications: { label: '查看通知', title: '通知', state: 'notifications', reason: '依据：示例页面登记的查看通知操作。' },
  };
  return rules[action] || genericSuggestion(element);
}

function suggestMockLabel(element) {
  const action = element.dataset.demoAction;
  const scene = element.closest('[data-demo-page]')?.dataset.demoPage;
  const item = element.closest('article')?.querySelector('h3')?.textContent.trim() || '';
  const pressed = element.hasAttribute('aria-pressed')
    ? element.getAttribute('aria-pressed') === 'true' : element.classList.contains('bv-is-active');
  const rules = {
    search: [scene === 'campus' ? '搜索校园服务' : '搜索商品', '搜索'],
    menu: ['打开导航菜单', '导航菜单'],
    notify: ['查看通知', '通知'],
    filter: ['筛选商品', '商品筛选'],
    share: [item ? `分享${item}` : '分享图书推荐', '分享'],
    more: ['打开更多操作', '更多操作'],
    voice: ['打开语音检索', '语音检索入口'],
    virtual: ['打开辅助阅读体验', '辅助阅读体验'],
    photo: ['添加现场照片', '现场照片'],
    location: ['标记现场位置', '现场位置'],
    export: ['导出现场记录', '导出记录'],
  };
  if (['favorite', 'bookmark', 'pin'].includes(action)) {
    const label = action === 'pin'
      ? pressed ? `从常用服务移除${item}` : `将${item || '此服务'}加入常用服务`
      : action === 'bookmark'
        ? pressed ? `从书单移除${item}` : `将${item || '此书'}加入书单`
        : `${pressed ? '取消收藏' : '收藏'}${item || '此商品'}`;
    return {
      label, title: item || (action === 'pin' ? '常用服务' : '收藏'), state: `${action}:${pressed}`,
      reason: `依据：模拟网页登记的${action === 'pin' ? '常用服务' : action === 'bookmark' ? '书单' : '收藏'}操作及条目标题，当前${pressed ? '已选中' : '未选中'}。`,
    };
  }
  const rule = rules[action];
  return rule ? {
    label: rule[0], title: rule[1], state: action,
    reason: `依据：模拟网页登记的${rule[1]}操作。`,
  } : genericSuggestion(element);
}
