# 侧面坐姿头发校准 · 变更与恢复
- 只改 draft-conflict-1794271316087-dc54567c 的前、后发联动设置中 original16_sit/side 的四个偏移，以及由其生成的 8 个头发帧。沿用原算法，身体、手、眼睛、其他动作和程序未改。
- 前、后发 Y 偏移从 1、1、2、2 改为 0、0、1、1，X 保持 0。旧头发帧逐像素等于旧算法输出；新结果无遮挡、无裁剪。preview.png 上排原版、下排改版。
- before.json 是原始响应，revision.json 含原始 SHA256 和 ETag；candidate.json 与 verified.json 逐字节一致，写入与回读见 verification.json。
- 回退时，先 GET 同一工程，若 ETag 仍等于 verification.json 中 get.etag，带该 If-Match、X-Pixel-Editor: 1 和 Content-Type: application/json 将 before.json 原字节 PUT 到同一工程，再回读对照 revision.json 中 SHA256。若已有新版本，只合并本次差异，不整稿回退。
