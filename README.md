# 像素角色绘画编辑器 (Pixel Art Character Editor)

面向 AI Agent 与像素画师深度协作的专业 Web 像素角色精灵图编辑器。支持导入素材大图、智能切帧、多动作与朝向管理、多图层混合、逐像素精密编辑、撤销/重做栈、实时洋葱皮透光、原图差异高亮、动画连续预览、帧质量校验及一键批量打包导出。

---

## 🚀 启动与使用指南

本项目为原生 Web 应用（Vanilla JavaScript + HTML5 Canvas + CSS3），无需安装任何大型 Node 构建依赖。

### 本地启动方式

系统已提供零依赖极速本地静态服务脚本 `server.js`（纯原生 Node.js 内置模块实现，无需安装 npm 依赖）：

1. 打开终端（PowerShell 或 CMD），进入项目根目录：
   ```bash
   cd c:\Users\Administrator\Desktop\角色绘画
   ```

2. 启动服务（推荐 Node.js，或 Python）：
   ```bash
   node server.js
   # 或者使用其它静态服务：python -m http.server 8080 / npx serve
   ```

3. 打开现代浏览器（Chrome、Edge 或 Firefox）访问：
   - 🎨 **编辑工作台**: `http://localhost:8080`
   - 🧪 **自动化测试套件**: `http://localhost:8080/test.html`
   - 📑 **Agent API 文档**: `http://localhost:8080/API_DOCS.md`

---

## 工作台操作

- 动画帧上方提供“复制 / 剪切 / 粘贴”（Ctrl+C / X / V）：有选区时操作选区，无选区时操作当前图层；切换帧或朝向后仍能粘贴。
- “复制到下一帧”可连续点击；已存在下一帧时只复制当前图层，末帧时复制整帧新建下一帧。“复制整帧到末尾”会复制全部图层。均支持撤销。
- “批量复制”可选正面、侧面、背面或全部朝向，以及目标帧范围；默认叠加非透明像素，可显式选择覆盖粘贴范围。整批校验锁定和边界，一次撤销。复制不会自动把侧面画成正面。
- AI 可用 `pixelAPI.copyLayerToFrames(source, targets)` 直接跨帧、朝向批量复制；`getLayers()` 返回素材表、分组、保护状态和当前帧是否有内容。具体参数见 `API_DOCS.md`。

- 色板自动显示当前帧可见画面的颜色，点击取色。
- 每个图层有独立删除按钮，删除后可用 Ctrl+Z 撤销；锁定图层先解锁。
- “上传图片”支持框选局部、拖动裁选框和右下角调整范围；默认平滑缩小并保留原图颜色，可手动选择 8–64 色或最近邻缩放。放入后拖动图片移动、拖动右下角白色方块等比缩放，也可用“缩小图片 / 放大图片”按钮；取消选中后用“移动 / 缩放”点回图片，方向键微调，Ctrl+Z 撤销。关闭“转成像素图”也会保留半透明像素。
- “工程操作”中创建或管理分支；画布背景收在“画布设置”，“显示手部”直接放在画布上方。AI 助手入口已隐藏。
- 人物／衣服分支的头部、身体和手部跟随已保存的主工程，分支内只读；头发、五官、衣服独立。已有未保存草稿时暂停同步，保留草稿和版本冲突检查。独立稿与场景不参与同步。

---

## ✨ 核心功能列表

### 1. 绘图与工具箱
- **像素铅笔 (B/P)**：支持 1~16px 粗细无抗锯齿的精细像素绘制。
- **橡皮擦 (E)**：擦除指定图层像素至全透明。
- **吸色管 (I)**：从复合画布实时吸取目标坐标的 RGB 颜色并同步至前景色。
- **油漆桶 (G)**：基于广度优先搜索 (BFS) 快速填充闭合相同颜色区域。
- **选区框选 (M)**：矩形选区复制、粘贴与位移移动。
- **调色板系统**：内置经典 16 色复古像素调色板，支持动态添加自定义色彩与一键切换。

### 2. 精灵图管理与切帧 (SpriteSheet Slicing)
- **素材表导入**：支持一键导入单张或多张 PNG/JPG 精灵图。
- **切帧配置面板**：实时调节帧宽 (Width)、帧高 (Height)、行列数 (Columns/Rows)、行列间距 (Spacing) 与起始偏移量 (Offset)。
- **动作与朝向分类**：支持将帧序列归类至特定动作（如 `walk`, `attack`, `idle`）及方向（`down`, `left`, `right`, `up`）。

### 3. 多图层系统 (Layers)
- 独立图层新建、删除与排序。
- 图层可见性切换（👁/🚫）与锁定保护（🔒/🔓）。
- 0%~100% 不透明度实时无级调节。
- 复合图层实时渲染与非破坏性编辑。

### 4. 辅助视效与检查 (Inspection)
- **无级缩放与平移**：支持鼠标滚轮平滑缩放与空格键按住拖拽平移画布。
- **高对比像素网格**：随缩放等级自适应显示的网格基线。
- **洋葱皮模式 (Onion Skin)**：透光显示前后相邻关键帧，辅助动画对齐与动态流畅度调整。
- **变更高亮模式 (Diff)**：一键高亮对比当前编辑效果与原始素材帧的差异像素。
- **质量校验**：自动检测空白帧、尺寸合规性、锁定区域破坏与色板规范。
- **Contact Sheet 与连环预览**：一键生成动作序列排版图及前后三帧对照预览。

