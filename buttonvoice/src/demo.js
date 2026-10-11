import { icon } from './icons.js';

export function createDemo(root, onStateChange) {
  const avatar = `data:image/svg+xml,${encodeURIComponent(icon('UserRound').replace('currentColor', '#c8ccff'))}`;
  const initialHTML = `
    <header class="store-header">
      <div class="store-brand"><button id="demo-menu" type="button" class="store-icon" data-action="menu" aria-expanded="false" aria-controls="demo-navigation">${icon('Menu')}</button><span>回声集<span class="store-brand-sub">校园好物循环</span></span></div>
      <div class="store-header-actions"><button id="demo-help" type="button" class="store-icon" aria-label="查看交易帮助">${icon('CircleHelp')}</button><button id="demo-cart" type="button" class="store-icon" data-action="cart" aria-expanded="false" aria-controls="demo-cart-panel">${icon('ShoppingBag')}</button></div>
    </header>
    <div id="demo-navigation" class="store-inline-panel" hidden>校园集市 / 数码好物 / 同学闲置</div>
    <div id="demo-cart-panel" class="store-inline-panel" hidden>购物车还是空的。可以先联系卖家了解这件好物。</div>
    <form id="demo-search-form" class="store-search" role="search" aria-label="搜索校园商品"><label for="demo-query" class="sr-only">商品关键词</label><input id="demo-query" type="search" placeholder="搜一件你需要的好物" autocomplete="off"><button id="demo-search" type="submit" class="store-icon" data-action="search">${icon('Search')}</button></form>
    <div class="store-section-heading"><h3>同学的闲置，你的新喜欢。</h3><span>今日推荐</span></div>
    <article id="demo-product" class="product">
      <div class="product-image-wrap"><img class="product-image" src="/headphones.jpg" width="1000" height="667" alt="米色背景上的黑色头戴式耳机"><button id="demo-favorite" type="button" class="store-icon favorite-button" data-action="favorite" aria-pressed="false">${icon('Heart')}</button><span class="product-condition">九成新 · 校内面交</span></div>
      <div class="product-copy"><div><p class="product-category">数码 / 耳机</p><h4>给自习时间，留一点安静。</h4><p class="product-description">头戴式耳机，带收纳袋。毕业整理，等下一位爱听歌的同学。</p></div><span class="price">¥ <strong>168</strong></span></div>
      <div class="seller-row"><div class="seller"><button id="demo-seller" type="button" class="seller-avatar"><img src="${avatar}" alt="查看卖家主页" width="24" height="24"></button><span><strong>小林同学</strong><small>致诚书院 · 校内交易</small></span></div><button id="demo-details" type="button" class="store-icon" aria-labelledby="demo-details-label" aria-expanded="false" aria-controls="demo-product-details">${icon('ArrowUpRight')}</button><span id="demo-details-label" class="sr-only">查看商品详情</span></div>
      <p id="demo-product-details" class="store-inline-panel" hidden>演示商品：黑色头戴式耳机，功能正常，附收纳袋。价格与卖家均为示例数据。</p>
      <button id="demo-contact" type="button" class="store-contact">联系卖家 ${icon('ArrowRight')}</button>
    </article>
    <p id="store-feedback" class="store-feedback" role="status">示例商城，所有操作仅在本页演示。</p>
  `;

  function reset() { root.innerHTML = initialHTML; }
  function message(text) { root.querySelector('#store-feedback').textContent = text; }
  function search() {
    const query = root.querySelector('#demo-query').value.trim();
    message(!query || /耳机|数码|自习|音乐/.test(query)
      ? '找到 1 件演示商品：头戴式耳机。'
      : `没有与「${query}」匹配的演示商品。试试搜索“耳机”。`);
  }
  root.addEventListener('submit', event => {
    if (event.target.id !== 'demo-search-form') return;
    event.preventDefault();
    search();
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button?.id.startsWith('demo-') || !root.contains(button)) return;
    if (button.dataset.action === 'favorite') {
      const pressed = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(pressed));
      message(pressed ? '已收藏这件商品。再次点击可以取消收藏。' : '已取消收藏。');
    } else if (['menu', 'cart'].includes(button.dataset.action)) {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      root.querySelector(`#${button.getAttribute('aria-controls')}`).hidden = !expanded;
    } else if (button.id === 'demo-details') {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      root.querySelector('#demo-product-details').hidden = !expanded;
      root.querySelector('#demo-details-label').textContent = expanded ? '收起商品详情' : '查看商品详情';
    } else if (button.id === 'demo-help') message('交易帮助：请当面确认商品情况。本页不会发起真实交易。');
    else if (button.id === 'demo-contact') message('已打开本地联系演示：你好，耳机还在吗？');
    else if (button.id === 'demo-seller') message('小林同学：致诚书院，正在毕业整理。此处为本地卖家资料演示。');
    onStateChange(button);
  });
  reset();
  return { reset };
}
