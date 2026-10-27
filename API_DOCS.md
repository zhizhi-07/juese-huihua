# 像素角色绘画编辑器 - Agent API 接口文档 (window.pixelAPI)

本接口文档面向 AI Agent 及自动化程序，用于无缝操作、检查、绘制及批量校验像素角色精灵图 (Sprite Sheet)。

---

## 1. 概述 (Overview)

`window.pixelAPI` 是编辑器专为 AI Agent 和脚本自动化设计的全局 API。在浏览器控制台或自动化脚本上下文中可以直接调用 `pixelAPI.<method>(...)`。

### 核心特性
- **纯整数坐标系**：所有像素坐标 `(x, y)` 均以左上角为 `(0, 0)`，向右为 X 轴正向，向下为 Y 轴正向。
- **结构化返回**：所有方法统一返回格式化结果对象，避免抛出未捕获异常。
- **历史记录追踪**：所有的像素绘制与区域变换操作均会自动分批压入历史栈（`Undo/Redo`），并自动同步触发视图和缩略图渲染。
- **锁定保护机制**：支持对帧、图层以及特定局部矩形区域实施保护，防止覆盖核心骨架或不需要修改的区域。

---

## 2. 统一返回格式 (Return Format)

无论是查询还是绘制操作，所有 API 均统一返回如下对象结构：

```typescript
interface APIResult<T = any> {
  success: boolean;       // 执行是否成功
  data: T | null;         // 成功时的返回数据对象或载荷
  error?: string | null;  // 失败时的错误信息中文描述
  modifiedPixels?: number;// 绘制/修改操作中成功变更的像素数量
  rejectedPixels?: Array<{// 绘制/修改操作中被拦截拒绝的像素
    x: number;
    y: number;
    reason: string;       // 拦截原因: '超出帧边界' | '像素位于锁定区域内' | '目标图层已被锁定' | '目标帧已被锁定'
  }>;
}
```

---

## 3. 完整方法列表 (Complete Method Reference)

### 3.1 项目与素材信息 (Project Info)

#### `getProjectInfo()`
获取当前项目的总体结构概要。
- **参数**：无
- **返回值**：
  ```json
  {
    "success": true,
    "data": {
      "name": "主角走动素材",
      "sheetCount": 1,
      "layerCount": 2,
      "currentSheetIndex": 0,
      "currentActionIndex": 0,
      "currentFrameIndex": 0,
      "currentLayerIndex": 0,
      "palette": [{ "r": 208, "g": 70, "b": 72, "a": 255, "name": "朱红" }]
    }
  }
  ```
- **示例**：
  ```javascript
  const info = pixelAPI.getProjectInfo();
  console.log(`项目名称: ${info.data.name}, 素材表数: ${info.data.sheetCount}`);
  ```

#### `getSheetInfo(sheetIndex)`
获取指定素材表的切帧规格与动作概览。
- **参数**：
  - `sheetIndex` *(number, 可选)*：素材表索引，缺省为当前素材表
- **返回值**：
  ```json
  {
    "success": true,
    "data": {
      "name": "hero_sheet",
      "frameWidth": 32,
      "frameHeight": 32,
      "columns": 4,
      "rows": 4,
      "spacingX": 0,
      "spacingY": 0,
      "offsetX": 0,
      "offsetY": 0,
      "fps": 8,
      "actionCount": 4,
      "totalFrames": 16
    }
  }
  ```
- **示例**：
  ```javascript
  const sheet = pixelAPI.getSheetInfo(0);
  console.log(`帧大小: ${sheet.data.frameWidth}x${sheet.data.frameHeight}`);
  ```

#### `getActions(sheetIndex)`
获取指定素材表下的所有动作（Action）及其朝向与帧数。
- **参数**：
  - `sheetIndex` *(number, 可选)*：素材表索引
- **返回值**：
  ```json
  {
    "success": true,
    "data": [
      { "actionIndex": 0, "name": "walk", "direction": "down", "frameCount": 4 },
      { "actionIndex": 1, "name": "walk", "direction": "left", "frameCount": 4 }
    ]
  }
  ```
- **示例**：
  ```javascript
  const actions = pixelAPI.getActions();
  ```

