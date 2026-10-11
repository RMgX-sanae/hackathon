# ButtonVoice · 模块一：模拟网页素材包

四个**可实际运行、可被 DOM 扫描、可修改 aria-label** 的模拟网页。无外部依赖、无第三方图片、无后端。场景均为虚构示例，并非对应机构的真实服务。

## 如何打开

直接双击 `index.html` 即可体验四个场景；也可分别打开 `campus.html`、`shop.html`、`library.html`、`volunteer.html`。每个页面顶部都有【重置页面】按钮。

| 场景 | 文件 | 故意缺名按钮 | 正常命名按钮 |
|---|---|---:|---:|
| 南科生活 · 校园服务 | `campus.html` | 5 | 4 |
| 柚子商店 · 电商 | `shop.html` | 6 | 3 |
| 山海图书馆 · 阅读 | `library.html` | 6 | 3 |
| 微光行动 · 志愿者工具 | `volunteer.html` | 5 | 4 |

“故意缺名”是模块 1 的预设测试数据，不是扫描器运行所得结果。页面的演示交互仅作示意。

## 给扫描组 / 修复组的接口

在项目中引入：

```html
<link rel="stylesheet" href="./preview.css">
<script src="./preview.js"></script>
<div id="preview-area"></div>
<script>
  const container = document.querySelector('#preview-area');
  const {root} = ButtonVoicePreview.createPreview(container, {template: 'campus'});
  // 这里传递 root 给真正的扫描器，避免把外围控制台也扫进去
  // const issues = scanButtons(root);
  // reset
  // ButtonVoicePreview.resetPreview(container);
</script>
```

支持的 `template`：`'campus' | 'shop' | 'library' | 'volunteer'`。

| 公共 API | 说明 |
|---|---|
| `ButtonVoicePreview.createPreview(container, {template})` | 将指定场景挂载到 DOM，返回 `{id, root}`；`root` 是内层 `[data-demo-page]` 元素 |
| `ButtonVoicePreview.resetPreview(container)` | 重新渲染当前场景，移除修复和收藏状态 |
| `ButtonVoicePreview.listTemplates()` | 返回所有场景元数据和测试点 |
| `ButtonVoicePreview.getTestCases(template)` | 返回 `{missing: [data-demo-id], named: [data-demo-id]}`，方便测试核对 |

每个重要按钮都有唯一的 `data-demo-id`，常见按钮还有 `data-demo-action`，可作为建议引擎的上下文；**不要把 `data-demo-action` 误认为按钮的可访问名称**。扫描逻辑应使用 Accessible Name 算法（如 `computeAccessibleName`）。

正例包含可见文本、`aria-label`、`aria-labelledby`，以及带真实文本的提交按钮；反例主要是仅有 `aria-hidden` SVG 的无名图标按钮，还包括无名称的 `role="button"`。

扫描前不要查看 `getTestCases` 当作检测结果：这些只是期望输出的测试样本。

## 技术注意事项

- 各页面是原生 DOM，不使用 iframe，因此扫描可直接访问元素并修改属性。
- `preview.css` 主要限定在 `.bv-preview` 下，尽量与集成应用隔离样式。
- 模拟网页预留了交互反馈，真正扫描/修复逻辑尚未接入，这正是模块二、三的工作。
- 一部分演示按钮故意不满足无障碍规范，**不要直接发布为正式业务产品**。
- 请勿把“朗读文字”当作真正的读屏器测试，最后仍需使用 NVDA / VoiceOver 进行人工验证。
