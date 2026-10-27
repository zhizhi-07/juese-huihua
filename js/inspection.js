/**
 * inspection.js - Inspection, diff, validation, contact sheet, and verification utilities
 */
window.PE = window.PE || {};

(function(PE) {
  'use strict';

  class InspectionManager {
    constructor() {
      this.project = null;
      this.canvasManager = null;
    }

    /**
     * Initialize inspection manager
     * @param {PE.Project} project 
     * @param {PE.CanvasManager} canvasManager 
     */
    init(project, canvasManager) {
      this.project = project;
      this.canvasManager = canvasManager;
    }

    /**
     * Internal helper to get composite ImageData for a given frame
     * Falls back to layer blending if canvasManager is not available
     * @private
     */
    _getCompositeImageData(sheetIdx, actionIdx, frameIdx, proj = null) {
      const project = proj || this.project;
      if (this.canvasManager && typeof this.canvasManager.getCompositeImageData === 'function') {
        const comp = this.canvasManager.getCompositeImageData(sheetIdx, actionIdx, frameIdx);
        if (comp) return comp;
      }

      const frame = project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx]?.frames?.[frameIdx];
      if (!frame) {
        return (PE.utils && typeof PE.utils.createTransparentImageData === 'function')
          ? PE.utils.createTransparentImageData(1, 1)
          : new ImageData(1, 1);
      }

      const fw = frame.width;
      const fh = frame.height;
      const key = typeof project.getFrameKey === 'function'
        ? project.getFrameKey(sheetIdx, actionIdx, frameIdx)
        : `${sheetIdx}_${actionIdx}_${frameIdx}`;

      // Composite across all visible layers
      if (Array.isArray(project.layers) && project.layers.length > 0) {
        const result = (PE.utils && typeof PE.utils.createTransparentImageData === 'function')
          ? PE.utils.createTransparentImageData(fw, fh)
          : new ImageData(fw, fh);
        const rData = result.data;

        for (let li = 0; li < project.layers.length; li++) {
          const layer = project.layers[li];
          if (!layer.visible || layer.opacity <= 0) continue;

          let lData = null;
          if (typeof layer.getFrameData === 'function') {
            lData = layer.getFrameData(key);
          } else if (layer.frameData instanceof Map) {
            lData = layer.frameData.get(key);
          } else if (layer.frameData) {
            lData = layer.frameData[key];
          }

          // If layer 0 has no frameData, fallback to frame.originalPixels
          if (!lData && li === 0 && frame.originalPixels) {
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

      // Default fallback: original pixels
      if (frame.originalPixels) {
        return (PE.utils && typeof PE.utils.cloneImageData === 'function')
          ? PE.utils.cloneImageData(frame.originalPixels)
          : new ImageData(new Uint8ClampedArray(frame.originalPixels.data), fw, fh);
      }

      return (PE.utils && typeof PE.utils.createTransparentImageData === 'function')
        ? PE.utils.createTransparentImageData(fw, fh)
        : new ImageData(fw, fh);
    }

    /**
     * Get pixel diff between original and current composite for a frame
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {{totalPixels: number, changedPixels: number, changes: Array<{x: number, y: number, original: {r,g,b,a}, current: {r,g,b,a}}>}}
     */
    getFrameDiff(sheetIdx, actionIdx, frameIdx) {
      const frame = this.project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx]?.frames?.[frameIdx];
      if (!frame || !frame.originalPixels) {
        return { totalPixels: 0, changedPixels: 0, changes: [] };
      }

      const orig = frame.originalPixels;
      const curr = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);
      const fw = frame.width;
      const fh = frame.height;
      const totalPixels = fw * fh;
      const changes = [];
      let changedPixels = 0;

      const oData = orig.data;
      const cData = curr.data;

      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const idx = (y * fw + x) * 4;
          const or = oData[idx];
          const og = oData[idx + 1];
          const ob = oData[idx + 2];
          const oa = oData[idx + 3];

          const cr = cData[idx];
          const cg = cData[idx + 1];
          const cb = cData[idx + 2];
          const ca = cData[idx + 3];

          if (or !== cr || og !== cg || ob !== cb || oa !== ca) {
            changedPixels++;
            changes.push({
              x,
              y,
              original: { r: or, g: og, b: ob, a: oa },
              current:  { r: cr, g: cg, b: cb, a: ca }
            });
          }
        }
      }

      return {
        totalPixels,
        changedPixels,
        changes
      };
    }

    /**
     * Generate contact sheet canvas for an action (all frames side by side)
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} scale Rendering scale (1 = original size)
     * @returns {{canvas: HTMLCanvasElement, width: number, height: number, frameCount: number}}
     */
    generateContactSheet(sheetIdx, actionIdx, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const action = this.project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx];
      const frames = action?.frames || [];
      const frameCount = frames.length;

      const canvas = document.createElement('canvas');
      if (frameCount === 0) {
        canvas.width = 0;
        canvas.height = 0;
        return { canvas, width: 0, height: 0, frameCount: 0 };
      }

      const fw = frames[0].width;
      const fh = frames[0].height;
      const totalW = fw * renderScale * frameCount;
      const totalH = fh * renderScale;

      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      for (let fi = 0; fi < frameCount; fi++) {
        const comp = this._getCompositeImageData(sheetIdx, actionIdx, fi);
        if (comp) {
          const off = document.createElement('canvas');
          off.width = comp.width;
          off.height = comp.height;
          off.getContext('2d').putImageData(comp, 0, 0);

          ctx.drawImage(
            off,
            0, 0, comp.width, comp.height,
            fi * fw * renderScale, 0, fw * renderScale, fh * renderScale
          );
        }
      }

      return {
        canvas,
        width: totalW,
        height: totalH,
        frameCount
      };
    }

    /**
     * Generate direction comparison (same frame index across all actions)
     * @param {number} sheetIdx 
     * @param {number} frameIdx 
     * @param {number} scale 
     * @returns {{canvas: HTMLCanvasElement, width: number, height: number, actionCount: number}}
     */
    generateDirectionSheet(sheetIdx, frameIdx, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const sheet = this.project?.spriteSheets?.[sheetIdx];
      const actions = sheet?.actions || [];
      const actionCount = actions.length;

      const canvas = document.createElement('canvas');
      if (actionCount === 0) {
        canvas.width = 0;
        canvas.height = 0;
        return { canvas, width: 0, height: 0, actionCount: 0 };
      }

      const fw = sheet.frameWidth || (actions[0]?.frames?.[0]?.width || 32);
      const fh = sheet.frameHeight || (actions[0]?.frames?.[0]?.height || 32);

      // Grid layout: up to 4 columns
      const cols = actionCount <= 4 ? actionCount : Math.min(4, actionCount);
      const rows = Math.ceil(actionCount / cols);

      const totalW = cols * fw * renderScale;
      const totalH = rows * fh * renderScale;

      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      for (let ai = 0; ai < actionCount; ai++) {
        const c = ai % cols;
        const r = Math.floor(ai / cols);
        const action = actions[ai];

        if (action.frames && frameIdx < action.frames.length) {
          const comp = this._getCompositeImageData(sheetIdx, ai, frameIdx);
          if (comp) {
            const off = document.createElement('canvas');
            off.width = comp.width;
            off.height = comp.height;
            off.getContext('2d').putImageData(comp, 0, 0);

            ctx.drawImage(
              off,
              0, 0, comp.width, comp.height,
              c * fw * renderScale, r * fh * renderScale, fw * renderScale, fh * renderScale
            );
          }
        }
      }

      return {
        canvas,
        width: totalW,
        height: totalH,
        actionCount
      };
    }

    /**
     * Generate side-by-side original vs modified comparison
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @param {number} scale 
     * @returns {{canvas: HTMLCanvasElement, width: number, height: number}}
     */
    generateComparison(sheetIdx, actionIdx, frameIdx, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const frame = this.project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx]?.frames?.[frameIdx];
      const fw = frame?.width || 32;
      const fh = frame?.height || 32;

      const canvas = document.createElement('canvas');
      const totalW = fw * renderScale * 2;
      const totalH = fh * renderScale;

      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Left: Original Pixels
      if (frame?.originalPixels) {
        const offOrig = document.createElement('canvas');
        offOrig.width = fw;
        offOrig.height = fh;
        offOrig.getContext('2d').putImageData(frame.originalPixels, 0, 0);

        ctx.drawImage(offOrig, 0, 0, fw, fh, 0, 0, fw * renderScale, fh * renderScale);
      }

      // Right: Current Composite
      const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);
      if (comp) {
        const offCurr = document.createElement('canvas');
        offCurr.width = comp.width;
        offCurr.height = comp.height;
        offCurr.getContext('2d').putImageData(comp, 0, 0);

        ctx.drawImage(offCurr, 0, 0, comp.width, comp.height, fw * renderScale, 0, fw * renderScale, fh * renderScale);
      }

      return {
        canvas,
        width: totalW,
        height: totalH
      };
    }

    /**
     * Get preview image as data URL
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @param {number} scale 
     * @returns {string} data URL
     */
    getFramePreviewDataURL(sheetIdx, actionIdx, frameIdx, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);
      if (!comp || !comp.width || !comp.height) return '';

      const canvas = document.createElement('canvas');
      const tw = comp.width * renderScale;
      const th = comp.height * renderScale;
      canvas.width = tw;
      canvas.height = th;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const off = document.createElement('canvas');
      off.width = comp.width;
      off.height = comp.height;
      off.getContext('2d').putImageData(comp, 0, 0);

      ctx.drawImage(off, 0, 0, comp.width, comp.height, 0, 0, tw, th);
      return canvas.toDataURL('image/png');
    }

    /**
     * Get sub-region preview as data URL
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {number} scale 
     * @returns {string} data URL
     */
    getRegionPreviewDataURL(sheetIdx, actionIdx, frameIdx, x, y, w, h, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);
      if (!comp || !comp.width || !comp.height) return '';

      const sx = Math.max(0, Math.min(comp.width, Math.floor(x)));
      const sy = Math.max(0, Math.min(comp.height, Math.floor(y)));
      const sw = Math.max(1, Math.min(comp.width - sx, Math.floor(w)));
      const sh = Math.max(1, Math.min(comp.height - sy, Math.floor(h)));

      const canvas = document.createElement('canvas');
      const tw = sw * renderScale;
      const th = sh * renderScale;
      canvas.width = tw;
      canvas.height = th;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const off = document.createElement('canvas');
      off.width = comp.width;
      off.height = comp.height;
      off.getContext('2d').putImageData(comp, 0, 0);

      ctx.drawImage(off, sx, sy, sw, sh, 0, 0, tw, th);
      return canvas.toDataURL('image/png');
    }

    /**
     * Adjacent frames preview (prev, current, next)
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @param {number} scale 
     * @returns {{canvas: HTMLCanvasElement, prevDataURL: string, currentDataURL: string, nextDataURL: string}}
     */
    getAdjacentFramesPreview(sheetIdx, actionIdx, frameIdx, scale = 1) {
      const renderScale = Math.max(1, Number(scale) || 1);
      const action = this.project?.spriteSheets?.[sheetIdx]?.actions?.[actionIdx];
      const frames = action?.frames || [];
      const frameCount = frames.length;

      if (frameCount === 0) {
        return {
          canvas: document.createElement('canvas'),
          prevDataURL: '',
          currentDataURL: '',
          nextDataURL: ''
        };
      }

      const prevIdx = frameIdx > 0 ? frameIdx - 1 : frameCount - 1;
      const nextIdx = frameIdx < frameCount - 1 ? frameIdx + 1 : 0;

      const prevDataURL = this.getFramePreviewDataURL(sheetIdx, actionIdx, prevIdx, renderScale);
      const currentDataURL = this.getFramePreviewDataURL(sheetIdx, actionIdx, frameIdx, renderScale);
      const nextDataURL = this.getFramePreviewDataURL(sheetIdx, actionIdx, nextIdx, renderScale);

      const fw = frames[frameIdx].width;
      const fh = frames[frameIdx].height;
      const canvas = document.createElement('canvas');
      canvas.width = fw * renderScale * 3;
      canvas.height = fh * renderScale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const idxList = [prevIdx, frameIdx, nextIdx];
      for (let i = 0; i < 3; i++) {
        const comp = this._getCompositeImageData(sheetIdx, actionIdx, idxList[i]);
        if (comp) {
          const off = document.createElement('canvas');
          off.width = comp.width;
          off.height = comp.height;
          off.getContext('2d').putImageData(comp, 0, 0);

          ctx.drawImage(off, 0, 0, comp.width, comp.height, i * fw * renderScale, 0, fw * renderScale, fh * renderScale);
        }
      }

      return {
        canvas,
        prevDataURL,
        currentDataURL,
        nextDataURL
      };
    }

    /**
     * Run automated validation checks on a single frame
     * @param {PE.Project} project 
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {{valid: boolean, checks: Array<{name: string, passed: boolean, detail: string, count?: number}>}}
     */
    validateFrame(project, sheetIdx, actionIdx, frameIdx) {
      const proj = project || this.project;
      const sheet = proj?.spriteSheets?.[sheetIdx];
      const action = sheet?.actions?.[actionIdx];
      const frame = action?.frames?.[frameIdx];

      if (!sheet || !action || !frame) {
        return {
          valid: false,
          checks: [
            { name: '尺寸检查', passed: false, detail: '无法找到目标帧数据' }
          ]
        };
      }

      const key = typeof proj.getFrameKey === 'function'
        ? proj.getFrameKey(sheetIdx, actionIdx, frameIdx)
        : `${sheetIdx}_${actionIdx}_${frameIdx}`;

      // 1. Frame dimensions check
      const expectedW = sheet.frameWidth;
      const expectedH = sheet.frameHeight;
      const passedDim = (frame.width === expectedW && frame.height === expectedH &&
                         (!frame.originalPixels || (frame.originalPixels.width === expectedW && frame.originalPixels.height === expectedH)));
      const detailDim = passedDim
        ? `尺寸正确 (${frame.width}x${frame.height})`
        : `尺寸不匹配: 期望 ${expectedW}x${expectedH}, 实际 ${frame.width}x${frame.height}`;

      // 2. Locked pixels check (compare layer 0 with originalPixels and frame lockedRegions)
      let lockedModifiedCount = 0;
      const layer0 = proj.layers?.find(l=>l.sheetIndex===sheetIdx && l.isOriginal);
      if (layer0?.locked && frame.originalPixels) {
        let l0Data = null;
        if (typeof layer0.getFrameData === 'function') {
          l0Data = layer0.getFrameData(key);
        } else if (layer0.frameData instanceof Map) {
          l0Data = layer0.frameData.get(key);
        } else if (layer0.frameData) {
          l0Data = layer0.frameData[key];
        }

        if (l0Data && l0Data.data) {
          const oData = frame.originalPixels.data;
          const ld = l0Data.data;
          const minLen = Math.min(oData.length, ld.length);
          for (let i = 0; i < minLen; i += 4) {
            if (oData[i] !== ld[i] || oData[i + 1] !== ld[i + 1] || oData[i + 2] !== ld[i + 2] || oData[i + 3] !== ld[i + 3]) {
              lockedModifiedCount++;
            }
          }
        }
      }

      // Check locked regions against composite
      if (frame.lockedRegions && frame.lockedRegions.length > 0 && frame.originalPixels) {
        const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx, proj);
        if (comp && comp.data) {
          for (const reg of frame.lockedRegions) {
            const rxEnd = Math.min(frame.width, reg.x + reg.w);
            const ryEnd = Math.min(frame.height, reg.y + reg.h);
            for (let ry = Math.max(0, reg.y); ry < ryEnd; ry++) {
              for (let rx = Math.max(0, reg.x); rx < rxEnd; rx++) {
                const idx = (ry * frame.width + rx) * 4;
                if (comp.data[idx] !== frame.originalPixels.data[idx] ||
                    comp.data[idx + 1] !== frame.originalPixels.data[idx + 1] ||
                    comp.data[idx + 2] !== frame.originalPixels.data[idx + 2] ||
                    comp.data[idx + 3] !== frame.originalPixels.data[idx + 3]) {
                  lockedModifiedCount++;
                }
              }
            }
          }
        }
      }

      const passedLocked = lockedModifiedCount === 0;
      const detailLocked = passedLocked
        ? '锁定像素保持未修改'
        : `检测到 ${lockedModifiedCount} 个锁定像素被修改`;

      // 3. Out-of-bounds check
      const sheetW = sheet.imageData?.width || sheet.image?.width || 0;
      const sheetH = sheet.imageData?.height || sheet.image?.height || 0;
      let isOOB = false;
      let oobDetail = '';

      if (frame.sourceX < 0 || frame.sourceY < 0 ||
          (sheetW > 0 && frame.sourceX + frame.width > sheetW) ||
          (sheetH > 0 && frame.sourceY + frame.height > sheetH)) {
        isOOB = true;
        oobDetail = `帧截取范围 (${frame.sourceX},${frame.sourceY}) 超出精灵图集边界 (${sheetW}x${sheetH})`;
      }

      if (!isOOB && Array.isArray(proj.layers)) {
        const expectedLen = frame.width * frame.height * 4;
        for (const layer of proj.layers) {
          let fd = null;
          if (typeof layer.getFrameData === 'function') {
            fd = layer.getFrameData(key);
          } else if (layer.frameData instanceof Map) {
            fd = layer.frameData.get(key);
          } else if (layer.frameData) {
            fd = layer.frameData[key];
          }

          if (fd && (fd.width !== frame.width || fd.height !== frame.height || fd.data.length !== expectedLen)) {
            isOOB = true;
            oobDetail = `图层 "${layer.name}" 像素尺寸 (${fd.width}x${fd.height}) 与帧不匹配`;
            break;
          }
        }
      }

      const passedOOB = !isOOB;
      const detailOOB = passedOOB ? '无越界像素' : (oobDetail || '存在越界修改');

      // 4. Semi-transparent pixels check (0 < a < 255) in non-original layers
      let semiCount = 0;
      if (Array.isArray(proj.layers) && proj.layers.length > 1) {
        for (let li = 1; li < proj.layers.length; li++) {
          const layer = proj.layers[li];
          if (layer.name === '原始图层') continue;

          let fd = null;
          if (typeof layer.getFrameData === 'function') {
            fd = layer.getFrameData(key);
          } else if (layer.frameData instanceof Map) {
            fd = layer.frameData.get(key);
          } else if (layer.frameData) {
            fd = layer.frameData[key];
          }

          if (fd && fd.data) {
            const data = fd.data;
            const len = data.length;
            for (let i = 3; i < len; i += 4) {
              const alpha = data[i];
              if (alpha > 0 && alpha < 255) {
                semiCount++;
              }
            }
          }
        }
      }

      const passedSemi = semiCount === 0;
      const detailSemi = passedSemi
        ? '无半透明像素，符合像素画纯色规范'
        : `发现 ${semiCount} 个半透明像素 (透明度介于 1-254)`;

      const checks = [
        { name: '尺寸检查', passed: passedDim, detail: detailDim },
        { name: '锁定像素检查', passed: passedLocked, detail: detailLocked },
        { name: '越界检查', passed: passedOOB, detail: detailOOB },
        { name: '半透明检查', passed: passedSemi, detail: detailSemi, count: semiCount }
      ];

      return {
        valid: checks.every(c => c.passed),
        checks
      };
    }

    /**
     * Run validateFrame for every frame in every action in every sheet
     * @param {PE.Project} project 
     * @returns {{totalFrames: number, passedFrames: number, failedFrames: number, results: Array<object>}}
     */
    validateAll(project) {
      const proj = project || this.project;
      if (!proj || !Array.isArray(proj.spriteSheets)) {
        return { totalFrames: 0, passedFrames: 0, failedFrames: 0, results: [] };
      }

      const results = [];
      let totalFrames = 0;
      let passedFrames = 0;
      let failedFrames = 0;

      for (let si = 0; si < proj.spriteSheets.length; si++) {
        const sheet = proj.spriteSheets[si];
        if (!Array.isArray(sheet.actions)) continue;

        for (let ai = 0; ai < sheet.actions.length; ai++) {
          const action = sheet.actions[ai];
          if (!Array.isArray(action.frames)) continue;

          for (let fi = 0; fi < action.frames.length; fi++) {
            totalFrames++;
            const vRes = this.validateFrame(proj, si, ai, fi);
            if (vRes.valid) {
              passedFrames++;
            } else {
              failedFrames++;
            }

            results.push({
              sheetIndex: si,
              sheetName: sheet.name || `图集_${si}`,
              actionIndex: ai,
              actionName: action.name || `动作_${ai}`,
              frameIndex: fi,
              valid: vRes.valid,
              checks: vRes.checks
            });
          }
        }
      }

      return {
        totalFrames,
        passedFrames,
        failedFrames,
        results
      };
    }

    /**
     * Export-reimport consistency verification
     * @param {Blob} exportedBlob 
     * @param {number} sheetIdx 
     * @param {number} actionIdx 
     * @param {number} frameIdx 
     * @returns {Promise<{consistent: boolean, differentPixels: number}>}
     */
    async verifyExportConsistency(exportedBlob, sheetIdx, actionIdx, frameIdx) {
      if (!exportedBlob) {
        throw new Error('未提供导出的 Blob 数据');
      }

      const url = URL.createObjectURL(exportedBlob);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = (err) => reject(new Error('无法解析导出的图片 Blob: ' + err));
          image.src = url;
        });

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const offCtx = off.getContext('2d');
        offCtx.imageSmoothingEnabled = false;
        offCtx.drawImage(img, 0, 0);

        const importedData = offCtx.getImageData(0, 0, w, h);
        const comp = this._getCompositeImageData(sheetIdx, actionIdx, frameIdx);

        if (comp.width !== w || comp.height !== h) {
          return {
            consistent: false,
            differentPixels: w * h
          };
        }

        let differentPixels = 0;
        const impData = importedData.data;
        const cData = comp.data;
        const len = w * h * 4;

        for (let i = 0; i < len; i += 4) {
          if (impData[i] !== cData[i] ||
              impData[i + 1] !== cData[i + 1] ||
              impData[i + 2] !== cData[i + 2] ||
              impData[i + 3] !== cData[i + 3]) {
            differentPixels++;
          }
        }

        return {
          consistent: differentPixels === 0,
          differentPixels
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  // Export to PE namespace
  PE.InspectionManager = InspectionManager;

})(window.PE);