### 5. 动画实时预览 (Animation Player)
- 底部独立实时动画播放器。
- 支持 1~60 FPS 帧率实时无缝切换。
- 播放、暂停、停止、逐帧步进/后退控制。

### 6. 导出与工程存储
- **单帧 PNG 导出**：无损像素导出当前选中帧。
- **整表 SpriteSheet 导出**：重构并生成整张高精度精灵图。
- **全动作 ZIP 打包**：基于 JSZip 将所有动作和分帧一键压缩打包下载。
- **JSON 工程文件保存与恢复**：完整保存图层数据、锁定区域与审核备注，方便随时继续创作。

---

## 🤖 AI Agent 自动化接口 (pixelAPI)

本编辑器在全局作用域注入了专门设计的 `window.pixelAPI`，供 AI Agent 或后台脚本自动化控制。所有接口均采用统一结构化返回：

```javascript
{
  success: true,
  data: { ... },
  modifiedPixels: 42,
  rejectedPixels: []
}
```

详细的 API 规范、完整方法清单及丰富的工作流代码示例，请参阅：
👉 [**Agent API 接口文档 (API_DOCS.md)**](file:///c:/Users/Administrator/Desktop/角色绘画/API_DOCS.md)

### 常用快捷调用示例：
```javascript
// 获取当前帧信息
const info = pixelAPI.getFrameInfo();

// 批量修改图层像素
pixelAPI.setPixels(0, 0, 0, 0, [
  { x: 16, y: 16, r: 255, g: 255, b: 255, a: 255 }
]);

// 撤销上一步
pixelAPI.undo();

// 标记审核通过
pixelAPI.setFrameStatus(0, 0, 0, 'confirmed', 'AI 修订完成');
```

---

## ⌨️ 常用键盘快捷键

| 快捷键 | 功能说明 |
| :--- | :--- |
| `B` 或 `P` | 切换为 **铅笔** 工具 |
| `E` | 切换为 **橡皮擦** 工具 |
| `I` | 切换为 **吸色管** 工具 |
| `G` | 切换为 **油漆桶** 填充工具 |
| `M` | 切换为 **选区** 工具 |
| `[` / `]` | 缩小 / 放大笔刷粗细 (1px ~ 16px) |
| `Space + 鼠标左键拖拽` | 平移移动画布视野 |
| `Ctrl + Z` | 撤销上一步 (Undo) |
| `Ctrl + Y` 或 `Ctrl + Shift + Z` | 重做 (Redo) |
| `Ctrl + S` | 导出项目工程文件 (.json) |
| `←` / `→` (方向键) | 快速切换上一帧 / 下一帧 |

---

## 📁 项目目录结构

```text
角色绘画/
├── index.html         # 主编辑器工作台页面
├── test.html          # 自动化测试套件页面 (一键验证30项核心指标)
├── server.js          # 本地静态服务启动脚本 (Node.js 零依赖)
├── API_DOCS.md        # 完整 Agent API 接口使用文档 (58 个结构化方法)
├── README.md          # 项目说明与操作指南
├── assets/
│   └── sample_character.png # 预置 4 帧标准角色动作表素材 (32x32)
├── test/
│   └── test_suite.js  # 全流程自动化测试套件
├── css/
│   └── style.css      # 暗黑主题、像素渲染与响应式样式
└── js/
    ├── core.js        # 数据核心结构 (Project, SpriteSheet, Layer, Frame)
    ├── history.js     # 撤销/重做历史管理器 (HistoryManager)
    ├── canvas.js      # 画布渲染与坐标映射器 (CanvasManager)
    ├── tools.js       # 交互工具控制器 (ToolManager)
    ├── spritesheet.js # 精灵图切割与导入管理器 (SpriteSheetManager)
    ├── animation.js   # 动画实时播放器 (AnimationPlayer)
    ├── inspection.js  # 检查、校验、Diff 对比器 (InspectionManager)
    ├── export.js      # 导出与 ZIP 压缩管理器 (ExportManager)
    ├── api.js         # 全局 Agent API 模块 (window.pixelAPI)
    └── app.js         # 应用入口与事件控制器 (PE.App)
```

---

## ⚠️ 已知限制与注意事项

1. **同源策略限制 (CORS)**：请务必通过 HTTP 服务（如 `python -m http.server`）打开网页，直接双击 `file://` 打开可能导致部分浏览器阻止跨域读取 Canvas 像素及导出 Blob。
2. **内存与超大图建议**：建议单个 SpriteSheet 分辨率控制在 2048x2048 以内，以保证全图层复合渲染与动画播放的最佳流畅度。
3. **坐标范围**：所有绘图 API 的像素坐标均受限于当前帧的 `frameWidth` 与 `frameHeight`，超出范围的像素将被自动拦截并在 `rejectedPixels` 中予以报告。
