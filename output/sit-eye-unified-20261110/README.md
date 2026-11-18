before.json 是改前原始响应；revision.json 记录项目 URL、ETag 与 SHA256；changes.json 是偏移差异；verified.json 为 API 回读，与 candidate.json 逐字节一致。前后预览上排改前，下排改后；分支预览逐套临时显示眼睛，未修改保存稿可见性。
恢复：GET 同一 URL，仅当 ETag 仍等于 verification.json 中 get.etag 时，以该 ETag 为 If-Match，带 X-Pixel-Editor: 1 和 Content-Type: application/json，PUT before.json 原字节，再 GET 核对原 SHA256。若 ETag 已变，只合并本次眼睛差异，勿覆盖整稿。
