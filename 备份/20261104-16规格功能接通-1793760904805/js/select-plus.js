/**
 * Selection upgrades: magic wand + lasso, mask-based selection, in-selection color replace.
 * 魔棒 / 套索 / 不规则选区换色。以「掩膜 + 包围盒」的方式接入原有矩形选区系统：
 * 原有 setSelection / copySelection / 移动 逻辑继续按包围盒工作，掩膜只收紧参与运算的像素。
 */
window.PE = window.PE || {};

(() => {
  'use strict';

  const WAND_TOOL = 'wand';
  const LASSO_TOOL = 'lasso';

  const state = {
    /** @type {{x:number,y:number,w:number,h:number,width:number,height:number,data:Uint8Array}|null} */
    mask: null,
    tolerance: 16,
    contiguous: true,
    sampleComposite: true, // 默认按“看到的全部图层”取样，点哪选哪（等同 PS 的“对所有图层取样”）
    lasso: null,
    antsPhase: 0
  };

  PE.selectionPlus = state;

  const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function inFrame(x, y, w, h) {
    return x >= 0 && y >= 0 && x < w && y < h;
  }

  function activeToolModifier() {
    if (PE.shapeShift) return 'add';
    if (PE.altPrecision) return 'subtract';
    return 'replace';
  }

  function colorDiff(a, b) {
    if (!a || !b) return 255;
    return Math.max(
      Math.abs(a.r - b.r),
      Math.abs(a.g - b.g),
      Math.abs(a.b - b.b),
      Math.abs((a.a === undefined ? 255 : a.a) - (b.a === undefined ? 255 : b.a))
    );
  }

  function maskHas(mask, x, y) {
    if (!mask) return true;
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
    return mask.data[y * mask.width + x] === 1;
  }

  function maskIsRect(mask) {
    if (!mask) return true;
    for (let y = mask.y; y < mask.y + mask.h; y++) {
      for (let x = mask.x; x < mask.x + mask.w; x++) {
        if (mask.data[y * mask.width + x] !== 1) return false;
      }
    }
    return true;
  }

  /** 选区命中判定：有掩膜按掩膜，否则按矩形。 */
  function insideSelection(x, y, selection) {
    if (state.mask) return maskHas(state.mask, x, y);
    if (!selection) return false;
    return x >= selection.x && y >= selection.y && x < selection.x + selection.w && y < selection.y + selection.h;
  }
  PE.insideSelection = insideSelection;

  function syncUi() {
    const badge = document.getElementById('plus-selection-info');
    if (!badge) return;
    const mask = state.mask;
    if (!mask) {
      badge.textContent = '无选区';
      badge.dataset.mode = 'none';
      return;
    }
    badge.dataset.mode = maskIsRect(mask) ? 'rect' : 'shape';
    badge.textContent = `${mask.w}×${mask.h}${maskIsRect(mask) ? '' : ' 不规则'}`;
  }

  function setMask(tools, data, width, height) {
    let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!data[y * width + x]) continue;
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (!count) {
      clearMask(tools);
      return null;
    }
    state.mask = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, width, height, data };
    const rect = { x: minX, y: minY, w: state.mask.w, h: state.mask.h };
    tools.selection = rect;
    tools.selectionData = null;
    if (tools.canvasManager) tools.canvasManager.selection = rect;
    syncUi();
    return rect;
  }

  function clearMask(tools) {
    state.mask = null;
    state.lasso = null;
    syncUi();
    if (tools && tools.canvasManager) tools.canvasManager.render();
  }

  function combineSelection(tools, incoming, width, height, mode) {
    const base = state.mask;
    if (!base || base.width !== width || base.height !== height || mode === 'replace') {
      return setMask(tools, incoming, width, height);
    }
    const merged = new Uint8Array(base.data);
    for (let i = 0; i < merged.length; i++) {
      if (!incoming[i]) continue;
      merged[i] = mode === 'subtract' ? 0 : 1;
    }
    return setMask(tools, merged, width, height);
  }

  function sourceImage(tools) {
    const project = tools.project;
    const layer = project && project.getCurrentLayer();
    if (!layer) return null;
    if (state.sampleComposite) {
      return tools.canvasManager ? tools.canvasManager.getCompositeImageData() : null;
    }
    const data = layer.getFrameData(project.getFrameKey());
    if (data && data.placement) return { placement: true };
    return data;
  }

  function magicWand(tools, px, py) {
    const project = tools.project;
    const frame = project && project.getCurrentFrame();
    if (!frame) return null;
    const image = sourceImage(tools);
    if (!image) {
      toast('当前图层没有像素，魔棒无从取样');
      return null;
    }
    if (image.placement) {
      toast('高清图片图层不能魔棒选取，请先栅格化');
      return null;
    }

    const width = frame.width;
    const height = frame.height;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    if (!inFrame(x0, y0, width, height)) return null;

    const target = PE.utils.getPixelFromImageData(image, x0, y0) || { r: 0, g: 0, b: 0, a: 0 };
    const tolerance = state.tolerance;

    const matches = (x, y) => {
      const color = PE.utils.getPixelFromImageData(image, x, y);
      if (!color) return false;
      return colorDiff(color, target) <= tolerance;
    };

    const result = new Uint8Array(width * height);

    if (state.contiguous) {
      const seen = new Uint8Array(width * height);
      const queue = [y0 * width + x0];
      seen[y0 * width + x0] = 1;
      while (queue.length) {
        const index = queue.pop();
        const x = index % width;
        const y = (index - x) / width;
        if (!matches(x, y)) continue;
        result[index] = 1;
        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inFrame(nx, ny, width, height)) continue;
          const next = ny * width + nx;
          if (seen[next]) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (matches(x, y)) result[y * width + x] = 1;
        }
      }
    }

    const rect = combineSelection(tools, result, width, height, activeToolModifier());
    if (rect) {
      const count = result.reduce((sum, v) => sum + v, 0);
      toast(`魔棒选取 ${count} 像素 · 容差 ${tolerance}${state.contiguous ? ' · 连续' : ' · 全图同色'}`);
    } else {
      toast('魔棒没有选中任何像素，可调大容差');
    }
    return rect;
  }

  function lassoStart(tools, px, py) {
    const project = tools.project;
    const frame = project && project.getCurrentFrame();
    if (!frame) return;
    const x = Math.max(0, Math.min(frame.width, px));
    const y = Math.max(0, Math.min(frame.height, py));
    state.lasso = { points: [{ x, y }], mode: activeToolModifier() };
    tools.isDrawing = true;
    tools._isSelecting = true;
    tools.lastX = px;
    tools.lastY = py;
  }

  function lassoMove(tools, px, py) {
    const lasso = state.lasso;
    if (!lasso) return;
    const last = lasso.points[lasso.points.length - 1];
    if (Math.abs(last.x - px) < 0.5 && Math.abs(last.y - py) < 0.5) return;
    lasso.points.push({ x: px, y: py });
    tools.lastX = px;
    tools.lastY = py;
  }

  function rasterizePolygon(points, width, height) {
    const mask = new Uint8Array(width * height);
    if (!points || points.length < 3) return mask;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    const top = Math.max(0, Math.floor(minY));
    const bottom = Math.min(height - 1, Math.ceil(maxY));
    const crossings = [];
    for (let y = top; y <= bottom; y++) {
      const scanY = y + 0.5;
      crossings.length = 0;
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if ((a.y <= scanY && b.y > scanY) || (b.y <= scanY && a.y > scanY)) {
          crossings.push(a.x + (scanY - a.y) / (b.y - a.y) * (b.x - a.x));
        }
      }
      if (crossings.length < 2) continue;
      crossings.sort((m, n) => m - n);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const startX = Math.max(0, Math.ceil(crossings[i] - 0.5));
        const endX = Math.min(width - 1, Math.floor(crossings[i + 1] - 0.5));
        for (let x = startX; x <= endX; x++) mask[y * width + x] = 1;
      }
    }
    return mask;
  }

  function lassoEnd(tools) {
    const lasso = state.lasso;
    state.lasso = null;
    tools.isDrawing = false;
    tools._isSelecting = false;
    if (!lasso) return null;
    const project = tools.project;
    const frame = project && project.getCurrentFrame();
    if (!frame) return null;
    if (lasso.points.length < 3) {
      toast('套索至少要围出一个角，按住拖动再松手');
      return null;
    }
    const pixels = rasterizePolygon(lasso.points, frame.width, frame.height);
    const rect = combineSelection(tools, pixels, frame.width, frame.height, lasso.mode);
    if (rect) toast(`套索选区 ${rect.w}×${rect.h}`);
    else toast('套索没有围出像素，画大一点再试');
    return rect;
  }

  // ==========================================
  // 选区内替换颜色
  // ==========================================

  function replaceColorInSelection(tools, from, to, tolerance) {
    const project = tools.project;
    const frame = project && project.getCurrentFrame();
    const layer = project && project.getCurrentLayer();
    if (!frame || !layer) return { success: false, modifiedCount: 0, reason: '编辑器未就绪' };
    if (layer.locked) return { success: false, modifiedCount: 0, reason: '当前图层已锁定' };
    if (layer.isGroup) return { success: false, modifiedCount: 0, reason: '请选择具体图层，不要选组' };
    if (layer.inheritedBase) return { success: false, modifiedCount: 0, reason: '跟随主工程的图层只读' };
    if (PE.isHandLayer && PE.isHandLayer(layer)) return { success: false, modifiedCount: 0, reason: '手部参考层受保护' };
    if (frame.locked) return { success: false, modifiedCount: 0, reason: '当前帧已锁定' };

    const key = project.getFrameKey();
    const existing = layer.getFrameData(key);
    if (existing && existing.placement) return { success: false, modifiedCount: 0, reason: '高清图片图层不能逐像素换色' };

    const selection = state.mask ? state.mask : tools.selection;
    if (!selection) return { success: false, modifiedCount: 0, reason: '先框选或用魔棒建立选区' };

    const data = layer.ensureFrameData(key, frame.width, frame.height);
    const history = tools.historyManager;
    const autoCommit = history && !history.currentBatch;
    if (autoCommit) history.beginBatch('选区换色');

    let modifiedCount = 0;
    for (let y = selection.y; y < selection.y + selection.h; y++) {
      for (let x = selection.x; x < selection.x + selection.w; x++) {
        if (!inFrame(x, y, frame.width, frame.height)) continue;
        if (!insideSelection(x, y, tools.selection)) continue;
        if (frame.isPixelLocked(x, y)) continue;
        const oldColor = PE.utils.getPixelFromImageData(data, x, y);
        if (!oldColor || oldColor.a === 0) continue;
        if (colorDiff(oldColor, from) > tolerance) continue;
        const newColor = { r: to.r, g: to.g, b: to.b, a: oldColor.a };
        if (PE.utils.comparePixels(oldColor, newColor)) continue;
        if (history) history.recordPixelChange(project.currentLayerIndex, key, x, y, oldColor, newColor);
        PE.utils.setPixelInImageData(data, x, y, newColor.r, newColor.g, newColor.b, newColor.a);
        modifiedCount++;
      }
    }

    if (autoCommit) history.commitBatch();
    if (tools.canvasManager) tools.canvasManager.render();
    return {
      success: true,
      modifiedCount,
      reason: modifiedCount ? '' : '选区内没有匹配的颜色，可调大容差'
    };
  }

  // ==========================================
  // 删除选区内容（把选区内像素清成透明），整批一次撤销
  // ==========================================

  function deleteSelection(tools) {
    const project = tools.project;
    const frame = project && project.getCurrentFrame();
    const layer = project && project.getCurrentLayer();
    if (!frame || !layer) { toast('编辑器未就绪'); return { success: false, modifiedCount: 0 }; }

    const selection = state.mask ? state.mask : tools.selection;
    if (!selection) { toast('先框选或用魔棒选中要删除的区域'); return { success: false, modifiedCount: 0 }; }

    if (layer.locked) { toast('当前图层已锁定'); return { success: false, modifiedCount: 0 }; }
    if (layer.isGroup) { toast('请选择具体图层，不要选组'); return { success: false, modifiedCount: 0 }; }
    if (layer.inheritedBase) { toast('跟随主工程的图层只读'); return { success: false, modifiedCount: 0 }; }
    if (PE.isHandLayer && PE.isHandLayer(layer)) { toast('手部参考层受保护'); return { success: false, modifiedCount: 0 }; }
    if (frame.locked) { toast('当前帧已锁定'); return { success: false, modifiedCount: 0 }; }

    const key = project.getFrameKey();
    const existing = layer.getFrameData(key);
    if (existing && existing.placement) { toast('高清图片图层暂不支持删除，请先栅格化'); return { success: false, modifiedCount: 0 }; }

    const data = layer.ensureFrameData(key, frame.width, frame.height);
    const history = tools.historyManager;
    const autoCommit = history && !history.currentBatch;
    if (autoCommit) history.beginBatch('删除选区');

    let modifiedCount = 0;
    for (let y = selection.y; y < selection.y + selection.h; y++) {
      for (let x = selection.x; x < selection.x + selection.w; x++) {
        if (!inFrame(x, y, frame.width, frame.height)) continue;
        if (!insideSelection(x, y, tools.selection)) continue;
        if (frame.isPixelLocked(x, y)) continue;
        const oldColor = PE.utils.getPixelFromImageData(data, x, y);
        if (!oldColor || oldColor.a === 0) continue;
        const cleared = { r: 0, g: 0, b: 0, a: 0 };
        if (history) history.recordPixelChange(project.currentLayerIndex, key, x, y, oldColor, cleared);
        PE.utils.setPixelInImageData(data, x, y, 0, 0, 0, 0);
        modifiedCount++;
      }
    }

    if (autoCommit) history.commitBatch();
    if (tools.canvasManager) tools.canvasManager.render();
    toast(modifiedCount ? `已删除 ${modifiedCount} 像素` : '选区内没有可删除的像素');
    return { success: true, modifiedCount };
  }

  // ==========================================
  // 渲染：不规则选区轮廓 + 套索拖拽预览
  // ==========================================

  function drawMaskOverlay(cm) {
    const mask = state.mask;
    if (!mask || !cm.ctx) return;
    const ctx = cm.ctx;
    const zoom = cm.zoom;
    const ox = cm.offsetX;
    const oy = cm.offsetY;
    const path = new Path2D();
    const area = mask.w * mask.h;
    const withFill = area <= 200000;

    ctx.save();
    ctx.beginPath();
    if (withFill) {
      for (let y = mask.y; y < mask.y + mask.h; y++) {
        let runStart = -1;
        for (let x = mask.x; x <= mask.x + mask.w; x++) {
          const filled = x < mask.x + mask.w && maskHas(mask, x, y);
          if (filled && runStart < 0) runStart = x;
          if (!filled && runStart >= 0) {
            ctx.rect(ox + runStart * zoom, oy + y * zoom, (x - runStart) * zoom, zoom);
            runStart = -1;
          }
        }
      }
      ctx.fillStyle = 'rgba(30,150,255,0.12)';
      ctx.fill();
    }

    for (let y = mask.y; y < mask.y + mask.h; y++) {
      for (let x = mask.x; x < mask.x + mask.w; x++) {
        if (!maskHas(mask, x, y)) continue;
        const sx = ox + x * zoom;
        const sy = oy + y * zoom;
        if (!maskHas(mask, x, y - 1)) {
          path.moveTo(sx, sy + 0.5);
          path.lineTo(sx + zoom, sy + 0.5);
        }
        if (!maskHas(mask, x, y + 1)) {
          path.moveTo(sx, sy + zoom - 0.5);
          path.lineTo(sx + zoom, sy + zoom - 0.5);
        }
        if (!maskHas(mask, x - 1, y)) {
          path.moveTo(sx + 0.5, sy);
          path.lineTo(sx + 0.5, sy + zoom);
        }
        if (!maskHas(mask, x + 1, y)) {
          path.moveTo(sx + zoom - 0.5, sy);
          path.lineTo(sx + zoom - 0.5, sy + zoom);
        }
      }
    }

    // 黑白“蚂蚁线”：两段虚线错开相位、随时间流动，接近 PS 的选区边框。
    const phase = state.antsPhase || 0;
    const dash = 4;
    ctx.lineWidth = Math.max(1, Math.min(2, zoom / 6));
    ctx.setLineDash([dash, dash]);
    ctx.lineDashOffset = -phase;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.stroke(path);
    ctx.lineDashOffset = -phase + dash;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawLassoPreview(cm) {
    const lasso = state.lasso;
    if (!lasso || lasso.points.length < 2 || !cm.ctx) return;
    const ctx = cm.ctx;
    const zoom = cm.zoom;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,168,60,0.95)';
    ctx.lineWidth = Math.max(1, Math.min(2, zoom / 6));
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    lasso.points.forEach((point, index) => {
      const sx = cm.offsetX + point.x * zoom;
      const sy = cm.offsetY + point.y * zoom;
      if (index === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.restore();
  }

  function installRenderHook() {
    const proto = PE.CanvasManager && PE.CanvasManager.prototype;
    if (!proto || proto.__plusRender) return;
    const original = proto.render;
    proto.render = function () {
      original.apply(this, arguments);
      drawMaskOverlay(this);
      drawLassoPreview(this);
    };
    proto.__plusRender = true;
  }

  // 蚂蚁线动画：有选区且空闲时，按约 9fps 推进相位并重绘，让选区边框“流动”。
  PE.selectionAntsPhase = PE.selectionAntsPhase || 0;
  function startAntsLoop() {
    if (startAntsLoop._timer) return;
    startAntsLoop._timer = setInterval(() => {
      const app = PE.app;
      const cm = app && app.canvasManager;
      const tools = app && app.toolManager;
      if (!cm || !tools) return;
      const hasSel = !!(state.mask || tools.selection);
      if (!hasSel || tools.isDrawing || (app.animationPlayer && app.animationPlayer.playing)) return;
      state.antsPhase = (state.antsPhase + 1) % 8;
      PE.selectionAntsPhase = state.antsPhase;
      cm.render();
    }, 110);
  }

  // ==========================================
  // 工具原型挂载
  // ==========================================

  function installToolHooks() {
    const proto = PE.ToolManager && PE.ToolManager.prototype;
    if (!proto || proto.__plusTools) return;

    const onDown = proto.onMouseDown;
    const onMove = proto.onMouseMove;
    const onUp = proto.onMouseUp;

    proto.onMouseDown = function (px, py, button = 0) {
      if (button === 0 && this.currentTool === WAND_TOOL) {
        magicWand(this, px, py);
        if (this.canvasManager) this.canvasManager.render();
        return;
      }
      if (button === 0 && this.currentTool === LASSO_TOOL) {
        lassoStart(this, px, py);
        if (this.canvasManager) this.canvasManager.render();
        return;
      }
      return onDown.apply(this, arguments);
    };

    proto.onMouseMove = function (px, py) {
      if (this.currentTool === LASSO_TOOL && state.lasso) {
        lassoMove(this, px, py);
        if (this.canvasManager) this.canvasManager.render();
        return;
      }
      return onMove.apply(this, arguments);
    };

    proto.onMouseUp = function () {
      if (this.currentTool === LASSO_TOOL && state.lasso) {
        lassoEnd(this);
        if (this.canvasManager) this.canvasManager.render();
        return;
      }
      return onUp.apply(this, arguments);
    };

    const setSelection = proto.setSelection;
    proto.setSelection = function () {
      // 矩形框选会重新定义选区，掩膜随之失效，避免两套选区互相打架。
      if (state.mask) {
        state.mask = null;
        syncUi();
      }
      return setSelection.apply(this, arguments);
    };

    const clearSelection = proto.clearSelection;
    proto.clearSelection = function () {
      state.mask = null;
      state.lasso = null;
      syncUi();
      return clearSelection.apply(this, arguments);
    };

    const copySelection = proto.copySelection;
    proto.copySelection = function () {
      const result = copySelection.apply(this, arguments);
      const mask = state.mask;
      if (!result || !mask) return result;
      const origin = this.selection || { x: mask.x, y: mask.y };
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          if (maskHas(mask, origin.x + x, origin.y + y)) continue;
          PE.utils.setPixelInImageData(result, x, y, 0, 0, 0, 0);
        }
      }
      return result;
    };

    const pasteSelection = proto.pasteSelection;
    proto.pasteSelection = function () {
      const result = pasteSelection.apply(this, arguments);
      if (result && state.mask) {
        state.mask = null;
        syncUi();
      }
      return result;
    };

    const nudgeSelection = proto.nudgeSelection;
    proto.nudgeSelection = function () {
      if (state.mask && !maskIsRect(state.mask)) {
        toast('不规则选区暂不支持整块移动；Esc 取消后改用矩形框选');
        return false;
      }
      return nudgeSelection.apply(this, arguments);
    };

    const moveSelection = proto.moveSelection;
    proto.moveSelection = function () {
      if (state.mask && !maskIsRect(state.mask)) {
        toast('不规则选区暂不支持整块移动；Esc 取消后改用矩形框选');
        return false;
      }
      return moveSelection.apply(this, arguments);
    };

    proto.__plusTools = true;
  }

  // ==========================================
  // 界面
  // ==========================================

  function toast(message) {
    let node = document.getElementById('plus-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'plus-toast';
      node.className = 'plus-toast';
      document.body.append(node);
    }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  PE.toast = toast;

  function rgbToHex(color) {
    return '#' + [color.r, color.g, color.b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

  // 魔棒做成主工具条上的一个按钮（和铅笔/橡皮/框选并列），点一下就按颜色自动选区。
  function buildWandButton(app) {
    const rail = document.querySelector('.tool-rail');
    const group = document.querySelector('.tool-selection-group');
    const host = rail || group;
    if (!host) return [];

    // 新版界面用 .tool-rail；旧版没有 rail 时退回分组并补上套索按钮。
    const specs = [
      { tool: WAND_TOOL, label: '魔棒', key: 'W', title: '魔棒 (W) · 点一下就按颜色自动选中同类区域；Shift 加选 / Alt 减选' }
    ];
    if (!rail) specs.push({ tool: LASSO_TOOL, label: '套索', key: 'S', title: '套索 (S) · 按住拖出不规则选区' });

    const icons = {
      wand: 'M4 20l5-5M9 15l-2-2 9-9 2 2zM16 3l.8 2.2L19 6l-2.2.8L16 9l-.8-2.2L13 6l2.2-.8z',
      lasso: 'M4 13c0-4 4-7 8-7s8 3 8 7-3 6-6 6c-2 0-3-1-3-2s1-2 2-2M7 22c-1-1-1-3 1-4'
    };
    const history = rail ? rail.querySelector('.rail-history') : null;

    const buttons = specs.map(spec => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tool-btn';
      button.id = `tool-${spec.tool}`;
      button.dataset.tool = spec.tool;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[spec.tool]}"/></svg><span>${spec.label}</span><kbd>${spec.key}</kbd>`;
      button.title = spec.title;
      button.setAttribute('aria-label', spec.label);
      button.addEventListener('click', () => {
        app.toolManager.setTool(spec.tool);
        app.updateToolbar();
      });
      if (rail) rail.insertBefore(button, history || null);
      else host.append(button);
      return button;
    });

    const updateToolbar = app.updateToolbar.bind(app);
    app.updateToolbar = function () {
      updateToolbar();
      const current = app.toolManager.currentTool;
      for (const button of buttons) {
        const on = button.dataset.tool === current;
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };

    return buttons;
  }

  function buildPanel(app) {
    const viewbar = document.querySelector('#center-viewport .canvas-viewbar .view-actions');
    const host = viewbar || document.querySelector('#center-viewport') || document.body;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'subtle-button plus-selection-toggle';
    toggle.textContent = '选区';
    toggle.title = '魔棒容差、选区换色';
    host.append(toggle);

    const panel = document.createElement('div');
    panel.className = 'plus-panel';
    panel.id = 'plus-selection-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="plus-panel-head">
        <strong>选区</strong>
        <span id="plus-selection-info" class="plus-badge" data-mode="none">无选区</span>
        <button type="button" class="plus-close" aria-label="关闭">×</button>
      </div>
      <div class="plus-row">
        <label>容差 <output id="plus-tolerance-val">16</output></label>
        <input type="range" id="plus-tolerance" min="0" max="128" step="1" value="16">
      </div>
      <div class="plus-row plus-inline">
        <label class="plus-check"><input type="checkbox" id="plus-contiguous" checked> 只选连续区域</label>
        <label class="plus-check" title="勾选后按画面看到的所有图层颜色取样，点哪选哪；取消则只按当前图层颜色"><input type="checkbox" id="plus-composite" checked> 对所有图层取样</label>
      </div>
      <p class="plus-hint">魔棒 <kbd>W</kbd> / 套索 <kbd>S</kbd> · <kbd>Shift</kbd> 加选 · <kbd>Alt</kbd> 减选 · <kbd>Esc</kbd> 取消</p>
      <div class="plus-divider"></div>
      <div class="plus-row">
        <label>选区内换色</label>
        <div class="plus-inline">
          <input type="color" id="plus-replace-from" value="#000000" title="要被替换掉的旧色">
          <span class="plus-arrow">→</span>
          <input type="color" id="plus-replace-to" value="#ffffff" title="替换成的新色">
        </div>
      </div>
      <div class="plus-row">
        <label>换色容差 <output id="plus-replace-tol-val">0</output></label>
        <input type="range" id="plus-replace-tol" min="0" max="64" step="1" value="0">
      </div>
      <div class="plus-row plus-inline">
        <button type="button" class="compact-btn" id="plus-replace-pick">取图层色</button>
        <button type="button" class="action-btn-primary" id="plus-replace-apply">替换选区内颜色</button>
      </div>
      <p class="plus-hint">换色只改当前图层、选区内、颜色匹配的像素，保留原不透明度，整批一次撤销。</p>
      <div class="plus-divider"></div>
      <div class="plus-row plus-inline">
        <button type="button" class="compact-btn" id="plus-delete-selection">删除选区内像素</button>
        <button type="button" class="compact-btn" id="plus-clear-selection">取消选区</button>
      </div>
      <p class="plus-hint">选中后也可以直接按 <kbd>Delete</kbd> 删除；用画笔 / 橡皮 / 填充绘画时只会画在选区内。</p>
    `;

    (document.querySelector('#center-viewport') || document.body).append(panel);

    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      toggle.classList.toggle('active', !panel.hidden);
      if (!panel.hidden) {
        const tool = app.toolManager;
        const selection = tool.selection;
        if (selection) {
          const sample = tool.project?.getCurrentLayer()?.getFrameData(tool.project.getFrameKey());
          if (sample) {
            const color = PE.utils.getPixelFromImageData(sample, Math.floor(selection.x + selection.w / 2), Math.floor(selection.y + selection.h / 2));
            if (color && color.a) document.getElementById('plus-replace-from').value = rgbToHex(color);
          }
        }
      }
    });

    panel.querySelector('.plus-close').addEventListener('click', () => {
      panel.hidden = true;
      toggle.classList.remove('active');
    });

    const tolerance = panel.querySelector('#plus-tolerance');
    const toleranceVal = panel.querySelector('#plus-tolerance-val');
    tolerance.addEventListener('input', () => {
      state.tolerance = Number(tolerance.value);
      toleranceVal.textContent = tolerance.value;
    });

    panel.querySelector('#plus-contiguous').addEventListener('change', event => {
      state.contiguous = event.target.checked;
    });
    panel.querySelector('#plus-composite').addEventListener('change', event => {
      state.sampleComposite = event.target.checked;
    });

    const replaceTol = panel.querySelector('#plus-replace-tol');
    const replaceTolVal = panel.querySelector('#plus-replace-tol-val');
    replaceTol.addEventListener('input', () => {
      replaceTolVal.textContent = replaceTol.value;
    });

    panel.querySelector('#plus-replace-pick').addEventListener('click', () => {
      const color = app.toolManager.primaryColor;
      document.getElementById('plus-replace-from').value = rgbToHex(color);
      toast('已把前景色填入“旧色”');
    });

    panel.querySelector('#plus-replace-apply').addEventListener('click', () => {
      const from = PE.utils.hexToRGBA(document.getElementById('plus-replace-from').value);
      const to = PE.utils.hexToRGBA(document.getElementById('plus-replace-to').value);
      const result = replaceColorInSelection(app.toolManager, from, to, Number(replaceTol.value));
      if (!result.success) {
        toast(result.reason);
        return;
      }
      toast(result.modifiedCount ? `已换色 ${result.modifiedCount} 像素` : result.reason);
      app.updateFrameList?.();
      app.updatePalette?.();
      app.updateHistoryButtons?.();
    });

    panel.querySelector('#plus-delete-selection').addEventListener('click', () => {
      deleteSelection(app.toolManager);
      app.updateFrameList?.();
      app.updatePalette?.();
      app.updateHistoryButtons?.();
    });

    panel.querySelector('#plus-clear-selection').addEventListener('click', () => {
      app.toolManager.clearSelection();
      clearMask(app.toolManager);
      app.updateHistoryButtons?.();
    });

    syncUi();
    return panel;
  }

  function installShortcuts(app) {
    window.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === 'w') {
        event.preventDefault();
        app.toolManager.setTool(WAND_TOOL);
        app.updateToolbar();
      } else if (key === 's') {
        event.preventDefault();
        app.toolManager.setTool(LASSO_TOOL);
        app.updateToolbar();
      }
    });
  }

  function installApi(app) {
    const api = window.pixelAPI;
    if (!api) return;
    api.magicWand = (x, y, options = {}) => {
      const tools = app.toolManager;
      if (Number.isFinite(options.tolerance)) state.tolerance = Math.max(0, Math.min(255, options.tolerance));
      if (typeof options.contiguous === 'boolean') state.contiguous = options.contiguous;
      if (typeof options.sampleComposite === 'boolean') state.sampleComposite = options.sampleComposite;
      const rect = magicWand(tools, x, y);
      return { success: !!rect, data: rect || null, message: rect ? '魔棒选取完成' : '没有选中像素' };
    };
    api.lasso = (points, options = {}) => {
      const tools = app.toolManager;
      const frame = tools.project?.getCurrentFrame();
      if (!frame || !Array.isArray(points) || points.length < 3) {
        return { success: false, message: '套索至少需要三个点' };
      }
      const pixels = rasterizePolygon(points, frame.width, frame.height);
      const rect = combineSelection(tools, pixels, frame.width, frame.height, options.mode || 'replace');
      if (tools.canvasManager) tools.canvasManager.render();
      return { success: !!rect, data: rect || null, message: rect ? '套索选取完成' : '套索没有围出像素' };
    };
    api.replaceColor = (from, to, options = {}) => {
      const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 0;
      if (options.selection === 'all') {
        state.mask = null;
      }
      const result = replaceColorInSelection(app.toolManager, from, to, tolerance);
      return {
        success: result.success,
        modifiedCount: result.modifiedCount || 0,
        rejectedPixels: [],
        message: result.success ? `已换色 ${result.modifiedCount} 像素` : result.reason
      };
    };
    api.getSelectionMask = () => {
      const mask = state.mask;
      if (!mask) {
        const selection = app.toolManager.selection;
        return { success: true, data: selection ? { ...selection, shape: 'rect' } : null };
      }
      return {
        success: true,
        data: { x: mask.x, y: mask.y, w: mask.w, h: mask.h, shape: maskIsRect(mask) ? 'rect' : 'mask' }
      };
    };
  }

  function installDeleteShortcut(app) {
    window.addEventListener('keydown', event => {
      const tools = app.toolManager;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      // Esc 或 Ctrl/Cmd+D：取消选区（像 PS 那样）
      if ((event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey) ||
          (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey))) {
        if (state.mask || tools.selection) {
          event.preventDefault();
          tools.clearSelection(); // 覆盖后的 clearSelection 会一并清掉魔棒掩膜
          app.updateHistoryButtons?.();
        }
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!state.mask && !tools.selection) return;
      event.preventDefault();
      deleteSelection(tools);
      app.updateFrameList?.();
      app.updatePalette?.();
      app.updateHistoryButtons?.();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    if (!app || !app.toolManager) return;
    installRenderHook();
    installToolHooks();
    buildWandButton(app);
    buildPanel(app);
    installShortcuts(app);
    installDeleteShortcut(app);
    installApi(app);
    startAntsLoop();
  });
})();
