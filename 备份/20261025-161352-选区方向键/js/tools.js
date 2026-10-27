/**
 * Pixel Art Character Editor - Tool Manager (tools.js)
 * Drawing tools: pencil, eraser, eyedropper, flood fill, marquee selection, and movement.
 */

window.PE = window.PE || {};

(() => {
  'use strict';

  class ToolManager {
    constructor() {
      this.currentTool = 'pencil'; // 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select' | 'move'
      this.primaryColor = { r: 0, g: 0, b: 0, a: 255 };
      this.brushSize = 1;
      this.isDrawing = false;
      this.selection = null; // {x, y, w, h} or null
      this.selectionData = null; // ImageData of copied selection
      this.lastX = -1;
      this.lastY = -1;
      this.project = null;
      this.canvasManager = null;
      this.historyManager = null;
      this.onColorPick = null; // Callback when eyedropper picks a pixel color

      // Internal interaction tracking
      this._mouseButton = 0;
      this._isSelecting = false;
      this._selectStartX = -1;
      this._selectStartY = -1;
      this._isMoving = false;
      this._moveStartX = -1;
      this._moveStartY = -1;
      this._moveOriginX = 0;
      this._moveOriginY = 0;
    }

    /**
     * Bind project, canvas manager, and history manager dependencies.
     * @param {PE.Project} project 
     * @param {PE.CanvasManager} canvasManager 
     * @param {PE.HistoryManager} historyManager 
     */
    init(project, canvasManager, historyManager) {
      this.project = project;
      this.canvasManager = canvasManager;
      this.historyManager = historyManager;
      if (this.canvasManager) {
        this.canvasManager.toolManager = this;
      }
    }

    /**
     * Switch active drawing tool.
     * @param {string} name 
     */
    setTool(name) {
      this.currentTool = name;
      if (name !== 'select' && name !== 'move' && this.selection) {
        // Keep selection active or allow tools to edit within/without as needed
      }
    }

    /**
     * Set primary drawing color.
     * Accepts (r, g, b, a) or a single color object {r, g, b, a}.
     * @param {number|{r:number, g:number, b:number, a:number}} r 
     * @param {number} [g] 
     * @param {number} [b] 
     * @param {number} [a=255] 
     */
    setColor(r, g, b, a = 255) {
      if (typeof r === 'object' && r !== null) {
        this.primaryColor = {
          r: Math.max(0, Math.min(255, Math.round(r.r || 0))),
          g: Math.max(0, Math.min(255, Math.round(r.g || 0))),
          b: Math.max(0, Math.min(255, Math.round(r.b || 0))),
          a: r.a !== undefined ? Math.max(0, Math.min(255, Math.round(r.a))) : 255
        };
      } else {
        this.primaryColor = {
          r: Math.max(0, Math.min(255, Math.round(r || 0))),
          g: Math.max(0, Math.min(255, Math.round(g || 0))),
          b: Math.max(0, Math.min(255, Math.round(b || 0))),
          a: a !== undefined ? Math.max(0, Math.min(255, Math.round(a))) : 255
        };
      }
    }

    /**
     * Set brush size in pixels (clamped between 1 and 32).
     * @param {number} size 
     */
    setBrushSize(size) {
      this.brushSize = Math.max(1, Math.min(32, Math.round(size)));
    }

    // ==========================================
    // Mouse Event Handlers
    // Receive PIXEL coordinates (already converted from screen)
    // ==========================================

    /**
     * Pointer press event handler.
     * @param {number} px 
     * @param {number} py 
     * @param {number} [button=0] 0: left, 2: right
     */
    onMouseDown(px, py, button = 0) {
      this._mouseButton = button;
      if (!this.project) return;

      const frame = this.project.getCurrentFrame();
      if (!frame) return;

      const layer = this.project.getCurrentLayer();
      if (!layer) return;

      const frameKey = this.project.getFrameKey();
      const layerIdx = this.project.currentLayerIndex;

      switch (this.currentTool) {
        case 'pencil': {
          if (layer.locked || PE.isHandLayer(layer) || !layer.visible || frame.locked) return;
          this.isDrawing = true;
          this.lastX = px;
          this.lastY = py;

          const color = (button === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
          if (this.historyManager) {
            this.historyManager.beginBatch(button === 2 ? '橡皮擦' : '铅笔绘制');
          }

          this.drawLine(layerIdx, frameKey, px, py, px, py, color.r, color.g, color.b, color.a);
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'eraser': {
          if (layer.locked || PE.isHandLayer(layer) || !layer.visible || frame.locked) return;
          this.isDrawing = true;
          this.lastX = px;
          this.lastY = py;

          if (this.historyManager) {
            this.historyManager.beginBatch('橡皮擦');
          }

          this.drawLine(layerIdx, frameKey, px, py, px, py, 0, 0, 0, 0);
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'eyedropper': {
          const comp = this.canvasManager ? this.canvasManager.getCompositeWithOriginal() : null;
          if (comp) {
            const picked = PE.utils.getPixelFromImageData(comp, px, py);
            if (picked) {
              this.setColor(picked.r, picked.g, picked.b, picked.a);
              if (typeof this.onColorPick === 'function') {
                this.onColorPick(picked);
              }
            }
          }
          break;
        }

        case 'fill': {
          if (layer.locked || PE.isHandLayer(layer) || !layer.visible || frame.locked) return;
          const color = (button === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
          this.fillArea(layerIdx, frameKey, px, py, color.r, color.g, color.b, color.a);
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'select': {
          this.isDrawing = true;
          this._isSelecting = true;
          this._selectStartX = px;
          this._selectStartY = py;
          this.setSelection(px, py, 1, 1);
          break;
        }

        case 'move': {
          if (this.selection && px >= this.selection.x && px < this.selection.x + this.selection.w &&
              py >= this.selection.y && py < this.selection.y + this.selection.h) {
            this._isMoving = true;
            this._moveStartX = px;
            this._moveStartY = py;
            this._moveOriginX = this.selection.x;
            this._moveOriginY = this.selection.y;
            if (!this.selectionData) {
              this.copySelection();
            }
          } else {
            this.clearSelection();
          }
          break;
        }
      }
    }

    /**
     * Pointer move event handler.
     * @param {number} px 
     * @param {number} py 
     */
    onMouseMove(px, py) {
      if (!this.project) return;
      const frameKey = this.project.getFrameKey();
      const layerIdx = this.project.currentLayerIndex;

      if (this.isDrawing) {
        if (this.currentTool === 'pencil') {
          if (this.lastX !== -1 && (this.lastX !== px || this.lastY !== py)) {
            const color = (this._mouseButton === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
            this.drawLine(layerIdx, frameKey, this.lastX, this.lastY, px, py, color.r, color.g, color.b, color.a);
            this.lastX = px;
            this.lastY = py;
            if (this.canvasManager) this.canvasManager.render();
          }
        } else if (this.currentTool === 'eraser') {
          if (this.lastX !== -1 && (this.lastX !== px || this.lastY !== py)) {
            this.drawLine(layerIdx, frameKey, this.lastX, this.lastY, px, py, 0, 0, 0, 0);
            this.lastX = px;
            this.lastY = py;
            if (this.canvasManager) this.canvasManager.render();
          }
        } else if (this.currentTool === 'select' && this._isSelecting) {
          const sx = Math.min(this._selectStartX, px);
          const sy = Math.min(this._selectStartY, py);
          const sw = Math.abs(px - this._selectStartX) + 1;
          const sh = Math.abs(py - this._selectStartY) + 1;
          this.setSelection(sx, sy, sw, sh);
        }
      } else if (this._isMoving && this.selection) {
        const dx = px - this._moveStartX;
        const dy = py - this._moveStartY;
        this.selection.x = this._moveOriginX + dx;
        this.selection.y = this._moveOriginY + dy;
        if (this.canvasManager) {
          this.canvasManager.selection = this.selection;
          this.canvasManager.render();
        }
      }
    }

    /**
     * Pointer release event handler.
     * @param {number} px 
     * @param {number} py 
     */
    onMouseUp(px, py) {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.lastX = -1;
        this.lastY = -1;

        if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
          if (this.historyManager) {
            this.historyManager.commitBatch();
          }
          if (this.canvasManager) {
            this.canvasManager.render();
          }
        } else if (this.currentTool === 'select') {
          this._isSelecting = false;
          this.copySelection();
        }
      }

      if (this._isMoving) {
        this._isMoving = false;
        if (this.selection && (this.selection.x !== this._moveOriginX || this.selection.y !== this._moveOriginY)) {
          this.moveSelection(
            this.project.currentLayerIndex,
            this.project.getFrameKey(),
            this._moveOriginX,
            this._moveOriginY,
            this.selection.w,
            this.selection.h,
            this.selection.x,
            this.selection.y
          );
        }
      }
    }

    // ==========================================
    // Drawing Primitives (Used by Tools and External API)
    // ==========================================

    /**
     * Draw a single pixel on the designated layer and frame.
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {{success: boolean, modifiedCount?: number, rejected?: {reason: string}}}
     */
    drawPixel(layerIdx, frameKey, x, y, r, g, b, a = 255) {
      if (!this.project) return { success: false, rejected: { reason: 'no_project' } };

      const layer = this.project.layers[layerIdx];
      if (!layer) return { success: false, rejected: { reason: 'layer_not_found' } };
      if (layer.locked || PE.isHandLayer(layer) || layer.isGroup) return { success: false, rejected: { reason: 'layer_locked' } };
      if (!layer.visible) return { success: false, rejected: { reason: 'layer_invisible' } };

      const [si,ai,fi]=frameKey.split('_').map(Number);
      if (layer.sheetIndex!==undefined && layer.sheetIndex!==si) return {success:false,rejected:{reason:'wrong_sheet'}};
      const frame = this.project.spriteSheets[si]?.actions[ai]?.frames[fi];
      if (!frame) return { success: false, rejected: { reason: 'no_current_frame' } };
      if (frame.locked) return { success: false, rejected: { reason: 'frame_locked' } };

      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !this._isInBounds(x, y, frame.width, frame.height)) {
        return { success: false, rejected: { reason: 'out_of_bounds' } };
      }
      if (frame.isPixelLocked(x, y)) {
        return { success: false, rejected: { reason: 'pixel_locked' } };
      }

      const frameData = layer.ensureFrameData(frameKey, frame.width, frame.height);
      const oldColor = PE.utils.getPixelFromImageData(frameData, x, y) || { r: 0, g: 0, b: 0, a: 0 };
      const newColor = { r, g, b, a: a !== undefined ? a : 255 };

      if (PE.utils.comparePixels(oldColor, newColor)) {
        return { success: true, modifiedCount: 0 };
      }

      const autoCommit = this.historyManager && !this.historyManager.currentBatch;
      if (autoCommit) {
        this.historyManager.beginBatch('绘制像素');
      }

      if (this.historyManager) {
        this.historyManager.recordPixelChange(layerIdx, frameKey, x, y, oldColor, newColor);
      }
      PE.utils.setPixelInImageData(frameData, x, y, newColor.r, newColor.g, newColor.b, newColor.a);

      if (autoCommit) {
        this.historyManager.commitBatch();
      }

      return { success: true, modifiedCount: 1 };
    }

    /**
     * Batch draw pixels on the designated layer and frame.
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {Array<{x:number, y:number, r:number, g:number, b:number, a?:number}>} pixels 
     * @returns {{success: boolean, modifiedCount: number, rejectedPixels: Array<{x:number, y:number, reason:string}>}}
     */
    drawPixels(layerIdx, frameKey, pixels) {
      const rejectedPixels = [];
      if (!this.project) {
        return { success: false, modifiedCount: 0, rejectedPixels };
      }

      const layer = this.project.layers[layerIdx];
      if (!layer || layer.locked || PE.isHandLayer(layer) || layer.isGroup || !layer.visible) {
        const reason = !layer ? 'layer_not_found' : (layer.locked ? 'layer_locked' : 'layer_invisible');
        return {
          success: false,
          modifiedCount: 0,
          rejectedPixels: pixels.map(p => ({ x: p.x, y: p.y, reason }))
        };
      }

      const [si,ai,fi]=frameKey.split('_').map(Number);
      const frame = this.project.spriteSheets[si]?.actions[ai]?.frames[fi];
      if (!frame || frame.locked || (layer.sheetIndex!==undefined && layer.sheetIndex!==si)) {
        const reason = !frame ? 'no_frame' : 'frame_locked';
        return {
          success: false,
          modifiedCount: 0,
          rejectedPixels: pixels.map(p => ({ x: p.x, y: p.y, reason }))
        };
      }

      const frameData = layer.ensureFrameData(frameKey, frame.width, frame.height);
      const autoCommit = this.historyManager && !this.historyManager.currentBatch;
      if (autoCommit) {
        this.historyManager.beginBatch('批量绘制像素');
      }

      let modifiedCount = 0;

      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        if (!Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y) || !this._isInBounds(p.x, p.y, frame.width, frame.height)) {
          rejectedPixels.push({ x: p.x, y: p.y, reason: 'out_of_bounds' });
          continue;
        }

        if (frame.isPixelLocked(p.x, p.y)) {
          rejectedPixels.push({ x: p.x, y: p.y, reason: 'pixel_locked' });
          continue;
        }

        const oldColor = PE.utils.getPixelFromImageData(frameData, p.x, p.y) || { r: 0, g: 0, b: 0, a: 0 };
        const newColor = { r: p.r, g: p.g, b: p.b, a: p.a !== undefined ? p.a : 255 };

        if (PE.utils.comparePixels(oldColor, newColor)) {
          continue;
        }

        if (this.historyManager) {
          this.historyManager.recordPixelChange(layerIdx, frameKey, p.x, p.y, oldColor, newColor);
        }
        PE.utils.setPixelInImageData(frameData, p.x, p.y, newColor.r, newColor.g, newColor.b, newColor.a);
        modifiedCount++;
      }

      if (autoCommit) {
        this.historyManager.commitBatch();
      }

      return {
        success: true,
        modifiedCount,
        rejectedPixels
      };
    }

    /**
     * Draw line from (x1, y1) to (x2, y2) using Bresenham's algorithm and current brush size.
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {{success: boolean, modifiedCount: number, rejectedPixels: Array<{x:number, y:number, reason:string}>}}
     */
    drawLine(layerIdx, frameKey, x1, y1, x2, y2, r, g, b, a = 255) {
      const points = this._bresenhamLine(x1, y1, x2, y2);
      const alphaVal = a !== undefined ? a : 255;

      if (this.brushSize === 1) {
        const pixels = points.map(pt => ({
          x: pt.x,
          y: pt.y,
          r,
          g,
          b,
          a: alphaVal
        }));
        return this.drawPixels(layerIdx, frameKey, pixels);
      }

      // Stamp brushSize square centered at each point
      const half = Math.floor(this.brushSize / 2);
      const pixelMap = new Map();

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        for (let dy = -half; dy < -half + this.brushSize; dy++) {
          for (let dx = -half; dx < -half + this.brushSize; dx++) {
            const px = pt.x + dx;
            const py = pt.y + dy;
            const key = `${px}_${py}`;
            if (!pixelMap.has(key)) {
              pixelMap.set(key, { x: px, y: py, r, g, b, a: alphaVal });
            }
          }
        }
      }

      const pixelList = Array.from(pixelMap.values());
      return this.drawPixels(layerIdx, frameKey, pixelList);
    }

    /**
     * Draw rectangle outline or filled rectangle.
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @param {boolean} [filled=false] 
     * @returns {{success: boolean, modifiedCount: number, rejectedPixels: Array<{x:number, y:number, reason:string}>}}
     */
    drawRect(layerIdx, frameKey, x, y, w, h, r, g, b, a = 255, filled = false) {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.abs(w);
      const rh = Math.abs(h);
      const alphaVal = a !== undefined ? a : 255;
      const pixels = [];

      if (filled) {
        for (let cy = ry; cy < ry + rh; cy++) {
          for (let cx = rx; cx < rx + rw; cx++) {
            pixels.push({ x: cx, y: cy, r, g, b, a: alphaVal });
          }
        }
      } else {
        const pixelSet = new Set();
        const addP = (px, py) => {
          const key = `${px}_${py}`;
          if (!pixelSet.has(key)) {
            pixelSet.add(key);
            pixels.push({ x: px, y: py, r, g, b, a: alphaVal });
          }
        };

        // Top & bottom edges
        for (let cx = rx; cx < rx + rw; cx++) {
          addP(cx, ry);
          if (rh > 1) addP(cx, ry + rh - 1);
        }
        // Left & right edges
        for (let cy = ry; cy < ry + rh; cy++) {
          addP(rx, cy);
          if (rw > 1) addP(rx + rw - 1, cy);
        }
      }

      return this.drawPixels(layerIdx, frameKey, pixels);
    }

    /**
     * Erase pixels (set to completely transparent RGBA: 0, 0, 0, 0).
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {Array<{x:number, y:number}>} pixels 
     * @returns {{success: boolean, modifiedCount: number, rejectedPixels: Array<{x:number, y:number, reason:string}>}}
     */
    erasePixels(layerIdx, frameKey, pixels) {
      const eraseArray = pixels.map(p => ({
        x: p.x,
        y: p.y,
        r: 0,
        g: 0,
        b: 0,
        a: 0
      }));
      return this.drawPixels(layerIdx, frameKey, eraseArray);
    }

    /**
     * Flood fill starting from (startX, startY).
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {{success: boolean, modifiedCount: number, reason?: string}}
     */
    fillArea(layerIdx, frameKey, startX, startY, r, g, b, a = 255) {
      if (!this.project) return { success: false, modifiedCount: 0, reason: 'no_project' };

      const layer = this.project.layers[layerIdx];
      if (!layer || layer.locked || PE.isHandLayer(layer) || layer.isGroup || !layer.visible) {
        return { success: false, modifiedCount: 0, reason: 'layer_invalid_or_locked' };
      }

      const [si,ai,fi]=frameKey.split('_').map(Number);
      const frame = this.project.spriteSheets[si]?.actions[ai]?.frames[fi];
      if (!frame || frame.locked || (layer.sheetIndex!==undefined && layer.sheetIndex!==si)) {
        return { success: false, modifiedCount: 0, reason: 'frame_locked' };
      }

      if (!this._isInBounds(startX, startY, frame.width, frame.height)) {
        return { success: false, modifiedCount: 0, reason: 'out_of_bounds' };
      }

      if (frame.isPixelLocked(startX, startY)) {
        return { success: false, modifiedCount: 0, reason: 'pixel_locked' };
      }

      const frameData = layer.ensureFrameData(frameKey, frame.width, frame.height);
      const fillColor = { r, g, b, a: a !== undefined ? a : 255 };

      const fillPoints = this._floodFill(frameData, startX, startY, fillColor, frame);
      if (fillPoints.length === 0) {
        return { success: true, modifiedCount: 0 };
      }

      const autoCommit = this.historyManager && !this.historyManager.currentBatch;
      if (autoCommit) {
        this.historyManager.beginBatch('油漆桶填充');
      }

      const pixelBatch = fillPoints.map(pt => ({
        x: pt.x,
        y: pt.y,
        r: fillColor.r,
        g: fillColor.g,
        b: fillColor.b,
        a: fillColor.a
      }));

      const res = this.drawPixels(layerIdx, frameKey, pixelBatch);

      if (autoCommit) {
        this.historyManager.commitBatch();
      }

      return {
        success: true,
        modifiedCount: res.modifiedCount
      };
    }

    // ==========================================
    // Selection Operations
    // ==========================================

    /**
     * Define active selection rectangle (clamped to frame boundaries).
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @returns {{x:number, y:number, w:number, h:number}|null}
     */
    setSelection(x, y, w, h) {
      const frame = this.project ? this.project.getCurrentFrame() : null;
      const maxW = frame ? frame.width : Infinity;
      const maxH = frame ? frame.height : Infinity;

      let rx = w < 0 ? x + w : x;
      let ry = h < 0 ? y + h : y;
      let rw = Math.abs(w);
      let rh = Math.abs(h);

      // Clamp within frame bounds
      if (rx < 0) { rw += rx; rx = 0; }
      if (ry < 0) { rh += ry; ry = 0; }
      if (rx + rw > maxW) rw = Math.max(0, maxW - rx);
      if (ry + rh > maxH) rh = Math.max(0, maxH - ry);

      if (rw <= 0 || rh <= 0) {
        this.selection = null;
      } else {
        this.selection = {
          x: Math.floor(rx),
          y: Math.floor(ry),
          w: Math.floor(rw),
          h: Math.floor(rh)
        };
      }

      if (this.canvasManager) {
        this.canvasManager.selection = this.selection;
        this.canvasManager.render();
      }

      return this.selection;
    }

    /**
     * Deselect and clear selection buffer.
     */
    clearSelection() {
      this.selection = null;
      this.selectionData = null;
      if (this.canvasManager) {
        this.canvasManager.selection = null;
        this.canvasManager.render();
      }
    }

    /**
     * Copy composite pixels inside current selection rectangle into selectionData.
     * @param {number} [sheetIdx] 
     * @param {number} [actionIdx] 
     * @param {number} [frameIdx] 
     * @returns {ImageData|null}
     */
    copySelection(sheetIdx, actionIdx, frameIdx) {
      if (!this.selection || !this.canvasManager) return null;

      const key=this.project.getFrameKey(sheetIdx,actionIdx,frameIdx);
      const comp = this.project.getCurrentLayer()?.getFrameData(key);
      if (!comp) return null;

      const sw = this.selection.w;
      const sh = this.selection.h;
      const data = PE.utils.createTransparentImageData(sw, sh);

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const color = PE.utils.getPixelFromImageData(comp, this.selection.x + x, this.selection.y + y);
          if (color) {
            PE.utils.setPixelInImageData(data, x, y, color.r, color.g, color.b, color.a);
          }
        }
      }

      this.selectionData = data;
      return this.selectionData;
    }

    /**
     * Paste selectionData onto designated layer at destination offset.
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} destX 
     * @param {number} destY 
     * @returns {boolean}
     */
    pasteSelection(layerIdx, frameKey, destX, destY) {
      if (!this.selectionData || !this.project) return false;

      const autoCommit = this.historyManager && !this.historyManager.currentBatch;
      if (autoCommit) {
        this.historyManager.beginBatch('粘贴选区');
      }

      const pixels = [];
      for (let y = 0; y < this.selectionData.height; y++) {
        for (let x = 0; x < this.selectionData.width; x++) {
          const c = PE.utils.getPixelFromImageData(this.selectionData, x, y);
          if (c && c.a > 0) {
            pixels.push({
              x: destX + x,
              y: destY + y,
              r: c.r,
              g: c.g,
              b: c.b,
              a: c.a
            });
          }
        }
      }

      this.drawPixels(layerIdx, frameKey, pixels);

      if (autoCommit) {
        this.historyManager.commitBatch();
      }

      this.setSelection(destX, destY, this.selectionData.width, this.selectionData.height);
      if (this.canvasManager) this.canvasManager.render();
      return true;
    }

    /**
     * Move selection contents (cut from source and paste at destination).
     * @param {number} layerIdx 
     * @param {string} frameKey 
     * @param {number} srcX 
     * @param {number} srcY 
     * @param {number} srcW 
     * @param {number} srcH 
     * @param {number} destX 
     * @param {number} destY 
     * @returns {boolean}
     */
    moveSelection(layerIdx, frameKey, srcX, srcY, srcW, srcH, destX, destY) {
      if (!this.project) return false;
      const layer=this.project.layers[layerIdx],frame=this.project.getCurrentFrame();
      if (!layer || layer.locked || PE.isHandLayer(layer) || layer.isGroup || !layer.visible || !frame || frame.locked) return false;
      for(let y=0;y<srcH;y++)for(let x=0;x<srcW;x++) {
        if(!this._isInBounds(srcX+x,srcY+y,frame.width,frame.height) || !this._isInBounds(destX+x,destY+y,frame.width,frame.height) || frame.isPixelLocked(srcX+x,srcY+y) || frame.isPixelLocked(destX+x,destY+y)) return false;
      }

      // Extract current layer pixels inside source region if selectionData is absent
      if (!this.selectionData) {
        const layer = this.project.layers[layerIdx];
        const frameData = layer ? layer.getFrameData(frameKey) : null;
        this.selectionData = PE.utils.createTransparentImageData(srcW, srcH);
        if (frameData) {
          for (let y = 0; y < srcH; y++) {
            for (let x = 0; x < srcW; x++) {
              const c = PE.utils.getPixelFromImageData(frameData, srcX + x, srcY + y);
              if (c) {
                PE.utils.setPixelInImageData(this.selectionData, x, y, c.r, c.g, c.b, c.a);
              }
            }
          }
        }
      }

      if (this.historyManager) {
        this.historyManager.beginBatch('移动选区');
      }

      // Erase original source pixels
      const eraseList = [];
      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          eraseList.push({ x: srcX + x, y: srcY + y });
        }
      }
      this.erasePixels(layerIdx, frameKey, eraseList);

      // Paste selectionData at new destination
      const pasteList = [];
      for (let y = 0; y < this.selectionData.height; y++) {
        for (let x = 0; x < this.selectionData.width; x++) {
          const c = PE.utils.getPixelFromImageData(this.selectionData, x, y);
          if (c && c.a > 0) {
            pasteList.push({
              x: destX + x,
              y: destY + y,
              r: c.r,
              g: c.g,
              b: c.b,
              a: c.a
            });
          }
        }
      }
      this.drawPixels(layerIdx, frameKey, pasteList);

      if (this.historyManager) {
        this.historyManager.commitBatch();
      }

      this.setSelection(destX, destY, srcW, srcH);
      if (this.canvasManager) this.canvasManager.render();
      return true;
    }

    // ==========================================
    // Internal Helper Algorithms
    // ==========================================

    /**
     * Standard Bresenham integer line rasterizer.
     * @private
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {Array<{x:number, y:number}>}
     */
    _bresenhamLine(x1, y1, x2, y2) {
      const points = [];
      let cx = Math.round(x1);
      let cy = Math.round(y1);
      const targetX = Math.round(x2);
      const targetY = Math.round(y2);

      const dx = Math.abs(targetX - cx);
      const dy = Math.abs(targetY - cy);
      const sx = cx < targetX ? 1 : -1;
      const sy = cy < targetY ? 1 : -1;
      let err = dx - dy;

      while (true) {
        points.push({ x: cx, y: cy });
        if (cx === targetX && cy === targetY) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          cx += sx;
        }
        if (e2 < dx) {
          err += dx;
          cy += sy;
        }
      }

      return points;
    }

    /**
     * 4-connected stack-based flood fill algorithm respecting locked regions.
     * @private
     * @param {ImageData} imageData 
     * @param {number} startX 
     * @param {number} startY 
     * @param {{r:number, g:number, b:number, a:number}} fillColor 
     * @param {PE.Frame} [frame] 
     * @returns {Array<{x:number, y:number}>}
     */
    _floodFill(imageData, startX, startY, fillColor, frame) {
      const w = imageData.width;
      const h = imageData.height;
      const targetColor = PE.utils.getPixelFromImageData(imageData, startX, startY);
      if (!targetColor) return [];

      if (PE.utils.comparePixels(targetColor, fillColor)) {
        return [];
      }

      const filledPoints = [];
      const visited = new Uint8Array(w * h);
      const stack = [[startX, startY]];
      visited[startY * w + startX] = 1;

      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];

      while (stack.length > 0) {
        const [cx, cy] = stack.pop();

        if (frame && frame.isPixelLocked(cx, cy)) {
          continue;
        }

        filledPoints.push({ x: cx, y: cy });

        for (let i = 0; i < dirs.length; i++) {
          const nx = cx + dirs[i][0];
          const ny = cy + dirs[i][1];

          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

          const vidx = ny * w + nx;
          if (visited[vidx]) continue;
          visited[vidx] = 1;

          if (frame && frame.isPixelLocked(nx, ny)) {
            continue;
          }

          const currentColor = PE.utils.getPixelFromImageData(imageData, nx, ny);
          if (currentColor && PE.utils.comparePixels(currentColor, targetColor)) {
            stack.push([nx, ny]);
          }
        }
      }

      return filledPoints;
    }

    /**
     * Check if coordinate falls within frame bounds.
     * @private
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @returns {boolean}
     */
    _isInBounds(x, y, w, h) {
      return Number.isSafeInteger(x) && Number.isSafeInteger(y) && x >= 0 && x < w && y >= 0 && y < h;
    }

    /**
     * Check if a pixel coordinate is locked.
     * @private
     * @param {PE.Project} project 
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    _isLocked(project, frameKey, x, y) {
      if (!project) return true;
      const frame = project.getCurrentFrame();
      if (!frame || frame.locked || frame.isPixelLocked(x, y)) return true;

      const layer = project.getCurrentLayer();
      if (!layer || layer.locked || PE.isHandLayer(layer) || layer.isGroup || !layer.visible) return true;

      return false;
    }
  }

  // Export to window.PE
  PE.ToolManager = ToolManager;

})();
