/**
 * Pixel Art Character Editor - Tool Manager (tools.js)
 * Drawing tools: pencil, eraser, eyedropper, flood fill, marquee selection, and movement.
 */

window.PE = window.PE || {};

(() => {
  'use strict';

  class ToolManager {
    constructor() {
      this.currentTool = 'pencil'; // 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select' | 'move' | 'line' | 'rect' | 'ellipse'
      this.symmetry = 'none'; // 'none' | 'x'（左右镜像） | 'y'（上下镜像） | 'both'
      this.freeImagePlacement = false;
      this.imageResizeMode = null; // 未手动选择时沿用当前图层类型，避免改变旧工程的缩放方式。
      this.primaryColor = { r: 0, g: 0, b: 0, a: 255 };
      this.brushSize = 1;
      this.pixelPerfect = true; // 去双拐角：斜线不再留 L 形双像素
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
      this._transform = null;
      this._rectStroke = null;
      this._shape = null; // 直线 / 矩形 / 椭圆的拖拽预览状态
      this._perfect = null; // 像素完美笔画的当前笔迹
      this._suspendClip = false; // 粘贴等内部操作临时脱离选区裁剪
    }

    /**
     * 当前工具是否应该被选区裁剪（像 PS 那样画不出选区）。
     * @returns {boolean}
     */
    _clipToolActive() {
      return ['pencil', 'eraser', 'fill', 'line', 'rect', 'ellipse'].includes(this.currentTool);
    }

    /**
     * 判断像素是否允许落笔：有选区且当前是绘画工具时，只允许落在选区内。
     * 矩形选区与魔棒掩膜都支持（交给 select-plus 的 insideSelection，取不到就退回矩形判断）。
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    _pixelInSelection(x, y) {
      if (this._suspendClip) return true;
      if (!this._clipToolActive()) return true;
      if (!this.selection && !(PE.selectionPlus && PE.selectionPlus.mask)) return true;
      if (PE.insideSelection) return PE.insideSelection(x, y, this.selection);
      const s = this.selection;
      if (!s) return true;
      return x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h;
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
      if(this._rectStroke||this._nativeEdit?.tools._rectStroke)this.clearSelection();
      if(this._nativeEdit)this.onMouseUp();
      if (this._transform) this.clearSelection();
      if (this._shape) this.cancelShape();
      this._perfect = null;
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
     * Set brush size in native pixels (clamped between 1 and 128).
     * @param {number} size 
     */
    setBrushSize(size) {
      this.brushSize = Number.isFinite(size) ? Math.max(1, Math.min(128, Math.round(size))) : 1;
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
    onMouseDown(px, py, button = 0, resizeHandle = null, rectangle = false) {
      this._mouseButton = button;
      if (!this.project) return;

      const frame = this.project.getCurrentFrame();
      if (!frame) return;

      const layer = this.project.getCurrentLayer();
      if (!layer) return;

      const frameKey = this.project.getFrameKey();
      const layerIdx = this.project.currentLayerIndex;

      const image=layer.getFrameData(frameKey),r=image?.placement;
      if(r&&['pencil','eraser','fill'].includes(this.currentTool)){
        this._beginNativeEdit(px,py,button,rectangle);return;
      }
      if(rectangle&&button===0&&['pencil','eraser'].includes(this.currentTool)){
        if(layer.locked||layer.inheritedBase||layer.isGroup||PE.isProtectedHandLayer(layer)||!PE.isLayerVisible(this.project,layer)||frame.locked)return;
        px=Math.floor(px);py=Math.floor(py);
        if(!this._isInBounds(px,py,frame.width,frame.height))return;
        this._rectStroke={project:this.project,layer,frame,index:layerIdx,key:frameKey,x:px,y:py,color:this.currentTool==='eraser'?{r:0,g:0,b:0,a:0}:{...this.primaryColor}};
        this.isDrawing=true;this._updateRectStroke(px,py);return;
      }
      if(r&&this.currentTool==='select'){
        const point=this._imagePoint(px,py,image);this._selectStartX=point.x;this._selectStartY=point.y;
        this.isDrawing=true;this._isSelecting=true;
        this.setSelection(point.x,point.y,r.w/image.width,r.h/image.height);return;
      }
      if(r&&this.currentTool==='eyedropper'){
        const x=Math.floor((px-r.x)*image.width/r.w),y=Math.floor((py-r.y)*image.height/r.h),picked=PE.utils.getPixelFromImageData(image,x,y);
        if(picked?.a){this.setColor(picked);this.onColorPick?.(picked);return;}
      }

      switch (this.currentTool) {
        case 'pencil': {
          if (layer.locked || PE.isProtectedHandLayer(layer) || !layer.visible || frame.locked) return;
          this.isDrawing = true;
          this.lastX = px;
          this.lastY = py;

          const color = (button === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
          if (this.historyManager) {
            this.historyManager.beginBatch(button === 2 ? '橡皮擦' : '铅笔绘制');
          }

          if (this._usePerfectStroke()) {
            this._beginPerfectStroke(layerIdx, frameKey, px, py, color);
            this._refreshPerfectStroke();
          } else {
            this.drawLine(layerIdx, frameKey, px, py, px, py, color.r, color.g, color.b, color.a, this.activeSymmetry());
          }
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'eraser': {
          if (layer.locked || PE.isProtectedHandLayer(layer) || !layer.visible || frame.locked) return;
          this.isDrawing = true;
          this.lastX = px;
          this.lastY = py;

          if (this.historyManager) {
            this.historyManager.beginBatch('橡皮擦');
          }

          if (this._usePerfectStroke()) {
            this._beginPerfectStroke(layerIdx, frameKey, px, py, { r: 0, g: 0, b: 0, a: 0 });
            this._refreshPerfectStroke();
          } else {
            this.drawLine(layerIdx, frameKey, px, py, px, py, 0, 0, 0, 0, this.activeSymmetry());
          }
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'eyedropper': {
          const comp = this.canvasManager ? this.canvasManager.getCompositeWithOriginal() : null;
          if (comp) {
            const picked = PE.utils.getPixelFromImageData(comp, Math.floor(px), Math.floor(py));
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
          if (layer.locked || PE.isProtectedHandLayer(layer) || !layer.visible || frame.locked) return;
          const color = (button === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
          this.fillArea(layerIdx, frameKey, px, py, color.r, color.g, color.b, color.a);
          if (this.canvasManager) this.canvasManager.render();
          break;
        }

        case 'line':
        case 'rect':
        case 'ellipse': {
          if (layer.locked || PE.isProtectedHandLayer(layer) || !layer.visible || frame.locked) return;
          px = Math.floor(px);
          py = Math.floor(py);
          if (!this._isInBounds(px, py, frame.width, frame.height)) return;
          this.isDrawing = true;
          this._shape = {
            tool: this.currentTool,
            x0: px,
            y0: py,
            x1: px,
            y1: py,
            color: button === 2 ? { r: 0, g: 0, b: 0, a: 0 } : { ...this.primaryColor }
          };
          this._updateShapePreview();
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
          if (button !== 0 || frame.locked) return;
          const s=this.selection,tolerance=4/(this.canvasManager?.zoom||1);
          const resize=!this._selectionStep(s)&&(resizeHandle??(s&&Math.abs(px-s.x-s.w)<=tolerance&&Math.abs(py-s.y-s.h)<=tolerance));
          if (!resize && (!s || px<s.x || py<s.y || px>=s.x+s.w || py>=s.y+s.h)) this.selectLayerAt(px,py);
          const source=this.selection,index=this.project.currentLayerIndex;
          if (!source || !this._selectionPixels(index,frameKey,source,source)) return;
          this._isMoving=true;this.isDrawing=true;this.selectionData=null;
          this._transform={layer:this.project.getCurrentLayer(),index,frameKey,source:{...source},target:{...source},px,py,resize,preview:null};
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
      if(this._nativeEdit){
        const edit=this._nativeEdit;
        if(this.project.getCurrentLayer()!==edit.session.layer||this.project.getFrameKey()!==edit.session.key){this._nativeEdit=null;this.isDrawing=false;return;}
        const point=this._sourcePoint(px,py,edit.session.original);edit.tools.onMouseMove(point.x,point.y);
        const box=edit.tools._rectStroke?.rect,r=edit.session.original.placement;
        if(box&&this.canvasManager)this.canvasManager.selection={x:r.x+box.x*r.w/edit.session.original.width,y:r.y+box.y*r.h/edit.session.original.height,w:box.w*r.w/edit.session.original.width,h:box.h*r.h/edit.session.original.height};
        this.canvasManager?.render();return;
      }
      if(this._rectStroke){this._updateRectStroke(px,py);return;}
      if(this._shape){
        const frame=this.project.getCurrentFrame();
        if(!frame){this._shape=null;this.isDrawing=false;return;}
        this._shape.x1=Math.max(0,Math.min(frame.width-1,Math.floor(px)));
        this._shape.y1=Math.max(0,Math.min(frame.height-1,Math.floor(py)));
        this._updateShapePreview();return;
      }
      const frameKey = this.project.getFrameKey();
      const layerIdx = this.project.currentLayerIndex;

      if (this._transform) {
        const t=this._transform,s=t.source;
        if (frameKey!==t.frameKey || this.project.getCurrentLayer()!==t.layer) {this.clearSelection();return;}
        const grid=this._selectionStep(s),position=(v,origin,step)=>grid?origin+Math.round((v-origin)/step)*step:this._canFreePlace(s,t.index,t.frameKey)?Math.round(v*1e6)/1e6:Math.round(v);
        const target=t.resize?this._scaledSelection(s,Math.max((px-s.x)/s.w,(py-s.y)/s.h)):
          {...s,x:position(s.x+px-t.px,s.x,grid?.x),y:position(s.y+py-t.py,s.y,grid?.y)};
        const preview=this._selectionPixels(t.index,t.frameKey,s,target);
        if (preview) {t.target=target;t.preview=preview;this.setSelection(target.x,target.y,target.w,target.h);}
        return;
      }

      if (this.isDrawing) {
        if (this._perfect) {
          this._appendPerfectPoint(px, py);
          this._refreshPerfectStroke();
          this.lastX = px;
          this.lastY = py;
          if (this.canvasManager) this.canvasManager.render();
        } else if (this.currentTool === 'pencil') {
          if (this.lastX !== px || this.lastY !== py) {
            const color = (this._mouseButton === 2) ? { r: 0, g: 0, b: 0, a: 0 } : this.primaryColor;
            this.drawLine(layerIdx, frameKey, this.lastX, this.lastY, px, py, color.r, color.g, color.b, color.a, this.activeSymmetry());
            this.lastX = px;
            this.lastY = py;
            if (this.canvasManager) this.canvasManager.render();
          }
        } else if (this.currentTool === 'eraser') {
          if (this.lastX !== px || this.lastY !== py) {
            this.drawLine(layerIdx, frameKey, this.lastX, this.lastY, px, py, 0, 0, 0, 0, this.activeSymmetry());
            this.lastX = px;
            this.lastY = py;
            if (this.canvasManager) this.canvasManager.render();
          }
        } else if (this.currentTool === 'select' && this._isSelecting) {
          const image=this.project.getCurrentLayer()?.getFrameData(frameKey),r=image?.placement;
          if(r){const point=this._imagePoint(px,py,image);this.setSelection(Math.min(point.x,this._selectStartX),Math.min(point.y,this._selectStartY),Math.abs(point.x-this._selectStartX)+r.w/image.width,Math.abs(point.y-this._selectStartY)+r.h/image.height);return;}
          const sx = Math.min(this._selectStartX, px);
          const sy = Math.min(this._selectStartY, py);
          const sw = Math.abs(px - this._selectStartX) + 1;
          const sh = Math.abs(py - this._selectStartY) + 1;
          this.setSelection(sx, sy, sw, sh);
        }
      }
    }

    /**
     * Pointer release event handler.
     * @param {number} px 
     * @param {number} py 
     */
    onMouseUp(px, py) {
      if(this._nativeEdit){
        if(this._nativeEdit.tools._rectStroke&&Number.isFinite(px)&&Number.isFinite(py))this.onMouseMove(px,py);
        const edit=this._nativeEdit;this._nativeEdit=null;this.isDrawing=false;edit.tools.onMouseUp();
        try{
          if(this.project.getCurrentLayer()!==edit.session.layer||this.project.getFrameKey()!==edit.session.key)throw new Error('图层或帧已切换，本笔修改未应用');
          edit.session.apply();
        }catch(e){this.onImageEditBlocked?.(e.message);}
        if(this.canvasManager)this.canvasManager.selection=this.selection;
        this.canvasManager?.render();return;
      }
      if(this._rectStroke){
        if(Number.isFinite(px)&&Number.isFinite(py))this._updateRectStroke(px,py);
        const s=this._rectStroke;this._rectStroke=null;this.isDrawing=false;
        if(this.canvasManager)this.canvasManager.selection=this.selection;
        if(this.project===s.project&&this.project.getCurrentLayer()===s.layer&&this.project.getCurrentFrame()===s.frame&&this.project.getFrameKey()===s.key&&!s.layer.inheritedBase&&PE.isLayerVisible(this.project,s.layer)){
          let {x,y,w,h}=s.rect;
          if(this.selection){const c=this.selection,right=Math.min(x+w,c.x+c.w),bottom=Math.min(y+h,c.y+c.h);x=Math.max(x,c.x);y=Math.max(y,c.y);w=right-x;h=bottom-y;}
          if(w>0&&h>0){const c=s.color;this.historyManager?.beginBatch(c.a===0?'Ctrl 框选擦除':'Ctrl 矩形绘制');this.drawRect(s.index,s.key,x,y,w,h,c.r,c.g,c.b,c.a,true,this.activeSymmetry());this.historyManager?.commitBatch();}
        }
        this.canvasManager?.render();return;
      }
      if (this._shape) {
        if(Number.isFinite(px)&&Number.isFinite(py))this.onMouseMove(px,py);
        this._commitShape();return;
      }
      if (this._transform) {
        const t=this._transform;this._transform=null;this._isMoving=false;this.isDrawing=false;
        if (this.project.getFrameKey()!==t.frameKey || this.project.getCurrentLayer()!==t.layer) {this.clearSelection();return;}
        if (!this.transformSelection(t.index,t.frameKey,t.source,t.target)) this.setSelection(t.source.x,t.source.y,t.source.w,t.source.h);
        return;
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        this.lastX = -1;
        this.lastY = -1;
        this._perfect = null;

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

    }

    _sourcePoint(x,y,image) {
      const r=image.placement;
      return {x:Math.max(-1,Math.min(image.width,Math.floor((x-r.x)*image.width/r.w+1e-7))),y:Math.max(-1,Math.min(image.height,Math.floor((y-r.y)*image.height/r.h+1e-7)))};
    }

    _imagePoint(x,y,image) {
      const r=image.placement,point=this._sourcePoint(x,y,image);
      return {x:r.x+point.x*r.w/image.width,y:r.y+point.y*r.h/image.height};
    }

    _updateRectStroke(x,y) {
      const s=this._rectStroke;
      x=Math.max(0,Math.min(s.frame.width-1,Math.floor(x)));y=Math.max(0,Math.min(s.frame.height-1,Math.floor(y)));
      s.rect={x:Math.min(s.x,x),y:Math.min(s.y,y),w:Math.abs(s.x-x)+1,h:Math.abs(s.y-y)+1};
      if(this.canvasManager){this.canvasManager.selection=s.rect;this.canvasManager.render();}
    }

    // ==========================================
    // Shape Tools: line / rect / ellipse with live preview
    // ==========================================

    cancelShape() {
      this._shape = null;
      this.isDrawing = false;
      if (this.canvasManager) {
        this.canvasManager.shapePreview = null;
        this.canvasManager.render();
      }
    }

    _updateShapePreview() {
      const shape = this._shape;
      if (!shape || !this.canvasManager) return;
      const pixels = this._withSymmetry(this._shapePixels(shape), this.activeSymmetry())
        .filter(p => this._pixelInSelection(p.x, p.y));
      this.canvasManager.shapePreview = { pixels, color: shape.color };
      this.canvasManager.render();
    }

    _shapePixels(shape) {
      const frame = this.project ? this.project.getCurrentFrame() : null;
      if (!frame) return [];
      const clampX = v => Math.max(0, Math.min(frame.width - 1, v));
      const clampY = v => Math.max(0, Math.min(frame.height - 1, v));
      let x0 = clampX(shape.x0);
      let y0 = clampY(shape.y0);
      let x1 = clampX(shape.x1);
      let y1 = clampY(shape.y1);
      const shift = PE.shapeShift === true;
      const paint = (x, y) => ({ x, y, r: shape.color.r, g: shape.color.g, b: shape.color.b, a: shape.color.a });

      if (shape.tool === 'line') {
        if (shift) {
          // 45° 吸附：取更长的那个轴，保证斜向、水平、垂直都直。
          const dx = x1 - x0;
          const dy = y1 - y0;
          if (Math.abs(dx) > Math.abs(dy) * 2) y1 = y0;
          else if (Math.abs(dy) > Math.abs(dx) * 2) x1 = x0;
          else {
            const len = Math.max(Math.abs(dx), Math.abs(dy));
            x1 = x0 + Math.sign(dx) * len;
            y1 = y0 + Math.sign(dy) * len;
          }
        }
        return this._bresenhamLine(x0, y0, x1, y1).map(pt => paint(pt.x, pt.y));
      }

      if (shift) {
        const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        x1 = x0 + Math.sign(x1 - x0 || 1) * len;
        y1 = y0 + Math.sign(y1 - y0 || 1) * len;
        x1 = clampX(x1);
        y1 = clampY(y1);
      }

      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);

      if (shape.tool === 'rect') {
        const pixels = [];
        for (let x = left; x <= right; x++) {
          pixels.push(paint(x, top));
          if (bottom !== top) pixels.push(paint(x, bottom));
        }
        for (let y = top + 1; y < bottom; y++) {
          pixels.push(paint(left, y));
          if (right !== left) pixels.push(paint(right, y));
        }
        return pixels;
      }

      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      const rx = (right - left) / 2 + 0.5;
      const ry = (bottom - top) / 2 + 0.5;
      const inside = (x, y) => {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        return nx * nx + ny * ny <= 1;
      };
      const pixels = [];
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          if (edge) pixels.push(paint(x, y));
        }
      }
      return pixels;
    }

    _commitShape() {
      const shape = this._shape;
      this._shape = null;
      this.isDrawing = false;
      if (this.canvasManager) this.canvasManager.shapePreview = null;
      if (!shape || !this.project) return;
      const layer = this.project.getCurrentLayer();
      const frame = this.project.getCurrentFrame();
      if (!layer || !frame || layer.locked || PE.isProtectedHandLayer(layer) || frame.locked) return;
      const pixels = this._withSymmetry(this._shapePixels(shape), this.activeSymmetry());
      if (!pixels.length) return;
      const label = { line: '直线', rect: '矩形', ellipse: '椭圆' }[shape.tool] || '形状';
      if (this.historyManager) this.historyManager.beginBatch(label);
      this.drawPixels(this.project.currentLayerIndex, this.project.getFrameKey(), pixels);
      if (this.historyManager) this.historyManager.commitBatch();
      if (this.canvasManager) this.canvasManager.render();
    }

    // ==========================================
    // Pixel-perfect stroke: 去双拐角，并支持撤回单个像素
    // ==========================================

    _usePerfectStroke() {
      if (PE.altPrecision === true) return true;
      return this.pixelPerfect !== false && this.brushSize === 1;
    }

    _beginPerfectStroke(layerIdx, frameKey, x, y, color) {
      this._perfect = {
        layerIdx,
        frameKey,
        raw: [{ x, y }],
        painted: new Map(), // 'x_y' -> 落笔前的原色，用于扣掉拐角时还原
        color: { r: color.r, g: color.g, b: color.b, a: color.a }
      };
    }

    _appendPerfectPoint(x, y) {
      const stroke = this._perfect;
      if (!stroke) return;
      const last = stroke.raw[stroke.raw.length - 1];
      if (last && last.x === x && last.y === y) return;
      stroke.raw.push({ x, y });
    }

    /**
     * 把鼠标轨迹补成连续像素，再削掉 L 形拐角的多余像素。
     * @param {Array<{x:number,y:number}>} raw
     * @returns {Array<{x:number,y:number}>}
     */
    _perfectPixels(raw) {
      if (!raw || !raw.length) return [];
      const dense = [];
      const push = point => {
        const last = dense[dense.length - 1];
        if (!last || last.x !== point.x || last.y !== point.y) dense.push({ x: point.x, y: point.y });
      };
      push(raw[0]);
      for (let i = 1; i < raw.length; i++) {
        for (const point of this._bresenhamLine(raw[i - 1].x, raw[i - 1].y, raw[i].x, raw[i].y)) push(point);
      }
      for (let i = dense.length - 2; i >= 1; i--) {
        const a = dense[i - 1];
        const b = dense[i];
        const c = dense[i + 1];
        const corner = ((a.x === b.x && c.y === b.y) || (a.y === b.y && c.x === b.x)) && a.x !== c.x && a.y !== c.y;
        if (corner) dense.splice(i, 1);
      }
      return dense;
    }

    _refreshPerfectStroke() {
      const stroke = this._perfect;
      if (!stroke || !this.project) return;
      const layer = this.project.layers[stroke.layerIdx];
      if (!layer) return;
      const [si, ai, fi] = stroke.frameKey.split('_').map(Number);
      const frame = this.project.spriteSheets[si]?.actions?.[ai]?.frames?.[fi];
      if (!frame) return;
      const data = layer.ensureFrameData(stroke.frameKey, frame.width, frame.height);

      const points = this._perfectPixels(stroke.raw);
      const painted = this._withSymmetry(points.map(p => ({ ...p, ...stroke.color })), this.activeSymmetry());
      const target = new Map(painted.map(p => [`${p.x}_${p.y}`, p]));

      // 拐角被削掉时，把那一格还原成落笔前的颜色
      for (const [key, before] of [...stroke.painted]) {
        if (target.has(key)) continue;
        stroke.painted.delete(key);
        const [px, py] = key.split('_').map(Number);
        const current = PE.utils.getPixelFromImageData(data, px, py) || { r: 0, g: 0, b: 0, a: 0 };
        if (PE.utils.comparePixels(current, before)) continue;
        this.historyManager?.recordPixelChange(stroke.layerIdx, stroke.frameKey, px, py, current, before);
        PE.utils.setPixelInImageData(data, px, py, before.r, before.g, before.b, before.a);
      }

      for (const [key, pixel] of target) {
        if (stroke.painted.has(key)) continue;
        const [px, py] = key.split('_').map(Number);
        if (px < 0 || py < 0 || px >= frame.width || py >= frame.height) continue;
        if (frame.isPixelLocked(px, py)) continue;
        if (!this._pixelInSelection(px, py)) continue;
        const before = PE.utils.getPixelFromImageData(data, px, py) || { r: 0, g: 0, b: 0, a: 0 };
        stroke.painted.set(key, before);
        const after = { r: pixel.r, g: pixel.g, b: pixel.b, a: pixel.a };
        if (PE.utils.comparePixels(before, after)) continue;
        this.historyManager?.recordPixelChange(stroke.layerIdx, stroke.frameKey, px, py, before, after);
        PE.utils.setPixelInImageData(data, px, py, after.r, after.g, after.b, after.a);
      }
    }

    _beginNativeEdit(x,y,button,rectangle=false) {      try{
        const app=PE.app?.project===this.project?PE.app:{project:this.project,history:this.historyManager,updateAll:()=>this.canvasManager?.render()};
        const session=new PE.HDCanvasSession(app),point=this._sourcePoint(x,y,session.original);
        if(point.x<0||point.y<0||point.x>=session.original.width||point.y>=session.original.height)return;
        const tools=new ToolManager();tools.init(session.project,null,session.history);tools.setTool(this.currentTool);tools.setColor(this.primaryColor);tools.setBrushSize(this.brushSize);
        // 子工具必须继承画笔开关，否则高清图片图层会一直按默认值（像素完美开启）作画。
        tools.pixelPerfect=this.pixelPerfect;tools.symmetry=this.symmetry;tools.freeImagePlacement=this.freeImagePlacement;
        // 高清图层在源像素坐标上作画：把帧坐标的镜像中线换算成源图坐标，边画边镜像才对得上。
        const mirrorState=this.project.getCurrentLayer?.()?.mirror;
        if(mirrorState?.enabled){
          const r=session.original.placement,horizontal=mirrorState.direction!=='vertical',f=this.project.getCurrentFrame();
          const line=typeof mirrorState.axis==='number'?mirrorState.axis:(horizontal?f.width/2:f.height/2);
          const sourceLine=horizontal?(line-r.x)*session.original.width/r.w:(line-r.y)*session.original.height/r.h;
          const temp=session.project.layers[0];
          if(temp)temp.mirror={enabled:true,direction:mirrorState.direction,axis:sourceLine};
        }
        if(this.selection){
          const s=PE.utils.imageSourceRect(session.original,this.selection),f=session.project.getCurrentFrame(),w=f.width,h=f.height;
          if(!s.w||!s.h)return;
          for(const box of [[0,0,w,s.y],[0,s.y+s.h,w,h-s.y-s.h],[0,s.y,s.x,s.h],[s.x+s.w,s.y,w-s.x-s.w,s.h]])if(box[2]>0&&box[3]>0)f.addLockedRegion(...box);
        }
        this._nativeEdit={session,tools};this.isDrawing=true;tools.onMouseDown(point.x,point.y,button,null,rectangle);
        if(tools._rectStroke)this.onMouseMove(x,y);
        if(!tools.isDrawing)this.onMouseUp();
      }catch(e){this._nativeEdit=null;this.isDrawing=false;this.onImageEditBlocked?.(e.message);}
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
      if(layer.getFrameData(frameKey)?.placement)return {success:false,rejected:{reason:'hd_image_layer'}};
      if (layer.locked || PE.isProtectedHandLayer(layer) || layer.isGroup) return { success: false, rejected: { reason: 'layer_locked' } };
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

      if (!this._pixelInSelection(x, y)) {
        return { success: false, rejected: { reason: 'outside_selection' } };
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
      if(layer?.getFrameData(frameKey)?.placement)return {success:false,modifiedCount:0,rejectedPixels:pixels.map(p=>({x:p.x,y:p.y,reason:'hd_image_layer'}))};
      if (!layer || layer.locked || PE.isProtectedHandLayer(layer) || layer.isGroup || !layer.visible) {
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

        if (!this._pixelInSelection(p.x, p.y)) {
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
    drawLine(layerIdx, frameKey, x1, y1, x2, y2, r, g, b, a = 255, symmetry = 'none') {
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
        return this.drawPixels(layerIdx, frameKey, this._withSymmetry(pixels, symmetry));
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
    drawRect(layerIdx, frameKey, x, y, w, h, r, g, b, a = 255, filled = false, symmetry = 'none') {
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

      return this.drawPixels(layerIdx, frameKey, this._withSymmetry(pixels, symmetry));
    }

    /**
     * 当前笔触真正生效的对称模式：当前图层开了边画边镜像时，以镜像为准。
     * @returns {'none'|'x'|'y'|'both'}
     */
    activeSymmetry() {
      const layer = this.project ? this.project.getCurrentLayer() : null;
      const mirror = PE.Mirror && layer ? PE.Mirror.strokeMode(layer) : null;
      return mirror || this.symmetry || 'none';
    }

    /**
     * 展开像素列表，加入镜像副本；中线由 PE.Mirror 决定（默认画布最中间）。
     * @param {Array<{x:number,y:number,r:number,g:number,b:number,a:number}>} pixels
     * @param {'none'|'x'|'y'|'both'} symmetry
     * @returns {Array}
     */
    _withSymmetry(pixels, symmetry) {
      if (!symmetry || symmetry === 'none' || !pixels.length) return pixels;
      const frame = this.project ? this.project.getCurrentFrame() : null;
      if (!frame) return pixels;
      const w = frame.width;
      const h = frame.height;
      const lines = PE.Mirror && PE.Mirror.lines ? PE.Mirror.lines(this.project, frame) : { x: w / 2, y: h / 2 };
      const flipX = value => Math.round(2 * lines.x - 1 - value);
      const flipY = value => Math.round(2 * lines.y - 1 - value);
      const seen = new Set(pixels.map(p => `${p.x}_${p.y}`));
      const out = pixels.slice();
      const push = (x, y, source) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const key = `${x}_${y}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ ...source, x, y });
      };
      for (const p of pixels) {
        if (symmetry === 'x' || symmetry === 'both') push(flipX(p.x), p.y, p);
        if (symmetry === 'y' || symmetry === 'both') push(p.x, flipY(p.y), p);
        if (symmetry === 'both') push(flipX(p.x), flipY(p.y), p);
      }
      return out;
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

      if(this.project.layers[layerIdx]?.getFrameData(frameKey)?.placement)return {success:false,modifiedCount:0,reason:'hd_image_layer'};

      const layer = this.project.layers[layerIdx];
      if (!layer || layer.locked || PE.isProtectedHandLayer(layer) || layer.isGroup || !layer.visible) {
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

      const fillPoints = this._floodFill(frameData, startX, startY, fillColor, frame).filter(
        pt => this._pixelInSelection(pt.x, pt.y)
      );
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

      // Raster marquees are clipped; moving image boxes must keep their off-canvas extent.
      const placed=this.project?.getCurrentLayer()?.getFrameData(this.project.getFrameKey())?.placement;
      if(!placed&&this.currentTool!=='move'){
      if (rx < 0) { rw += rx; rx = 0; }
      if (ry < 0) { rh += ry; ry = 0; }
      if (rx + rw > maxW) rw = Math.max(0, maxW - rx);
      if (ry + rh > maxH) rh = Math.max(0, maxH - ry);
      }

      if (rw <= 0 || rh <= 0) {
        this.selection = null;
      } else {
        const hd=this.project?.getCurrentLayer()?.getFrameData(this.project.getFrameKey())?.placement;
        this.selection = {
          x: hd||this.currentTool==='move'&&this.freeImagePlacement?rx:Math.floor(rx),
          y: hd||this.currentTool==='move'&&this.freeImagePlacement?ry:Math.floor(ry),
          w: hd?rw:Math.floor(rw),
          h: hd?rh:Math.floor(rh)
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
      if(this._rectStroke||this._nativeEdit?.tools._rectStroke){this._rectStroke=null;this._nativeEdit=null;this.isDrawing=false;}
      if (this._transform) this.isDrawing=false;
      this._transform=null;this._isMoving=false;
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
      if(comp.placement)return null;

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
      if(this.selectionData.placement)return false;

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

      // 粘贴的内容要落到目标位置，不能被“旧选区”裁剪，先临时关闭裁剪。
      this._suspendClip = true;
      try {
        this.drawPixels(layerIdx, frameKey, pixels);
      } finally {
        this._suspendClip = false;
      }

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
    nudgeSelection(dx, dy) {
      if (!this.selection || !this.project || this.isDrawing || this._isMoving) return false;
      const {x,y,w,h}=this.selection;
      const free=this._canFreePlace(this.selection,this.project.currentLayerIndex,this.project.getFrameKey());
      const grid=this._selectionStep(this.selection),position=(v,step,cell)=>grid?v+step*cell:free?Math.round((v+step*.1)*1e6)/1e6:Math.round(v+step);
      // Read the active layer again; never paste an old composite/copy buffer.
      this.selectionData=null;
      const moved=this.moveSelection(this.project.currentLayerIndex,this.project.getFrameKey(),x,y,w,h,position(x,dx,grid?.x),position(y,dy,grid?.y));
      this.selectionData=null;
      return moved;
    }

    moveSelection(layerIdx, frameKey, srcX, srcY, srcW, srcH, destX, destY) {
      return this.transformSelection(layerIdx,frameKey,{x:srcX,y:srcY,w:srcW,h:srcH},{x:destX,y:destY,w:srcW,h:srcH});
    }

    getLayerPlacement(index=this.project.currentLayerIndex,key=this.project.getFrameKey()) {
      const data=this.project.layers[index]?.getFrameData(key);if(!data)return null;
      if(data.placement)return {...data.placement};
      let left=data.width,top=data.height,right=-1,bottom=-1;
      for(let y=0;y<data.height;y++)for(let x=0;x<data.width;x++)if(data.data[(y*data.width+x)*4+3]){
        left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
      }
      return right<0?null:{x:left,y:top,w:right-left+1,h:bottom-top+1};
    }

    _canFreePlace(source,index,key) {
      const r=this.freeImagePlacement&&this.getLayerPlacement(index,key);
      // Partial selections stay on-grid; separate the fragment into a layer before free placement.
      return !!r&&source.x<=r.x&&source.y<=r.y&&source.x+source.w>=r.x+r.w&&source.y+source.h>=r.y+r.h;
    }

    _selectionStep(source) {
      if(!source)return null;
      const image=this.project.getCurrentLayer()?.getFrameData(this.project.getFrameKey()),r=image?.placement;
      return r&&!(source.x<=r.x&&source.y<=r.y&&source.x+source.w>=r.x+r.w&&source.y+source.h>=r.y+r.h)?{x:r.w/image.width,y:r.h/image.height}:null;
    }

    selectLayerAt(x,y) {
      const p=this.project,key=p.getFrameKey();this.clearSelection();
      for (const layer of PE.getRenderLayers(p,p.currentSheetIndex,p.currentActionIndex).slice().reverse()) {
        if (layer.locked || layer.inheritedBase || PE.isProtectedHandLayer(layer) || layer.opacity<=0 || !PE.isLayerVisible(p,layer)) continue;
        const data=layer.getFrameData(key);
        if(data?.placement){
          const r=data.placement;
          if(x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h){p.currentLayerIndex=p.layers.indexOf(layer);this.setSelection(r.x,r.y,r.w,r.h);return true;}
          continue;
        }
        const px=Math.floor(x),py=Math.floor(y);
        if (!data || !this._isInBounds(px,py,data.width,data.height) || !data.data[(py*data.width+px)*4+3]) continue;
        p.currentLayerIndex=p.layers.indexOf(layer);const r=this.getLayerPlacement();this.setSelection(r.x,r.y,r.w,r.h);return true;
      }
      return false;
    }

    _scaledSelection(s,scale) {
      const f=this.project.getCurrentFrame();
      const image=this.project.getCurrentLayer()?.getFrameData(this.project.getFrameKey());
      if(image?.placement||this.imageResizeMode==='hd'){
        const ratio=image?.placement?image.width/image.height:s.w/s.h,w=Math.max(1,Math.round(s.w*scale));
        return {...s,w,h:Math.max(1,Math.round(w/ratio))};
      }
      scale=Math.max(1/Math.min(s.w,s.h),Math.min(scale,(f.width-s.x)/s.w,(f.height-s.y)/s.h));
      return {...s,w:Math.max(1,Math.min(f.width-s.x,Math.round(s.w*scale))),h:Math.max(1,Math.min(f.height-s.y,Math.round(s.h*scale)))};
    }

    resizeSelection(scale) {
      if (!this.selection || this.isDrawing || !Number.isFinite(scale) || scale<=0) return false;
      const s=this.selection;
      return this.transformSelection(this.project.currentLayerIndex,this.project.getFrameKey(),s,this._scaledSelection(s,scale));
    }

    _rasterizePlacement(data,target,frame) {
      const {x,y,w,h}=target;
      if(![w,h].every(Number.isSafeInteger)||w<1||h<1||w>32767||h>32767||w*h>16*1024*1024)return null;
      const inFrame=Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x+w<=frame.width&&y+h<=frame.height;
      const result=new ImageData(inFrame?frame.width:w,inFrame?frame.height:h),dx=inFrame?x:0,dy=inFrame?y:0;
      for(let row=0;row<h;row++)for(let col=0;col<w;col++){
        const sx=Math.min(data.width-1,Math.floor((col+.5)*data.width/w)),sy=Math.min(data.height-1,Math.floor((row+.5)*data.height/h)),i=(sy*data.width+sx)*4;
        result.data.set(data.data.subarray(i,i+4),((dy+row)*result.width+dx+col)*4);
      }
      if(!inFrame)result.placement={...target};
      return result;
    }

    _selectionPixels(layerIdx,key,source,target) {
      const p=this.project,layer=p?.layers[layerIdx],[si,ai,fi]=key.split('_').map(Number),frame=p?.spriteSheets[si]?.actions[ai]?.frames[fi];
      if (!layer || layer.isGroup || layer.sheetIndex!==undefined&&layer.sheetIndex!==si || layer.locked || layer.inheritedBase || PE.isProtectedHandLayer(layer) || !PE.isLayerVisible(p,layer,si) || !frame || frame.locked) return null;
      let data=layer.getFrameData(key);if(!data)return null;
      const free=this._canFreePlace(source,layerIdx,key);
      const resizing=source.w!==target.w||source.h!==target.h,mode=this.imageResizeMode||(data.placement?'hd':'pixel');
      const outside=target.x<0||target.y<0||target.x+target.w>frame.width||target.y+target.h>frame.height;
      for(const [s,isTarget] of [[source,false],[target,true]]) {
        if(data.placement||isTarget&&(free||outside)){
          if(!data.placement&&!free&&![s.x,s.y].every(Number.isSafeInteger))return null;
          try{PE.utils.validateImagePlacement(s,frame);}catch{return null;}
          if(PE.utils.imagePlacementLocked(s,frame))return null;
          continue;
        }
        if(![s.x,s.y,s.w,s.h].every(Number.isSafeInteger)||s.x<0||s.y<0||s.w<1||s.h<1||s.x+s.w>frame.width||s.y+s.h>frame.height)return null;
        for(let y=s.y;y<s.y+s.h;y++)for(let x=s.x;x<s.x+s.w;x++)if(frame.isPixelLocked(x,y))return null;
      }
      if(!data.placement){
        const r=this.getLayerPlacement(layerIdx,key),whole=r&&source.x<=r.x&&source.y<=r.y&&source.x+source.w>=r.x+r.w&&source.y+source.h>=r.y+r.h;
        if(resizing&&mode==='hd'&&!whole){this.onImageEditBlocked?.('高清无损缩放请点选整层；局部选区请用普通像素缩放。');return null;}
        if(whole&&(outside||resizing&&mode==='hd'||free&&(!Number.isInteger(target.x)||!Number.isInteger(target.y)))){
          const result=new ImageData(source.w,source.h);
          for(let y=0;y<source.h;y++)result.data.set(data.data.subarray(((source.y+y)*data.width+source.x)*4,((source.y+y)*data.width+source.x+source.w)*4),y*source.w*4);
          result.placement={...target};return resizing&&mode==='pixel'?this._rasterizePlacement(result,target,frame):result;
        }
        // Preserve the unselected raster as well as the fragment moved beyond the canvas.
        if(outside){data=PE.utils.cloneImageData(data);data.placement={x:0,y:0,w:data.width,h:data.height};}
      }
      if(data.placement){
        const r=data.placement;
        if(['x','y','w','h'].every(k=>source[k]===r[k])){
          if(resizing&&mode==='pixel')return this._rasterizePlacement(data,target,frame);
          const result=new ImageData(data.data,data.width,data.height);result.placement={...target};return result;
        }
        if(source.w!==target.w||source.h!==target.h){this.onImageEditBlocked?.('高清局部选区可移动；缩放请点选整图或编辑源画布。');return null;}
        if(source.x<=r.x&&source.y<=r.y&&source.x+source.w>=r.x+r.w&&source.y+source.h>=r.y+r.h){
          const placement={...r,x:r.x+target.x-source.x,y:r.y+target.y-source.y};
          try{PE.utils.validateImagePlacement(placement,frame);}catch{return null;}
          const result=new ImageData(data.data,data.width,data.height);result.placement=placement;return result;
        }
        const scaleX=data.width/r.w,scaleY=data.height/r.h;
        const sx=Math.max(0,Math.floor((source.x-r.x)*scaleX+1e-7)),sy=Math.max(0,Math.floor((source.y-r.y)*scaleY+1e-7)),ex=Math.min(data.width,Math.ceil((source.x+source.w-r.x)*scaleX-1e-7)),ey=Math.min(data.height,Math.ceil((source.y+source.h-r.y)*scaleY-1e-7));
        if(ex<=sx||ey<=sy)return null;
        const dx=Math.round((target.x-source.x)*scaleX),dy=Math.round((target.y-source.y)*scaleY),left=Math.min(0,sx+dx),top=Math.min(0,sy+dy);
        const width=Math.ceil((Math.max(data.width,ex+dx)-left)/scaleX)*scaleX,height=Math.ceil((Math.max(data.height,ey+dy)-top)/scaleY)*scaleY;
        const nativeWidth=Math.ceil(width-1e-7),nativeHeight=Math.ceil(height-1e-7);
        if(width>32767||height>32767||width*height>16*1024*1024)return null;
        const placement={x:r.x+left/scaleX,y:r.y+top/scaleY,w:nativeWidth/scaleX,h:nativeHeight/scaleY};
        try{PE.utils.validateImagePlacement(placement,frame);}catch{return null;}
        const result=new ImageData(nativeWidth,nativeHeight);result.placement=placement;
        for(let y=0;y<data.height;y++)result.data.set(data.data.subarray(y*data.width*4,(y+1)*data.width*4),((y-top)*nativeWidth-left)*4);
        for(let y=sy;y<ey;y++)result.data.fill(0,((y-top)*nativeWidth+sx-left)*4,((y-top)*nativeWidth+ex-left)*4);
        for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++){const i=(y*data.width+x)*4;if(data.data[i+3])result.data.set(data.data.subarray(i,i+4),((y+dy-top)*nativeWidth+x+dx-left)*4);}
        return result;
      }
      const result=PE.utils.cloneImageData(data);
      for(let y=source.y;y<source.y+source.h;y++)result.data.fill(0,(y*data.width+source.x)*4,(y*data.width+source.x+source.w)*4);
      for(let y=0;y<target.h;y++)for(let x=0;x<target.w;x++){
        const sx=source.x+Math.min(source.w-1,Math.floor((x+.5)*source.w/target.w)),sy=source.y+Math.min(source.h-1,Math.floor((y+.5)*source.h/target.h)),i=(sy*data.width+sx)*4;
        if(data.data[i+3])result.data.set(data.data.subarray(i,i+4),((target.y+y)*data.width+target.x+x)*4);
      }
      return result;
    }

    transformSelection(layerIdx,key,source,target) {
      const after=this._selectionPixels(layerIdx,key,source,target);if(!after)return false;
      return this._commitSelectionPixels(layerIdx,key,source,target,after,source.w===target.w&&source.h===target.h?'移动选区':'缩放选区');
    }

    editSelection(edit,description) {
      if(!this.selection||this.isDrawing)return false;
      const s={...this.selection},p=this.project,index=p.currentLayerIndex,key=p.getFrameKey();
      const r=p.getCurrentLayer()?.getFrameData(key)?.placement;
      const after=this._selectionPixels(index,key,s,s);if(!after)return false;
      if(after.placement){
        const pixels=PE.utils.cloneImageData(after);
        if(['x','y','w','h'].every(k=>s[k]===r[k]))edit(pixels);
        else{
          const box=PE.utils.imageSourceRect(pixels,s);if(!box.w||!box.h)return false;
          const fragment=new ImageData(box.w,box.h);
          for(let y=0;y<box.h;y++)fragment.data.set(pixels.data.subarray(((box.y+y)*pixels.width+box.x)*4,((box.y+y)*pixels.width+box.x+box.w)*4),y*box.w*4);
          edit(fragment);
          for(let y=0;y<box.h;y++)pixels.data.set(fragment.data.subarray(y*box.w*4,(y+1)*box.w*4),((box.y+y)*pixels.width+box.x)*4);
        }
        return this._commitSelectionPixels(index,key,s,s,pixels,description);
      }
      const pixels=new ImageData(s.w,s.h);
      for(let y=0;y<s.h;y++)pixels.data.set(after.data.subarray(((s.y+y)*after.width+s.x)*4,((s.y+y)*after.width+s.x+s.w)*4),y*s.w*4);
      edit(pixels);
      for(let y=0;y<s.h;y++)after.data.set(pixels.data.subarray(y*s.w*4,(y+1)*s.w*4),((s.y+y)*after.width+s.x)*4);
      return this._commitSelectionPixels(index,key,s,s,after,description);
    }

    _commitSelectionPixels(layerIdx,key,source,target,after,description) {
      const before=this.project.layers[layerIdx].getFrameData(key),history=this.historyManager;
      if(before.placement||after.placement){
        if(before.placement&&['x','y','w','h'].every(k=>source[k]===target[k])&&(before.data===after.data||after.data.every((v,i)=>v===before.data[i])))return true;
        const layer=this.project.layers[layerIdx],restore=(data,rect)=>{layer.frameData.set(key,data);this.clearSelection();if(this.project.getFrameKey()===key&&this.project.getCurrentLayer()===layer)this.setSelection(rect.x,rect.y,rect.w,rect.h);};
        restore(after,target);
        if(history){history.undoStack.push({description,changes:[],undo:()=>restore(before,source),redo:()=>restore(after,target)});if(history.undoStack.length>history.maxSteps)history.undoStack.shift();history.redoStack=[];history._notifyChange();}
        return true;
      }
      history?.beginBatch(description);
      for(let i=0;i<after.data.length;i+=4){
        if(after.data.subarray(i,i+4).every((v,c)=>v===before.data[i+c]))continue;
        const rgba=d=>({r:d[i],g:d[i+1],b:d[i+2],a:d[i+3]});
        history?.recordPixelChange(layerIdx,key,(i/4)%before.width,Math.floor(i/4/before.width),rgba(before.data),rgba(after.data));
      }
      before.data.set(after.data);this.selectionData=null;this.setSelection(target.x,target.y,target.w,target.h);
      if(history?.commitBatch()){
        const entry=history.undoStack.at(-1),layer=this.project.layers[layerIdx];
        const restore=s=>{this.clearSelection();if(this.project.getFrameKey()===key&&this.project.getCurrentLayer()===layer)this.setSelection(s.x,s.y,s.w,s.h);};
        entry.undo=()=>restore(source);entry.redo=()=>restore(target);
      }
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
      if (!layer || layer.locked || PE.isProtectedHandLayer(layer) || layer.isGroup || !layer.visible) return true;

      return false;
    }
  }

  // Export to window.PE
  PE.ToolManager = ToolManager;

})();
