/**
 * Pixel Art Editor - Agent API (window.pixelAPI)
 * 供 AI Agent 和自动化脚本调用的像素级操作接口
 */

window.PE = window.PE || {};

(function() {
  'use strict';

  // 内部辅助剪贴板，用于 copyRegion / pasteRegion
  let _clipboard = null;

  function _getProject() {
    return (window.PE && window.PE.app && window.PE.app.project) || window.PE.project || null;
  }

  function _getCanvasManager() {
    return (window.PE && window.PE.app && window.PE.app.canvasManager) || window.PE.canvasManager || null;
  }

  function _getHistory() {
    return (window.PE && window.PE.app && window.PE.app.history) || window.PE.history || null;
  }

  function _getInspection() {
    return (window.PE && window.PE.app && window.PE.app.inspectionManager) || window.PE.inspectionManager || null;
  }

  function _getExport() {
    return (window.PE && window.PE.app && window.PE.app.exportManager) || window.PE.exportManager || null;
  }

  function _success(data, extra = {}) {
    return {
      success: true,
      data: data !== undefined ? data : null,
      error: null,
      ...extra
    };
  }

  function _fail(error, extra = {}) {
    return {
      success: false,
      data: null,
      error: typeof error === 'string' ? error : (error && error.message ? error.message : '未知错误'),
      ...extra
    };
  }

  function _notifyCanvasAndUI() {
    const cm = _getCanvasManager();
    if (cm && typeof cm.render === 'function') {
      cm.render();
    }
    if (window.PE && window.PE.app) {
      if (typeof window.PE.app.updateFrameList === 'function') {
        window.PE.app.updateFrameList();
      }
      if (typeof window.PE.app.updateLayerList === 'function') {
        window.PE.app.updateLayerList();
      }
      if (typeof window.PE.app.updateStatusBar === 'function') {
        window.PE.app.updateStatusBar();
      }
    }
  }

  function _resolveFrame(si, ai, fi) {
    const p = _getProject();
    if (!p) throw new Error('项目尚未初始化');

    const sheetIdx = (si !== undefined && si !== null) ? Number(si) : p.currentSheetIndex;
    if (!p.spriteSheets || sheetIdx < 0 || sheetIdx >= p.spriteSheets.length) {
      throw new Error(`素材表不存在 (sheetIndex: ${sheetIdx})`);
    }
    const sheet = p.spriteSheets[sheetIdx];

    const actionIdx = (ai !== undefined && ai !== null) ? Number(ai) : p.currentActionIndex;
    if (!sheet.actions || actionIdx < 0 || actionIdx >= sheet.actions.length) {
      throw new Error(`动作不存在 (actionIndex: ${actionIdx})`);
    }
    const action = sheet.actions[actionIdx];

    const frameIdx = (fi !== undefined && fi !== null) ? Number(fi) : p.currentFrameIndex;
    if (!action.frames || frameIdx < 0 || frameIdx >= action.frames.length) {
      throw new Error(`帧不存在 (frameIndex: ${frameIdx})`);
    }
    const frame = action.frames[frameIdx];

    const frameKey = p.getFrameKey ? p.getFrameKey(sheetIdx, actionIdx, frameIdx) : `${sheetIdx}_${actionIdx}_${frameIdx}`;

    return {
      project: p,
      sheet,
      action,
      frame,
      sheetIndex: sheetIdx,
      actionIndex: actionIdx,
      frameIndex: frameIdx,
      frameKey
    };
  }

  function _resolveLayer(project, layerIdx) {
    const lIdx = (layerIdx !== undefined && layerIdx !== null) ? Number(layerIdx) : project.currentLayerIndex;
    if (!project.layers || lIdx < 0 || lIdx >= project.layers.length) {
      throw new Error(`图层不存在 (layerIndex: ${lIdx})`);
    }
    return { layer: project.layers[lIdx], layerIndex: lIdx };
  }

  function _getLinePixels(x1, y1, x2, y2) {
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

  function _applyPixelsToLayer(layer, layerIdx, frame, frameKey, pixelList, batchDescription) {
    if (layer.locked || PE.isHandLayer(layer) || layer.isGroup || (layer.sheetIndex!==undefined && layer.sheetIndex!==frame.sheetIndex)) {
      return {
        modifiedPixels: 0,
        rejectedPixels: pixelList.map(p => ({ x: p.x, y: p.y, reason: '目标图层已被锁定' }))
      };
    }
    if (frame.locked) {
      return {
        modifiedPixels: 0,
        rejectedPixels: pixelList.map(p => ({ x: p.x, y: p.y, reason: '目标帧已被锁定' }))
      };
    }

    layer.ensureFrameData(frameKey, frame.width, frame.height);

    const modified = [];
    const rejected = [];
    const seen = new Set();

    for (let i = 0; i < pixelList.length; i++) {
      const item = pixelList[i];
      const x = Math.round(item.x);
      const y = Math.round(item.y);

      if (!Number.isSafeInteger(item.x) || !Number.isSafeInteger(item.y) || x < 0 || x >= frame.width || y < 0 || y >= frame.height) {
        rejected.push({ x, y, reason: '超出帧边界' });
        continue;
      }

      if (frame.isPixelLocked && frame.isPixelLocked(x, y)) {
        rejected.push({ x, y, reason: '像素位于锁定区域内' });
        continue;
      }

      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const oldPixel = layer.getPixel(frameKey, x, y) || { r: 0, g: 0, b: 0, a: 0 };
      const newColor = {
        r: Math.max(0, Math.min(255, Math.round(item.r || 0))),
        g: Math.max(0, Math.min(255, Math.round(item.g || 0))),
        b: Math.max(0, Math.min(255, Math.round(item.b || 0))),
        a: Math.max(0, Math.min(255, Math.round(item.a !== undefined ? item.a : 255)))
      };

      modified.push({ x, y, old: oldPixel, newColor });
    }

    const hist = _getHistory();
    if (hist && modified.length > 0) {
      hist.beginBatch(batchDescription || 'API 像素修改');
      for (const m of modified) {
        hist.recordPixelChange(layerIdx, frameKey, m.x, m.y, m.old, m.newColor);
        layer.setPixel(frameKey, m.x, m.y, m.newColor.r, m.newColor.g, m.newColor.b, m.newColor.a);
      }
      hist.commitBatch();
    } else {
      for (const m of modified) {
        layer.setPixel(frameKey, m.x, m.y, m.newColor.r, m.newColor.g, m.newColor.b, m.newColor.a);
      }
    }

    _notifyCanvasAndUI();

    return {
      modifiedPixels: modified.length,
      rejectedPixels: rejected
    };
  }

  // ==========================================
  // window.pixelAPI 实现
  // ==========================================
  const pixelAPI = {
    // ===== PROJECT INFO =====
    getProjectInfo() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        return _success({
          name: p.name || '未命名项目',
          sheetCount: p.spriteSheets ? p.spriteSheets.length : 0,
          layerCount: p.layers ? p.layers.length : 0,
          currentSheetIndex: p.currentSheetIndex,
          currentActionIndex: p.currentActionIndex,
          currentFrameIndex: p.currentFrameIndex,
          currentLayerIndex: p.currentLayerIndex,
          palette: p.palette || []
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getSheetInfo(sheetIndex) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const sIdx = (sheetIndex !== undefined && sheetIndex !== null) ? Number(sheetIndex) : p.currentSheetIndex;
        if (!p.spriteSheets || sIdx < 0 || sIdx >= p.spriteSheets.length) {
          return _fail(`素材表不存在 (sheetIndex: ${sIdx})`);
        }
        const sheet = p.spriteSheets[sIdx];
        let totalFrames = 0;
        if (sheet.actions) {
          sheet.actions.forEach(a => {
            if (a.frames) totalFrames += a.frames.length;
          });
        }
        return _success({
          name: sheet.name || `Sheet_${sIdx}`,
          frameWidth: sheet.frameWidth || 0,
          frameHeight: sheet.frameHeight || 0,
          columns: sheet.columns || 0,
          rows: sheet.rows || 0,
          spacingX: sheet.spacingX || 0,
          spacingY: sheet.spacingY || 0,
          offsetX: sheet.offsetX || 0,
          offsetY: sheet.offsetY || 0,
          fps: sheet.fps || 8,
          actionCount: sheet.actions ? sheet.actions.length : 0,
          totalFrames
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getActions(sheetIndex) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const sIdx = (sheetIndex !== undefined && sheetIndex !== null) ? Number(sheetIndex) : p.currentSheetIndex;
        if (!p.spriteSheets || sIdx < 0 || sIdx >= p.spriteSheets.length) {
          return _fail(`素材表不存在 (sheetIndex: ${sIdx})`);
        }
        const sheet = p.spriteSheets[sIdx];
        const actions = (sheet.actions || []).map((a, idx) => ({
          actionIndex: idx,
          name: a.name || `Action_${idx}`,
          direction: a.direction || 'none',
          frameCount: a.frames ? a.frames.length : 0
        }));
        return _success(actions);
      } catch (err) {
        return _fail(err);
      }
    },

    getFrameInfo(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const f = ref.frame;
        return _success({
          sheetIndex: ref.sheetIndex,
          actionIndex: ref.actionIndex,
          frameIndex: ref.frameIndex,
          width: f.width,
          height: f.height,
          locked: !!f.locked,
          lockedRegions: f.lockedRegions ? [...f.lockedRegions] : [],
          status: f.status || 'pending',
          notes: f.notes || '',
          hasOriginal: !!f.originalPixels
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getLayers() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const layers = (p.layers || []).map((l, idx) => ({
          index: idx,
          name: l.name || `图层 ${idx + 1}`,
          visible: l.visible !== false,
          locked: !!l.locked,
          opacity: l.opacity !== undefined ? l.opacity : 1.0,
          isCurrent: idx === p.currentLayerIndex
        }));
        return _success(layers);
      } catch (err) {
        return _fail(err);
      }
    },

    getPalette() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        return _success(p.palette ? [...p.palette] : []);
      } catch (err) {
        return _fail(err);
      }
    },

    getLockedRegions(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        return _success(ref.frame.lockedRegions ? [...ref.frame.lockedRegions] : []);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== PIXEL READING =====
    getPixel(si, ai, fi, x, y) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const px = Math.round(x);
        const py = Math.round(y);
        if (px < 0 || px >= ref.frame.width || py < 0 || py >= ref.frame.height) {
          return _fail(`坐标超出帧边界: (${px}, ${py})，帧尺寸为 ${ref.frame.width}x${ref.frame.height}`);
        }

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        if (!compImgData) return _fail('无法获取复合图像数据');

        const idx = (py * ref.frame.width + px) * 4;
        const d = compImgData.data;
        return _success({
          r: d[idx],
          g: d[idx + 1],
          b: d[idx + 2],
          a: d[idx + 3]
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getPixels(si, ai, fi, x, y, w, h) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        if (!compImgData) return _fail('无法获取复合图像数据');

        const sx = Math.max(0, Math.round(x));
        const sy = Math.max(0, Math.round(y));
        const sw = Math.min(ref.frame.width - sx, Math.round(w));
        const sh = Math.min(ref.frame.height - sy, Math.round(h));

        if (sw <= 0 || sh <= 0) return _success([]);

        const result = [];
        const d = compImgData.data;
        const fw = ref.frame.width;

        for (let row = 0; row < sh; row++) {
          const rowPixels = [];
          const curY = sy + row;
          for (let col = 0; col < sw; col++) {
            const curX = sx + col;
            const idx = (curY * fw + curX) * 4;
            rowPixels.push({
              r: d[idx],
              g: d[idx + 1],
              b: d[idx + 2],
              a: d[idx + 3]
            });
          }
          result.push(rowPixels);
        }

        return _success(result);
      } catch (err) {
        return _fail(err);
      }
    },

    getFramePixels(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        if (!compImgData) return _fail('无法获取复合图像数据');

        const d = compImgData.data;
        const fw = ref.frame.width;
        const fh = ref.frame.height;
        const pixels = [];

        for (let py = 0; py < fh; py++) {
          for (let px = 0; px < fw; px++) {
            const idx = (py * fw + px) * 4;
            const a = d[idx + 3];
            if (a > 0) {
              pixels.push({
                x: px,
                y: py,
                r: d[idx],
                g: d[idx + 1],
                b: d[idx + 2],
                a: a
              });
            }
          }
        }

        return _success(pixels);
      } catch (err) {
        return _fail(err);
      }
    },

    getFrameRawRGBA(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        if (!compImgData) return _fail('无法获取复合图像数据');

        return _success(new Uint8ClampedArray(compImgData.data));
      } catch (err) {
        return _fail(err);
      }
    },

    getLayerPixel(layerIdx, si, ai, fi, x, y) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);
        const px = Math.round(x);
        const py = Math.round(y);

        if (px < 0 || px >= ref.frame.width || py < 0 || py >= ref.frame.height) {
          return _fail(`坐标超出边界: (${px}, ${py})`);
        }

        const pixel = lRes.layer.getPixel(ref.frameKey, px, py) || { r: 0, g: 0, b: 0, a: 0 };
        return _success(pixel);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== PREVIEWS =====
    getFramePreview(si, ai, fi, scale = 1) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const dataURL = insp.getFramePreviewDataURL(ref.sheetIndex, ref.actionIndex, ref.frameIndex, s);
        return _success({
          dataURL,
          width: ref.frame.width * s,
          height: ref.frame.height * s
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getActionPreview(si, ai, scale = 1) {
      try {
        const p = _getProject();
        const sIdx = (si !== undefined && si !== null) ? Number(si) : p.currentSheetIndex;
        const aIdx = (ai !== undefined && ai !== null) ? Number(ai) : p.currentActionIndex;
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const dataURL = insp.generateContactSheet(sIdx, aIdx, s);
        return _success({ dataURL });
      } catch (err) {
        return _fail(err);
      }
    },

    getAdjacentFramesPreview(si, ai, fi, scale = 1) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const res = insp.getAdjacentFramesPreview(ref.sheetIndex, ref.actionIndex, ref.frameIndex, s);
        return _success(res);
      } catch (err) {
        return _fail(err);
      }
    },

    getRegionPreview(si, ai, fi, x, y, w, h, scale = 1) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const dataURL = insp.getRegionPreviewDataURL(ref.sheetIndex, ref.actionIndex, ref.frameIndex, x, y, w, h, s);
        return _success({ dataURL });
      } catch (err) {
        return _fail(err);
      }
    },

    getDirectionSheet(si, fi, scale = 1) {
      try {
        const p = _getProject();
        const sIdx = (si !== undefined && si !== null) ? Number(si) : p.currentSheetIndex;
        const fIdx = (fi !== undefined && fi !== null) ? Number(fi) : p.currentFrameIndex;
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const dataURL = insp.generateDirectionSheet(sIdx, fIdx, s);
        return _success({ dataURL });
      } catch (err) {
        return _fail(err);
      }
    },

    getComparisonPreview(si, ai, fi, scale = 1) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');

        const s = Math.max(1, Math.round(scale));
        const dataURL = insp.generateComparison(ref.sheetIndex, ref.actionIndex, ref.frameIndex, s);
        return _success({ dataURL });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== LAYER OPERATIONS =====
    addLayer(name) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const layerName = name || `图层 ${(p.layers ? p.layers.length : 0) + 1}`;
        p.addLayer(layerName).sheetIndex=p.currentSheetIndex;
        const newIndex = p.layers.length - 1;
        p.currentLayerIndex = newIndex;
        _notifyCanvasAndUI();
        return _success({ layerIndex: newIndex, name: layerName });
      } catch (err) {
        return _fail(err);
      }
    },

    removeLayer(index) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        if (!p.layers || p.layers.length <= 1) {
          return _fail('至少需保留一个图层，无法删除');
        }
        const idx = (index !== undefined && index !== null) ? Number(index) : p.currentLayerIndex;
        if (idx < 0 || idx >= p.layers.length) {
          return _fail(`图层索引无效: ${idx}`);
        }
        if (!p.removeLayer(idx)) return _fail('不能删除图层组或最后一个图层');
        _getHistory()?.clear();
        if (p.currentLayerIndex >= p.layers.length) {
          p.currentLayerIndex = p.layers.length - 1;
        }
        _notifyCanvasAndUI();
        return _success({ layerCount: p.layers.length, currentLayerIndex: p.currentLayerIndex });
      } catch (err) {
        return _fail(err);
      }
    },

    selectLayer(index) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const idx = Number(index);
        if (idx < 0 || idx >= p.layers.length) {
          return _fail(`图层索引无效: ${idx}`);
        }
        p.currentLayerIndex = idx;
        _notifyCanvasAndUI();
        return _success({ currentLayerIndex: idx, name: p.layers[idx].name });
      } catch (err) {
        return _fail(err);
      }
    },

    setLayerVisibility(index, visible) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const lRes = _resolveLayer(p, index);
        if (PE.isHandLayer(lRes.layer)) return _fail('请使用手部预览开关，原始手部可见性受保护');
        lRes.layer.visible = !!visible;
        _notifyCanvasAndUI();
        return _success({ layerIndex: lRes.layerIndex, visible: lRes.layer.visible });
      } catch (err) {
        return _fail(err);
      }
    },

    setLayerLocked(index, locked) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const lRes = _resolveLayer(p, index);
        if (PE.isHandLayer(lRes.layer) && !locked) return _fail('手部是独立参考层，不能解锁绘画');
        lRes.layer.locked = !!locked;
        _notifyCanvasAndUI();
        return _success({ layerIndex: lRes.layerIndex, locked: lRes.layer.locked });
      } catch (err) {
        return _fail(err);
      }
    },

    setLayerOpacity(index, opacity) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const lRes = _resolveLayer(p, index);
        if (PE.isHandLayer(lRes.layer)) return _fail('手部原始透明度受保护');
        const op = Math.max(0, Math.min(1, Number(opacity)));
        lRes.layer.opacity = op;
        _notifyCanvasAndUI();
        return _success({ layerIndex: lRes.layerIndex, opacity: op });
      } catch (err) {
        return _fail(err);
      }
    },

    reorderLayers(fromIndex, toIndex) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const from = Number(fromIndex);
        const to = Number(toIndex);
        if (from < 0 || from >= p.layers.length || to < 0 || to >= p.layers.length) {
          return _fail(`图层索引无效: from=${from}, to=${to}`);
        }
        if (PE.isHandLayer(p.layers[from]) || p.layers[from].isGroup || p.layers[from].parent!=null || p.layers[to].isGroup || p.layers[to].parent!=null) return _fail('受保护手部或分组图层不能调整顺序');
        const parents=new Map(p.layers.map(l=>[l,l.parent==null?null:p.layers[l.parent]]));
        const movedLayer = p.layers.splice(from, 1)[0];
        p.layers.splice(to, 0, movedLayer);
        for(const l of p.layers){const parent=parents.get(l);l.parent=parent?p.layers.indexOf(parent):null;}
        _getHistory()?.clear();
        p.currentLayerIndex = to;
        _notifyCanvasAndUI();
        return _success({ from, to, layerCount: p.layers.length });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== DRAWING =====
    setPixels(layerIdx, si, ai, fi, pixels) {
      try {
        if (!Array.isArray(pixels)) {
          return _fail('pixels 参数必须为数组 [{x, y, r, g, b, a}]');
        }
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);

        const res = _applyPixelsToLayer(lRes.layer, lRes.layerIndex, ref.frame, ref.frameKey, pixels, 'API 批量设置像素');
        return _success(
          { modifiedCount: res.modifiedPixels, rejectedCount: res.rejectedPixels.length },
          { modifiedPixels: res.modifiedPixels, rejectedPixels: res.rejectedPixels }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    drawLine(layerIdx, si, ai, fi, x1, y1, x2, y2, r, g, b, a = 255) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);

        const points = _getLinePixels(x1, y1, x2, y2);
        const pixels = points.map(pt => ({ x: pt.x, y: pt.y, r, g, b, a }));

        const res = _applyPixelsToLayer(lRes.layer, lRes.layerIndex, ref.frame, ref.frameKey, pixels, `API 绘制线条 (${x1},${y1})->(${x2},${y2})`);
        return _success(
          { modifiedCount: res.modifiedPixels, rejectedCount: res.rejectedPixels.length },
          { modifiedPixels: res.modifiedPixels, rejectedPixels: res.rejectedPixels }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    drawRect(layerIdx, si, ai, fi, x, y, w, h, r, g, b, a = 255, filled = false) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);

        const rx = Math.round(x);
        const ry = Math.round(y);
        const rw = Math.round(w);
        const rh = Math.round(h);

        if (rw <= 0 || rh <= 0) return _fail('矩形宽度和高度必须大于0');

        const pixels = [];
        if (filled) {
          for (let py = ry; py < ry + rh; py++) {
            for (let px = rx; px < rx + rw; px++) {
              pixels.push({ x: px, y: py, r, g, b, a });
            }
          }
        } else {
          for (let px = rx; px < rx + rw; px++) {
            pixels.push({ x: px, y: ry, r, g, b, a });
            if (rh > 1) pixels.push({ x: px, y: ry + rh - 1, r, g, b, a });
          }
          for (let py = ry + 1; py < ry + rh - 1; py++) {
            pixels.push({ x: rx, y: py, r, g, b, a });
            if (rw > 1) pixels.push({ x: rx + rw - 1, y: py, r, g, b, a });
          }
        }

        const res = _applyPixelsToLayer(lRes.layer, lRes.layerIndex, ref.frame, ref.frameKey, pixels, `API 绘制矩形 [${rx},${ry},${rw},${rh}]`);
        return _success(
          { modifiedCount: res.modifiedPixels, rejectedCount: res.rejectedPixels.length },
          { modifiedPixels: res.modifiedPixels, rejectedPixels: res.rejectedPixels }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    erasePixels(layerIdx, si, ai, fi, pixels) {
      try {
        if (!Array.isArray(pixels)) {
          return _fail('pixels 参数必须为数组 [{x, y}]');
        }
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);

        const eraseList = pixels.map(pt => ({ x: pt.x, y: pt.y, r: 0, g: 0, b: 0, a: 0 }));
        const res = _applyPixelsToLayer(lRes.layer, lRes.layerIndex, ref.frame, ref.frameKey, eraseList, 'API 橡皮擦除');
        return _success(
          { modifiedCount: res.modifiedPixels, rejectedCount: res.rejectedPixels.length },
          { modifiedPixels: res.modifiedPixels, rejectedPixels: res.rejectedPixels }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    eraseRect(layerIdx, si, ai, fi, x, y, w, h) {
      return this.drawRect(layerIdx, si, ai, fi, x, y, w, h, 0, 0, 0, 0, true);
    },

    fillArea(layerIdx, si, ai, fi, x, y, r, g, b, a = 255) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);
        const layer = lRes.layer;

        if (layer.locked || PE.isHandLayer(layer) || layer.isGroup || (layer.sheetIndex!==undefined && layer.sheetIndex!==ref.frame.sheetIndex)) {
          return _fail('目标图层已被锁定', { modifiedPixels: 0, rejectedPixels: [{ x, y, reason: '图层已锁定' }] });
        }
        if (ref.frame.locked) {
          return _fail('目标帧已被锁定', { modifiedPixels: 0, rejectedPixels: [{ x, y, reason: '帧已锁定' }] });
        }

        const targetX = Math.round(x);
        const targetY = Math.round(y);
        const fw = ref.frame.width;
        const fh = ref.frame.height;

        if (targetX < 0 || targetX >= fw || targetY < 0 || targetY >= fh) {
          return _fail(`起始填充坐标越界: (${targetX}, ${targetY})`);
        }

        layer.ensureFrameData(ref.frameKey, fw, fh);
        const startColor = layer.getPixel(ref.frameKey, targetX, targetY) || { r: 0, g: 0, b: 0, a: 0 };
        const newColor = {
          r: Math.max(0, Math.min(255, Math.round(r))),
          g: Math.max(0, Math.min(255, Math.round(g))),
          b: Math.max(0, Math.min(255, Math.round(b))),
          a: Math.max(0, Math.min(255, Math.round(a)))
        };

        if (startColor.r === newColor.r && startColor.g === newColor.g && startColor.b === newColor.b && startColor.a === newColor.a) {
          return _success({ modifiedCount: 0, rejectedCount: 0 }, { modifiedPixels: 0, rejectedPixels: [] });
        }

        const visited = new Uint8Array(fw * fh);
        const queue = [{ x: targetX, y: targetY }];
        visited[targetY * fw + targetX] = 1;

        const pixelsToFill = [];
        const rejected = [];

        while (queue.length > 0) {
          const pt = queue.shift();

          if (ref.frame.isPixelLocked && ref.frame.isPixelLocked(pt.x, pt.y)) {
            rejected.push({ x: pt.x, y: pt.y, reason: '像素位于锁定区域内' });
            continue;
          }

          pixelsToFill.push({ x: pt.x, y: pt.y, r: newColor.r, g: newColor.g, b: newColor.b, a: newColor.a });

          const neighbors = [
            { x: pt.x + 1, y: pt.y },
            { x: pt.x - 1, y: pt.y },
            { x: pt.x, y: pt.y + 1 },
            { x: pt.x, y: pt.y - 1 }
          ];

          for (const nb of neighbors) {
            if (nb.x >= 0 && nb.x < fw && nb.y >= 0 && nb.y < fh) {
              const idx = nb.y * fw + nb.x;
              if (!visited[idx]) {
                const col = layer.getPixel(ref.frameKey, nb.x, nb.y) || { r: 0, g: 0, b: 0, a: 0 };
                if (col.r === startColor.r && col.g === startColor.g && col.b === startColor.b && col.a === startColor.a) {
                  visited[idx] = 1;
                  queue.push(nb);
                }
              }
            }
          }
        }

        const res = _applyPixelsToLayer(layer, lRes.layerIndex, ref.frame, ref.frameKey, pixelsToFill, `API 油漆桶填充 (${targetX},${targetY})`);
        return _success(
          { modifiedCount: res.modifiedPixels, rejectedCount: res.rejectedPixels.length + rejected.length },
          { modifiedPixels: res.modifiedPixels, rejectedPixels: [...res.rejectedPixels, ...rejected] }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== SELECTION =====
    copyRegion(si, ai, fi, x, y, w, h) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const sx = Math.max(0, Math.round(x));
        const sy = Math.max(0, Math.round(y));
        const sw = Math.min(ref.frame.width - sx, Math.round(w));
        const sh = Math.min(ref.frame.height - sy, Math.round(h));

        if (sw <= 0 || sh <= 0) return _fail('选区范围无效或超出边界');

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        const d = compImgData.data;
        const fw = ref.frame.width;
        const pixels = [];

        for (let py = 0; py < sh; py++) {
          for (let px = 0; px < sw; px++) {
            const idx = ((sy + py) * fw + (sx + px)) * 4;
            pixels.push({
              relX: px,
              relY: py,
              r: d[idx],
              g: d[idx + 1],
              b: d[idx + 2],
              a: d[idx + 3]
            });
          }
        }

        _clipboard = {
          width: sw,
          height: sh,
          pixels
        };

        return _success({
          width: sw,
          height: sh,
          pixelCount: pixels.length
        });
      } catch (err) {
        return _fail(err);
      }
    },

    pasteRegion(layerIdx, si, ai, fi, x, y) {
      try {
        if (!_clipboard || !_clipboard.pixels) {
          return _fail('剪贴板为空，请先调用 copyRegion');
        }
        const destX = Math.round(x);
        const destY = Math.round(y);
        const pixels = _clipboard.pixels.map(p => ({
          x: destX + p.relX,
          y: destY + p.relY,
          r: p.r,
          g: p.g,
          b: p.b,
          a: p.a
        }));

        return this.setPixels(layerIdx, si, ai, fi, pixels);
      } catch (err) {
        return _fail(err);
      }
    },

    moveRegion(layerIdx, si, ai, fi, srcX, srcY, srcW, srcH, destX, destY) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const lRes = _resolveLayer(ref.project, layerIdx);
        const layer = lRes.layer;

        if (layer.locked || PE.isHandLayer(layer)) return _fail('图层已锁定');
        if (ref.frame.locked) return _fail('帧已锁定');

        const sx = Math.round(srcX);
        const sy = Math.round(srcY);
        const sw = Math.round(srcW);
        const sh = Math.round(srcH);
        const dx = Math.round(destX);
        const dy = Math.round(destY);

        if (sw <= 0 || sh <= 0) return _fail('源区域尺寸必须大于0');

        layer.ensureFrameData(ref.frameKey, ref.frame.width, ref.frame.height);

        // 收集源像素
        const copied = [];
        for (let py = 0; py < sh; py++) {
          for (let px = 0; px < sw; px++) {
            const curX = sx + px;
            const curY = sy + py;
            if (curX >= 0 && curX < ref.frame.width && curY >= 0 && curY < ref.frame.height) {
              const p = layer.getPixel(ref.frameKey, curX, curY) || { r: 0, g: 0, b: 0, a: 0 };
              copied.push({
                srcX: curX,
                srcY: curY,
                destX: dx + px,
                destY: dy + py,
                color: p
              });
            }
          }
        }

        const hist = _getHistory();
        if (hist) hist.beginBatch(`API 移动区域 [${sx},${sy}]->[${dx},${dy}]`);

        // 擦除原位置
        const erasePixels = copied.map(c => ({
          x: c.srcX,
          y: c.srcY,
          old: layer.getPixel(ref.frameKey, c.srcX, c.srcY) || { r: 0, g: 0, b: 0, a: 0 },
          newColor: { r: 0, g: 0, b: 0, a: 0 }
        }));

        for (const ep of erasePixels) {
          if (hist) hist.recordPixelChange(lRes.layerIndex, ref.frameKey, ep.x, ep.y, ep.old, ep.newColor);
          layer.setPixel(ref.frameKey, ep.x, ep.y, 0, 0, 0, 0);
        }

        // 写入新位置
        const pastePixels = [];
        const rejected = [];
        for (const cp of copied) {
          if (cp.destX < 0 || cp.destX >= ref.frame.width || cp.destY < 0 || cp.destY >= ref.frame.height) {
            rejected.push({ x: cp.destX, y: cp.destY, reason: '超出帧边界' });
            continue;
          }
          if (ref.frame.isPixelLocked && ref.frame.isPixelLocked(cp.destX, cp.destY)) {
            rejected.push({ x: cp.destX, y: cp.destY, reason: '目标像素被锁定' });
            continue;
          }
          const oldDest = layer.getPixel(ref.frameKey, cp.destX, cp.destY) || { r: 0, g: 0, b: 0, a: 0 };
          if (hist) hist.recordPixelChange(lRes.layerIndex, ref.frameKey, cp.destX, cp.destY, oldDest, cp.color);
          layer.setPixel(ref.frameKey, cp.destX, cp.destY, cp.color.r, cp.color.g, cp.color.b, cp.color.a);
          pastePixels.push(cp);
        }

        if (hist) hist.commitBatch();
        _notifyCanvasAndUI();

        return _success(
          { movedCount: pastePixels.length, rejectedCount: rejected.length },
          { modifiedPixels: pastePixels.length, rejectedPixels: rejected }
        );
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== DIFF & INSPECTION =====
    getFrameDiff(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (insp && typeof insp.getFrameDiff === 'function') {
          const diff = insp.getFrameDiff(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
          return _success(diff);
        }

        // 自行计算 diff
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');
        const currentData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        const orig = ref.frame.originalPixels;

        if (!orig || !currentData) {
          return _success({ changedPixels: 0, changes: [] });
        }

        const changes = [];
        const fw = ref.frame.width;
        const fh = ref.frame.height;
        const cData = currentData.data;
        const oData = orig.data;

        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const idx = (y * fw + x) * 4;
            if (
              cData[idx] !== oData[idx] ||
              cData[idx + 1] !== oData[idx + 1] ||
              cData[idx + 2] !== oData[idx + 2] ||
              cData[idx + 3] !== oData[idx + 3]
            ) {
              changes.push({
                x,
                y,
                original: { r: oData[idx], g: oData[idx + 1], b: oData[idx + 2], a: oData[idx + 3] },
                current: { r: cData[idx], g: cData[idx + 1], b: cData[idx + 2], a: cData[idx + 3] }
              });
            }
          }
        }

        return _success({
          changedPixels: changes.length,
          changes
        });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== HISTORY =====
    undo() {
      try {
        const hist = _getHistory();
        const p = _getProject();
        if (!hist || !p) return _fail('历史记录未初始化');
        if (!hist.canUndo()) return _fail('没有可撤销的操作');

        const entry = hist.undo(p);
        _notifyCanvasAndUI();
        return _success({
          description: (entry && entry.description) ? entry.description : '撤销操作',
          canUndo: hist.canUndo(),
          canRedo: hist.canRedo()
        });
      } catch (err) {
        return _fail(err);
      }
    },

    redo() {
      try {
        const hist = _getHistory();
        const p = _getProject();
        if (!hist || !p) return _fail('历史记录未初始化');
        if (!hist.canRedo()) return _fail('没有可重做的操作');

        const entry = hist.redo(p);
        _notifyCanvasAndUI();
        return _success({
          description: (entry && entry.description) ? entry.description : '重做操作',
          canUndo: hist.canUndo(),
          canRedo: hist.canRedo()
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getHistory() {
      try {
        const hist = _getHistory();
        if (!hist) return _fail('历史记录未初始化');
        const list = hist.getHistory ? hist.getHistory() : [];
        return _success(list);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== LOCKING =====
    lockFrame(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        ref.frame.locked = true;
        _notifyCanvasAndUI();
        return _success({ locked: true });
      } catch (err) {
        return _fail(err);
      }
    },

    unlockFrame(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        ref.frame.locked = false;
        _notifyCanvasAndUI();
        return _success({ locked: false });
      } catch (err) {
        return _fail(err);
      }
    },

    lockRegion(si, ai, fi, x, y, w, h) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const rx = Math.round(x);
        const ry = Math.round(y);
        const rw = Math.round(w);
        const rh = Math.round(h);
        if (rw <= 0 || rh <= 0) return _fail('锁定区域宽高必须大于0');

        ref.frame.lockedRegions = ref.frame.lockedRegions || [];
        const region = { x: rx, y: ry, w: rw, h: rh };
        ref.frame.lockedRegions.push(region);
        _notifyCanvasAndUI();
        return _success({ lockedRegions: ref.frame.lockedRegions });
      } catch (err) {
        return _fail(err);
      }
    },

    unlockRegion(si, ai, fi, x, y, w, h) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        ref.frame.lockedRegions = ref.frame.lockedRegions || [];
        const rx = Math.round(x);
        const ry = Math.round(y);
        const rw = Math.round(w);
        const rh = Math.round(h);

        const beforeLen = ref.frame.lockedRegions.length;
        ref.frame.lockedRegions = ref.frame.lockedRegions.filter(
          r => !(r.x === rx && r.y === ry && r.w === rw && r.h === rh)
        );
        const removed = beforeLen !== ref.frame.lockedRegions.length;
        _notifyCanvasAndUI();
        return _success({ removed, remainingRegions: ref.frame.lockedRegions });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== FRAME STATUS =====
    setFrameStatus(si, ai, fi, status, notes) {
      try {
        const validStatuses = ['pending', 'confirmed', 'needs-fix'];
        if (!validStatuses.includes(status)) {
          return _fail(`状态值无效: "${status}"，可选: ${validStatuses.join(', ')}`);
        }
        const ref = _resolveFrame(si, ai, fi);
        ref.frame.status = status;
        if (notes !== undefined && notes !== null) {
          ref.frame.notes = String(notes);
        }
        _notifyCanvasAndUI();
        return _success({ status: ref.frame.status, notes: ref.frame.notes || '' });
      } catch (err) {
        return _fail(err);
      }
    },

    getFrameStatus(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        return _success({
          status: ref.frame.status || 'pending',
          notes: ref.frame.notes || ''
        });
      } catch (err) {
        return _fail(err);
      }
    },

    getAllFrameStatuses() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const results = [];
        (p.spriteSheets || []).forEach((sheet, si) => {
          (sheet.actions || []).forEach((action, ai) => {
            (action.frames || []).forEach((frame, fi) => {
              results.push({
                sheetIndex: si,
                actionIndex: ai,
                frameIndex: fi,
                sheetName: sheet.name,
                actionName: action.name,
                status: frame.status || 'pending',
                notes: frame.notes || ''
              });
            });
          });
        });
        return _success(results);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== NAVIGATION =====
    selectFrame(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        ref.project.selectFrame(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        _notifyCanvasAndUI();
        return _success({
          sheetIndex: ref.sheetIndex,
          actionIndex: ref.actionIndex,
          frameIndex: ref.frameIndex
        });
      } catch (err) {
        return _fail(err);
      }
    },

    selectSheet(si) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const sIdx = Number(si);
        if (!p.spriteSheets || sIdx < 0 || sIdx >= p.spriteSheets.length) {
          return _fail(`素材表索引无效: ${sIdx}`);
        }
        p.currentSheetIndex = sIdx;
        p.currentActionIndex = 0;
        p.currentFrameIndex = 0;
        if (p.selectFrame) {
          p.selectFrame(sIdx, 0, 0);
        }
        _notifyCanvasAndUI();
        return _success({ sheetIndex: sIdx });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== PALETTE =====
    addColor(r, g, b, a = 255, name = '') {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        p.palette = p.palette || [];
        const newColor = {
          r: Math.max(0, Math.min(255, Math.round(r))),
          g: Math.max(0, Math.min(255, Math.round(g))),
          b: Math.max(0, Math.min(255, Math.round(b))),
          a: Math.max(0, Math.min(255, Math.round(a))),
          name: String(name || '')
        };
        p.palette.push(newColor);
        if (window.PE && window.PE.app && typeof window.PE.app.updatePalette === 'function') {
          window.PE.app.updatePalette();
        }
        return _success({ index: p.palette.length - 1, color: newColor });
      } catch (err) {
        return _fail(err);
      }
    },

    removeColor(index) {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        p.palette = p.palette || [];
        const idx = Number(index);
        if (idx < 0 || idx >= p.palette.length) {
          return _fail(`调色板索引无效: ${idx}`);
        }
        const removed = p.palette.splice(idx, 1)[0];
        if (window.PE && window.PE.app && typeof window.PE.app.updatePalette === 'function') {
          window.PE.app.updatePalette();
        }
        return _success({ removedColor: removed, remainingCount: p.palette.length });
      } catch (err) {
        return _fail(err);
      }
    },

    getPaletteColors() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const list = (p.palette || []).map((c, idx) => ({
          index: idx,
          r: c.r,
          g: c.g,
          b: c.b,
          a: c.a !== undefined ? c.a : 255,
          name: c.name || ''
        }));
        return _success(list);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== EXPORT =====
    async exportFrame(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const exp = _getExport();
        if (!exp) return _fail('导出管理器未初始化');
        await exp.exportFrame(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        return _success({ exported: true, frame: `${ref.sheetIndex}_${ref.actionIndex}_${ref.frameIndex}` });
      } catch (err) {
        return _fail(err);
      }
    },

    async exportSpriteSheet(si) {
      try {
        const p = _getProject();
        const sIdx = (si !== undefined && si !== null) ? Number(si) : p.currentSheetIndex;
        const exp = _getExport();
        if (!exp) return _fail('导出管理器未初始化');
        await exp.exportSpriteSheet(sIdx);
        return _success({ exported: true, sheetIndex: sIdx });
      } catch (err) {
        return _fail(err);
      }
    },

    async exportAllAsZip() {
      try {
        const exp = _getExport();
        if (!exp) return _fail('导出管理器未初始化');
        await exp.exportAllAsZip();
        return _success({ exported: true });
      } catch (err) {
        return _fail(err);
      }
    },

    async exportProject() {
      try {
        const exp = _getExport();
        if (!exp) return _fail('导出管理器未初始化');
        await exp.exportProject();
        return _success({ exported: true });
      } catch (err) {
        return _fail(err);
      }
    },

    getFrameDataURL(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const cm = _getCanvasManager();
        if (!cm) return _fail('画布管理器未初始化');

        const compImgData = cm.getCompositeImageData(ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        if (!compImgData) return _fail('无法获取复合图像');

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ref.frame.width;
        tempCanvas.height = ref.frame.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.putImageData(compImgData, 0, 0);

        return _success({ dataURL: tempCanvas.toDataURL('image/png') });
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== VALIDATION =====
    validateFrame(si, ai, fi) {
      try {
        const ref = _resolveFrame(si, ai, fi);
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');
        const res = insp.validateFrame(ref.project, ref.sheetIndex, ref.actionIndex, ref.frameIndex);
        return _success(res);
      } catch (err) {
        return _fail(err);
      }
    },

    validateAll() {
      try {
        const p = _getProject();
        if (!p) return _fail('项目未初始化');
        const insp = _getInspection();
        if (!insp) return _fail('检查管理器未初始化');
        const res = insp.validateAll(p);
        return _success(res);
      } catch (err) {
        return _fail(err);
      }
    },

    // ===== HELP =====
    help(methodName) {
      const docs = {
        getProjectInfo: 'getProjectInfo() -> 获取项目基本信息 (名称、素材表数、图层数、调色板等)',
        getSheetInfo: 'getSheetInfo(sheetIndex) -> 获取素材表配置与动作帧总数',
        getActions: 'getActions(sheetIndex) -> 获取指定素材表下的动作列表及帧数',
        getFrameInfo: 'getFrameInfo(si, ai, fi) -> 获取帧尺寸、锁定状态、区域及审核状态',
        getLayers: 'getLayers() -> 获取图层列表 (名称、可见性、锁定、透明度)',
        getPalette: 'getPalette() -> 获取全局调色板颜色列表',
        getLockedRegions: 'getLockedRegions(si, ai, fi) -> 获取帧的全部锁定保护区域',
        getPixel: 'getPixel(si, ai, fi, x, y) -> 获取复合画布上指定坐标的 RGBA 像素',
        getPixels: 'getPixels(si, ai, fi, x, y, w, h) -> 获取指定矩形区域的二维 RGBA 像素数组',
        getFramePixels: 'getFramePixels(si, ai, fi) -> 获取帧内所有非透明像素扁平数组 [{x,y,r,g,b,a}]',
        getFrameRawRGBA: 'getFrameRawRGBA(si, ai, fi) -> 获取原始 Uint8ClampedArray 复合缓冲区',
        getLayerPixel: 'getLayerPixel(layerIdx, si, ai, fi, x, y) -> 读取单个图层的像素',
        getFramePreview: 'getFramePreview(si, ai, fi, scale=1) -> 生成帧预览 DataURL',
        getActionPreview: 'getActionPreview(si, ai, scale=1) -> 生成整个动作的 Contact Sheet 预览图',
        getAdjacentFramesPreview: 'getAdjacentFramesPreview(si, ai, fi, scale=1) -> 获取前后相邻三帧对比图',
        getRegionPreview: 'getRegionPreview(si, ai, fi, x, y, w, h, scale=1) -> 获取局部区域预览 DataURL',
        getDirectionSheet: 'getDirectionSheet(si, fi, scale=1) -> 获取同帧索引在各朝向上的对比排版图',
        getComparisonPreview: 'getComparisonPreview(si, ai, fi, scale=1) -> 获取原图与当前修改对照图',
        addLayer: 'addLayer(name) -> 添加新图层并激活',
        removeLayer: 'removeLayer(index) -> 删除指定索引的图层 (至少保留1层)',
        selectLayer: 'selectLayer(index) -> 切换当前工作图层',
        setLayerVisibility: 'setLayerVisibility(index, visible) -> 设置图层可见性',
        setLayerLocked: 'setLayerLocked(index, locked) -> 设置图层锁定状态',
        setLayerOpacity: 'setLayerOpacity(index, opacity) -> 设置图层不透明度 (0.0 - 1.0)',
        reorderLayers: 'reorderLayers(fromIndex, toIndex) -> 调整图层堆叠顺序',
        setPixels: 'setPixels(layerIdx, si, ai, fi, pixels) -> 批量设置像素 [{x,y,r,g,b,a}]',
        drawLine: 'drawLine(layerIdx, si, ai, fi, x1, y1, x2, y2, r, g, b, a) -> 使用 Bresenham 算法绘制线条',
        drawRect: 'drawRect(layerIdx, si, ai, fi, x, y, w, h, r, g, b, a, filled) -> 绘制实心或空心矩形',
        erasePixels: 'erasePixels(layerIdx, si, ai, fi, pixels) -> 批量擦除指定坐标的像素 [{x,y}]',
        eraseRect: 'eraseRect(layerIdx, si, ai, fi, x, y, w, h) -> 擦除矩形区域内所有像素',
        fillArea: 'fillArea(layerIdx, si, ai, fi, x, y, r, g, b, a) -> 泛洪填充同色连续区域 (油漆桶)',
        copyRegion: 'copyRegion(si, ai, fi, x, y, w, h) -> 复制复合画布选区到内部剪贴板',
        pasteRegion: 'pasteRegion(layerIdx, si, ai, fi, x, y) -> 将剪贴板像素粘贴到指定图层',
        moveRegion: 'moveRegion(layerIdx, si, ai, fi, srcX, srcY, srcW, srcH, destX, destY) -> 移动图层上的局部像素',
        getFrameDiff: 'getFrameDiff(si, ai, fi) -> 对比当前帧与原始帧的差异像素列表',
        undo: 'undo() -> 撤销上一批次编辑操作',
        redo: 'redo() -> 重做上一次撤销的操作',
        getHistory: 'getHistory() -> 获取撤销/重做操作历史栈',
        lockFrame: 'lockFrame(si, ai, fi) -> 全局锁定此帧，禁止任何编辑',
        unlockFrame: 'unlockFrame(si, ai, fi) -> 解除帧锁定',
        lockRegion: 'lockRegion(si, ai, fi, x, y, w, h) -> 锁定局部区域，禁止编辑被保护的像素',
        unlockRegion: 'unlockRegion(si, ai, fi, x, y, w, h) -> 解除局部区域锁定',
        setFrameStatus: 'setFrameStatus(si, ai, fi, status, notes) -> 设置帧审核状态 (pending/confirmed/needs-fix)',
        getFrameStatus: 'getFrameStatus(si, ai, fi) -> 获取帧审核状态及备注说明',
        getAllFrameStatuses: 'getAllFrameStatuses() -> 遍历获取所有帧的状态清单',
        selectFrame: 'selectFrame(si, ai, fi) -> 在主编辑界面激活指定帧',
        selectSheet: 'selectSheet(si) -> 切换当前素材表',
        addColor: 'addColor(r, g, b, a, name) -> 添加新颜色到调色板',
        removeColor: 'removeColor(index) -> 从调色板移除颜色',
        getPaletteColors: 'getPaletteColors() -> 获取当前所有调色板颜色',
        exportFrame: 'exportFrame(si, ai, fi) -> 下载导出当前帧 PNG 图像',
        exportSpriteSheet: 'exportSpriteSheet(si) -> 下载导出整个素材表大图 PNG',
        exportAllAsZip: 'exportAllAsZip() -> 将全部帧打包为 ZIP 文件下载',
        exportProject: 'exportProject() -> 导出项目 JSON 工程文件',
        getFrameDataURL: 'getFrameDataURL(si, ai, fi) -> 获取复合帧的 Base64 PNG DataURL',
        validateFrame: 'validateFrame(si, ai, fi) -> 针对该帧执行尺寸、空白、锁定区与色板校验',
        validateAll: 'validateAll() -> 执行全项目所有帧的完整质量校验',
        help: 'help(methodName) -> 获取 API 帮助信息'
      };

      if (methodName && docs[methodName]) {
        return docs[methodName];
      }

      let summary = '=== 像素画编辑 Agent API (window.pixelAPI) ===\n统一返回格式: { success: boolean, data: any, error?: string, modifiedPixels?: number, rejectedPixels?: Array }\n\n可用方法列表:\n';
      for (const [name, desc] of Object.entries(docs)) {
        summary += ` - ${desc}\n`;
      }
      return summary;
    }
  };

  window.pixelAPI = pixelAPI;
  window.PE.pixelAPI = pixelAPI;
})();