#### `getFrameInfo(si, ai, fi)`
获取指定帧的尺寸、锁定区域、审核状态与备注。
- **参数**：
  - `si` *(number, 可选)*: 素材表索引
  - `ai` *(number, 可选)*: 动作索引
  - `fi` *(number, 可选)*: 帧索引
- **返回值**：
  ```json
  {
    "success": true,
    "data": {
      "sheetIndex": 0,
      "actionIndex": 0,
      "frameIndex": 1,
      "width": 32,
      "height": 32,
      "locked": false,
      "lockedRegions": [{ "x": 10, "y": 10, "w": 12, "h": 12 }],
      "status": "pending",
      "notes": "头部轮廓待微调",
      "hasOriginal": true
    }
  }
  ```

#### `getLayers()`
获取项目所有图层状态。
- **参数**：无
- **返回值**：
  ```json
  {
    "success": true,
    "data": [
      { "index": 0, "name": "图层 1", "visible": true, "locked": false, "opacity": 1.0, "isCurrent": true }
    ]
  }
  ```

#### `getPalette()`
获取项目颜色调色板。
- **返回值**：`data` 为 `[{ r, g, b, a, name }]`

#### `getLockedRegions(si, ai, fi)`
获取指定帧内设置的所有锁定矩形区域列表。
- **返回值**：`data` 为 `[{ x, y, w, h }]`

---

### 3.2 像素读取 (Pixel Reading)

#### `getPixel(si, ai, fi, x, y)`
读取复合渲染画布上特定像素位置的 RGBA 颜色。
- **参数**：
  - `si, ai, fi` *(number)*: 帧坐标三元组
  - `x, y` *(number)*: 帧内像素坐标
- **返回值**：
  ```json
  {
    "success": true,
    "data": { "r": 208, "g": 70, "b": 72, "a": 255 }
  }
  ```

#### `getPixels(si, ai, fi, x, y, w, h)`
以二维数组形式读取复合画布上的局部矩形像素块。
- **参数**：
  - `si, ai, fi` *(number)*: 帧定位
  - `x, y, w, h` *(number)*: 矩形区域坐标与宽高
- **返回值**：`data[row][col] = { r, g, b, a }`

#### `getFramePixels(si, ai, fi)`
读取整帧中所有非完全透明的有效像素（扁平列表）。
- **参数**：`si, ai, fi`
- **返回值**：
  ```json
  {
    "success": true,
    "data": [
      { "x": 12, "y": 14, "r": 255, "g": 0, "b": 0, "a": 255 },
      { "x": 13, "y": 14, "r": 255, "g": 0, "b": 0, "a": 255 }
    ]
  }
  ```

#### `getFrameRawRGBA(si, ai, fi)`
获取包含该帧全部 `width * height * 4` 字节的 `Uint8ClampedArray` 原始二进制像素缓冲区。

#### `getLayerPixel(layerIdx, si, ai, fi, x, y)`
独立读取特定单图层上的像素，不计算复合图层透明度混合。

---

### 3.3 图像预览 (Previews)

#### `getFramePreview(si, ai, fi, scale)`
- **说明**：生成放大 `scale` 倍的近邻无模糊 PNG Base64 DataURL。
- **返回值**：`{ dataURL: "data:image/png;base64,...", width, height }`

#### `getActionPreview(si, ai, scale)`
- **说明**：将整个动作所有连续帧水平排布生成一张 Contact Sheet 连环对比图。

#### `getAdjacentFramesPreview(si, ai, fi, scale)`
- **说明**：同时获取上一帧 (prev)、当前帧 (current) 和下一帧 (next) 三张预览 DataURL。

#### `getRegionPreview(si, ai, fi, x, y, w, h, scale)`
- **说明**：仅截取局部矩形范围的高清放大预览。

#### `getDirectionSheet(si, fi, scale)`
- **说明**：获取所有朝向动作在当前帧编号（例如走动第2步）的对比拼图。

#### `getComparisonPreview(si, ai, fi, scale)`
- **说明**：生成左右并排对照图（左：原始导入帧，右：当前编辑帧），用于审查修改效果。

---

