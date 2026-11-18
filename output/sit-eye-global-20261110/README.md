# 全局侧面坐姿眼睛同步
「同步全部」与实时同步共用生成逻辑：侧面坐姿的 Y = 当前帧头顶 − 同方向待机首帧头顶 − 2。忽略各工程旧坐姿眼睛 Y；X、原画保护、其他动作和头发不变。未 PUT 工程。
验证：baseline.log 为原测试，regression-before.log 为新增用例在原算法上的失败记录，regression-after.log 与 eye-layer-order.log 为新算法回归，live-check.log 为服务代码、两个真实工程只读生成及 ETag 检查，button-check.log 为隔离 Edge 两次点击实际按钮。
恢复：before/ 内为本次改前的三个文件，sha256.txt 为原校验值。若没有后续修改，可分别将 hair-animation.js、index.html、eye-sync.cjs 还原至 js/、根目录、test/；否则按各 .diff 只反转本次差异。已打开的页面不会被强制刷新。
