# 侧面坐姿眼睛上移两格
仅修改当前素体源侧面坐姿四帧的眼睛联动 Y 与生成图层放置 Y，各减 2；逆差应用于候选副本后，与原 JSON 深比较一致。高清 PNG 不变。preview.png 上排为原图，下排为候选（当前刘海盖住上移后的眼睛）。
原始响应为 before.json，SHA256 与 ETag 见 revision.json；候选与回读分别为 candidate.json 和 verified.json；差异见 changes.json。
恢复：GET revision.json 的 URL；仅当 ETag 与 verification.json 的 get.etag 一致，用该 ETag 作为 If-Match，带 X-Pixel-Editor: 1、Content-Type: application/json，PUT before.json 原字节，GET 核对 revision.json 的 SHA256。若 ETag 已变，只合并本次差异，勿覆盖整稿。