### 3.4 图层管理 (Layer Operations)

- `addLayer(name)`: 创建新图层。返回 `{ layerIndex, name }`
- `removeLayer(index)`: 删除指定图层（至少需保留1个图层）。
- `selectLayer(index)`: 切换激活的工作图层。
- `setLayerVisibility(index, visible)`: 开启或隐藏图层。
- `setLayerLocked(index, locked)`: 锁定/解锁图层。
- `setLayerOpacity(index, opacity)`: 设置图层透明度（`0.0` - `1.0`）。
- `reorderLayers(fromIndex, toIndex)`: 调整图层堆叠顺序。

---

### 3.5 像素绘制 (Drawing)

#### `setPixels(layerIdx, si, ai, fi, pixels)`
批量绘制或修改像素数组，内部自动打包单步 Undo 历史并刷新画布。
- **参数**：
  - `layerIdx` *(number)*: 写入图层
  - `si, ai, fi` *(number)*: 目标帧
  - `pixels` *(Array)*: `[{ x, y, r, g, b, a }]`
- **返回值**：
  ```json
  {
    "success": true,
    "data": { "modifiedCount": 35, "rejectedCount": 1 },
    "modifiedPixels": 35,
    "rejectedPixels": [
      { "x": 10, "y": 10, "reason": "像素位于锁定区域内" }
    ]
  }
  ```

#### `drawLine(layerIdx, si, ai, fi, x1, y1, x2, y2, r, g, b, a)`
使用 Bresenham 整数直线算法绘制像素线条。

#### `drawRect(layerIdx, si, ai, fi, x, y, w, h, r, g, b, a, filled)`
绘制空心或实心矩形（`filled: true` 为实心填充，`false` 为1像素边框）。

#### `erasePixels(layerIdx, si, ai, fi, pixels)`
将指定坐标数组的像素透明度置为 0（橡皮擦效果）。
- **参数**：`pixels` 为 `[{ x, y }]`

#### `eraseRect(layerIdx, si, ai, fi, x, y, w, h)`
将整个矩形范围内的图层像素擦除为全透明。

#### `fillArea(layerIdx, si, ai, fi, x, y, r, g, b, a)`
油漆桶工具：基于广度优先搜索 (BFS) 自动填充相同颜色的闭合连续区域。

---

### 3.6 选区操作 (Selection)

#### `copyRegion(si, ai, fi, x, y, w, h)`
复制复合帧的指定矩形选区至 API 内部剪贴板。

#### `pasteRegion(layerIdx, si, ai, fi, x, y)`
将剪贴板内容粘贴至目标图层的 `(x, y)` 偏移起始点。

#### `moveRegion(layerIdx, si, ai, fi, srcX, srcY, srcW, srcH, destX, destY)`
图层局部位移：将源矩形像素从原位置清除，并移动粘贴至目标坐标，并入单次操作历史。

---

### 3.7 历史与撤销 (History)

- `undo()`: 撤销最近一次批次操作。
- `redo()`: 重做上一步撤销的操作。
- `getHistory()`: 获取历史栈记录列表 `[{ description, timestamp, changeCount }]`。

---

### 3.8 区域与帧锁定 (Locking)

- `lockFrame(si, ai, fi)`: 锁定整帧，任何针对该帧的绘制均会被拒绝。
- `unlockFrame(si, ai, fi)`: 解锁整帧。
- `lockRegion(si, ai, fi, x, y, w, h)`: 添加局部矩形保护区，防止笔刷破坏角色重要部位。
- `unlockRegion(si, ai, fi, x, y, w, h)`: 移除匹配的锁定保护区。

---

### 3.9 帧审核状态 (Frame Status)

- `setFrameStatus(si, ai, fi, status, notes)`:
  - `status`: `'pending'` (待审核) | `'confirmed'` (已确认) | `'needs-fix'` (需修改)
  - `notes`: 文本说明或修改要求
- `getFrameStatus(si, ai, fi)`: 获取当前帧状态及备注。
- `getAllFrameStatuses()`: 遍历获取所有素材表、动作、帧的状态及备注清单。

---

### 3.10 导航与视图 (Navigation)

