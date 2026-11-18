# base-outlined-1794365455561 全部眼睛下移 1 格

- 时间：2026-11-11 16:58–17:03（Asia/Shanghai）
- 工程：`data/projects/base-outlined-1794365455561.json`（新主工程 · 原版描边素体）
- 请求：所有眼睛整体下移一格
- 结论：14 套动作里 156 个有眼睛的 cel 全部下移 1 像素；78 个背面/空眼睛 cel 原样保留；已按 If-Match 保存并全量回读验证。

## 版本

| | ETag / SHA256 | 字节 |
| --- | --- | --- |
| 保存前 | `1bebe6994f7eab71cbcc7a04181188dedb925f52903af2fece7ea464116cd15a` | 936842 |
| 保存后 | `4493814377daf1962e41cbb4d1f6b094b5fd95f78bdc52ae80d833c2b30432a8` | 934870 |

服务端保存时自动生成的 `data/projects/base-outlined-1794365455561.json.bak`，SHA256 与 `before.json` 完全一致，恢复时可直接对照。

## 每个 cel 的变化规则

对每个有像素的眼睛 cel：可见像素从 `(x, y)` 移到 `(x, y+1)`，最上面一行清空；cel 的 `width/height` 不变，画布尺寸、帧时长、`sourceX/sourceY`、`status/locked/notes`、图层顺序、配色、其他图层均不变。眼睛像素数一个不增不减。

这次包含待机的三个方向首帧（上次旧操作曾跳过这三帧，导致待机眼睛上下跳 2 格）。现在待机 4 帧的眼睛一起下移，原有的 1 像素呼吸位移保持不变（侧/正：第1–2帧 8–9 行，第3–4帧 9–10 行，坐标 0 起算）。

## 逐套动作改动数

| 动作 | 改动的 cel |
| --- | --- |
| original16_walk | 16 |
| original16_idle | 8 |
| original16_pickup | 12 |
| 浇水 | 12 |
| 镐 | 12 |
| 斧头 | 12 |
| 锄头 | 12 |
| 镰刀 | 12 |
| 种植 | 8 |
| 钓鱼-甩竿 | 12 |
| 钓鱼-持竿 | 8 |
| 钓鱼-收线 | 12 |
| 钓鱼-上鱼 | 12 |
| original16_sit | 8 |

合计 156 个 cel；另 78 个空 cel（背面 up 方向等）不改。没有一个 cel 的底行有像素，所以下移不会裁切。

## 验证

1. 保存前 GET 工程，写入 `before.json`；保存用 `PUT /api/project?id=base-outlined-1794365455561`，请求头带 `X-Pixel-Editor: 1` 与读取时的 ETag。
2. PUT 前再次 GET，确认字节与 ETag 未变，避免覆盖用户新改的内容。
3. PUT 返回 200；紧接着 GET 回读，逐字节等于候选稿 `candidate.json`。
4. 把 156 个眼睛 cel 还原成旧值后，整份 JSON 与 `before.json` 深度比较完全相等，说明没有碰到任何非眼睛数据。
5. 逐帧核对 `width/height/sourceX/sourceY/duration/status/locked/notes` 与图层数量 344、动作顺序 14 套均未变。
6. 磁盘 `data/projects/base-outlined-1794365455561.json` 的字节等于 API 回读字节。
7. 逐个眼睛像素核对：每个旧像素都正好下移 1 格（`independent-verification.json`、`saved-verification.json`）。

图形核对（本地读 PNG 逐像素合成，非截图）：

- `compare.png`：12 组动作原图 / 改后并排（7 倍）。
- `eyes-zoom-before-after.png`：10 组头部特写（18 倍），上排改前、下排改后。
- `face-zoom.png`：正面行走、正面待机、侧面坐姿三张脸的特写（26 倍）。
- `idle-frames-after.png`：改后侧面待机 4 帧，确认呼吸位移仍是 1 格。

已目检：眼睛下移后仍在脸内，没有落到描边外或透明区，没有压住下巴轮廓；头发/工具在眼睛之上的遮挡关系与原来一致。

## 文件

- `before.json`：保存前完整工程（原始快照）
- `after-api.json`：保存后 API 回读的完整工程
- `candidate.json`：PUT 的候选稿
- `backup-info.json`：保存前 ETag / SHA256 / 字节数
- `save-response.txt`：PUT 状态与返回
- `shift.cjs`：本次一次性改动脚本（已执行，勿重复运行，会再下移一次）
- `independent-verification.json`：独立回读核对
- `saved-verification.json`：保存流程内置核对
- `dryrun-verification.json`：PUT 前逐 cel 清单
- 备份副本：`备份/eyes-down-all-eyes-20261111/`

## 恢复方法

用 `before.json` 覆盖回去即可，但必须先 GET 当前工程拿最新 ETag，确认期间没有新的用户修改后用 If-Match PUT，不要盲目覆盖。服务端 `.bak` 也是保存前版本。

## 备注

- 未刷新前台页面，未改动编辑器代码与按钮；前台如果还开着旧页面，继续编辑前请先在页面里保存或重新加载，避免用旧稿覆盖这次保存。
- 保存完成后，工作区 `server.js` 的素体编号被改成 `base-outlined-1794365455561`；已按要求重启本地服务让新代码生效，`/api/status` 现在返回该编号。工程数据本身未被重启影响（回读 SHA 不变）。
