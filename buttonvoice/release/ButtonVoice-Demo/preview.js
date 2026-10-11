/* ButtonVoice / 模块一：无障碍测试网页。纯前端、无依赖，可直接在 file:// 下运行。 */
(function () {
  'use strict';
  const icons = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.4-3"/>',
    down: '<path d="M12 3v13m-5-5 5 5 5-5M4 19v2h16v-2"/>',
    bus: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 21v-3m8 3v-3M8 7h2m4 0h2"/>',
    shopping: '<path d="M4 8h16l-1 13H5L4 8ZM9 9V6a3 3 0 0 1 6 0v3"/>',
    cart: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l3 13h12l2-9H5"/>',
    share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
    star: '<path d="m12 2 3.2 6.5 7.2 1.1-5.2 5.1 1.2 7.2-6.4-3.4-6.4 3.4 1.2-7.2L1.6 9.6l7.2-1.1Z"/>',
    bookmark: '<path d="M5 4h14v18l-7-5-7 5V4Z"/>',
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
    camera: '<path d="M4 6h4l2-2h4l2 2h4v14H4V6Z"/><circle cx="12" cy="13" r="4"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4V4Zm16 0h-3a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h3V4Z"/>',
    pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    shield: '<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    chart: '<path d="M4 21V11m6 10V3m6 18v-7m5 7H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="m3 21 4-1 13-13-3-3L4 17l-1 4ZM14 7l3 3"/>',
    play: '<path d="m8 5 12 7-12 7V5Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    location: '<path d="m3 11 18-8-8 18-3-7-7-3Z"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  function sprite() {
    return '<svg aria-hidden="true" class="bv-sprite" xmlns="http://www.w3.org/2000/svg">' + Object.entries(icons).map(([name, paths]) => `<symbol id="bv-icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</symbol>`).join('') + '</svg>';
  }
  const icon = (name, extra = '') => `<svg class="bv-icon ${extra}" aria-hidden="true" focusable="false"><use href="#bv-icon-${name}"></use></svg>`;
  function action(id, kind, iconName, classes = '', extra = '') {
    return `<button type="button" class="bv-icon-btn ${classes}" data-demo-id="${id}" data-demo-action="${kind}" ${extra}>${icon(iconName)}</button>`;
  }
  function circleText(str, kind = '') { return `<span class="bv-avatar ${kind}">${str}</span>`; }
  const cases = {
    campus: {
      title: '南科生活', tag: '校园服务', description: '课表、校巴、校园卡聚合页：高频图标按钮密集，学生每天都会用。',
      missing: ['campus-menu', 'campus-search', 'campus-bell', 'campus-pin', 'campus-more'],
      named: ['campus-services', 'campus-timetable', 'campus-refresh', 'campus-download']
    },
    shop: {
      title: '柚子商店', tag: '电商网站', description: '商品收藏、分享、筛选、搜索：同一视觉图标不一定有可访问名称。',
      missing: ['shop-search', 'shop-filter', 'shop-heart-1', 'shop-heart-2', 'shop-share', 'shop-more'],
      named: ['shop-cart', 'shop-buy', 'shop-heart-3']
    },
    library: {
      title: '山海图书馆', tag: '阅读服务', description: '检索、收藏、语音、馆藏服务：混合 button 与 role="button" 的测试。',
      missing: ['library-menu', 'library-voice', 'library-save-1', 'library-save-2', 'library-share', 'library-virtual'],
      named: ['library-search', 'library-renew', 'library-help']
    },
    volunteer: {
      title: '微光行动', tag: '志愿者工具', description: '任务记录与现场督导：相机、定位、导出和更多操作的可访问名称。',
      missing: ['vol-photo', 'vol-location', 'vol-export', 'vol-more', 'vol-notify'],
      named: ['vol-create', 'vol-record', 'vol-team', 'vol-today']
    }
  };

  const templates = {
    campus: () => `
      <div class="bv-site bv-site-campus" data-demo-page="campus">
        <div class="bv-campus-alert"><span class="bv-alert-dot"></span> 校园服务实验页面 <span>·</span> 所有信息仅用于测试</div>
        <header class="bv-site-header bv-campus-header">
          <div class="bv-header-left">${action('campus-menu','menu','menu')}<div class="bv-campus-brand"><span class="bv-brand-mark">N.</span><span>南科<span class="bv-brand-thin">生活</span><small>ONE CAMPUS</small></span></div></div>
          <nav class="bv-site-nav" aria-label="校园服务导航"><a href="#bv-campus-today">今日概览</a><a href="#bv-campus-cards">常用服务</a><a href="#bv-campus-bus">校巴动态</a></nav>
          <div class="bv-header-actions">${action('campus-search','search','search')}${action('campus-bell','notify','bell','bv-notify-dot')}${circleText('同','bv-campus-avatar')}</div>
        </header>
        <main class="bv-campus-main">
          <div class="bv-welcome-line"><span>2026 · 秋季学期</span><span>星期日 · 校园晴朗 <span aria-hidden="true">☀</span></span></div>
          <section class="bv-campus-hero" id="bv-campus-today">
            <div><span class="bv-kicker">GOOD AFTERNOON / 同学你好</span><h1>在校园的每一天，<br><em>都值得被照顾。</em></h1><p>你的日常服务都在这里。查课表、看校巴、找餐厅，轻松安排今天。</p><button class="bv-btn bv-campus-primary" data-demo-id="campus-services" data-demo-action="services">探索校园服务 ${icon('arrow')}</button></div>
            <div class="bv-hero-deco" aria-hidden="true"><div class="bv-deco-ring bv-ring-one"></div><div class="bv-deco-ring bv-ring-two"></div><span>01<span> / 04</span></span></div>
          </section>
          <div class="bv-section-row"><h2>今天，为你准备好了</h2><span class="bv-muted">推荐的校园服务</span></div>
          <section class="bv-campus-cardgrid" id="bv-campus-cards">
            <article class="bv-campus-feature bv-feature-blue"><div class="bv-feature-top"><span class="bv-tile-icon">${icon('calendar')}</span>${action('campus-pin','pin','heart','bv-glass-btn')}</div><span class="bv-feature-tag">我的日程</span><h3>课表与考试</h3><p>下一节课 · 数据结构</p><div class="bv-feature-bottom"><span>14:00 · 一教 208</span><button class="bv-text-action" data-demo-id="campus-timetable" data-demo-action="timetable">查看课表 ${icon('arrow')}</button></div></article>
            <article class="bv-campus-feature bv-feature-mint"><div class="bv-feature-top"><span class="bv-tile-icon">${icon('book')}</span>${action('campus-more','more','dots','bv-glass-btn')}</div><span class="bv-feature-tag">自习推荐</span><h3>空闲教室</h3><p>目前 12 间空教室可用</p><div class="bv-feature-bottom"><span>最近 · 荔园 103</span><span class="bv-status-ok"><i></i> 可前往</span></div></article>
            <article class="bv-campus-mini"><div class="bv-mini-eyebrow">CAMPUS CARD</div><div class="bv-card-chip"></div><h3>校园卡</h3><p>当前余额</p><strong>¥ 86.50</strong><div class="bv-mini-bottom">尾号 0721 <span>••••</span></div></article>
          </section>
          <section class="bv-bus-row" id="bv-campus-bus"><div class="bv-bus-icon">${icon('bus')}</div><div><strong>校巴实时动态</strong><p>科研楼站 · 下一班预计 6 分钟到站</p></div><span class="bv-bus-pill">运行中</span>${action('campus-refresh','refresh','refresh','', 'aria-label="刷新校巴到站信息"')}${action('campus-download','download','down','', 'aria-labelledby="bv-campus-download-name"')}<span id="bv-campus-download-name" class="bv-visually-hidden">下载校巴时刻表</span></section>
        </main>
        <footer class="bv-site-footer"><span>南科生活 · 无障碍检测示例页</span><span>Demo content only — not an official service</span></footer>
      </div>`,
    shop: () => `
      <div class="bv-site bv-site-shop" data-demo-page="shop">
        <div class="bv-shop-promo">周末好物灵感 · 满 199 包邮 <span>探索生活的小惊喜 ↗</span></div>
        <header class="bv-site-header bv-shop-header"><div class="bv-shop-brand">YUZU<span>○</span><small>柚子商店</small></div><nav class="bv-site-nav" aria-label="商城导航"><a href="#bv-shop-picks">好物精选</a><a href="#bv-shop-picks">日常灵感</a><a href="#bv-shop-picks">新鲜上架</a></nav><div class="bv-header-actions">${action('shop-search','search','search')}${action('shop-filter','filter','filter')}${action('shop-cart','cart','shopping','', 'aria-label="查看购物袋"')}</div></header>
        <main class="bv-shop-main"><section class="bv-shop-hero"><div><span class="bv-shop-overline">YUZU PICKS / 10 月精选</span><h1>把日子过成<br><em>喜欢的样子。</em></h1><p>不疾不徐，遇见好物。<br>关于生活的一点点小讲究。</p><a class="bv-shop-hero-link" href="#bv-shop-picks">查看本期精选 ${icon('arrow')}</a></div><div class="bv-shop-scene" aria-hidden="true"><div class="bv-shop-sun"></div><div class="bv-shop-bag-shape"><div class="bv-bag-handle"></div><b>yuzu.</b><span>good day, everyday</span></div><div class="bv-shop-shadow"></div></div></section>
        <section class="bv-shop-products" id="bv-shop-picks"><div class="bv-shop-products-title"><div><span class="bv-eyebrow">CURATED FOR YOU</span><h2>今天的好物清单</h2></div><div class="bv-sort-note">用心挑选 · 03 件好物 ${action('shop-more','more','dots')}</div></div>
          <div class="bv-product-grid">
            <article class="bv-product"><div class="bv-product-photo bv-prod-a"><span class="bv-product-corner">NEW</span><div class="bv-product-art bv-vase-art" aria-hidden="true"><i></i><b></b><span>✿</span></div>${action('shop-heart-1','favorite','heart','bv-product-heart')}</div><div class="bv-product-meta"><span>家居 · 让房间慢下来</span>${action('shop-share','share','share','bv-product-share')}</div><h3>日光陶瓷花瓶</h3><div class="bv-price"><strong>¥ 128</strong><small>已售 168</small></div></article>
            <article class="bv-product"><div class="bv-product-photo bv-prod-b"><span class="bv-product-corner">HOT</span><div class="bv-product-art bv-lamp-art" aria-hidden="true"><i></i><b></b><span></span></div>${action('shop-heart-2','favorite','heart','bv-product-heart')}</div><div class="bv-product-meta"><span>灯具 · 温柔照明</span><span class="bv-tag-pill">热销</span></div><h3>落日氛围台灯</h3><div class="bv-price"><strong>¥ 219</strong><small>已售 326</small></div></article>
            <article class="bv-product"><div class="bv-product-photo bv-prod-c"><span class="bv-product-corner">LIMITED</span><div class="bv-product-art bv-cup-art" aria-hidden="true"><i></i><b></b><span></span></div>${action('shop-heart-3','favorite','heart','bv-product-heart','aria-label="收藏云朵马克杯"')}</div><div class="bv-product-meta"><span>茶器 · 慢慢喝杯水</span><span class="bv-tag-pill">限量</span></div><h3>云朵马克杯</h3><div class="bv-price"><strong>¥ 89</strong><small>已售 92</small></div></article>
          </div><div class="bv-shop-cta"><div><strong>喜欢的日常，值得慢慢收藏。</strong><p>这里的商品仅供交互测试与演示。</p></div><button class="bv-btn bv-shop-buy" data-demo-id="shop-buy" data-demo-action="buy">浏览全部好物 ${icon('arrow')}</button></div>
        </section></main><footer class="bv-site-footer"><span>YUZU / 柚子商店 · 测试网页</span><span>Thoughtfully made for the demo</span></footer>
      </div>`,
    library: () => `
      <div class="bv-site bv-site-library" data-demo-page="library">
        <header class="bv-site-header bv-library-header"><div class="bv-header-left">${action('library-menu','menu','menu')}<div class="bv-library-brand"><span class="bv-library-logo">山<br>海</span><div><strong>山海图书馆</strong><small>BETWEEN THE PAGES</small></div></div></div><nav class="bv-site-nav" aria-label="图书馆导航"><a href="#bv-library-collection">馆藏检索</a><a href="#bv-library-collection">电子阅读</a><a href="#bv-library-hours">服务指南</a></nav><div class="bv-header-actions">${action('library-voice','voice','mic')}${action('library-help','help','book','', 'aria-label="查看阅读帮助"')}${circleText('读','bv-library-avatar')}</div></header>
        <main class="bv-library-main"><section class="bv-library-hero"><div class="bv-lib-hero-content"><span class="bv-library-caption">A SPACE FOR EVERY STORY</span><h1>借一本书，<br>去更远的地方<span>。</span></h1><p>从书页出发，向无限世界延伸。<br>每一个好故事，都有等待读到它的人。</p><form class="bv-library-searchform" data-demo-form="library-search"><label class="bv-visually-hidden" for="bv-library-keyword">搜索馆藏书名或作者</label>${icon('search')}<input id="bv-library-keyword" name="keyword" placeholder="搜索书名、作者、ISBN…"/><button type="submit" data-demo-id="library-search">搜索馆藏</button></form><span class="bv-library-smallnote">热门搜索：设计 · 人工智能 · 中国文学</span></div><div class="bv-library-cover-stack" aria-hidden="true"><div class="bv-book-cover bv-cover-one"><span>THE ART OF<br>NOTICING</span><i>观察的艺术</i></div><div class="bv-book-cover bv-cover-two"><span>THE<br>OTHER<br>SIDE</span><i>写给好奇心</i></div></div></section>
        <section class="bv-library-collection" id="bv-library-collection"><div class="bv-library-sectionhead"><div><span class="bv-eyebrow">STAFF PICKS / 本周推荐</span><h2>阅读，从这里开始</h2></div><div class="bv-lib-section-actions">${action('library-share','share','share')}<button class="bv-library-textbutton" data-demo-id="library-renew" data-demo-action="renew">续借我的图书 ${icon('arrow')}</button></div></div><div class="bv-library-cards">
          <article class="bv-library-item"><div class="bv-library-item-cover bv-cover-green"><span>解构<br>日常</span><small>THE DESIGN OF EVERYDAY</small></div><div><span class="bv-book-type">艺术 / 设计</span><h3>设计心理学</h3><p>唐纳德·诺曼 著</p><div class="bv-item-foot"><span>馆藏 3 本 · 可借 2 本</span>${action('library-save-1','bookmark','bookmark')}</div></div></article>
          <article class="bv-library-item"><div class="bv-library-item-cover bv-cover-sand"><span>人间<br>失格</span><small>人间の記録</small></div><div><span class="bv-book-type">文学 / 小说</span><h3>人间失格</h3><p>太宰治 著</p><div class="bv-item-foot"><span>馆藏 5 本 · 可借 3 本</span>${action('library-save-2','bookmark','bookmark')}</div></div></article>
          <article class="bv-library-item bv-library-special"><div class="bv-lib-special-mark">${icon('book')}</div><h3>不是所有功能<br>都能被读出来。</h3><p>看看我们的辅助阅读实验。</p><div class="bv-item-foot"><span>FEATURED</span><span class="bv-virtual-wrap"><span id="bv-library-experience-label" class="bv-visually-hidden">了解辅助阅读实验</span><span role="button" tabindex="0" class="bv-icon-btn bv-lib-special-btn" data-demo-id="library-virtual" data-demo-action="virtual">${icon('arrow')}</span></span></div></article>
        </div></section><section class="bv-library-hours" id="bv-library-hours">${icon('clock')}<span>本馆今日开放 08:00–22:00</span><strong>书海无涯，欢迎停留。</strong></section></main><footer class="bv-site-footer"><span>山海图书馆 · 模拟馆藏，非真实借阅服务</span><span>Read beyond limits</span></footer>
      </div>`,
    volunteer: () => `
      <div class="bv-site bv-site-volunteer" data-demo-page="volunteer"><aside class="bv-vol-sidebar"><div class="bv-vol-brand"><span class="bv-vol-brandicon">✳</span><div>微光行动<small>WE GLOW TOGETHER</small></div></div><div class="bv-vol-groupcaption">工作空间</div><nav class="bv-vol-nav" aria-label="志愿者工作台导航"><a class="bv-vol-active" href="#bv-vol-overview">${icon('grid')} 总览</a><a href="#bv-vol-tasks">${icon('check')} 现场任务</a><a href="#bv-vol-tasks">${icon('camera')} 督导记录</a><a href="#bv-vol-tasks">${icon('user')} 志愿者</a></nav><div class="bv-vol-sidebottom"><div class="bv-vol-side-card">${icon('shield')}<strong>每一份记录都有意义</strong><p>改善无障碍，从发现问题开始。</p></div>${circleText('光','bv-vol-avatar')}<span>志愿者 · 演示账户</span></div></aside>
        <div class="bv-vol-content"><header class="bv-vol-topbar"><span>工作空间 <span class="bv-vol-slash">/</span> <strong>工作台概览</strong></span><div class="bv-header-actions"><span class="bv-vol-date">10 月 · 周日</span>${action('vol-notify','notify','bell','bv-notify-dot')}${circleText('光','bv-vol-avatar')}</div></header><main class="bv-vol-main" id="bv-vol-overview"><div class="bv-vol-heading"><div><span class="bv-eyebrow">GOOD AFTERNOON, VOLUNTEER</span><h1>一起让改变发生<span> ✳</span></h1><p>今天也有一些温柔而重要的事情，等着我们完成。</p></div><button class="bv-btn bv-vol-create" data-demo-id="vol-create" data-demo-action="create">${icon('plus')} 创建新活动</button></div>
          <div class="bv-vol-stats"><div class="bv-vol-stat"><span>待处理的记录 ${icon('pencil')}</span><strong>08</strong><small>其中 3 条需要复核</small></div><div class="bv-vol-stat"><span>本周活动场次 ${icon('calendar')}</span><strong>04</strong><small>2 场活动正在招募</small></div><div class="bv-vol-stat"><span>累计服务时长 ${icon('clock')}</span><strong>126<em>h</em></strong><small>每一次行动都有回响</small></div></div>
          <div class="bv-vol-twocol"><section class="bv-vol-panel" id="bv-vol-tasks"><div class="bv-vol-paneltop"><div><span class="bv-eyebrow">FIELD NOTES</span><h2>现场无障碍记录</h2></div>${action('vol-more','more','dots')}</div><p class="bv-vol-panel-sub">拍摄、定位、分类，留存每一条真实发现。</p><div class="bv-vol-upload"><div class="bv-vol-photo-bubble">${icon('camera')}</div><strong>记录现场情况</strong><p>拍一张照片，记下需要关注的地方</p><div class="bv-vol-upload-actions">${action('vol-photo','photo','camera','bv-vol-round')}${action('vol-location','location','pin','bv-vol-round')}${action('vol-export','export','down','bv-vol-round')}</div><span class="bv-vol-upload-note">三个操作按钮仅显示图标，等待无障碍扫描</span></div><button class="bv-vol-record" data-demo-id="vol-record" data-demo-action="record">查看历史记录 ${icon('arrow')}</button></section>
          <section class="bv-vol-panel bv-vol-activity"><div class="bv-vol-paneltop"><div><span class="bv-eyebrow">UP NEXT</span><h2>即将开始</h2></div><button class="bv-vol-today" data-demo-id="vol-today" data-demo-action="today">今天 ${icon('chevron')}</button></div><div class="bv-vol-activity-item"><span class="bv-vol-datebox"><strong>15</strong><small>OCT</small></span><div><strong>校园无障碍路线走访</strong><p>${icon('pin')} 主校区 · 14:30</p><span class="bv-tag-pill">招募中</span></div></div><div class="bv-vol-activity-item"><span class="bv-vol-datebox bv-vol-datebox-light"><strong>18</strong><small>OCT</small></span><div><strong>视障友好阅读分享会</strong><p>${icon('pin')} 图书馆 · 10:00</p><span class="bv-tag-pill">已报名</span></div></div><button class="bv-vol-team" data-demo-id="vol-team" data-demo-action="team">查看完整排班 ${icon('arrow')}</button></section></div>
        </main><footer class="bv-site-footer"><span>微光行动 · 志愿者工具示例</span><span>Better together, a little every day</span></footer></div>
      </div>`
  };

  const initialized = new WeakSet();
  function toast(container, message) {
    let node = container.querySelector('.bv-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'bv-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      container.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('bv-toast-visible');
    window.clearTimeout(container._bvToastTimer);
    container._bvToastTimer = window.setTimeout(() => node.classList.remove('bv-toast-visible'), 2200);
  }
  const messages = {
    menu:'演示导航菜单已打开', notify:'目前没有新的消息', services:'正在探索校园服务', timetable:'课表详情（演示）', pin:'已加入我的常用服务', more:'更多操作（演示）', refresh:'实时信息已刷新（模拟）', download:'模拟时刻表已准备就绪',
    filter:'筛选条件（演示）', favorite:'已更新收藏状态', cart:'购物袋暂时是空的', buy:'已进入全部好物（演示）', share:'分享链接已准备好（演示）',
    voice:'语音检索入口（演示）', help:'阅读帮助（演示）', renew:'续借服务（演示）', bookmark:'已更新我的书单', virtual:'辅助阅读体验（演示）',
    photo:'现场照片上传入口（演示）', location:'定位为校园主校区（模拟）', export:'模拟记录已准备导出', create:'新活动创建入口（演示）', record:'查看督导历史记录', today:'已选中今天', team:'完整排班（演示）'
  };
  function handleAction(ev, container) {
    const clicked = ev.target.closest('[data-demo-action]');
    if (!clicked || !container.contains(clicked)) return;
    // 预览区的控件保持真实可点击，但不会导航到外部页面。
    if (clicked.tagName === 'A') ev.preventDefault();
    const kind = clicked.getAttribute('data-demo-action');
    if (kind === 'favorite' || kind === 'bookmark' || kind === 'pin') clicked.classList.toggle('bv-is-active');
    if (kind === 'search') {
      const input = container.querySelector('input[type="search"], .bv-shop-search, .bv-library-searchform input');
      if (input) input.focus();
    }
    toast(container, messages[kind] || '演示交互已触发');
  }
  function createPreview(container, opts) {
    if (!container || !(container instanceof Element)) throw new Error('createPreview(container) 需要有效的 DOM 容器');
    const template = typeof opts === 'string' ? opts : (opts && opts.template) || 'campus';
    const id = Object.hasOwn(templates, template) ? template : 'campus';
    window.clearTimeout(container._bvToastTimer);
    container.classList.add('bv-preview');
    container.dataset.demoTemplate = id;
    container.innerHTML = sprite() + templates[id]();
    if (!initialized.has(container)) {
      container.addEventListener('click', (event) => handleAction(event, container));
      container.addEventListener('keydown', (event) => {
        const button = event.target.closest('[role="button"][data-demo-action]');
        if (button && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleAction({ target: button }, container);
        }
      });
      container.addEventListener('submit', (event) => {
        if (!event.target.matches('[data-demo-form]')) return;
        event.preventDefault();
        const term = event.target.querySelector('input')?.value?.trim();
        toast(container, term ? `正在检索“${term}”（演示）` : '请输入关键词后再搜索');
      });
      initialized.add(container);
    }
    return { id, root: container.querySelector('[data-demo-page]') };
  }
  function resetPreview(container) {
    return createPreview(container, container.dataset.demoTemplate || 'campus');
  }
  function listTemplates() { return Object.entries(cases).map(([id, c]) => ({id, title:c.title, tag:c.tag, description:c.description, missing: [...c.missing], named: [...c.named]})); }
  function getTestCases(template) { const target = cases[template] || cases.campus; return { missing:[...target.missing], named:[...target.named] }; }
  window.ButtonVoicePreview = { createPreview, resetPreview, listTemplates, getTestCases };
  // 与黑客松项目既定接口兼容。若宿主已有同名函数，避免覆盖。
  if (!window.createPreview) window.createPreview = createPreview;
  if (!window.resetPreview) window.resetPreview = resetPreview;
})();
