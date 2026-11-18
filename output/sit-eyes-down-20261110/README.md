# 侧面坐姿眼睛下移 · 变更与恢复
- 只改指定副本侧面坐姿的四个眼睛联动 Y 偏移和四个高清眼睛放置 Y，各增加 1 个逻辑像素。PNG、X 坐标、画布、时长、身体、头发与其他动作不变。
- preview.png 上排修改前，下排修改后。before.json 是原始响应，revision.json 含原始 ETag 和 SHA256；candidate.json 与 verified.json 逐字节一致。
- 回退前先 GET 同一工程。若 ETag 等于 verification.json 的 get.etag，以该 ETag 做 If-Match，带 X-Pixel-Editor: 1、Content-Type: application/json，将 before.json 原字节 PUT 回同一工程，再 GET 检查原 SHA256。若 ETag 已变，仅合并本次眼睛改动，不整稿覆盖。
