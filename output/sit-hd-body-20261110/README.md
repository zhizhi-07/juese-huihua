# 侧面坐姿高清身体 · 变更与恢复
- 只写入 draft-conflict-1794271316087-dc54567c。侧面坐姿 body 的 3_0_0 至 3_0_3 更换为同一份 2× 身体；用户原画的 54 个不透明像素及放置坐标不变。保留首帧原身体的颈部连接（逻辑 y=11、12），不复制旧的下半身像素。
- 原「高清 · 眼睛身体」保留原帧，改为隐藏以免重复绘制。头部、手、眼睛、发型、衣服及所有其他帧和动作没有改变。
- before.json 是原始响应；original-revision.json 记录原 SHA256 和 ETag。candidate.json 为写入稿，verified.json 为回读响应，两者字节一致。preview.png 上排原版，下排改版。
- 恢复时先 GET 同一工程并对照 verification.json 中的回读 ETag；若版本仍一致，用该 ETag 做 If-Match，带 X-Pixel-Editor: 1、Content-Type: application/json，将 before.json 原字节 PUT 到同一工程，再 GET 验证原 SHA256。若版本不同，不覆盖整稿，应只合并这两项图层差异。
