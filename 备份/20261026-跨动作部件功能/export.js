/**
 * export.js - Export single frame, sprite sheet, ZIP package, and project save/load
 */
window.PE = window.PE || {};

(function(PE) {
  'use strict';

  class ExportManager {
    constructor() {
      this.project = null;
      this.canvasManager = null;
    }

    /**
     * Initialize export manager
     * @param {PE.Project} project 
     * @param {PE.CanvasManager} canvasManager 
     */
    init(project, canvasManager) {
      this.project = project;
      this.canvasManager = canvasManager;
    }

    /**
     * Internal helper to get composite ImageData for a given frame
     * @private
     */
    _getCompositeImageData(sheetIdx, actionIdx, frameIdx) {
      if (this.canvasManager && typeof this.canvasManager.getCompositeImageData === 'function') {
        const comp = this.canvasManager.getCompositeImageData(sheetIdx, actionIdx, frameIdx);
        if (comp) return comp;
      }

      const frame = this.project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx]?.frames?.[frameIdx];
      if (!frame) return null;

      const fw = frame.width;
      const fh = frame.height;
      const key = typeof this.project?.getFrameKey === 'function'
        ? this.project.getFrameKey(sheetIdx, actionIdx, frameIdx)
        : `${sheetIdx}_${actionIdx}_${frameIdx}`;

      // Composite visible layers
      if (Array.isArray(this.project?.layers) && this.project.layers.length > 0) {
        const result = (PE.utils && typeof PE.utils.createTransparentImageData === 'function')
          ? PE.utils.createTransparentImageData(fw, fh)
          : new ImageData(fw, fh);
        const rData = result.data;

        const renderLayers=PE.getRenderLayers(this.project,sheetIdx,actionIdx);
        for (let li = 0; li < renderLayers.length; li++) {
          const layer = renderLayers[li];
          if (!PE.isLayerVisible(this.project, layer, sheetIdx) || layer.opacity <= 0) continue;

          let lData = null;
          if (typeof layer.getFrameData === 'function') {
            lData = layer.getFrameData(key);
          } else if (layer.frameData instanceof Map) {
            lData = layer.frameData.get(key);
          } else if (layer.frameData) {
            lData = layer.frameData[key];
          }

          if (!lData && layer === this.project.layers[0] && frame.originalPixels) {
            lData = frame.originalPixels;
          }

          if (!lData || !lData.data) continue;

          const sData = lData.data;
          const opacity = layer.opacity !== undefined ? Math.max(0, Math.min(1, layer.opacity)) : 1;
          const len = fw * fh * 4;

          for (let i = 0; i < len; i += 4) {
            const sa = (sData[i + 3] / 255) * opacity;
            if (sa <= 0) continue;

            const sr = sData[i];
            const sg = sData[i + 1];
            const sb = sData[i + 2];

            const da = rData[i + 3] / 255;
            const dr = rData[i];
            const dg = rData[i + 1];
            const db = rData[i + 2];

            if (sa >= 1 || da <= 0) {
              rData[i]     = sr;
              rData[i + 1] = sg;
              rData[i + 2] = sb;
              rData[i + 3] = Math.round(sa * 255);
            } else {
              const outA = sa + da * (1 - sa);
              rData[i]     = Math.round((sr * sa + dr * da * (1 - sa)) / outA);
              rData[i + 1] = Math.round((sg * sa + dg * da * (1 - sa)) / outA);
              rData[i + 2] = Math.round((sb * sa + db * da * (1 - sa)) / outA);
              rData[i + 3] = Math.round(outA * 255);
            }
          }
        }
        return result;
      }

      // Default fallback
      if (frame.originalPixels) {
        return (PE.utils && typeof PE.utils.cloneImageData === 'function')
          ? PE.utils.cloneImageData(frame.originalPixels)
          : new ImageData(new Uint8ClampedArray(frame.originalPixels.data), fw, fh);
      }

      return null;
    }

    /**
     * Export a single frame as a PNG Blob
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {Promise<Blob>}
     */
    exportFrameAsBlob(sheetIdx, actionIdx, frameIdx) {
      return new Promise((resolve, reject) => {
        const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);
        if (!comp) {
          reject(new Error(`无法获取帧 [${sheetIdx}, ${actionIdx}, ${frameIdx}] 的图像数据`));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = comp.width;
        canvas.height = comp.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.putImageData(comp, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('生成图片 Blob 失败'));
          }
        }, 'image/png');
      });
    }

    /**
     * Export a single frame and trigger download
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {Promise<{success: boolean, filename: string, blob: Blob}>}
     */
    async exportFrame(sheetIdx, actionIdx, frameIdx) {
      const sheet = this.project?.spriteSheets?.[sheetIdx];
      const action = sheet?.actions?.[actionIdx];

      const blob = await this.exportFrameAsBlob(sheetIdx, actionIdx, frameIdx);
      const projName = this._sanitizeFilename(this.project?.name || '角色');
      const actName = this._sanitizeFilename(action?.name || `动作_${actionIdx}`);
      const dirPart = action?.direction ? `${this._sanitizeFilename(action.direction)}_` : '';
      const filename = `${projName}_${actName}_${dirPart}帧${frameIdx}.png`;

      this._downloadBlob(blob, filename);

      return {
        success: true,
        filename,
        blob
      };
    }

    /**
     * Render the modified sprite sheet as a Blob
     * @private
     */
    async _renderSpriteSheetBlob(sheetIdx) {
      const sheet = this.project?.spriteSheets?.[sheetIdx];
      if (!sheet) {
        throw new Error('未找到指定精灵表');
      }

      const sw = sheet.imageData?.width || sheet.image?.naturalWidth || sheet.image?.width || 0;
      const sh = sheet.imageData?.height || sheet.image?.naturalHeight || sheet.image?.height || 0;

      if (sw === 0 || sh === 0) {
        throw new Error('精灵表尺寸无效');
      }

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Base: original sheet
      if (sheet.imageData) {
        ctx.putImageData(sheet.imageData, 0, 0);
      } else if (sheet.image) {
        ctx.drawImage(sheet.image, 0, 0);
      }

      // Draw composites for all frames
      if (Array.isArray(sheet.actions)) {
        for (let ai = 0; ai < sheet.actions.length; ai++) {
          const action = sheet.actions[ai];
          if (!Array.isArray(action.frames)) continue;

          for (let fi = 0; fi < action.frames.length; fi++) {
            const frame = action.frames[fi];
            const comp = this._getCompositeImageData(sheetIdx, ai, fi);
            if (comp) {
              const off = document.createElement('canvas');
              off.width = comp.width;
              off.height = comp.height;
              const offCtx = off.getContext('2d');
              offCtx.imageSmoothingEnabled = false;
              offCtx.putImageData(comp, 0, 0);

              ctx.clearRect(frame.sourceX, frame.sourceY, frame.width, frame.height);
              ctx.drawImage(off, frame.sourceX, frame.sourceY);
            }
          }
        }
      }

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('生成精灵表 Blob 失败'));
          }
        }, 'image/png');
      });
    }

    /**
     * Export sprite sheet - reconstruct full sheet with modifications and trigger download
     * @param {number} sheetIdx 
     * @returns {Promise<Blob>}
     */
    async exportSpriteSheet(sheetIdx) {
      const sheet = this.project?.spriteSheets?.[sheetIdx];
      const blob = await this._renderSpriteSheetBlob(sheetIdx);

      const projName = this._sanitizeFilename(this.project?.name || '角色');
      const sheetName = this._sanitizeFilename(sheet?.name || `图集_${sheetIdx}`);
      const filename = `${projName}_${sheetName}_动作表.png`;

      this._downloadBlob(blob, filename);

      return blob;
    }

    /**
     * Export all assets as ZIP archive
     * @returns {Promise<Blob>}
     */
    async exportAllAsZip() {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip 库未加载，请确保引入了 JSZip CDN 脚本');
      }

      if (!this.project) {
        throw new Error('当前无活动项目可导出');
      }

      const zip = new JSZip();
      const projName = this._sanitizeFilename(this.project.name || '角色');
      const rootFolder = zip.folder(projName);
      const sheetsFolder = rootFolder.folder('动作表');
      const framesFolder = rootFolder.folder('单帧');

      const spriteSheets = this.project.spriteSheets || [];

      // 1. Export all sprite sheets
      for (let si = 0; si < spriteSheets.length; si++) {
        const sheet = spriteSheets[si];
        const sheetBlob = await this._renderSpriteSheetBlob(si);
        const sheetName = `${si+1}_${this._sanitizeFilename(sheet.name || `图集_${si}`)}.png`;
        sheetsFolder.file(sheetName, sheetBlob);
      }

      // 2. Export all single frames
      for (let si = 0; si < spriteSheets.length; si++) {
        const sheet = spriteSheets[si];
        const actions = sheet.actions || [];

        for (let ai = 0; ai < actions.length; ai++) {
          const action = actions[ai];
          const actionName = this._sanitizeFilename(action.name || `动作_${ai}`);
          const actionFolder = framesFolder.folder(`${si+1}_${this._sanitizeFilename(sheet.name)}`).folder(`${ai+1}_${actionName}`);
          const frames = action.frames || [];

          for (let fi = 0; fi < frames.length; fi++) {
            const frameBlob = await this.exportFrameAsBlob(si, ai, fi);
            const dirPrefix = action.direction ? `${this._sanitizeFilename(action.direction)}_` : '';
            const frameName = `${dirPrefix}帧${fi}.png`;
            actionFolder.file(frameName, frameBlob);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      this._downloadBlob(zipBlob, `${projName}_素材包.zip`);

      return zipBlob;
    }

    /**
     * Save complete project as JSON Blob and trigger download
     * @returns {Blob}
     */
    exportProject(download = true) {
      if (!this.project) {
        throw new Error('当前无活动项目可保存');
      }

      const projectData = {
        version: '1.0',
        name: this.project.name || '未命名角色',
        bgColor: this.project.bgColor,
        gridColor: this.project.gridColor,
        currentSheetIndex: this.project.currentSheetIndex || 0,
        currentActionIndex: this.project.currentActionIndex || 0,
        currentFrameIndex: this.project.currentFrameIndex || 0,
        currentLayerIndex: this.project.currentLayerIndex || 0,
        palette: Array.isArray(this.project.palette) ? [...this.project.palette] : [],
        spriteSheets: [],
        layers: []
      };

      // Serialize SpriteSheets
      const spriteSheets = this.project.spriteSheets || [];
      for (let si = 0; si < spriteSheets.length; si++) {
        const sheet = spriteSheets[si];
        const sheetData = {
          sourceFormat: sheet.sourceFormat, sourceBytes: sheet.sourceBytes,
          name: sheet.name || '',
          frameWidth: sheet.frameWidth || 32,
          frameHeight: sheet.frameHeight || 32,
          columns: sheet.columns || 1,
          rows: sheet.rows || 1,
          spacingX: sheet.spacingX || 0,
          spacingY: sheet.spacingY || 0,
          offsetX: sheet.offsetX || 0,
          offsetY: sheet.offsetY || 0,
          useFrameDurations: sheet.useFrameDurations,
          fps: sheet.fps || 8,
          imageDataURL: this._imageDataToDataURL(sheet.imageData),
          actions: []
        };

        const actions = sheet.actions || [];
        for (let ai = 0; ai < actions.length; ai++) {
          const act = actions[ai];
          const actData = {
            name: act.name || '',
            direction: act.direction || '',
            frames: []
          };

          const frames = act.frames || [];
          for (let fi = 0; fi < frames.length; fi++) {
            const frm = frames[fi];
            actData.frames.push({
              sheetIndex: frm.sheetIndex !== undefined ? frm.sheetIndex : si,
              sourceX: frm.sourceX || 0,
              sourceY: frm.sourceY || 0,
              width: frm.width || 32,
              height: frm.height || 32,
              locked: Boolean(frm.locked),
              lockedRegions: Array.isArray(frm.lockedRegions) ? JSON.parse(JSON.stringify(frm.lockedRegions)) : [],
              status: frm.status || '未开始',
              duration: frm.duration,
              notes: frm.notes || ''
            });
          }
          sheetData.actions.push(actData);
        }

        projectData.spriteSheets.push(sheetData);
      }

      // Serialize Layers
      const layers = this.project.layers || [];
      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const layerData = {
          sheetIndex: layer.sheetIndex, isOriginal: layer.isOriginal, isGroup: layer.isGroup, parent: layer.parent, depth: layer.depth, referenceOnly: layer.referenceOnly,
          name: layer.name || '',
          visible: layer.visible !== undefined ? layer.visible : true,
          locked: Boolean(layer.locked),
          opacity: layer.opacity !== undefined ? layer.opacity : 1,
          frameData: {}
        };

        if (layer.frameData instanceof Map) {
          for (const [key, imgData] of layer.frameData.entries()) {
            if (imgData) {
              layerData.frameData[key] = {
                width: imgData.width,
                height: imgData.height,
                dataURL: this._imageDataToDataURL(imgData)
              };
            }
          }
        } else if (layer.frameData) {
          for (const key of Object.keys(layer.frameData)) {
            const imgData = layer.frameData[key];
            if (imgData) {
              layerData.frameData[key] = {
                width: imgData.width,
                height: imgData.height,
                dataURL: this._imageDataToDataURL(imgData)
              };
            }
          }
        }

        projectData.layers.push(layerData);
      }

      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = `${this._sanitizeFilename(projectData.name)}_项目存档.json`;

      if (download) this._downloadBlob(blob, filename);

      return blob;
    }

    /**
     * Load project from JSON file
     * @param {File|Blob} file 
     * @returns {Promise<{success: boolean, project: PE.Project}>}
     */
    async importProject(file) {
      if (!file) {
        throw new Error('未提供项目文件');
      }

      if (file.size>128*1024*1024) throw new Error('工程文件超过 128 MB');
      const jsonText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(new Error('读取 JSON 失败: ' + err));
        reader.readAsText(file);
      });

      const data = JSON.parse(jsonText);
      if (!Array.isArray(data.spriteSheets) || !Array.isArray(data.layers) || !data.layers.length || data.layers.length>1024 || data.spriteSheets.length>128) throw new Error('不是有效的工程文件或超出工程上限');
      let pixels=0;
      for (const s of data.spriteSheets) {
        if(!Array.isArray(s.actions))throw new Error('工程缺少动作列表');
        for(const a of s.actions){if(!Array.isArray(a.frames))throw new Error('工程缺少帧列表');for(const f of a.frames){
          if(!Number.isSafeInteger(f.width)||!Number.isSafeInteger(f.height)||f.width<1||f.height<1||f.width>4096||f.height>4096)throw new Error('工程帧尺寸无效');pixels+=f.width*f.height;
        }}
      }
      if(pixels>16*1024*1024)throw new Error('工程超过帧像素上限');

      // Reconstruct Project
      let proj;
      if (typeof PE.Project === 'function') {
        try {
          proj = new PE.Project(data.name || '未命名角色');
        } catch (e) {
          proj = new PE.Project();
        }
      } else {
        proj = {};
      }

      proj.name = data.name || '未命名角色';
      if(/^#[0-9a-f]{6}$/i.test(data.bgColor||''))proj.bgColor=data.bgColor;
      if(typeof data.gridColor==='string'&&data.gridColor.length<100)proj.gridColor=data.gridColor;
      proj.palette = Array.isArray(data.palette) ? data.palette : [];
      proj.currentSheetIndex = data.currentSheetIndex || 0;
      proj.currentActionIndex = data.currentActionIndex || 0;
      proj.currentFrameIndex = data.currentFrameIndex || 0;
      proj.currentLayerIndex = data.currentLayerIndex || 0;
      proj.spriteSheets = [];
      proj.layers = [];

      // Reconstruct SpriteSheets
      const rawSheets = data.spriteSheets || [];
      for (let si = 0; si < rawSheets.length; si++) {
        const sData = rawSheets[si];
        const sheetImageData = await this._dataURLToImageData(sData.imageDataURL);

        const img = new Image();
        if (sData.imageDataURL) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image load fails
            img.src = sData.imageDataURL;
          });
        }

        let sheet;
        if (typeof PE.SpriteSheet === 'function') {
          try {
            sheet = new PE.SpriteSheet(sData.name, img, sheetImageData);
          } catch (e) {
            sheet = new PE.SpriteSheet();
          }
        } else {
          sheet = {};
        }

        sheet.sourceFormat=sData.sourceFormat; sheet.sourceBytes=sData.sourceBytes;
        sheet.name = sData.name || `图集_${si}`;
        sheet.image = img;
        sheet.imageData = sheetImageData;
        sheet.frameWidth = sData.frameWidth || 32;
        sheet.frameHeight = sData.frameHeight || 32;
        sheet.columns = sData.columns || 1;
        sheet.rows = sData.rows || 1;
        sheet.spacingX = sData.spacingX || 0;
        sheet.spacingY = sData.spacingY || 0;
        sheet.offsetX = sData.offsetX || 0;
        sheet.offsetY = sData.offsetY || 0;
        sheet.useFrameDurations=sData.useFrameDurations;
        sheet.fps = sData.fps || 8;
        sheet.actions = [];

        const rawActions = sData.actions || [];
        for (let ai = 0; ai < rawActions.length; ai++) {
          const aData = rawActions[ai];
          let action;
          if (typeof PE.Action === 'function') {
            try {
              action = new PE.Action(aData.name, aData.direction);
            } catch (e) {
              action = new PE.Action();
            }
          } else {
            action = {};
          }

          action.name = aData.name || `动作_${ai}`;
          action.direction = aData.direction || '';
          action.frames = [];

          const rawFrames = aData.frames || [];
          for (let fi = 0; fi < rawFrames.length; fi++) {
            const fData = rawFrames[fi];
            let frame;
            if (typeof PE.Frame === 'function') {
              try {
                frame = new PE.Frame(fData.sheetIndex, fData.sourceX, fData.sourceY, fData.width, fData.height);
              } catch (e) {
                frame = new PE.Frame();
              }
            } else {
              frame = {};
            }

            frame.sheetIndex = fData.sheetIndex !== undefined ? fData.sheetIndex : si;
            frame.sourceX = fData.sourceX || 0;
            frame.sourceY = fData.sourceY || 0;
            frame.width = fData.width || sheet.frameWidth;
            frame.height = fData.height || sheet.frameHeight;
            frame.duration = fData.duration;
            frame.locked = Boolean(fData.locked);
            frame.lockedRegions = Array.isArray(fData.lockedRegions) ? fData.lockedRegions : [];
            frame.status = fData.status || '未开始';
            frame.notes = fData.notes || '';

            // Extract originalPixels from sheetImageData
            if (sheetImageData) {
              frame.originalPixels = this._extractSubImageData(
                sheetImageData,
                frame.sourceX,
                frame.sourceY,
                frame.width,
                frame.height
              );
            }

            // Frame helper methods
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
          }
          sheet.actions.push(action);
        }
        proj.spriteSheets.push(sheet);
      }

      // Reconstruct Layers
      const rawLayers = data.layers || [];
      for (let li = 0; li < rawLayers.length; li++) {
        const lData = rawLayers[li];
        let layer;
        if (typeof PE.Layer === 'function') {
          try {
            layer = new PE.Layer(lData.name);
          } catch (e) {
            layer = new PE.Layer();
          }
        } else {
          layer = {};
        }

        for (const key of ['sheetIndex','isOriginal','isGroup','parent','depth','referenceOnly']) layer[key]=lData[key];
        layer.name = lData.name || (li === 0 ? '原始图层' : `图层_${li}`);
        layer.visible = lData.visible !== undefined ? lData.visible : true;
        layer.locked = Boolean(lData.locked);
        layer.opacity = lData.opacity !== undefined ? lData.opacity : 1;
        layer.frameData = new Map();

        if (lData.frameData) {
          for (const [key, fd] of Object.entries(lData.frameData)) {
            if (fd && fd.dataURL) {
              const imgData = await this._dataURLToImageData(fd.dataURL);
              if (imgData) {
                layer.frameData.set(key, imgData);
              }
            }
          }
        }

        // Layer helper methods
        if (typeof layer.getFrameData !== 'function') {
          layer.getFrameData = function(key) {
            return this.frameData instanceof Map ? this.frameData.get(key) : this.frameData[key];
          };
        }
        if (typeof layer.ensureFrameData !== 'function') {
          layer.ensureFrameData = function(key, w, h) {
            let fd = this.getFrameData(key);
            if (!fd) {
              fd = (PE.utils && typeof PE.utils.createTransparentImageData === 'function')
                ? PE.utils.createTransparentImageData(w, h)
                : new ImageData(w, h);
              if (this.frameData instanceof Map) {
                this.frameData.set(key, fd);
              } else {
                this.frameData[key] = fd;
              }
            }
            return fd;
          };
        }

        proj.layers.push(layer);
      }

      this.project = proj;
      return {
        success: true,
        project: proj
      };
    }

    /**
     * Helper: Extract sub-region from an ImageData
     * @private
     */
    _extractSubImageData(sourceImageData, sx, sy, fw, fh) {
      let subData;
      if (PE.utils && typeof PE.utils.createTransparentImageData === 'function') {
        subData = PE.utils.createTransparentImageData(fw, fh);
      } else {
        subData = new ImageData(fw, fh);
      }

      const sw = sourceImageData.width;
      const sh = sourceImageData.height;
      const s = sourceImageData.data;
      const d = subData.data;

      for (let y = 0; y < fh; y++) {
        const srcY = sy + y;
        if (srcY < 0 || srcY >= sh) continue;
        for (let x = 0; x < fw; x++) {
          const srcX = sx + x;
          if (srcX < 0 || srcX >= sw) continue;

          const sIdx = (srcY * sw + srcX) * 4;
          const dIdx = (y * fw + x) * 4;

          d[dIdx]     = s[sIdx];
          d[dIdx + 1] = s[sIdx + 1];
          d[dIdx + 2] = s[sIdx + 2];
          d[dIdx + 3] = s[sIdx + 3];
        }
      }

      return subData;
    }

    /**
     * Helper: ImageData to base64 PNG data URL
     * @private
     */
    _imageDataToDataURL(imageData) {
      if (!imageData || !imageData.width || !imageData.height) return '';
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png');
    }

    /**
     * Helper: base64 data URL to ImageData
     * @private
     */
    async _dataURLToImageData(dataURL) {
      if (!dataURL) return null;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, w, h));
        };
        img.onerror = (err) => reject(new Error('转换 DataURL 失败: ' + err));
        img.src = dataURL;
      });
    }

    /**
     * Helper: trigger file download via anchor click
     * @private
     */
    _downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Helper: sanitize filenames for filesystem safety
     * @private
     */
    _sanitizeFilename(str) {
      return String(str || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    }
  }

  // Export to PE namespace
  PE.ExportManager = ExportManager;

})(window.PE);
