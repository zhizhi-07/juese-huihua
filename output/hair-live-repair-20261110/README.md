已保存链接副本：现有卷前发实时联动，原正/侧首帧原字节保留；仅在重叠动作隐藏旧后发，不删除。preview.png 上半原图、下半候选。candidate.json 与 verified.json 完全相同。
恢复：GET revision.json 中的 API。仅当 ETag 等于 verification.json 的 get.etag 时，带 X-Pixel-Editor: 1、Content-Type: application/json、If-Match: 该 ETag，PUT before.json 原字节；回读 SHA256 应与 revision.json 一致。若 ETag 已变化，仅合并本次差异，勿覆盖整稿。
