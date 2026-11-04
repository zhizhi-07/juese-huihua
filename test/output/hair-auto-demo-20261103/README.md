# 头发自动对比页修正（2026-11-03）

只修改对比页和独立脚本，未改公共编辑器代码或任何工程像素。

## 修改
- 使用当前 PE.getRenderLayers / PE.isLayerVisible；尊重图层透明度、父组显隐和 placement。生成帧用 source-over 叠图，不擦除下层。
- 从每帧头部最大连通主体测量平移，发根跟随头部；首帧保持原姿态。
- 蒙版只控制额外摆动与压缩；未选像素优先保留。橡皮擦擦空锁定全部，清空按钮恢复全部可动，切换工程/方向/发型清空蒙版。
- 按工程逐帧时长播放；周期整数，补逐帧、帧号、原尺寸与浅深背景检查；暂停调参保留当前帧。
- 加载失败明确提示，迟到响应不覆盖新选择；裁边给出警告。

## 本次验证
原版浏览器行为保存在备份中的 before-run.json / before.png。
修改后通过 node --check js/hair-auto-demo.js 和 node test/hair-auto-demo.cjs（退出0）。运行时 NODE_PATH=C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules。
具体测试见 verification.json；原始输出见备份中的 test-run.log。真实工程三方向共24帧的原版/自动合成都与编辑器 CanvasManager 像素一致；另有12帧合成测试覆盖透明度、裁图放置、父组隐藏和背面顺序。
实际8765服务直连浏览器复测见 live-smoke.json，服务文件与磁盘相同。目标工程 SHA256 和 ETag 未改变，全程没有写入请求。

## 恢复
备份：C:\Users\Administrator\Desktop\角色绘画\备份\头发自动对比页-20261103-081220
在 PowerShell 执行：

    & 'C:\Users\Administrator\Desktop\角色绘画\备份\头发自动对比页-20261103-081220\restore-page.ps1'

只恢复原对比页，新增JS保留但不再被原页引用。脚本校验备份及目标哈希；若页面后续有新修改会拒绝覆盖。已在 restore-check 额外副本上实际执行验证，最终修改页保留。
差异：备份目录 changes.patch（git diff --no-index 的退出1表示存在差异）。

## 限制
仍是行走后发草稿预览，不保存/导出工程，不处理其他动作。头部跟随只测平移，不重塑发帽；大幅度或复杂蒙版仍可能出现像素锯齿/接缝，需要逐帧查看，不能当作完整物理模拟或最终像素稿。
