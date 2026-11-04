/**
 * Outline engine（自动描边 + 自动填充闭合图形 + 实时预览）。
 *  - 实时：点击「描边」开启后，边画边看到描边 / 填充，不用等松手。
 *  - 自动描边：铅笔 / 橡皮 / 填充 / 直线 / 矩形 / 椭圆画出的新内容会自动补一圈外轮廓，
 *    默认颜色 #46465e，可调。
 *  - 自动填充：如果画的线围成了一个闭合区域（比如一个圆），自动把里面填成当前画笔色。
 *  - 手动整层描边：把当前图层一次性描一遍（保留旧接口 pixelAPI.outline）。
 * 自动与手动都并入同一步撤销，画笔 + 描边 + 填充可一起 Ctrl+Z 撤回。
 */
window.PE = window.PE || {};

(() => {
  'use strict';

  const DEFAULT_COLOR = { r: 0x46, g: 0x46, b: 0x5e, a: 255 }; // #46465e

  const state = {
    auto: false,           // 自动描边开关
    autoFill: true,        // 围出闭合区域时自动填充
    color: { ...DEFAULT_COLOR },
    thickness: 1,
    diagonal: false,
    // 手动整层描边参数
    mode: 'outside',
    scope: 'frame',
    limitToSelection: false,
    followForeground: false,
    // 内部状态
    _op: null,             // 当前正在记录的一次绘制操作
    _live: null            // 实时预览：{ fill:[idx], outline:[idx], W, fillColor, outlineColor }
  };

  PE.outline = state;

  const TOOL_LABEL = { pencil: '铅笔', eraser: '橡皮', fill: '填充', line: '直线', rect: '矩形', ellipse: '椭圆' };
  const AUTO_TOOLS = ['pencil', 'eraser', 'fill', 'line', 'rect', 'ellipse'];
  const LIVE_TOOLS = ['pencil', 'line', 'rect', 'ellipse'];

  function clampThickness(value) {
    return Math.max(1, Math.min(8, Math.round(value || 1)));
  }

  function guard(layer, frame) {
    if (!layer) return '请先选择一个图层';
    if (layer.isGroup) return '请选择具体图层，不要选组';
    if (layer.locked) return '当前图层已锁定，请先解锁';
    if (layer.inheritedBase) return '头部、身体跟随主工程，请到主工程描边';
    if (PE.isProtectedHandLayer && PE.isProtectedHandLayer(layer)) return '手部参考层受保护，不能描边';
    if (frame && frame.locked) return '当前帧已锁定';
    return '';
  }

  // ==========================================
  // 掩膜 / 连通性工具
  // ==========================================

  function buildFilledMask(data) {
    const W = data.width, H = data.height;
    const out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = data.data[i * 4 + 3] > 0 ? 1 : 0;
    return out;
  }

  function computeNewContentMask(data, snapshot) {
    const W = data.width, H = data.height;
    const out = new Uint8Array(W * H);
    const oc = state.color;
    const isOutline = (r, g, b, a) => a === 255 && r === oc.r && g === oc.g && b === oc.b;
    for (let i = 0; i < out.length; i++) {
      const a = data.data[i * 4 + 3];
      if (a === 0) continue;
      if (isOutline(data.data[i * 4], data.data[i * 4 + 1], data.data[i * 4 + 2], a)) continue; // 仍是描边色
      let wasContent = false;
      if (snapshot) {
        const oa = snapshot.data[i * 4 + 3];
        if (oa !== 0) wasContent = !isOutline(snapshot.data[i * 4], snapshot.data[i * 4 + 1], snapshot.data[i * 4 + 2], oa);
      }
      if (!wasContent) out[i] = 1;
    }
    return out;
  }

  /** 从画布边框出发、沿「空」格子四连通能到达的位置（= 外部）。 */
  function reachableFromBorder(emptyMask, W, H) {
    const seen = new Uint8Array(W * H);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      if (seen[i] || !emptyMask[i]) return;
      seen[i] = 1; stack.push(i);
    };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i - x) / W;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    return seen;
  }

  function buildOffsets(thickness, diagonal) {
    const offsets = [];
    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness; dx <= thickness; dx++) {
        if (!dx && !dy) continue;
        if (!diagonal && Math.abs(dx) + Math.abs(dy) > thickness) continue;
        offsets.push([dx, dy]);
      }
    }
    return offsets;
  }

  /**
   * 综合算出「需要填充的闭合区域」与「需要描边的地方」。
   * @param {{W:number,H:number,wallsMask:Uint8Array,newContentMask:Uint8Array,snapshotWallsMask:Uint8Array,inside:Function|null,frame:PE.Frame}} cfg
   * @returns {{fill:number[], outline:number[]}}  以 y*W+x 索引
   */
  function computeEffect(cfg) {
    const { W, H, wallsMask, newContentMask, snapshotWallsMask, inside, frame } = cfg;
    const total = W * H;
    const offsets = buildOffsets(clampThickness(state.thickness), state.diagonal);

    // 现在 / 之前 的「外部可达」区域
    const emptyNow = new Uint8Array(total);
    for (let i = 0; i < total; i++) emptyNow[i] = wallsMask[i] ? 0 : 1;
    const reachNow = reachableFromBorder(emptyNow, W, H);
    const emptyBefore = new Uint8Array(total);
    for (let i = 0; i < total; i++) emptyBefore[i] = snapshotWallsMask[i] ? 0 : 1;
    const reachBefore = reachableFromBorder(emptyBefore, W, H);

    const fill = [];
    const solid = new Uint8Array(wallsMask); // 墙 + 本次新增的填充
    if (state.autoFill) {
      for (let i = 0; i < total; i++) {
        if (wallsMask[i]) continue;
        if (reachNow[i]) continue;       // 现在还通到外面 → 没闭合
        if (!reachBefore[i]) continue;   // 之前就已经被围住（旧洞）→ 不重复填
        const x = i % W, y = (i - x) / W;
        if (inside && !inside(x, y)) continue;
        if (frame.isPixelLocked(x, y)) continue;
        fill.push(i);
        solid[i] = 1;
      }
    }

    // 新内容 = 本次笔画/图形 + 刚填充的区域
    const newSolid = new Uint8Array(newContentMask);
    for (const i of fill) newSolid[i] = 1;

    const outline = [];
    for (let i = 0; i < total; i++) {
      if (solid[i]) continue;            // 只在空格子里描
      const x = i % W, y = (i - x) / W;
      let hit = false;
      for (let k = 0; k < offsets.length; k++) {
        const nx = x + offsets[k][0], ny = y + offsets[k][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (newSolid[ny * W + nx]) { hit = true; break; }
      }
      if (!hit) continue;
      if (inside && !inside(x, y)) continue;
      if (frame.isPixelLocked(x, y)) continue;
      outline.push(i);
    }

    return { fill, outline };
  }

  // ==========================================
  // 自动描边 + 自动填充：一次绘制结束时落笔 / 绘制过程中实时预览
  // ==========================================

  function setLive(fill, outline, W, fillColor, outlineColor) {
    if ((!fill || !fill.length) && (!outline || !outline.length)) { state._live = null; return; }
    state._live = {
      fill: fill || [], outline: outline || [], W,
      fillColor: { r: fillColor.r, g: fillColor.g, b: fillColor.b },
      outlineColor: { r: outlineColor.r, g: outlineColor.g, b: outlineColor.b }
    };
  }

  function computeLivePencil(op) {
    const data = op.layer.getFrameData(op.key);
    if (!data || data.placement) { state._live = null; return; }
    const W = data.width, H = data.height;
    const walls = buildFilledMask(data);
    const newContent = computeNewContentMask(data, op.snapshot);
    const { fill, outline } = computeEffect({
      W, H, wallsMask: walls, newContentMask: newContent,
      snapshotWallsMask: op.snapshotFilled, inside: op.inside, frame: op.frame
    });
    setLive(fill, outline, W, op.fillColor, state.color);
  }

  function computeLiveShape(op, tools) {
    const shape = tools._shape;
    if (!shape || typeof tools._shapePixels !== 'function') { state._live = null; return; }
    const frame = op.frame, W = frame.width, H = frame.height;
    const walls = Uint8Array.from(op.snapshotFilled);
    const newContent = new Uint8Array(W * H);
    let pixels = [];
    try { pixels = tools._withSymmetry(tools._shapePixels(shape), tools.activeSymmetry()); } catch (_) { pixels = []; }
    for (const p of pixels) {
      const x = p.x, y = p.y;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      walls[i] = 1; newContent[i] = 1;
    }
    const { fill, outline } = computeEffect({
      W, H, wallsMask: walls, newContentMask: newContent,
      snapshotWallsMask: op.snapshotFilled, inside: op.inside, frame
    });
    setLive(fill, outline, W, op.fillColor, state.color);
  }

  function updateLive(tools) {
    const op = state._op;
    if (!op) return;
    const tool = op.tool;
    if (tool === 'pencil') computeLivePencil(op);
    else if (tool === 'line' || tool === 'rect' || tool === 'ellipse') computeLiveShape(op, tools);
    else state._live = null;
    // 主绘制已经渲染过一次（还没有 overlay），这里再渲染一次把实时描边/填充盖上去。
    if (tools && tools.canvasManager) tools.canvasManager.render();
  }

  function collectNetChanges(op, snapshot, data) {
    const W = data.width, H = data.height;
    const changes = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const nr = data.data[i], ng = data.data[i + 1], nb = data.data[i + 2], na = data.data[i + 3];
        let or = 0, og = 0, ob = 0, oa = 0;
        if (snapshot) { or = snapshot.data[i]; og = snapshot.data[i + 1]; ob = snapshot.data[i + 2]; oa = snapshot.data[i + 3]; }
        if (nr !== or || ng !== og || nb !== ob || na !== oa) {
          changes.push({ layerIndex: op.layerIdx, frameKey: op.key, x, y, oldR: or, oldG: og, oldB: ob, oldA: oa, newR: nr, newG: ng, newB: nb, newA: na });
        }
      }
    }
    return changes;
  }

  function finalizeOp() {
    const op = state._op;
    state._op = null;
    state._live = null;
    if (!op) return;
    const data = op.layer.getFrameData(op.key);
    if (!data || data.placement) { if (PE.app?.canvasManager) PE.app.canvasManager.render(); return; }

    const W = data.width, H = data.height;
    const snapshot = op.snapshot && op.snapshot.width === W && op.snapshot.height === H ? op.snapshot : null;
    const snapshotFilled = op.snapshotFilled && op.snapshotFilled.length === W * H ? op.snapshotFilled : (snapshot ? buildFilledMask(snapshot) : new Uint8Array(W * H));

    const walls = buildFilledMask(data);
    const newContent = computeNewContentMask(data, snapshot);
    const { fill, outline } = computeEffect({
      W, H, wallsMask: walls, newContentMask: newContent,
      snapshotWallsMask: snapshotFilled, inside: op.inside, frame: op.frame
    });

    const fillColor = op.fillColor || { r: 0, g: 0, b: 0, a: 255 };
    // 先把闭合区域填成画笔色（填充先落，描边才能只描在最外圈）
    for (const i of fill) {
      const x = i % W, y = (i - x) / W;
      PE.utils.setPixelInImageData(data, x, y, fillColor.r, fillColor.g, fillColor.b, 255);
    }
    const oc = state.color;
    for (const i of outline) {
      const x = i % W, y = (i - x) / W;
      PE.utils.setPixelInImageData(data, x, y, oc.r, oc.g, oc.b, 255);
    }

    const changes = collectNetChanges(op, snapshot, data);
    const history = PE.app && PE.app.history;
    if (history) {
      while (history.undoStack.length > op.beforeLen) history.undoStack.pop();
      if (changes.length) {
        const label = state.auto ? `${TOOL_LABEL[op.tool] || '绘制'} · 自动描边` : (TOOL_LABEL[op.tool] || '绘制');
        history.undoStack.push({ description: label, timestamp: Date.now(), changes });
        if (history.undoStack.length > history.maxSteps) history.undoStack.shift();
        history.redoStack = [];
        history._notifyChange();
      }
    }

    if (PE.app && PE.app.canvasManager) PE.app.canvasManager.render();
  }

  function snapshotOp(tools) {
    state._op = null;
    state._live = null;
    if (!state.auto) return;
    if (!tools || !tools.project) return;
    if (!AUTO_TOOLS.includes(tools.currentTool)) return;

    const project = tools.project;
    const layer = project.getCurrentLayer();
    const frame = project.getCurrentFrame();
    if (!layer || !frame) return;
    if (layer.isGroup || layer.locked || layer.inheritedBase) return;
    if (PE.isProtectedHandLayer && PE.isProtectedHandLayer(layer)) return;
    if (!layer.visible) return;
    if (frame.locked) return;

    const key = project.getFrameKey();
    const existing = layer.getFrameData(key);
    if (existing && existing.placement) return;

    const primary = tools.primaryColor || { r: 0, g: 0, b: 0, a: 255 };
    state._op = {
      tool: tools.currentTool,
      project, layer, frame, key,
      layerIdx: project.currentLayerIndex,
      snapshot: existing ? PE.utils.cloneImageData(existing) : null,
      snapshotFilled: existing ? buildFilledMask(existing) : new Uint8Array(frame.width * frame.height),
      inside: makeInsideFn(tools),
      fillColor: { r: primary.r, g: primary.g, b: primary.b },
      beforeLen: tools.historyManager ? tools.historyManager.undoStack.length : 0
    };
  }

  function makeInsideFn(tools) {
    const mask = PE.selectionPlus && PE.selectionPlus.mask;
    const sel = tools && tools.selection;
    if (!mask && !sel) return null;
    const inside = PE.insideSelection;
    if (inside) return (x, y) => inside(x, y, sel);
    if (sel) return (x, y) => x >= sel.x && y >= sel.y && x < sel.x + sel.w && y < sel.y + sel.h;
    return null;
  }

  function installToolHooks() {
    const proto = PE.ToolManager && PE.ToolManager.prototype;
    if (!proto || proto.__autoOutline) return;
    const down = proto.onMouseDown;
    const up = proto.onMouseUp;
    const move = proto.onMouseMove;

    proto.onMouseDown = function () {
      snapshotOp(this);
      const result = down.apply(this, arguments);
      if (state._op) {
        if (state._op.tool === 'fill') finalizeOp();
        else updateLive(this);
      }
      return result;
    };

    proto.onMouseMove = function () {
      const result = move.apply(this, arguments);
      if (state._op && LIVE_TOOLS.includes(state._op.tool)) updateLive(this);
      return result;
    };

    proto.onMouseUp = function () {
      const result = up.apply(this, arguments);
      if (state._op) finalizeOp();
      return result;
    };

    // 切换工具/取消图形时清掉残留的实时预览
    const setTool = proto.setTool;
    proto.setTool = function () {
      state._op = null;
      state._live = null;
      return setTool.apply(this, arguments);
    };

    proto.__autoOutline = true;
  }

  // 实时预览覆盖层：在正常渲染之后把「拟填充 + 拟描边」画到画布上
  function installRenderHook() {
    const proto = PE.CanvasManager && PE.CanvasManager.prototype;
    if (!proto || proto.__autoOutlineRender) return;
    const original = proto.render;
    proto.render = function () {
      original.apply(this, arguments);
      const live = state._live;
      if (!live || !this.ctx) return;
      if (!state._op) { state._live = null; return; } // 没有进行中的笔画 → 丢掉残留
      const ctx = this.ctx, zoom = this.zoom, ox = this.offsetX, oy = this.offsetY, W = live.W;
      ctx.save();
      if (live.fill.length) {
        ctx.fillStyle = `rgb(${live.fillColor.r},${live.fillColor.g},${live.fillColor.b})`;
        for (const i of live.fill) { const x = i % W, y = (i - x) / W; ctx.fillRect(ox + x * zoom, oy + y * zoom, zoom, zoom); }
      }
      if (live.outline.length) {
        ctx.fillStyle = `rgb(${live.outlineColor.r},${live.outlineColor.g},${live.outlineColor.b})`;
        for (const i of live.outline) { const x = i % W, y = (i - x) / W; ctx.fillRect(ox + x * zoom, oy + y * zoom, zoom, zoom); }
      }
      ctx.restore();
    };
    proto.__autoOutlineRender = true;
  }

  // ==========================================
  // 手动整层描边（保留旧接口）
  // ==========================================

  function computeMask(imageData, options = {}) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const mode = options.mode === 'inside' ? 'inside' : 'outside';
    const thickness = clampThickness(options.thickness || state.thickness);
    const diagonal = options.diagonal === true;

    const filled = new Uint8Array(width * height);
    for (let i = 0; i < filled.length; i++) filled[i] = src[i * 4 + 3] > 0 ? 1 : 0;

    const offsets = buildOffsets(thickness, diagonal);
    const result = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const isFilled = filled[index] === 1;
        if (mode === 'outside' && isFilled) continue;
        if (mode === 'inside' && !isFilled) continue;
        let hit = false;
        for (const [dx, dy] of offsets) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const target = filled[ny * width + nx];
          if (mode === 'outside' ? target === 1 : target === 0) { hit = true; break; }
        }
        if (hit) result[index] = 1;
      }
    }
    return result;
  }

  function resolveColor(app) {
    if (state.followForeground) {
      const color = app.toolManager.primaryColor || { r: 0, g: 0, b: 0, a: 255 };
      return { r: color.r, g: color.g, b: color.b, a: 255 };
    }
    return { ...state.color, a: 255 };
  }

  function collectFrames(project, scope) {
    const out = [];
    const push = (si, ai, fi) => out.push({ si, ai, fi });
    if (scope === 'frame') { push(project.currentSheetIndex, project.currentActionIndex, project.currentFrameIndex); return out; }
    if (scope === 'action') {
      const action = project.spriteSheets[project.currentSheetIndex]?.actions?.[project.currentActionIndex];
      (action?.frames || []).forEach((frame, fi) => push(project.currentSheetIndex, project.currentActionIndex, fi));
      return out;
    }
    if (scope === 'sheet') {
      const sheet = project.spriteSheets[project.currentSheetIndex];
      (sheet?.actions || []).forEach((action, ai) => (action.frames || []).forEach((frame, fi) => push(project.currentSheetIndex, ai, fi)));
      return out;
    }
    project.spriteSheets.forEach((sheet, si) => {
      (sheet?.actions || []).forEach((action, ai) => (action.frames || []).forEach((frame, fi) => push(si, ai, fi)));
    });
    return out;
  }

  function apply(options = {}) {
    const app = PE.app;
    const tools = app && app.toolManager;
    const project = app && app.project;
    if (!project || !tools) return { success: false, frames: 0, modifiedCount: 0, reason: '编辑器还没准备好' };

    const layer = project.getCurrentLayer();
    const frame = project.getCurrentFrame();
    const block = guard(layer, frame);
    if (block) return { success: false, frames: 0, modifiedCount: 0, reason: block };

    const currentKey = project.getFrameKey();
    if (layer.getFrameData(currentKey)?.placement) return { success: false, frames: 0, modifiedCount: 0, reason: '高清图片图层不能逐像素描边，请先栅格化' };

    const mode = options.mode || state.mode;
    const thickness = clampThickness(options.thickness || state.thickness);
    const diagonal = options.diagonal !== undefined ? options.diagonal : state.diagonal;
    const scope = options.scope || state.scope;
    const limitToSelection = options.limitToSelection !== undefined ? options.limitToSelection : state.limitToSelection;
    const color = options.color ? { ...options.color, a: 255 } : resolveColor(app);

    const selection = state.mask || tools.selection;
    if (limitToSelection && !selection) return { success: false, frames: 0, modifiedCount: 0, reason: '没有选区，请先框选或用魔棒建立选区' };

    const inside = PE.insideSelection || (() => true);
    const layerIndex = project.currentLayerIndex;
    const history = tools.historyManager;
    const autoCommit = history && !history.currentBatch;
    if (autoCommit) history.beginBatch(mode === 'inside' ? '内描边' : '外描边');

    let modifiedCount = 0, touchedFrames = 0;
    for (const { si, ai, fi } of collectFrames(project, scope)) {
      const sheet = project.spriteSheets[si];
      const target = sheet?.actions?.[ai]?.frames?.[fi];
      if (!target || target.locked) continue;
      if (layer.sheetIndex !== undefined && layer.sheetIndex !== si) continue;

      const key = project.getFrameKey(si, ai, fi);
      const existing = layer.getFrameData(key);
      if (existing?.placement) continue;

      const data = existing || layer.ensureFrameData(key, target.width, target.height);
      if (!data || data.width !== target.width || data.height !== target.height) continue;

      const mask = computeMask(data, { mode, thickness, diagonal });
      let touched = false;
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          if (!mask[y * data.width + x]) continue;
          if ((state.mask || tools.selection) && !inside(x, y, tools.selection)) continue;
          if (target.isPixelLocked(x, y)) continue;
          const oldColor = PE.utils.getPixelFromImageData(data, x, y) || { r: 0, g: 0, b: 0, a: 0 };
          if (PE.utils.comparePixels(oldColor, color)) continue;
          if (history) history.recordPixelChange(layerIndex, key, x, y, oldColor, color);
          PE.utils.setPixelInImageData(data, x, y, color.r, color.g, color.b, color.a);
          modifiedCount++; touched = true;
        }
      }
      if (touched) touchedFrames++;
    }

    if (autoCommit) history.commitBatch();
    if (tools.canvasManager) tools.canvasManager.render();
    app.updateFrameList?.();
    app.updatePalette?.();
    app.updateHistoryButtons?.();

    if (!modifiedCount) {
      const reason = mode === 'outside' ? '没有可描边的透明边缘（图层可能是空的）' : '没有可描边的内侧边缘';
      return { success: false, frames: 0, modifiedCount: 0, reason };
    }
    return { success: true, frames: touchedFrames, modifiedCount, reason: '' };
  }

  function toast(message) { if (PE.toast) PE.toast(message); }

  function rgbToHex(color) {
    return '#' + [color.r, color.g, color.b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

  function installApi() {
    const api = window.pixelAPI;
    if (!api) return;
    api.outline = (options = {}) => {
      const result = apply(options);
      return {
        success: result.success,
        modifiedPixels: result.modifiedCount,
        data: { frames: result.frames, mode: options.mode || state.mode, thickness: options.thickness || state.thickness },
        rejectedPixels: [],
        message: result.success ? `描边完成：${result.frames} 帧 / ${result.modifiedCount} 像素` : result.reason
      };
    };
  }

  // ==========================================
  // 界面
  // ==========================================

  function loadSettings() {
    try {
      const color = localStorage.getItem('pe-outline-color');
      if (color) state.color = { ...PE.utils.hexToRGBA(color), a: 255 };
      const thickness = Number(localStorage.getItem('pe-outline-thickness'));
      if (Number.isFinite(thickness) && thickness > 0) state.thickness = clampThickness(thickness);
      state.diagonal = localStorage.getItem('pe-outline-diagonal') === '1';
      const autoFill = localStorage.getItem('pe-outline-autofill');
      if (autoFill === '0') state.autoFill = false;
    } catch (_) { /* ignore */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem('pe-outline-color', rgbToHex(state.color));
      localStorage.setItem('pe-outline-thickness', String(state.thickness));
      localStorage.setItem('pe-outline-diagonal', state.diagonal ? '1' : '0');
      localStorage.setItem('pe-outline-autofill', state.autoFill ? '1' : '0');
    } catch (_) { /* ignore */ }
  }

  function buildPanel() {
    const viewbar = document.querySelector('#center-viewport .canvas-viewbar .view-actions');
    const host = viewbar || document.querySelector('#center-viewport') || document.body;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'subtle-button plus-outline-toggle';
    toggle.textContent = '描边';
    toggle.title = '自动描边：点一下开启，之后画任何图形都会实时自动加描边，围成闭合区域还会自动填充';
    host.append(toggle);

    const panel = document.createElement('div');
    panel.className = 'plus-panel';
    panel.id = 'plus-outline-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="plus-panel-head">
        <strong>自动描边</strong>
        <span class="plus-badge" id="plus-outline-state">关闭</span>
        <button type="button" class="plus-close" aria-label="关闭">×</button>
      </div>
      <div class="plus-row plus-inline">
        <label class="plus-check"><input type="checkbox" id="plus-outline-auto"> 开启自动描边</label>
        <label class="plus-check"><input type="checkbox" id="plus-outline-autofill" checked> 闭合图形自动填充</label>
      </div>
      <div class="plus-row plus-inline">
        <label class="plus-check">描边颜色 <input type="color" id="plus-outline-color" value="#46465e" title="描边颜色"></label>
        <label class="plus-check">粗细 <input type="number" id="plus-outline-thickness" min="1" max="8" step="1" value="1" class="plus-number"></label>
        <label class="plus-check"><input type="checkbox" id="plus-outline-diagonal"> 含斜角</label>
      </div>
      <div class="plus-row plus-inline">
        <button type="button" class="action-btn-primary" id="plus-outline-apply">整层描边一次</button>
      </div>
      <p class="plus-hint">边画边预览：画铅笔 / 直线 / 矩形 / 椭圆时会实时显示描边和填充；围出闭合区域会自动用画笔色填满。松手落定，画笔 + 描边 + 填充一起 Ctrl+Z 撤销。默认描边色 #46465e，可改。</p>
    `;

    (document.querySelector('#center-viewport') || document.body).append(panel);

    const autoCheck = panel.querySelector('#plus-outline-auto');
    const autoFillCheck = panel.querySelector('#plus-outline-autofill');
    const colorInput = panel.querySelector('#plus-outline-color');
    const thicknessInput = panel.querySelector('#plus-outline-thickness');
    const diagonalInput = panel.querySelector('#plus-outline-diagonal');
    const stateBadge = panel.querySelector('#plus-outline-state');
    const applyButton = panel.querySelector('#plus-outline-apply');

    const syncAutoUi = () => {
      toggle.classList.toggle('active', state.auto);
      toggle.setAttribute('aria-pressed', state.auto ? 'true' : 'false');
      toggle.textContent = state.auto ? '描边 · 开' : '描边';
      autoCheck.checked = state.auto;
      autoFillCheck.checked = state.autoFill;
      stateBadge.textContent = state.auto ? '开启' : '关闭';
      stateBadge.dataset.mode = state.auto ? 'on' : 'off';
      colorInput.value = rgbToHex(state.color);
      thicknessInput.value = String(state.thickness);
      diagonalInput.checked = state.diagonal;
    };

    toggle.addEventListener('click', () => {
      state.auto = !state.auto;
      panel.hidden = false;
      syncAutoUi();
      saveSettings();
      toast(state.auto ? '自动描边已开启：边画边自动描边 / 填充' : '自动描边已关闭');
    });

    panel.querySelector('.plus-close').addEventListener('click', () => { panel.hidden = true; });

    autoCheck.addEventListener('change', () => {
      state.auto = autoCheck.checked;
      syncAutoUi(); saveSettings();
      toast(state.auto ? '自动描边已开启' : '自动描边已关闭');
    });

    autoFillCheck.addEventListener('change', () => {
      state.autoFill = autoFillCheck.checked;
      saveSettings();
    });

    colorInput.addEventListener('input', () => {
      state.color = { ...PE.utils.hexToRGBA(colorInput.value), a: 255 };
      saveSettings();
    });

    thicknessInput.addEventListener('change', () => {
      state.thickness = clampThickness(Number(thicknessInput.value));
      thicknessInput.value = String(state.thickness);
      saveSettings();
    });

    diagonalInput.addEventListener('change', () => {
      state.diagonal = diagonalInput.checked;
      saveSettings();
    });

    applyButton.addEventListener('click', () => {
      const result = apply();
      toast(result.success ? `整层描边完成：${result.frames} 帧 / ${result.modifiedCount} 像素` : result.reason);
    });

    syncAutoUi();
    return panel;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    if (!app || !app.toolManager) return;
    loadSettings();
    installToolHooks();
    installRenderHook();
    buildPanel();
    installApi();
  });
})();
