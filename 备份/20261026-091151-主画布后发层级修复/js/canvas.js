/**
 * Pixel Art Character Editor - Canvas Manager (canvas.js)
 * Viewport transformations, zooming, panning, pixel grid, onion skin, and multi-layer rendering.
 */

window.PE = window.PE || {};

(() => {
  'use strict';

  class CanvasManager {
    /**
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas, project = null) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.project = project; // Set via constructor or setProject()
      this.zoom = 8;
      this.offsetX = 0; // Pan offset in screen pixels
      this.offsetY = 0;
      this.showGrid = true;
      this.showOnionSkin = false;
      this.onionSkinOpacity = 0.3;
      this.showChanges = false; // Highlight modified pixels vs original
      this.checkerboardSize = 8; // Transparency background checker square size in px
      this.gridMinZoom = 4; // Only display pixel grid when zoom >= gridMinZoom
      this.selection = null; // Selection box {x, y, w, h} or synced from ToolManager
      this.toolManager = null; // Optional reference to ToolManager

      // Reusable offscreen buffers
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      this.layerCanvas = document.createElement('canvas');
      this.layerCtx = this.layerCanvas.getContext('2d');

      // Configure rendering modes
      this._initCanvasSettings();
    }

    /**
     * Configure crisp pixelated rendering parameters on canvas contexts.
     * @private
     */
    _initCanvasSettings() {
      if (this.canvas) {
        this.canvas.style.imageRendering = 'pixelated';
      }
      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = false;
      }
      if (this.offscreenCtx) {
        this.offscreenCtx.imageSmoothingEnabled = false;
      }
      if (this.layerCtx) {
        this.layerCtx.imageSmoothingEnabled = false;
      }
    }

    /**
     * Bind a project and refresh viewport.
     * @param {PE.Project} project 
     */
    setProject(project) {
      this.project = project;
      this.centerView();
      this.render();
    }

    /**
     * Set zoom level (clamped between 1 and 64) centered on current canvas view.
     * @param {number} level 
     */
    setZoom(level) {
      const newZoom = Math.max(1, Math.min(64, Math.round(level)));
      if (newZoom === this.zoom) return;

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // Coordinate in frame pixel space at screen center
      const worldX = (centerX - this.offsetX) / this.zoom;
      const worldY = (centerY - this.offsetY) / this.zoom;

      this.zoom = newZoom;
      this.offsetX = Math.round(centerX - worldX * newZoom);
      this.offsetY = Math.round(centerY - worldY * newZoom);

      this.render();
    }

    /**
     * Double zoom level.
     */
    zoomIn() {
      this.setZoom(this.zoom * 2);
    }

    /**
     * Halve zoom level.
     */
    zoomOut() {
      this.setZoom(Math.max(1, Math.floor(this.zoom / 2)));
    }

    /**
     * Pan canvas viewport by screen delta.
     * @param {number} dx 
     * @param {number} dy 
     */
    pan(dx, dy) {
      this.offsetX += dx;
      this.offsetY += dy;
      this.render();
    }

    /**
     * Center the current frame within canvas dimensions.
     */
    centerView() {
      if (!this.canvas) return;
      const frame = this.project ? this.project.getCurrentFrame() : null;
      const sheet = this.project ? this.project.getCurrentSheet() : null;
      const fw = frame ? frame.width : (sheet ? sheet.frameWidth : 64);
      const fh = frame ? frame.height : (sheet ? sheet.frameHeight : 64);

      this.offsetX = Math.round((this.canvas.width - fw * this.zoom) / 2);
      this.offsetY = Math.round((this.canvas.height - fh * this.zoom) / 2);
      this.render();
    }

    /**
     * Convert screen (client or mouse event) coordinates to integer pixel coordinates.
     * @param {number} screenX 
     * @param {number} screenY 
     * @returns {{x: number, y: number}}
     */
    screenToPixel(screenX, screenY) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = (screenX - rect.left) * this.canvas.width / rect.width;
      const clientY = (screenY - rect.top) * this.canvas.height / rect.height;
      const x = Math.floor((clientX - this.offsetX) / this.zoom);
      const y = Math.floor((clientY - this.offsetY) / this.zoom);
      return { x, y };
    }

    /**
     * Convert integer pixel coordinates to screen coordinates.
     * @param {number} pixelX 
     * @param {number} pixelY 
     * @returns {{x: number, y: number}}
     */
    pixelToScreen(pixelX, pixelY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: rect.left + this.offsetX + pixelX * this.zoom,
        y: rect.top + this.offsetY + pixelY * this.zoom
      };
    }

    /**
     * Generate merged composite ImageData of all visible layers for a frame.
     * Starts with transparent canvas of frame size.
     * @param {number} [sheetIdx] 
     * @param {number} [actionIdx] 
     * @param {number} [frameIdx] 
     * @returns {ImageData|null}
     */
    getCompositeImageData(sheetIdx, actionIdx, frameIdx, includeHands = true) {
      if (!this.project) return null;
      const si = sheetIdx !== undefined ? sheetIdx : this.project.currentSheetIndex;
      const ai = actionIdx !== undefined ? actionIdx : this.project.currentActionIndex;
      const fi = frameIdx !== undefined ? frameIdx : this.project.currentFrameIndex;
      const frameKey = this.project.getFrameKey(si, ai, fi);

      const sheet = this.project.spriteSheets[si];
      const action = sheet && sheet.actions ? sheet.actions[ai] : null;
      const frame = action && action.frames ? action.frames[fi] : null;
      const fw = frame ? frame.width : (sheet ? sheet.frameWidth : 64);
      const fh = frame ? frame.height : (sheet ? sheet.frameHeight : 64);

      const compCanvas = document.createElement('canvas');
      compCanvas.width = fw;
      compCanvas.height = fh;
      const compCtx = compCanvas.getContext('2d');
      compCtx.imageSmoothingEnabled = false;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = fw;
      tempCanvas.height = fh;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.imageSmoothingEnabled = false;

      const renderLayers=PE.getRenderLayers(this.project,si,ai);
      for (let i = 0; i < renderLayers.length; i++) {
        const layer = renderLayers[i];
        if (!includeHands && PE.isHandLayer(layer)) continue;
        if (!PE.isLayerVisible(this.project, layer, typeof si === "undefined" ? this.project.currentSheetIndex : si)) continue;
        const frameData = layer.getFrameData(frameKey);
        if (!frameData) continue;

        tempCtx.clearRect(0, 0, fw, fh);
        tempCtx.putImageData(frameData, 0, 0);
        compCtx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
        compCtx.drawImage(tempCanvas, 0, 0);
      }

      return compCtx.getImageData(0, 0, fw, fh);
    }

    /**
     * Generate merged composite ImageData including original sheet frame pixels as base.
     * @param {number} [sheetIdx] 
     * @param {number} [actionIdx] 
     * @param {number} [frameIdx] 
     * @returns {ImageData|null}
     */
    getCompositeWithOriginal(sheetIdx, actionIdx, frameIdx) {
      if (!this.project) return null;
      const si = sheetIdx !== undefined ? sheetIdx : this.project.currentSheetIndex;
      const ai = actionIdx !== undefined ? actionIdx : this.project.currentActionIndex;
      const fi = frameIdx !== undefined ? frameIdx : this.project.currentFrameIndex;

      const sheet = this.project.spriteSheets[si];
      const action = sheet && sheet.actions ? sheet.actions[ai] : null;
      const frame = action && action.frames ? action.frames[fi] : null;
      const fw = frame ? frame.width : (sheet ? sheet.frameWidth : 64);
      const fh = frame ? frame.height : (sheet ? sheet.frameHeight : 64);

      const compCanvas = document.createElement('canvas');
      compCanvas.width = fw;
      compCanvas.height = fh;
      const compCtx = compCanvas.getContext('2d');
      compCtx.imageSmoothingEnabled = false;

      // Merge visible layers
      const layersComp = this.getCompositeImageData(si, ai, fi, !this.hideHands);
      if (layersComp) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = fw;
        tempCanvas.height = fh;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.putImageData(layersComp, 0, 0);
        compCtx.globalAlpha = 1.0;
        compCtx.drawImage(tempCanvas, 0, 0);
      }

      return compCtx.getImageData(0, 0, fw, fh);
    }

    /**
     * Full re-render of current frame.
     * Execution pipeline:
     * 1. Clear canvas with background color
     * 2. Draw checkerboard transparency background for frame boundary
     * 3. Composite visible layers (with original pixels as base if available)
     * 4. Draw onion skin overlay of prev/next frames
     * 5. Highlight modified pixels vs original if showChanges is enabled
     * 6. Draw pixel grid lines
     * 7. Draw locked regions and frame border
     * 8. Draw selection outline
     */
    render() {
      if (!this.canvas || !this.ctx) return;

      this.ctx.imageSmoothingEnabled = false;

      // 1. Clear background
      const bgColor = this.project && this.project.bgColor ? this.project.bgColor : '#1a1a2e';
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const frame = this.project ? this.project.getCurrentFrame() : null;
      if (!frame) return;

      const fw = frame.width;
      const fh = frame.height;
      const screenX = this.offsetX;
      const screenY = this.offsetY;
      const screenW = fw * this.zoom;
      const screenH = fh * this.zoom;

      // 2. Checkerboard transparency background
      this._drawCheckerboard(screenX, screenY, fw, fh);

      // Ensure offscreen dimensions match frame size
      if (this.offscreenCanvas.width !== fw || this.offscreenCanvas.height !== fh) {
        this.offscreenCanvas.width = fw;
        this.offscreenCanvas.height = fh;
        this.offscreenCtx.imageSmoothingEnabled = false;
      }
      if (this.layerCanvas.width !== fw || this.layerCanvas.height !== fh) {
        this.layerCanvas.width = fw;
        this.layerCanvas.height = fh;
        this.layerCtx.imageSmoothingEnabled = false;
      }

      this.offscreenCtx.clearRect(0, 0, fw, fh);

      // Composite the editable layers exactly once.
      const frameKey = this.project.getFrameKey();
      for (let i = 0; i < this.project.layers.length; i++) {
        const layer = this.project.layers[i];
        if (this.hideHands && PE.isHandLayer(layer)) continue;
        if (!PE.isLayerVisible(this.project, layer, typeof si === "undefined" ? this.project.currentSheetIndex : si)) continue;
        const data = layer.getFrameData(frameKey);
        if (!data) continue;

        this.layerCtx.clearRect(0, 0, fw, fh);
        this.layerCtx.putImageData(data, 0, 0);
        this.offscreenCtx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
        this.offscreenCtx.drawImage(this.layerCanvas, 0, 0);
      }

      // Draw composited result scaled to screen
      this.ctx.drawImage(this.offscreenCanvas, screenX, screenY, screenW, screenH);

      // 4. Onion skin: previous and next frames
      if (this.showOnionSkin) {
        const action = this.project.getCurrentAction();
        if (action && action.frames) {
          const curFi = this.project.currentFrameIndex;
          const si = this.project.currentSheetIndex;
          const ai = this.project.currentActionIndex;

          // Previous frame
          if (curFi > 0) {
            const prevComp = this.getCompositeWithOriginal(si, ai, curFi - 1);
            if (prevComp) {
              this.layerCtx.clearRect(0, 0, fw, fh);
              this.layerCtx.putImageData(prevComp, 0, 0);
              this.ctx.save();
              this.ctx.globalAlpha = this.onionSkinOpacity;
              this.ctx.drawImage(this.layerCanvas, screenX, screenY, screenW, screenH);
              this.ctx.restore();
            }
          }

          // Next frame
          if (curFi < action.frames.length - 1) {
            const nextComp = this.getCompositeWithOriginal(si, ai, curFi + 1);
            if (nextComp) {
              this.layerCtx.clearRect(0, 0, fw, fh);
              this.layerCtx.putImageData(nextComp, 0, 0);
              this.ctx.save();
              this.ctx.globalAlpha = this.onionSkinOpacity;
              this.ctx.drawImage(this.layerCanvas, screenX, screenY, screenW, screenH);
              this.ctx.restore();
            }
          }
        }
      }

      // 5. Show modified pixels overlay
      if (this.showChanges && frame.originalPixels) {
        const comp = this.getCompositeImageData();
        if (comp) {
          this.ctx.save();
          this.ctx.fillStyle = 'rgba(255, 165, 0, 0.45)';
          for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
              const orig = frame.getOriginalPixel(x, y);
              const cur = PE.utils.getPixelFromImageData(comp, x, y);
              if (cur && cur.a > 0 && !PE.utils.comparePixels(orig, cur)) {
                this.ctx.fillRect(screenX + x * this.zoom, screenY + y * this.zoom, this.zoom, this.zoom);
              }
            }
          }
          this.ctx.restore();
        }
      }

      // 6. Pixel grid
      if (this.showGrid && this.zoom >= this.gridMinZoom) {
        this._drawGrid(screenX, screenY, fw, fh);
      }

      // Frame border
      this.ctx.save();
      this.ctx.strokeStyle = '#555577';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX - 0.5, screenY - 0.5, screenW + 1, screenH + 1);
      this.ctx.restore();

      // 7. Locked regions & whole frame locked status
      if (frame.locked) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff3333';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(screenX, screenY, screenW, screenH);
        this.ctx.fillStyle = 'rgba(255, 50, 50, 0.12)';
        this.ctx.fillRect(screenX, screenY, screenW, screenH);
        this.ctx.restore();
      }

      if (frame.lockedRegions && frame.lockedRegions.length > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff3333';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
        for (let i = 0; i < frame.lockedRegions.length; i++) {
          const reg = frame.lockedRegions[i];
          const rx = screenX + reg.x * this.zoom;
          const ry = screenY + reg.y * this.zoom;
          const rw = reg.w * this.zoom;
          const rh = reg.h * this.zoom;
          this.ctx.fillRect(rx, ry, rw, rh);
          this.ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        }
        this.ctx.restore();
      }

      // 8. Selection outline
      const sel = this.selection || (this.toolManager && this.toolManager.selection) || (PE.toolManager && PE.toolManager.selection);
      if (sel) {
        this.ctx.save();
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        const sx = screenX + sel.x * this.zoom;
        const sy = screenY + sel.y * this.zoom;
        const sw = sel.w * this.zoom;
        const sh = sel.h * this.zoom;
        this.ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
        this.ctx.fillRect(sx, sy, sw, sh);
        this.ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
        this.ctx.restore();
      }
    }

    /**
     * Draw transparency checkerboard pattern inside the frame boundary.
     * @private
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    _drawCheckerboard(x, y, w, h) {
      const zoom = this.zoom;
      const totalW = w * zoom;
      const totalH = h * zoom;
      const size = this.checkerboardSize;
      const color1 = this.project?.bgColor || '#2c3335';
      const rgb=PE.utils.hexToRGBA(color1);
      const delta=(rgb.r+rgb.g+rgb.b)>480?-10:10;
      const color2='rgb('+[rgb.r,rgb.g,rgb.b].map(v=>Math.max(0,Math.min(255,v+delta))).join(',')+')';

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(x, y, totalW, totalH);
      this.ctx.clip();

      for (let cy = 0; cy < totalH; cy += size) {
        for (let cx = 0; cx < totalW; cx += size) {
          if (x+cx+size<0 || x+cx>this.canvas.width || y+cy+size<0 || y+cy>this.canvas.height) continue;
          const col = Math.floor(cx / size);
          const row = Math.floor(cy / size);
          this.ctx.fillStyle = (col + row) % 2 === 0 ? color1 : color2;
          this.ctx.fillRect(x + cx, y + cy, size, size);
        }
      }

      this.ctx.restore();
    }

    /**
     * Draw thin pixel grid lines.
     * @private
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    _drawGrid(x, y, w, h) {
      const zoom = this.zoom;
      this.ctx.save();
      this.ctx.strokeStyle = this.project && this.project.gridColor ? this.project.gridColor : '#333333';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();

      // Vertical lines
      for (let col = 0; col <= w; col++) {
        const lx = Math.floor(x + col * zoom) + 0.5;
        this.ctx.moveTo(lx, y);
        this.ctx.lineTo(lx, y + h * zoom);
      }

      // Horizontal lines
      for (let row = 0; row <= h; row++) {
        const ly = Math.floor(y + row * zoom) + 0.5;
        this.ctx.moveTo(x, ly);
        this.ctx.lineTo(x + w * zoom, ly);
      }

      this.ctx.stroke();
      this.ctx.restore();
    }

    /**
     * Alpha blend src RGBA onto dst RGBA with opacity.
     * @private
     * @param {{r:number, g:number, b:number, a:number}} dst 
     * @param {{r:number, g:number, b:number, a:number}} src 
     * @param {number} [opacity=1.0] 
     * @returns {{r:number, g:number, b:number, a:number}}
     */
    _blendPixel(dst, src, opacity = 1.0) {
      const sa = (src.a / 255) * opacity;
      const da = dst.a / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
      const r = Math.round((src.r * sa + dst.r * da * (1 - sa)) / outA);
      const g = Math.round((src.g * sa + dst.g * da * (1 - sa)) / outA);
      const b = Math.round((src.b * sa + dst.b * da * (1 - sa)) / outA);
      const a = Math.round(outA * 255);
      return { r, g, b, a };
    }
  }

  // Export to window.PE
  PE.CanvasManager = CanvasManager;

})();
