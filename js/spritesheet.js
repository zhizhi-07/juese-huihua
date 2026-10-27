/**
 * spritesheet.js - Sprite sheet import, auto-detection, and frame cutting
 */
window.PE = window.PE || {};

(function(PE) {
  'use strict';

  class SpriteSheetManager {
    constructor() {
      this.onImport = null;    // callback(sheetIndex)
      this.onFramesCut = null;  // callback(sheetIndex)
    }

    /**
     * Import an image file (PNG/JPEG/etc.) as a new sprite sheet
     * @param {File|Blob} file 
     * @param {PE.Project} project 
     * @returns {Promise<{success: boolean, sheetIndex: number, width: number, height: number}>}
     */
    async importFile(file, project) {
      if (/\.(ase|aseprite)$/i.test(file?.name || '')) return PE.importAseprite(file, project);
      if (!file || !project) {
        throw new Error('无效的文件或项目对象');
      }

      if (file.size>64*1024*1024) throw new Error('素材超过 64 MB');
      // 1. Read file as data URL
      const dataURL = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(new Error('读取文件失败: ' + err));
        reader.readAsDataURL(file);
      });

      // 2. Create Image element and wait for load
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (err) => reject(new Error('图像加载失败: ' + err));
        image.src = dataURL;
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height || width*height>16*1024*1024) throw new Error('图片超过像素上限');

      // 3. Draw to offscreen canvas to get full ImageData
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(img, 0, 0);
      const imageData = offCtx.getImageData(0, 0, width, height);

      // 4. Create SpriteSheet with name from filename
      const rawName = file.name || 'sprite_sheet';
      const name = rawName.replace(/\.[^/.]+$/, '');

      let sheet;
      if (typeof PE.SpriteSheet === 'function') {
        try {
          sheet = new PE.SpriteSheet(name, img, imageData);
        } catch (e) {
          sheet = new PE.SpriteSheet();
        }
      } else {
        sheet = {};
      }

      sheet.name = name;
      sheet.image = img;
      sheet.imageData = imageData;
      sheet.actions = sheet.actions || [];
      sheet.fps = sheet.fps || 8;
      sheet.offsetX = sheet.offsetX || 0;
      sheet.offsetY = sheet.offsetY || 0;
      sheet.spacingX = sheet.spacingX || 0;
      sheet.spacingY = sheet.spacingY || 0;

      // 5 & 6. Add to project.spriteSheets
      if (!Array.isArray(project.spriteSheets)) {
        project.spriteSheets = [];
      }
      const sheetIndex = project.spriteSheets.length;
      project.spriteSheets.push(sheet);

      // 7. Auto-detect frame dimensions
      const detected = this.autoDetect(project, sheetIndex);
      sheet.frameWidth = detected.frameWidth;
      sheet.frameHeight = detected.frameHeight;
      sheet.columns = detected.columns;
      sheet.rows = detected.rows;

      // Ensure select indices if not set
      if (project.currentSheetIndex === undefined || project.currentSheetIndex === null) {
        project.currentSheetIndex = sheetIndex;
        project.currentActionIndex = 0;
        project.currentFrameIndex = 0;
      }

      // Notify callback
      if (typeof this.onImport === 'function') {
        try {
          this.onImport(sheetIndex);
        } catch (err) {
          console.error('onImport 回调出错:', err);
        }
      }

      return {
        success: true,
        sheetIndex,
        width,
        height
      };
    }

    /**
     * Auto-detect frame dimensions by analyzing sprite sheet
     * @param {PE.Project} project 
     * @param {number} sheetIndex 
     * @returns {{frameWidth: number, frameHeight: number, columns: number, rows: number}}
     */
    autoDetect(project, sheetIndex) {
      const sheet = project?.spriteSheets?.[sheetIndex];
      if (!sheet || !sheet.imageData) {
        return { frameWidth: 32, frameHeight: 32, columns: 1, rows: 1 };
      }

      const w = sheet.imageData.width;
      const h = sheet.imageData.height;

      // Small image heuristic (single frame)
      if (w <= 48 && h <= 48) {
        return { frameWidth: w, frameHeight: h, columns: 1, rows: 1 };
      }

      // Try analyzing transparency gaps
      const gapResult = this._detectGaps(sheet.imageData);
      if (gapResult) {
        return gapResult;
      }

      // Common pixel art tile sizes in order of preference
      const commonSizes = [32, 24, 48, 64, 16, 96, 128];
      for (const size of commonSizes) {
        if (w % size === 0 && h % size === 0) {
          const cols = w / size;
          const rows = h / size;
          if (cols >= 1 && cols <= 64 && rows >= 1 && rows <= 64) {
            return {
              frameWidth: size,
              frameHeight: size,
              columns: cols,
              rows: rows
            };
          }
        }
      }

      // Check rectangular multiples
      for (const fw of commonSizes) {
        if (w % fw === 0) {
          for (const fh of commonSizes) {
            if (h % fh === 0) {
              return {
                frameWidth: fw,
                frameHeight: fh,
                columns: w / fw,
                rows: h / fh
              };
            }
          }
        }
      }

      // Fallback to full image as a single frame
      return {
        frameWidth: w,
        frameHeight: h,
        columns: 1,
        rows: 1
      };
    }

    /**
     * Helper to detect periodic transparent gaps
     * @private
     */
    _detectGaps(imageData) {
      const w = imageData.width;
      const h = imageData.height;
      const data = imageData.data;

      // Scan empty columns
      const emptyCols = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        let empty = 1;
        for (let y = 0; y < h; y++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
            empty = 0;
            break;
          }
        }
        emptyCols[x] = empty;
      }

      // Scan empty rows
      const emptyRows = new Uint8Array(h);
      for (let y = 0; y < h; y++) {
        let empty = 1;
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
            empty = 0;
            break;
          }
        }
        emptyRows[y] = empty;
      }

      const period = (empty, length) => {
        const runs=[];let start=-1;
        for(let i=0;i<=length;i++) {
          if(i<length && !empty[i]) { if(start<0)start=i; }
          else if(start>=0) { runs.push([start,i-1]);start=-1; }
        }
        if(runs.length<2)return length;
        const widths=runs.map(([a,b])=>b-a+1), centers=runs.map(([a,b])=>(a+b)/2);
        const differences=centers.slice(1).map((c,i)=>c-centers[i]).sort((a,b)=>a-b);
        const pitch=Math.round(differences[Math.floor(differences.length/2)]);
        if(pitch<Math.max(...widths) || length%pitch || length/pitch!==runs.length || differences.some(d=>Math.abs(d-pitch)>2))return null;
        if(runs.some(([a,b],i)=>a<i*pitch || b>=(i+1)*pitch))return null;
        return pitch;
      };
      const fw=period(emptyCols,w),fh=period(emptyRows,h);
      if(fw && fh && (fw<w || fh<h))return {frameWidth:fw,frameHeight:fh,columns:w/fw,rows:h/fh};

      return null;
    }

    /**
     * Re-cut frames based on updated grid settings
     * @param {PE.Project} project 
     * @param {number} sheetIndex 
     * @returns {{success: boolean, totalFrames: number, actions: Array<{name: string, frameCount: number}>}}
     */
    cutFrames(project, sheetIndex) {
      const sheet = project?.spriteSheets?.[sheetIndex];
      if (!sheet || !sheet.imageData) {
        throw new Error('未找到有效的精灵表');
      }

      const fw = Math.max(1, Math.floor(sheet.frameWidth || 32));
      const fh = Math.max(1, Math.floor(sheet.frameHeight || 32));
      const cols = Math.max(1, Math.floor(sheet.columns || 1));
      const rows = Math.max(1, Math.floor(sheet.rows || 1));
      const spacingX = Number(sheet.spacingX) || 0;
      const spacingY = Number(sheet.spacingY) || 0;
      const offsetX = Number(sheet.offsetX) || 0;
      const offsetY = Number(sheet.offsetY) || 0;

      // Clear existing actions/frames
      sheet.actions = [];

      // Ensure base layer '原始图层' exists as layer 0
      if (!Array.isArray(project.layers)) {
        project.layers = [];
      }

      let layer0 = project.layers.find(l => l.sheetIndex === sheetIndex && l.isOriginal);
      if (!layer0) { layer0 = project.addLayer(sheet.name+' / 原图'); layer0.sheetIndex=sheetIndex; layer0.isOriginal=true; }
      layer0.locked = true;

      const actionSummaries = [];
      let totalFrames = 0;

      // Cut frames row by row
      for (let r = 0; r < rows; r++) {
        let action;
        const actionName = `动作_${r}`;
        if (typeof PE.Action === 'function') {
          try {
            action = new PE.Action(actionName, '');
          } catch (e) {
            action = new PE.Action();
          }
        } else {
          action = {};
        }
        action.name = action.name || actionName;
        action.direction = action.direction !== undefined ? action.direction : '';
        action.frames = [];

        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * (fw + spacingX);
          const y = offsetY + r * (fh + spacingY);

          // Extract original pixels from sheet.imageData
          const framePixels = this._extractFramePixels(sheet.imageData, x, y, fw, fh);

          let frame;
          if (typeof PE.Frame === 'function') {
            try {
              frame = new PE.Frame(sheetIndex, x, y, fw, fh);
            } catch (e) {
              frame = new PE.Frame();
            }
          } else {
            frame = {};
          }

          frame.sheetIndex = sheetIndex;
          frame.sourceX = x;
          frame.sourceY = y;
          frame.width = fw;
          frame.height = fh;
          frame.originalPixels = framePixels;
          frame.locked = false;
          frame.lockedRegions = frame.lockedRegions || [];
          frame.status = frame.status || '未开始';
          frame.notes = frame.notes || '';

          // Attach helper methods if not present
          if (typeof frame.isPixelLocked !== 'function') {
            frame.isPixelLocked = function(px, py) {
              if (this.locked) return true;
              if (this.lockedRegions && this.lockedRegions.length > 0) {
                for (const reg of this.lockedRegions) {
                  if (px >= reg.x && px < reg.x + reg.w && py >= reg.y && py < reg.y + reg.h) {
                    return true;
                  }
                }
              }
              return false;
            };
          }

          if (typeof frame.getOriginalPixel !== 'function') {
            frame.getOriginalPixel = function(px, py) {
              if (!this.originalPixels || px < 0 || px >= this.width || py < 0 || py >= this.height) {
                return { r: 0, g: 0, b: 0, a: 0 };
              }
              const idx = (py * this.width + px) * 4;
              return {
                r: this.originalPixels.data[idx],
                g: this.originalPixels.data[idx + 1],
                b: this.originalPixels.data[idx + 2],
                a: this.originalPixels.data[idx + 3]
              };
            };
          }

          action.frames.push(frame);

          // Populate layer 0 frameData with original frame pixels
          const key = typeof project.getFrameKey === 'function'
            ? project.getFrameKey(sheetIndex, r, c)
            : `${sheetIndex}_${r}_${c}`;

          const clonedOriginal = (PE.utils && typeof PE.utils.cloneImageData === 'function')
            ? PE.utils.cloneImageData(framePixels)
            : new ImageData(new Uint8ClampedArray(framePixels.data), fw, fh);

          if (layer0.frameData instanceof Map) {
            layer0.frameData.set(key, clonedOriginal);
          } else {
            layer0.frameData[key] = clonedOriginal;
          }

          totalFrames++;
        }

        sheet.actions.push(action);
        actionSummaries.push({
          name: action.name,
          frameCount: action.frames.length
        });
      }

      // Notify callback
      if (typeof this.onFramesCut === 'function') {
        try {
          this.onFramesCut(sheetIndex);
        } catch (err) {
          console.error('onFramesCut 回调出错:', err);
        }
      }

      return {
        success: true,
        totalFrames,
        actions: actionSummaries
      };
    }

    /**
     * Extract pixel region from sheet ImageData
     * @private
     */
    _extractFramePixels(sheetImageData, sx, sy, fw, fh) {
      let frameImgData;
      if (PE.utils && typeof PE.utils.createTransparentImageData === 'function') {
        frameImgData = PE.utils.createTransparentImageData(fw, fh);
      } else {
        frameImgData = new ImageData(fw, fh);
      }

      const sData = sheetImageData.data;
      const sWidth = sheetImageData.width;
      const sHeight = sheetImageData.height;
      const dData = frameImgData.data;

      for (let y = 0; y < fh; y++) {
        const srcY = sy + y;
        if (srcY < 0 || srcY >= sHeight) continue;
        for (let x = 0; x < fw; x++) {
          const srcX = sx + x;
          if (srcX < 0 || srcX >= sWidth) continue;

          const sIdx = (srcY * sWidth + srcX) * 4;
          const dIdx = (y * fw + x) * 4;

          dData[dIdx]     = sData[sIdx];
          dData[dIdx + 1] = sData[sIdx + 1];
          dData[dIdx + 2] = sData[sIdx + 2];
          dData[dIdx + 3] = sData[sIdx + 3];
        }
      }

      return frameImgData;
    }

    /**
     * Update action name
     */
    setActionName(project, sheetIndex, actionIndex, name) {
      const action = project?.spriteSheets?.[sheetIndex]?.actions?.[actionIndex];
      if (action) {
        action.name = String(name || '');
        return true;
      }
      return false;
    }

    /**
     * Update action direction
     */
    setActionDirection(project, sheetIndex, actionIndex, direction) {
      const action = project?.spriteSheets?.[sheetIndex]?.actions?.[actionIndex];
      if (action) {
        action.direction = String(direction || '');
        return true;
      }
      return false;
    }

    /**
     * Set sheet playback FPS
     */
    setSheetFPS(project, sheetIndex, fps) {
      const sheet = project?.spriteSheets?.[sheetIndex];
      if (sheet) {
        sheet.fps = Math.max(1, Math.min(60, Number(fps) || 8));
        return true;
      }
      return false;
    }
  }

  // Export to PE namespace
  PE.SpriteSheetManager = SpriteSheetManager;

})(window.PE);
