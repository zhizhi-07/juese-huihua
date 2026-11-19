/**
 * 图层调色：在「颜色」面板里给当前图层整体调整色相 / 饱和度 / 明度。
 * 拖滑条时即时预览；点「应用」才把像素写进图层并记入撤销栈，可 Ctrl+Z 撤回。
 */
window.PE = window.PE || {};

(() => {
  'use strict';

  const SCOPE_FRAME = 'frame';
  const SCOPE_ACTION = 'action';
  const SCOPE_LAYER = 'layer';
  const clamp01 = value => Math.max(0, Math.min(1, value));

  function rgbToHsl(r, g, b) {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    const hue = ((h % 1) + 1) % 1;
    const light = clamp01(l), sat = clamp01(s);
    if (sat <= 0) {
      const gray = Math.round(light * 255);
      return [gray, gray, gray];
    }
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    const channel = offset => {
      let t = (hue + offset) % 1;
      if (t < 0) t += 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [channel(1 / 3), channel(0), channel(-1 / 3)].map(value => Math.round(Math.max(0, Math.min(255, value * 255))));
  }

  /**
   * 按 HSL 整体调色一个 ImageData：色相是角度偏移，饱和度是百分比增减，明度是百分比偏移。
   * 透明像素保持透明，skip(x, y) 返回 true 的像素（锁定区域）不动。
   * @returns {number} 实际改动的像素数
   */
  function adjustPixels(image, options = {}) {
    const hue = Number(options.hue) || 0;
    const saturation = Number(options.saturation) || 0;
    const lightness = Number(options.lightness) || 0;
    const skip = typeof options.skip === 'function' ? options.skip : null;
    if (!image || !image.data || image.placement) return 0;
    if (!hue && !saturation && !lightness) return 0;

    const data = image.data;
    const width = image.width;
    const hueShift = hue / 360;
    const satScale = 1 + saturation / 100;
    const lightShift = lightness / 200;
    let changed = 0;

    for (let i = 0, index = 0; i < data.length; i += 4, index++) {
      if (!data[i + 3]) continue;
      if (skip && skip(index % width, Math.floor(index / width))) continue;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const rgb = hslToRgb(h + hueShift, clamp01(s * satScale), clamp01(l + lightShift));
      if (rgb[0] === data[i] && rgb[1] === data[i + 1] && rgb[2] === data[i + 2]) continue;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      changed += 1;
    }
    return changed;
  }

  /** 调色范围落到哪些帧：当前帧 / 当前动作 / 这一层全部帧。 */
  function targetKeys(project, layer, scope) {
    const si = project.currentSheetIndex;
    const ai = project.currentActionIndex;
    const frameKey = project.getFrameKey();
    const keys = [];
    for (const key of layer.frameData.keys()) {
      const [s, a] = key.split('_').map(Number);
      if (scope === SCOPE_FRAME && key !== frameKey) continue;
      if (scope === SCOPE_ACTION && (s !== si || a !== ai)) continue;
      keys.push(key);
    }
    return keys;
  }

  /** 这一层能不能逐像素调色；返回 {layer} 或 {error}。 */
  function editableLayer(project) {
    const layer = project.getCurrentLayer();
    if (!layer) return { error: '先选一个图层' };
    if (layer.isGroup) return { error: '组不能整体调色，请选组里的具体图层' };
    if (layer.locked) return { error: '图层已锁定，先解锁再调色' };
    if (layer.inheritedBase) return { error: '跟随主工程的头部、身体只读' };
    if (PE.isProtectedHandLayer && PE.isProtectedHandLayer(layer)) return { error: '手部参考层受保护' };
    return { layer };
  }

  const api = { rgbToHsl, hslToRgb, adjustPixels, targetKeys, editableLayer };
  PE.LayerColorAdjust = api;

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    const paintControls = document.querySelector('.paint-controls');
    if (app && paintControls) {
      const group = document.createElement('div');
      group.className = 'brush-color-adjust';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', '微调当前画笔颜色');
      let hsl;
      const setColor = app.setPrimaryColor.bind(app);
      const sliders = [];
      for (const [index, label, max] of [[2, '明暗', 100], [1, '鲜艳', 100], [0, '色相', 360]]) {
        const row = document.createElement('label');
        row.textContent = label;
        const slider = document.createElement('input');
        slider.type = 'range';slider.min = '0';slider.max = String(max);slider.step = '0.1';
        slider.setAttribute('aria-label', '画笔颜色' + label);
        const value = document.createElement('output');
        slider.oninput = () => {
          hsl[index] = Number(slider.value) / max;
          const [r, g, b] = hslToRgb(...hsl);
          setColor({ r, g, b, a: app.toolManager.primaryColor.a });
          update();
        };
        sliders.push({ slider, value, index, max });
        row.append(slider, value);group.append(row);
      }
      function update() {
        for (const { slider, value, index, max } of sliders) {
          slider.value = String(hsl[index] * max);
          value.textContent = Math.round(hsl[index] * max) + (index === 0 ? '°' : '%');
        }
      }
      app.setPrimaryColor = color => {
        setColor(color);
        hsl = rgbToHsl(color.r, color.g, color.b);
        update();
      };
      const color = app.toolManager.primaryColor;
      hsl = rgbToHsl(color.r, color.g, color.b);update();
      paintControls.after(group);
    }
    const root = document.getElementById('layer-hue-adjust');
    if (!app || !root) return;

    const byId = id => document.getElementById(id);
    const pairs = [
      ['hue-shift', 'hue-shift-number'],
      ['hue-saturation', 'hue-saturation-number'],
      ['hue-lightness', 'hue-lightness-number']
    ].map(([rangeId, numberId]) => ({ range: byId(rangeId), number: byId(numberId), min: Number(byId(rangeId)?.min), max: Number(byId(rangeId)?.max) }))
      .filter(pair => pair.range && pair.number);
    const scopeSelect = byId('hue-scope');
    const applyButton = byId('hue-apply-btn');
    const resetButton = byId('hue-reset-btn');
    const statusText = byId('hue-adjust-status');
    const targetText = byId('hue-adjust-target');

    let session = null;
    let pendingFrame = 0;

    const context = () => {
      const p = app.project;
      return [p.currentSheetIndex, p.currentActionIndex, p.currentFrameIndex, p.currentLayerIndex].join('|');
    };

    const readValues = () => ({
      hue: Number(byId('hue-shift')?.value) || 0,
      saturation: Number(byId('hue-saturation')?.value) || 0,
      lightness: Number(byId('hue-lightness')?.value) || 0
    });

    const isNeutral = values => !values.hue && !values.saturation && !values.lightness;

    function status(text, isError) {
      if (!statusText) return;
      statusText.textContent = text;
      statusText.classList.toggle('is-error', !!isError);
    }

    function resetSliders() {
      for (const pair of pairs) {
        pair.range.value = '0';
        pair.number.value = '0';
      }
    }

    function syncTarget() {
      if (!targetText) return;
      const layer = app.project.getCurrentLayer();
      targetText.textContent = layer ? (layer.name || '未命名图层') : '没有图层';
      targetText.title = targetText.textContent;
    }

    function paint(thumbs) {
      syncTarget();
      app.canvasManager?.render();
      app.animationPlayer?._renderPreviewFrame?.();
      if (thumbs) {
        app.updateFrameList?.();
        app.updatePalette?.();
      }
    }

    function schedulePaint(thumbs) {
      const useThumbs = !!thumbs;
      if (pendingFrame && !useThumbs) return;
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        paint(useThumbs);
      });
    }

    function resolveFrame(si, ai, fi) {
      return app.project.spriteSheets?.[si]?.actions?.[ai]?.frames?.[fi] || null;
    }

    /** 采集这次调色要写的帧，并留一份调色前的原始像素（预览与撤销都靠它）。 */
    function begin() {
      const found = editableLayer(app.project);
      if (found.error) {
        status(found.error, true);
        return null;
      }
      const layer = found.layer;
      const scope = scopeSelect?.value || SCOPE_FRAME;
      const items = [];
      let skipped = 0;
      for (const key of targetKeys(app.project, layer, scope)) {
        const image = layer.frameData.get(key);
        if (!image) continue;
        if (image.placement) { skipped += 1; continue; }
        const [si, ai, fi] = key.split('_').map(Number);
        const frame = resolveFrame(si, ai, fi);
        if (frame && frame.locked) { skipped += 1; continue; }
        items.push({ key, image, frame, before: PE.utils.cloneImageData(image) });
      }
      if (!items.length) {
        status(skipped ? '这些帧是高清图片或已锁定，不能直接调色' : '这个范围里这一层还没有像素', true);
        return null;
      }
      session = { layer, items, scope, context: context(), changed: 0 };
      return session;
    }

    function restore(items) {
      for (const item of items) item.image.data.set(item.before.data);
    }

    function preview() {
      const values = readValues();
      syncTarget();
      if (isNeutral(values)) {
        if (session) {
          restore(session.items);
          session = null;
          schedulePaint(true);
        }
        status('拖动滑条即时预览；点“应用”写入图层，可撤销。');
        return;
      }
      if (session && session.context !== context()) commit({ quiet: true, keepSliders: true });
      if (!session && !begin()) return;
      let changed = 0;
      for (const item of session.items) {
        item.image.data.set(item.before.data);
        changed += adjustPixels(item.image, {
          hue: values.hue,
          saturation: values.saturation,
          lightness: values.lightness,
          skip: item.frame ? (x, y) => item.frame.isPixelLocked(x, y) : null
        });
      }
      session.changed = changed;
      status(`预览中 · ${session.items.length} 帧 / ${changed} 像素（未应用）`);
      schedulePaint(false);
    }

    /**
     * 把预览写进撤销栈。
     * @returns {number} 实际写入的像素数
     */
    function commit(options = {}) {
      const current = session;
      if (!current) return 0;
      session = null;
      const layerIndex = app.project.layers.indexOf(current.layer);
      if (layerIndex < 0) {
        restore(current.items);
        return 0;
      }
      const history = app.history;
      let changed = 0;
      if (history) history.beginBatch('图层调色');
      for (const item of current.items) {
        const before = item.before;
        const after = item.image;
        if (before.width !== after.width || before.height !== after.height) continue;
        for (let i = 0; i < after.data.length; i += 4) {
          if (after.data[i] === before.data[i] && after.data[i + 1] === before.data[i + 1]
            && after.data[i + 2] === before.data[i + 2] && after.data[i + 3] === before.data[i + 3]) continue;
          const oldColor = { r: before.data[i], g: before.data[i + 1], b: before.data[i + 2], a: before.data[i + 3] };
          const newColor = { r: after.data[i], g: after.data[i + 1], b: after.data[i + 2], a: after.data[i + 3] };
          history?.recordPixelChange(layerIndex, item.key, (i / 4) % before.width, Math.floor(i / 4 / before.width), oldColor, newColor);
          changed += 1;
        }
      }
      const committed = history?.commitBatch();
      if (changed && history && !committed) {
        // 批次被别处提前结束时，兜底成整帧快照，保证这一次调色也能撤销。
        const before = current.items.map(item => ({ image: item.image, data: item.before.data }));
        const after = current.items.map(item => ({ image: item.image, data: new Uint8ClampedArray(item.image.data) }));
        const restoreSnapshot = snapshot => () => {
          for (const entry of snapshot) entry.image.data.set(entry.data);
          paint(true);
        };
        history.undoStack.push({
          description: '图层调色',
          timestamp: Date.now(),
          changes: [],
          undo: restoreSnapshot(before),
          redo: restoreSnapshot(after)
        });
        if (history.undoStack.length > history.maxSteps) history.undoStack.shift();
        history.redoStack = [];
        history._notifyChange?.();
      }
      if (changed) {
        app.persistence?.markDirty?.();
        if (!options.quiet) status(`已应用 · ${current.items.length} 帧 / ${changed} 像素（可 Ctrl+Z 撤销）`);
      } else if (!options.quiet) {
        status('颜色没有变化');
      }
      if (!options.keepSliders) resetSliders();
      if (!options.keepSliders) paint(true);
      return changed;
    }

    /** 丢弃预览，恢复调色前的像素。 */
    function cancel() {
      const current = session;
      session = null;
      resetSliders();
      if (current) {
        restore(current.items);
        paint(true);
        status('已复位到调色前');
      } else {
        status('拖动滑条即时预览；点“应用”写入图层，可撤销。');
      }
    }

    /** 切帧、切层、撤销前先把没应用的预览落下来，避免像素被悄悄改掉。 */
    function autoCommit() {
      if (session) commit({ quiet: true });
    }

    for (const pair of pairs) {
      const sync = (source, target) => {
        const value = Number(source.value);
        target.value = Number.isFinite(value) ? Math.max(pair.min, Math.min(pair.max, value)) : 0;
      };
      pair.range.addEventListener('input', () => {
        pair.number.value = pair.range.value;
        preview();
      });
      pair.range.addEventListener('change', () => schedulePaint(true));
      pair.number.addEventListener('input', () => {
        sync(pair.number, pair.range);
        preview();
      });
      pair.number.addEventListener('change', () => {
        sync(pair.number, pair.range);
        preview();
        schedulePaint(true);
      });
    }

    scopeSelect?.addEventListener('change', () => {
      autoCommit();
      const values = readValues();
      if (!isNeutral(values)) preview();
      else syncTarget();
    });

    applyButton?.addEventListener('click', () => {
      const values = readValues();
      if (isNeutral(values)) {
        status('先把色相或饱和度拖一下再应用');
        return;
      }
      if (!session) preview();
      commit();
    });

    resetButton?.addEventListener('click', () => cancel());

    // 折叠面板时把没应用的预览落下来，别让像素停在半路上。
    root.addEventListener('toggle', () => {
      if (!root.open) autoCommit();
    });

    for (const name of ['selectFrame', 'selectAction', 'selectSheet']) {
      const original = app[name];
      if (typeof original !== 'function') continue;
      app[name] = function (...args) {
        autoCommit();
        return original.apply(this, args);
      };
    }

    const history = app.history;
    if (history) {
      for (const name of ['undo', 'redo']) {
        const original = history[name];
        if (typeof original !== 'function') continue;
        history[name] = function (...args) {
          autoCommit();
          return original.apply(this, args);
        };
      }
    }

    const updateLayerList = app.updateLayerList;
    if (typeof updateLayerList === 'function') {
      app.updateLayerList = function (...args) {
        const result = updateLayerList.apply(this, args);
        syncTarget();
        return result;
      };
    }

    document.addEventListener('pointerdown', event => {
      if (!session) return;
      if (root.contains(event.target)) return;
      autoCommit();
    }, true);

    window.addEventListener('beforeunload', autoCommit);
    syncTarget();
  });
})();