- `selectFrame(si, ai, fi)`: 选中指定帧并激活在主画布居中展示。
- `selectSheet(si)`: 切换当前素材表。

---

### 3.11 导入与导出 (Export)

- `exportFrame(si, ai, fi)`: 触发当前帧 PNG 文件浏览器下载。
- `exportSpriteSheet(si)`: 触发完整 SpriteSheet 大图 PNG 下载。
- `exportAllAsZip()`: 使用 JSZip 将全工程所有帧和动作打包为 `.zip` 下载。
- `exportProject()`: 下载项目 `.json` 工程文件。
- `getFrameDataURL(si, ai, fi)`: 获取当前帧的 Base64 PNG 数据，不触发下载（适合 Agent 传输）。

---

### 3.12 质量校验 (Validation)

- `validateFrame(si, ai, fi)`:
  检查帧是否空白、尺寸越界、锁定区损坏、颜色是否超出色板等。
- `validateAll()`:
  对工程内全部素材表和帧进行全量检查，输出结构化报告。

---

## 4. Agent 核心工作流示例 (Workflow Examples)

### 工作流 1: 扫描并微调角色边缘轮廓

```javascript
// 1. 获取当前帧尺寸与非透明像素
const frameInfo = pixelAPI.getFrameInfo(0, 0, 0);
const rawPixels = pixelAPI.getFramePixels(0, 0, 0).data;

// 2. 找到所有 X 坐标在边界的像素并添加深色描边
const outlinePixels = [];
for (const p of rawPixels) {
  // 检查上方是否为透明
  const above = pixelAPI.getPixel(0, 0, 0, p.x, p.y - 1);
  if (above.success && above.data.a === 0) {
    outlinePixels.push({
      x: p.x,
      y: p.y - 1,
      r: 20, g: 12, b: 28, a: 255 // 描边暗色
    });
  }
}

// 3. 在图层 0 批量写入描边像素
const drawResult = pixelAPI.setPixels(0, 0, 0, 0, outlinePixels);
console.log(`成功绘制描边像素: ${drawResult.modifiedPixels} 个`);
```

### 工作流 2: 锁定面部并批量替换衣服主色

```javascript
// 1. 保护面部区域 (12, 6, 8, 8)，防止颜色被误改
pixelAPI.lockRegion(0, 0, 0, 12, 6, 8, 8);

// 2. 将原蓝色衣服 (89, 125, 206) 替换为绯红色 (208, 70, 72)
const allPixels = pixelAPI.getFramePixels(0, 0, 0).data;
const recolorList = [];

for (const p of allPixels) {
  if (p.r === 89 && p.g === 125 && p.b === 206) {
    recolorList.push({
      x: p.x,
      y: p.y,
      r: 208,
      g: 70,
      b: 72,
      a: 255
    });
  }
}

const res = pixelAPI.setPixels(0, 0, 0, 0, recolorList);
console.log(`成功替换 ${res.modifiedPixels} 处衣服像素`);

// 3. 校验并标记该帧审核通过
const valid = pixelAPI.validateFrame(0, 0, 0);
if (valid.data.valid) {
  pixelAPI.setFrameStatus(0, 0, 0, 'confirmed', '衣服改色完成，面部保护完好');
}
```

---

## 5. 注意事项 (Important Notes)

1. **整数坐标要求**：所有 API 均自动对传入的浮点坐标执行 `Math.round()` 取整，但建议调用前保持整数以确保精度。
2. **图层索引安全**：图层索引从 0 开始。在调用 `setPixels` 之前可通过 `getLayers()` 确定工作图层索引。
3. **撤销批次原子性**：单次调用 `setPixels`、`drawLine` 或 `fillArea` 均视为一个不可分割的历史步，调用 `undo()` 即可一次性回滚全部改动。
4. **性能建议**：修改大量像素时，务必将点集整合为一个数组一次性调用 `setPixels`，避免循环调用单点绘制以获得最佳性能。


