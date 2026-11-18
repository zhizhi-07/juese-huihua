# 三方向跳跃末帧坐姿
本次用户明确把新主工程坐姿范围改为正/侧/背三方向，覆盖之前只保留侧面的限制；不修改其他旧工程。
源Basic/jump.aseprite，jump标签第6帧。仅补down/up两方向，原side及所有原图层保留。16×16、每方向1帧、100ms；沿用原分层和姿势，仅人物三色替换；眼睛独立层合成与原图相同，背面眼睛空。
已逐像素对照，0裁切，原side与其余动作/图层保持；PUT前重新GET与原ETag匹配，按原ETag保存，PUT/GET200，回读字节等于candidate。没有刷新前台、没有改按钮或自动补头发衣服。
恢复：原响应original.json、原SHA256/ETag在meta.json；保存后版本在verification-saved.json。仅当当前API ETag仍等于保存后版本时，用其If-Match PUT original.json并回读；已有后来编辑则先合并，仅撤销本次新增方向和图层，不能盲传旧整稿。未运行回滚。
