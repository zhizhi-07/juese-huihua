/**
 * Pixel Art Character Editor - Core Engine (core.js)
 * Data model classes and pixel manipulation utilities.
 */

window.PE = window.PE || {};

(() => {
  'use strict';

  // ==========================================
  // PE.utils - Pixel and Image Utility Methods
  // ==========================================
  const imageCanvases = new WeakMap();
  let pixelCanvas;
  const utils = {
    /**
     * Deep copy of an ImageData object.
     * @param {ImageData} imageData
     * @returns {ImageData|null}
     */
    cloneImageData(imageData) {
      if (!imageData) return null;
      const copy = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      if(imageData.placement)copy.placement={...imageData.placement};
      return copy;
    },

    validateImagePlacement(rect, frame) {
      if(!frame||!rect||![rect.x,rect.y,rect.w,rect.h].every(Number.isFinite)||rect.w<=0||rect.h<=0||Math.abs(rect.x)+rect.w>Number.MAX_SAFE_INTEGER||Math.abs(rect.y)+rect.h>Number.MAX_SAFE_INTEGER)throw new Error('图片放置范围无效');
      return {x:rect.x,y:rect.y,w:rect.w,h:rect.h};
    },

    imagePlacementLocked(rect,frame) {
      return frame.locked||frame.lockedRegions.some(r=>rect.x<r.x+r.w&&rect.x+rect.w>r.x&&rect.y<r.y+r.h&&rect.y+rect.h>r.y);
    },

    imageSourceRect(image,rect) {
      const r=image.placement,sx=image.width/r.w,sy=image.height/r.h;
      const x=Math.max(0,Math.floor((rect.x-r.x)*sx+1e-7)),y=Math.max(0,Math.floor((rect.y-r.y)*sy+1e-7));
      const right=Math.min(image.width,Math.ceil((rect.x+rect.w-r.x)*sx-1e-7)),bottom=Math.min(image.height,Math.ceil((rect.y+rect.h-r.y)*sy-1e-7));
      return {x,y,w:Math.max(0,right-x),h:Math.max(0,bottom-y)};
    },

    drawImageData(ctx, image, x=0, y=0, scale=1) {
      let source=image.placement&&imageCanvases.get(image.data);
      if(!source){source=image.placement?document.createElement('canvas'):(pixelCanvas||=document.createElement('canvas'));if(source.width!==image.width)source.width=image.width;if(source.height!==image.height)source.height=image.height;source.getContext('2d').putImageData(image,0,0);if(image.placement)imageCanvases.set(image.data,source);}
      const r=image.placement||{x:0,y:0,w:image.width,h:image.height};
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(source,x+r.x*scale,y+r.y*scale,r.w*scale,r.h*scale);
    },

    imageScale(project, sheetIndex, actionIndex=null, frameIndex=null) {
      let scale=1;
      for(const layer of project?.layers||[]){
        if(!PE.isLayerVisible(project,layer,sheetIndex)||layer.opacity<=0)continue;
        for(const [key,data]of layer.frameData){
          const [si,ai,fi]=key.split('_').map(Number),r=data.placement;
          if(r&&si===sheetIndex&&(actionIndex===null||ai===actionIndex)&&(frameIndex===null||fi===frameIndex))scale=Math.max(scale,Math.ceil(data.width/r.w),Math.ceil(data.height/r.h),!Number.isInteger(r.x)||!Number.isInteger(r.y)?10:1);
        }
      }
      return scale;
    },

    displayScale(project,si,ai,fi,limit=4) {
      const f=project.spriteSheets[si]?.actions[ai]?.frames[fi];
      return f?Math.max(1,Math.min(limit,this.imageScale(project,si,ai,fi),Math.floor(Math.sqrt(16*1024*1024/(f.width*f.height))))):1;
    },

    /**
     * Create a new blank transparent ImageData.
     * @param {number} w 
     * @param {number} h 
     * @returns {ImageData}
     */
    createTransparentImageData(w, h) {
      const width = Math.max(1, Math.floor(w || 1));
      const height = Math.max(1, Math.floor(h || 1));
      return new ImageData(width, height);
    },

    /**
     * Compare two color objects {r, g, b, a}.
     * @param {{r:number, g:number, b:number, a:number}} a 
     * @param {{r:number, g:number, b:number, a:number}} b 
     * @returns {boolean}
     */
    comparePixels(a, b) {
      if (!a || !b) return false;
      return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    },

    /**
     * Calculate 1D index into Uint8ClampedArray data for coordinate (x, y).
     * Format: (y * width + x) * 4
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @returns {number}
     */
    pixelIndex(x, y, width) {
      return (y * width + x) * 4;
    },

    /**
     * Retrieve RGBA pixel object from an ImageData at (x, y).
     * Returns null if out of bounds or imageData is invalid.
     * @param {ImageData} imageData 
     * @param {number} x 
     * @param {number} y 
     * @returns {{r:number, g:number, b:number, a:number}|null}
     */
    getPixelFromImageData(imageData, x, y) {
      if (!imageData || x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
        return null;
      }
      const idx = (y * imageData.width + x) * 4;
      return {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2],
        a: imageData.data[idx + 3]
      };
    },

    /**
     * Set RGBA values in an ImageData at (x, y).
     * @param {ImageData} imageData 
     * @param {number} x 
     * @param {number} y 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {boolean}
     */
    setPixelInImageData(imageData, x, y, r, g, b, a = 255) {
      if (!imageData || x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
        return false;
      }
      const idx = (y * imageData.width + x) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = a !== undefined ? a : 255;
      imageCanvases.delete(imageData.data);
      return true;
    },

    /**
     * Convert Hex string to RGBA object.
     * @param {string} hex 
     * @returns {{r:number, g:number, b:number, a:number}}
     */
    hexToRGBA(hex) {
      let c = hex.replace('#', '').trim();
      if (c.length === 3) {
        c = c.split('').map(ch => ch + ch).join('') + 'ff';
      } else if (c.length === 6) {
        c += 'ff';
      }
      const num = parseInt(c, 16);
      return {
        r: (num >> 24) & 255,
        g: (num >> 16) & 255,
        b: (num >> 8) & 255,
        a: num & 255
      };
    },

    /**
     * Convert RGBA components to hex string.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {string}
     */
    rgbaToHex(r, g, b, a = 255) {
      const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  };

  // ==========================================
  // PE.Frame - A single animation frame
  // ==========================================
  class Frame {
    /**
     * @param {number} sheetIndex 
     * @param {number} sourceX 
     * @param {number} sourceY 
     * @param {number} width 
     * @param {number} height 
     */
    constructor(sheetIndex, sourceX, sourceY, width, height) {
      this.sheetIndex = sheetIndex;
      this.sourceX = sourceX;
      this.sourceY = sourceY;
      this.width = width;
      this.height = height;
      this.originalPixels = null; // ImageData - read-only reference of original sheet
      this.locked = false;
      this.lockedRegions = []; // [{x, y, w, h}]
      this.status = 'pending'; // 'pending' | 'confirmed' | 'needs-fix'
      this.notes = '';
      this.duration = 0; // 毫秒；0 表示跟随素材表的 fps
    }

    /**
     * Check if a pixel coordinate is locked (either whole frame or within a locked region).
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    isPixelLocked(x, y) {
      if (this.locked) return true;
      for (let i = 0; i < this.lockedRegions.length; i++) {
        const reg = this.lockedRegions[i];
        if (x >= reg.x && x < reg.x + reg.w && y >= reg.y && y < reg.y + reg.h) {
          return true;
        }
      }
      return false;
    }

    /**
     * Return pixel from originalPixels ImageData at (x, y).
     * @param {number} x 
     * @param {number} y 
     * @returns {{r:number, g:number, b:number, a:number}}
     */
    getOriginalPixel(x, y) {
      if (!this.originalPixels) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
      const p = utils.getPixelFromImageData(this.originalPixels, x, y);
      return p || { r: 0, g: 0, b: 0, a: 0 };
    }

    /**
     * Add a sub-region to lock.
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    addLockedRegion(x, y, w, h) {
      this.lockedRegions.push({ x, y, w, h });
    }

    /**
     * Remove a locked region by index.
     * @param {number} index 
     */
    removeLockedRegion(index) {
      if (index >= 0 && index < this.lockedRegions.length) {
        this.lockedRegions.splice(index, 1);
      }
    }

    /**
     * Clear all locked sub-regions.
     */
    clearLockedRegions() {
      this.lockedRegions = [];
    }
  }

  // ==========================================
  // PE.Action - A named animation sequence
  // ==========================================
  class Action {
    /**
     * @param {string} name 
     * @param {string} [direction=''] 
     */
    constructor(name, direction = '') {
      this.name = name;
      this.direction = direction || '';
      this.frames = []; // Frame[]
    }

    /**
     * Add a frame to the action.
     * @param {Frame} frame 
     * @returns {Frame}
     */
    addFrame(frame) {
      this.frames.push(frame);
      return frame;
    }

    /**
     * Get frame by index.
     * @param {number} frameIdx 
     * @returns {Frame|null}
     */
    getFrame(frameIdx) {
      return this.frames[frameIdx] || null;
    }
  }

  // ==========================================
  // PE.SpriteSheet - An imported sprite sheet
  // ==========================================
  class SpriteSheet {
    /**
     * @param {string} name 
     * @param {HTMLImageElement|null} [imageElement=null] 
     */
    constructor(name, imageElement = null) {
      this.name = name;
      this.image = imageElement;
      this.imageData = null; // ImageData of full sheet
      this.frameWidth = 64;
      this.frameHeight = 64;
      this.columns = 1;
      this.rows = 1;
      this.spacingX = 0;
      this.spacingY = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.actions = []; // Action[]
      this.fps = 8;
    }

    /**
     * Get frame from specific action and frame index.
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {Frame|null}
     */
    getFrame(actionIdx, frameIdx) {
      const action = this.actions[actionIdx];
      if (!action) return null;
      return action.frames[frameIdx] || null;
    }

    /**
     * Get total frame count across all actions.
     * @returns {number}
     */
    getTotalFrames() {
      let total = 0;
      for (let i = 0; i < this.actions.length; i++) {
        total += this.actions[i].frames.length;
      }
      return total;
    }

    /**
     * Cut sprite sheet into actions and frames according to grid parameters.
     * Creates one Action per row by default.
     * @param {number} [sheetIndex=0] 
     */
    cutFrames(sheetIndex = 0) {
      this.actions = [];

      // Extract imageData from image if not already available
      if (!this.imageData && this.image) {
        try {
          const natW = this.image.naturalWidth || this.image.width || 0;
          const natH = this.image.naturalHeight || this.image.height || 0;
          if (natW > 0 && natH > 0 && typeof document !== 'undefined') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = natW;
            tempCanvas.height = natH;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.image, 0, 0);
            this.imageData = tempCtx.getImageData(0, 0, natW, natH);
          }
        } catch (e) {
          console.warn('Could not extract imageData from sprite sheet image:', e);
        }
      }

      const defaultDirections = ['down', 'left', 'right', 'up'];

      for (let r = 0; r < this.rows; r++) {
        const dir = r < defaultDirections.length ? defaultDirections[r] : '';
        const actionName = `动作 ${r + 1}${dir ? ` (${dir})` : ''}`;
        const action = new Action(actionName, dir);

        for (let c = 0; c < this.columns; c++) {
          const sourceX = this.offsetX + c * (this.frameWidth + this.spacingX);
          const sourceY = this.offsetY + r * (this.frameHeight + this.spacingY);
          const frame = new Frame(sheetIndex, sourceX, sourceY, this.frameWidth, this.frameHeight);

          // Extract original pixels if imageData is present
          if (this.imageData) {
            const frameImgData = utils.createTransparentImageData(this.frameWidth, this.frameHeight);
            const sheetW = this.imageData.width;
            const sheetH = this.imageData.height;

            for (let py = 0; py < this.frameHeight; py++) {
              const sy = sourceY + py;
              if (sy < 0 || sy >= sheetH) continue;
              for (let px = 0; px < this.frameWidth; px++) {
                const sx = sourceX + px;
                if (sx < 0 || sx >= sheetW) continue;

                const srcIdx = (sy * sheetW + sx) * 4;
                const dstIdx = (py * this.frameWidth + px) * 4;

                frameImgData.data[dstIdx] = this.imageData.data[srcIdx];
                frameImgData.data[dstIdx + 1] = this.imageData.data[srcIdx + 1];
                frameImgData.data[dstIdx + 2] = this.imageData.data[srcIdx + 2];
                frameImgData.data[dstIdx + 3] = this.imageData.data[srcIdx + 3];
              }
            }
            frame.originalPixels = frameImgData;
          }

          action.addFrame(frame);
        }

        this.actions.push(action);
      }
    }
  }

  // ==========================================
  // PE.Layer - An editing layer
  // ==========================================
  class Layer {
    /**
     * @param {string} name 
     */
    constructor(name) {
      this.name = name;
      this.visible = true;
      this.locked = false;
      this.opacity = 1.0;
      this.frameData = new Map(); // key: frameKey string -> ImageData
    }

    /**
     * Return ImageData for frameKey, or null if not created.
     * @param {string} frameKey 
     * @returns {ImageData|null}
     */
    getFrameData(frameKey) {
      return this.frameData.get(frameKey) || null;
    }

    /**
     * Ensures frameData exists for frameKey; creates a blank transparent ImageData if not.
     * @param {string} frameKey 
     * @param {number} [width=64] 
     * @param {number} [height=64] 
     * @returns {ImageData}
     */
    ensureFrameData(frameKey, width = 64, height = 64) {
      let data = this.frameData.get(frameKey);
      if(data?.placement)throw new Error('请点击“编辑高清画布”修改源像素');
      if (!data) {
        data = utils.createTransparentImageData(width, height);
        this.frameData.set(frameKey, data);
      }
      return data;
    }

    /**
     * Get pixel at (x, y) in the specified frame.
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @returns {{r:number, g:number, b:number, a:number}|null}
     */
    getPixel(frameKey, x, y) {
      const data = this.frameData.get(frameKey);
      if (!data) return null;
      return utils.getPixelFromImageData(data, x, y);
    }

    /**
     * Set pixel at (x, y) in the specified frame.
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} [a=255] 
     * @returns {boolean}
     */
    setPixel(frameKey, x, y, r, g, b, a = 255) {
      if (PE.isHandLayer(this) || this.frameData.get(frameKey)?.placement) return false;
      const data = this.frameData.get(frameKey);
      if (!data) return false;
      return utils.setPixelInImageData(data, x, y, r, g, b, a);
    }

    /**
     * Remove frame data for frameKey.
     * @param {string} frameKey 
     * @returns {boolean}
     */
    clearFrameData(frameKey) {
      return this.frameData.delete(frameKey);
    }

    /**
     * Check if frame data exists for frameKey.
     * @param {string} frameKey 
     * @returns {boolean}
     */
    hasFrameData(frameKey) {
      return this.frameData.has(frameKey);
    }
  }

  // ==========================================
  // PE.Project - Root container
  // ==========================================
  class Project {
    constructor() {
      this.name = '未命名项目';
      this.spriteSheets = []; // SpriteSheet[]
      this.layers = []; // Layer[]
      this.palette = [
        { r: 0, g: 0, b: 0, a: 255, name: '黑色' },
        { r: 255, g: 255, b: 255, a: 255, name: '白色' },
        { r: 231, g: 76, b: 60, a: 255, name: '红色' },
        { r: 230, g: 126, b: 34, a: 255, name: '橙色' },
        { r: 241, g: 196, b: 15, a: 255, name: '黄色' },
        { r: 46, g: 204, b: 113, a: 255, name: '绿色' },
        { r: 52, g: 152, b: 219, a: 255, name: '蓝色' },
        { r: 155, g: 89, b: 182, a: 255, name: '紫色' },
        { r: 52, g: 73, b: 94, a: 255, name: '深蓝灰' },
        { r: 149, g: 165, b: 166, a: 255, name: '浅灰色' }
      ];
      this.currentSheetIndex = 0;
      this.currentActionIndex = 0;
      this.currentFrameIndex = 0;
      this.currentLayerIndex = 0;
      this.gridColor = '#333333';
      this.bgColor = '#1a1a2e';

      // Initialize with default base layer
      this.addLayer('图层 1');
    }

    /**
     * Get current active SpriteSheet.
     * @returns {SpriteSheet|null}
     */
    getCurrentSheet() {
      return this.spriteSheets[this.currentSheetIndex] || null;
    }

    /**
     * Get current active Action.
     * @returns {Action|null}
     */
    getCurrentAction() {
      const sheet = this.getCurrentSheet();
      if (!sheet || !sheet.actions) return null;
      return sheet.actions[this.currentActionIndex] || null;
    }

    /**
     * Get current active Frame.
     * @returns {Frame|null}
     */
    getCurrentFrame() {
      const action = this.getCurrentAction();
      if (!action || !action.frames) return null;
      return action.frames[this.currentFrameIndex] || null;
    }

    /**
     * Get current active Layer.
     * @returns {Layer|null}
     */
    getCurrentLayer() {
      return this.layers[this.currentLayerIndex] || null;
    }

    /**
     * Construct frame key string from indices: `${si}_${ai}_${fi}`.
     * Uses current indices if not provided.
     * @param {number} [si] 
     * @param {number} [ai] 
     * @param {number} [fi] 
     * @returns {string}
     */
    getFrameKey(si, ai, fi) {
      const s = si !== undefined ? si : this.currentSheetIndex;
      const a = ai !== undefined ? ai : this.currentActionIndex;
      const f = fi !== undefined ? fi : this.currentFrameIndex;
      return `${s}_${a}_${f}`;
    }

    /**
     * Add a new Layer to the project.
     * @param {string} [name] 
     * @returns {Layer}
     */
    addLayer(name) {
      const layerName = name || `图层 ${this.layers.length + 1}`;
      const layer = new Layer(layerName);
      this.layers.push(layer);
      this.currentLayerIndex = this.layers.length - 1;
      return layer;
    }

    /**
     * Remove a Layer by index. Preserves at least one layer.
     * @param {number} idx 
     * @returns {boolean}
     */
    removeLayer(idx) {
      if (this.layers.length <= 1) {
        console.warn('Cannot remove the last remaining layer');
        return false;
      }
      if (idx < 0 || idx >= this.layers.length) {
        return false;
      }
      if (PE.isHandLayer(this.layers[idx]) || this.layers[idx].inheritedBase || this.layers[idx].isGroup || this.layers.some(l=>l.parent===idx)) return false;
      this.layers.splice(idx, 1);
      for (const layer of this.layers) if (layer.parent>idx) layer.parent--;
      if (this.currentLayerIndex > idx) this.currentLayerIndex--;
      if (this.currentLayerIndex >= this.layers.length) {
        this.currentLayerIndex = this.layers.length - 1;
      }
      return true;
    }

    /**
     * Select a specific frame by sheet, action, and frame index.
     * Clamps and validates indices.
     * @param {number} si 
     * @param {number} ai 
     * @param {number} fi 
     * @returns {Frame|null}
     */
    selectFrame(si, ai, fi) {
      if (si !== undefined && si >= 0 && si < this.spriteSheets.length) {
        this.currentSheetIndex = si;
      }
      const sheet = this.getCurrentSheet();
      if (sheet && sheet.actions) {
        if (ai !== undefined && ai >= 0 && ai < sheet.actions.length) {
          this.currentActionIndex = ai;
        }
        const action = this.getCurrentAction();
        if (action && action.frames) {
          if (fi !== undefined && fi >= 0 && fi < action.frames.length) {
            this.currentFrameIndex = fi;
          }
        }
      }
      return this.getCurrentFrame();
    }
  }

  // Export to window.PE
  PE.isHandLayer = layer => !!layer && (layer.referenceOnly === true || /^(?:hand(?:\s|$)|手(?:部|臂)?(?:\s|$))/i.test(layer.name));
  PE.isLayerVisible = (project, layer, sheetIndex = project.currentSheetIndex) => {
    if (!layer.visible || layer.isGroup) return false;
    if (layer.sheetIndex !== undefined && layer.sheetIndex !== sheetIndex) return false;
    let parent = layer.parent;
    const seen = new Set();
    while (parent != null) {
      if (seen.has(parent)) return false;
      seen.add(parent);
      const group = project.layers[parent];
      if (!group || !group.visible) return false;
      parent = group.parent;
    }
    return true;
  };
  // ==========================================
  // 部件名称识别与层级归位（改名字即自动分类并调整层序）
  // 渲染顺序：数组索引越大越靠上。rank 越小越靠底层。
  // ==========================================
  const PART_RULES = [
    { test: /后发|背发|后面的头发/, category: '头发', slot: '后发', rank: 0 },
    { test: /侧发|鬓发|鬓角/, category: '头发', slot: '侧发', rank: 1 },
    { test: /前发|刘海|额发/, category: '头发', slot: '前发', rank: 4 },
    { test: /发饰|发夹|发卡|发带|蝴蝶结|头饰|帽子/, category: '头发', slot: '饰品', rank: 5 },
    { test: /眼|瞳/, category: '五官', slot: '眼睛', rank: 6 },
    { test: /嘴|口型|唇/, category: '五官', slot: '嘴巴', rank: 7 },
    { test: /服|衣|裤|裙|鞋|袜|jk/i, category: '衣服', slot: '服装', rank: 3 }
  ];
  const HEAD_NAMES = { head: { category: '身体', slot: '头部', rank: 2 }, body: { category: '身体', slot: '身体', rank: 2 }, hand: { category: '身体', slot: '手部', rank: 2 }, 'hand 2': { category: '身体', slot: '手部', rank: -1 } };
  PE.classifyPart = name => {
    const full = String(name || '').trim();
    if (!full) return null;
    if (HEAD_NAMES[full]) return { ...HEAD_NAMES[full], name: full, clean: full };
    const pieces = full.split(' / ').map(s => s.trim()).filter(Boolean);
    const tail = pieces.at(-1) || full;
    const match = text => PART_RULES.find(rule => rule.test.test(text));
    const rule = match(tail) || match(full);
    if (!rule) return null;
    const clean = tail.replace(/^\d+\s*/, '').trim() || tail;
    const series = pieces[0] === '头发' && pieces.length >= 3 ? pieces[1].replace(/^\d+\s*/, '').trim() : '';
    const canonical = rule.category === '头发'
      ? (rule.slot === '饰品' ? `发饰 / ${clean}` : `头发 / ${series || '通用发型'} / ${rule.slot}`)
      : `${rule.slot} / ${clean}`;
    return { category: rule.category, slot: rule.slot, rank: rule.rank, name: canonical, clean, series };
  };
  PE.partSeries = (project, sheetIndex) => {
    for (const layer of project.layers) {
      if (layer.isGroup) continue;
      if (sheetIndex !== undefined && layer.sheetIndex !== undefined && layer.sheetIndex !== sheetIndex) continue;
      const pieces = String(layer.name || '').split(' / ');
      if (pieces[0] === '头发' && pieces.length >= 3) return pieces[1].replace(/^\d+\s*/, '').trim();
    }
    return '';
  };
  PE.layerPartRank = layer => {
    const info = PE.classifyPart(layer?.name);
    return info ? info.rank : 9;
  };
  const rebuildLayers = (project, ordered) => {
    const layers = project.layers;
    const parents = new Map(ordered.map(layer => [layer, layer.parent == null ? null : layers[layer.parent] || null]));
    layers.length = 0;
    for (const layer of ordered) layers.push(layer);
    for (const layer of ordered) {
      const parent = parents.get(layer);
      layer.parent = parent ? layers.indexOf(parent) : null;
    }
  };
  const rootBlocks = layers => {
    const blocks = [];
    let current = null;
    layers.forEach((layer, index) => {
      if (layer.parent == null || !current) { current = { indices: [index] }; blocks.push(current); }
      else current.indices.push(index);
    });
    return blocks;
  };
  /**
   * 移动一个图层在绘制顺序中的位置：delta>0 向上（更靠前），delta<0 向下。
   * 顶层图层与整组（组与组内成员）作为一块整体交换；组内图层只与同组兄弟交换。
   */
  PE.moveLayerOrder = (project, index, delta) => {
    const layers = project.layers, layer = layers[index];
    if (!layer) return { ok: false, reason: '请先选择一个图层' };
    if (layer.isGroup) return { ok: false, reason: '请选择组里的具体图层再移动' };
    if (PE.isHandLayer(layer)) return { ok: false, reason: '手部参考层受保护，不能调整顺序' };
    if (layer.inheritedBase) return { ok: false, reason: '头部、身体跟随主工程，不能调整顺序' };
    if (layer.parent != null) {
      const siblings = layers.map((item, i) => [item, i]).filter(([item]) => item.parent === layer.parent);
      const position = siblings.findIndex(([item]) => item === layer);
      const target = siblings[position + delta];
      if (!target) return { ok: false, reason: delta > 0 ? '已经是这一组的最上层' : '已经是这一组的最下层' };
      const a = siblings[position][1], b = target[1];
      [layers[a], layers[b]] = [layers[b], layers[a]];
      project.currentLayerIndex = layers.indexOf(layer);
      return { ok: true };
    }
    const blocks = rootBlocks(layers);
    const from = blocks.findIndex(block => block.indices.includes(index));
    const to = from + delta;
    if (!blocks[to]) return { ok: false, reason: delta > 0 ? '已经在最上层' : '已经在最下层' };
    [blocks[from], blocks[to]] = [blocks[to], blocks[from]];
    rebuildLayers(project, blocks.flatMap(block => block.indices.map(i => layers[i])));
    project.currentLayerIndex = project.layers.indexOf(layer);
    return { ok: true };
  };
  /**
   * 按图层名识别部件，并把它放进对应的分类与层序。
   * 返回 null 表示名字无法识别（保持原样）。
   */
  PE.autoPlaceLayer = (project, index, { rename = true } = {}) => {
    const layer = project.layers[index];
    if (!layer || layer.isGroup || layer.inheritedBase || PE.isHandLayer(layer)) return null;
    const info = PE.classifyPart(layer.name);
    if (!info) return null;
    const series = info.series || PE.partSeries(project, layer.sheetIndex ?? project.currentSheetIndex);
    const name = info.category === '头发' && info.slot !== '饰品'
      ? `头发 / ${series || '通用发型'} / ${info.slot}`
      : info.name;
    if (rename && name !== layer.name) layer.name = name;
    const rank = PE.layerPartRank(layer);
    if (layer.parent != null) {
      const siblings = project.layers.map((item, i) => [item, i]).filter(([item]) => item.parent === layer.parent);
      const ordered = siblings.map(([item]) => item);
      ordered.splice(ordered.indexOf(layer), 1);
      const position = ordered.findIndex(item => PE.layerPartRank(item) > rank);
      ordered.splice(position < 0 ? ordered.length : position, 0, layer);
      siblings.map(([, i]) => i).sort((a, b) => a - b).forEach((slot, i) => { project.layers[slot] = ordered[i]; });
    } else {
      const layers = project.layers;
      const blocks = rootBlocks(layers);
      const current = blocks.find(block => block.indices.includes(index));
      const rest = blocks.filter(block => block !== current);
      const position = rest.findIndex(block => Math.min(...block.indices.map(i => PE.layerPartRank(layers[i]))) > rank);
      rest.splice(position < 0 ? rest.length : position, 0, current);
      rebuildLayers(project, rest.flatMap(block => block.indices.map(i => layers[i])));
    }
    project.currentLayerIndex = project.layers.indexOf(layer);
    return { ...info, name: layer.name, rank, index: project.currentLayerIndex };
  };
  // Rear-view hair belongs to the rear-hair slot but must cover the back of the head.
  PE.getRenderLayers = (project, sheetIndex, actionIndex) => {
    const layers=project.layers;
    if(project.spriteSheets[sheetIndex]?.actions[actionIndex]?.direction!=='up')return layers;
    const isRear=l=>l.sheetIndex===sheetIndex&&l.name.startsWith('头发 /')&&l.name.endsWith('后发');
    const isAccessory=l=>l.sheetIndex===sheetIndex&&l.name.startsWith('发饰 /');
    return [...layers.filter(l=>!isRear(l)&&!isAccessory(l)),...layers.filter(isRear),...layers.filter(isAccessory)];
  };
  PE.utils = utils;
  PE.Frame = Frame;
  PE.Action = Action;
  PE.SpriteSheet = SpriteSheet;
  PE.Layer = Layer;
  PE.Project = Project;

})();