## 修复版补充
- .ase/.aseprite 导入：`await PE.app.handleImport(files)`，files 是用户文件控件取得的 File 数组，PNG 和源文件共用此入口。
- `PE.parseAseprite(arrayBuffer)` 只解析、不修改项目；不支持的特性会抛出明确错误。
- `pixelAPI` 的图层索引仍是项目全局索引；不要按右侧显示行号猜测索引。不同素材的图层现在隔离。
- `PE.app.exportManager.exportProject(false)` 返回带全部图层和源文件的 JSON Blob，不触发下载。打开工程必须经 `PE.app.exportManager.importProject(file)`，它会重新绑定编辑器、画笔和预览。
- 不要直接修改 originalPixels：它是只读对比底稿，实际绘画使用普通图层。源文件组不是可绘制图层。
- 角色方向从原始分组名读取，不按行号猜测。当前角色源文件的 side/down/up 与原 PNG 对应行顺序一致。


## 内置角色与手部保护
启动时自动载入用户给定的六套源文件，动作方向来自原始分组，不要假设正面一定是第一行。
`pixelAPI.getHandsInfo()` 返回当前素材的手部参考层及预览状态。
`pixelAPI.setHandsPreviewVisible(true/false)` 切换手部预览，不改变原始可见性或导出结果。
手部 referenceOnly 图层不可绘画、解锁、删除、移动、填充或改变透明度。衣服和头发请写入“衣服与发型”普通图层。
现有像素和导出接口默认返回包含原始手部的完整合成图。若 agent 需要不含手部的读图，可调用 `PE.app.canvasManager.getCompositeImageData(si, ai, fi, false)`，返回只读用途的 ImageData。

## 共享工程与自动恢复

默认自动恢复已保存的共享工程，首次升级会先保留浏览器旧版 IndexedDB 的 last 草稿。画笔、橡皮、图层及背景修改会自动保存。画布上方显示保存状态；未完成保存时关闭页面会提醒。

实际共享文件为项目目录下 `data/shared-project.json`，上一个磁盘版本保留为 `.bak`。背景只影响编辑预览，导出的 PNG 仍然透明。

Agent 后续修改应读取这份共享工程，不能仅修改内置素材后让用户刷新。推荐：

1. `GET http://localhost:8765/api/project`，保存响应的 ETag。
2. 基于完整工程修改指定图层，保留其余绘画、帧、手部保护和背景。
3. `PUT /api/project`，发送 JSON，并设置 `Content-Type: application/json`、`X-Pixel-Editor: 1`、`If-Match: <读取时的 ETag>`。
4. 409 表示用户或其他窗口已保存新版本，应重新读取后合并；不要覆盖。

网页在没有待保存笔画时自动接收共享更新。`pixelAPI.saveSharedProject()` 可手动触发保存，`pixelAPI.getSharedProjectInfo()` 可读取保存/加载/冲突状态，`pixelAPI.setPreviewBackground('#b8c8c3')` 修改并保存预览背景。

建议使用“启动编辑器.cmd”。直接打开 HTML 时，也会通过只保存在本机的连接凭据访问本地服务；服务没启动时保留浏览器备份，显示“共享未连接”，不会重置绘画。


## 保存策略更新
修改只标记未保存，不再定时保存、后台重试或切换窗口保存。点击“保存 / 上传 (Ctrl+S)”或按 Ctrl+S 将工程写入共享文件及浏览器恢复备份。关闭页面时如有未保存修改会提示。导出工程按钮仍用于下载独立工程文件。


## 可视化部件管理
右侧按头发、衣服、五官、身体、其他分类显示原生像素缩略卡。头发分前发、后发、饰品三个槽；点选用仅替换当前动作中同一槽的其他款式，前后发可以混搭，支持撤销。点卡片选中绘画图层，眼睛按钮单独显隐；不透明度和复制收在更多。仍需按钮或Ctrl+S保存共享工程。
发型统一使用共享五级色阶：#777585、#B3B0C9、#D1CFE2、#EEEDF6、#FFFFFF；饰品不随发色转换。


## 前后发语义
前发按刘海样式命名：斜刘海、齐刘海；后发按披发、双马尾命名。所有前发背面帧为空，后脑完整发型属于后发。背面合成通过 PE.getRenderLayers 将后发绘制在头部上、饰品下；画布与PNG回退使用相同顺序。背面前发卡片使用正面缩略图并注明背面不显示。
