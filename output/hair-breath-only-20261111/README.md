# 最终规则：头发只跟动作呼吸位移

用户已取消两态压形方案。本轮删除shapePose/reshape与自动形态切换：默认同步只把方向首帧的整块头发按实际头部锚点偏移平移，内部色块、形状、像素数量不变。不另造独立呼吸波、不摆动、不滞后；身体/头部静止时头发静止。

目标：base-outlined-1794365455561「新主工程 · 原版描边素体」。四段钓鱼已保留，共13套已有动作。原生16动作名称范围、钓鱼接入和校验扩展仍保留；没有撤销钓鱼。

## 代码与数据
- js/hair-animation.js移除两态函数、调用和导出。关闭高级效果时走严格刚性路径，不让残留轨迹/补全设置暗中生效。历史手动高级工具没有删除，但本次实际三个头发来源均enabled=false。
- index.html缓存已更新。test/hair-nine-live-browser.cjs恢复独立刚性像素参考；废弃test/hair-native-shape.cjs已删除，原文件在before/备份。新增test/hair-breath-only.cjs。
- before.json/meta.json保存本轮写入前最新工程原始响应与ETag/SHA256；从该新快照重新按实际头部校准各发型偏移，不使用首次钓鱼候选里的过时画稿。
- 实际同步三个已关联头发来源，共657个生成帧，0裁切。各方向首帧保留原始序列化内容；未关联的原画、全部非头发图层、动作尺寸/时长/顺序、四段钓鱼与当前显隐均保留。
- candidate.json为最终候选；readback.json/readback-meta.json为PUT200后完整API回读。两者内容全量一致。没有刷新用户前台或覆盖浏览器内未保存草稿。

## 实际命令与结果
```
$env:NODE_PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node test/hair-breath-only.cjs
node test/hair-rigid-sync.cjs
node test/hair-animation.cjs
node test/eye-sync.cjs
node test/hair-slots.cjs
node test/hair-nine-live-browser.cjs
node test/hair-breath-only.cjs --save
```
全部退出0。test.txt/save-log.txt记录657帧的完整世界坐标RGBA与源首帧+头部偏移一致；所有源首帧、非头发图层及动作均原样，重开/重复同步稳定，钓鱼仍在。browser-test.txt/browser-verification.json记录隔离Edge156帧、按钮/实时/撤销重做/重开/眼睛范围/原图层保护通过。另四个回归日志保留原始输出。service-verification.json为最终服务文件与磁盘逐字节一致。

--save只用于本次保存，保留原ETag前置条件；重复执行将因版本变化停止，不应当作普通回归命令重跑。

## 备份与恢复
before/、before-sha256.json、file-sha256.json和三个patch保存源码原件、SHA256与差异。没有后续代码修改时可将before/hair-animation.js与before/index.html恢复到工作区对应文件，测试一并恢复；有后续修改时按patch反向合并。若恢复工程，应先读取当前API/ETag、确认没有后续用户修改，再通过API If-Match提交before.json，不直接改data文件。不提供自动盲回滚。

本轮不再制作或保留新的复杂算法试稿作为默认。既有复杂算法演示属于历史试验，已被本结果取代。若前台仍有未保存草稿，请先导出备份，再重新打开工程，避免旧页面与后台新版本冲突。
