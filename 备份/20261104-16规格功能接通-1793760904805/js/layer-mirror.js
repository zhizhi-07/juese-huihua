window.PE = window.PE || {};

// 图层镜像：一次性镜像（整层翻转 / 以中线半边镜像）与“边画边镜像”的实时镜像。
// 中线默认取画布正中；选自定义时在画布上拖动参考线即可固定位置。
(() => {
  'use strict';

  const DIRECTIONS = ['horizontal', 'vertical'];
  const MODES = ['flip', 'forward', 'backward'];

  // 一次性镜像对话框临时打开的自定义中线（不写回图层）
  const runtime = { dialog: null };

  function mirrorStateOf(layer) {
    if (!layer) return null;
    if (!layer.mirror || typeof layer.mirror !== 'object') {
      layer.mirror = { enabled: false, direction: 'horizontal', axis: 'frame' };
    }
    if (layer.mirror.direction !== 'vertical') layer.mirror.direction = 'horizontal';
    if (typeof layer.mirror.axis !== 'number') layer.mirror.axis = layer.mirror.axis === 'content' ? 'content' : 'frame';
    layer.mirror.enabled = layer.mirror.enabled === true;
    return layer.mirror;
  }

  function lineOf(state, frame) {
    const horizontal = state.direction !== 'vertical';
    if (typeof state.axis === 'number' && Number.isFinite(state.axis)) return state.axis;
    return horizontal ? frame.width / 2 : frame.height / 2;
  }

  // 当前画布上应显示的镜像参考线。中线默认画布正中，可拖动改位置。
  function guide(project) {
    const layer = project?.getCurrentLayer?.();
    const frame = project?.getCurrentFrame?.();
    if (!frame || !layer) return null;
    if (runtime.dialog) {
      return { direction: runtime.dialog.direction, axis: runtime.dialog.axis, draggable: true, live: false, centered: false };
    }
    const state = mirrorStateOf(layer);
    if (!state.enabled) return null;
    return {
      direction: state.direction,
      axis: lineOf(state, frame),
      draggable: true,
      live: true,
      centered: state.axis === 'frame',
      layer
    };
  }

  function setGuideAxis(project, axis) {
    if (runtime.dialog) {
      runtime.dialog.axis = axis;
      return;
    }
    const layer = project?.getCurrentLayer?.();
    if (!layer) return;
    mirrorStateOf(layer).axis = axis;
  }

  function normalizeOptions(options) {
    const o = options && typeof options === 'object' ? options : {};
    return {
      direction: DIRECTIONS.includes(o.direction) ? o.direction : 'horizontal',
      mode: MODES.includes(o.mode) ? o.mode : 'flip',
      axis: typeof o.axis === 'number' && Number.isFinite(o.axis) ? o.axis : (o.axis === 'content' ? 'content' : 'frame'),
      scope: o.scope === 'action' ? 'action' : 'frame'
    };
  }

  function boundsOf(data) {
    const w = data.width, h = data.height;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!data.data[(y * w + x) * 4 + 3]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return maxX < 0 ? null : { minX, minY, maxX, maxY };
  }

  function flipPixels(source, horizontal) {
    const w = source.width, h = source.height;
    const out = new ImageData(w, h);
    const src = source.data, dst = out.data;
    for (let y = 0; y < h; y++) {
      const sy = horizontal ? y : h - 1 - y;
      for (let x = 0; x < w; x++) {
        const sx = horizontal ? w - 1 - x : x;
        const si = (sy * w + sx) * 4, di = (y * w + x) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    return out;
  }

  function mirrorHalf(source, horizontal, line, toFarSide) {
    const w = source.width, h = source.height;
    const out = new ImageData(new Uint8ClampedArray(source.data), w, h);
    const src = source.data, dst = out.data;
    const length = horizontal ? w : h;
    const span = horizontal ? h : w;
    for (let i = 0; i < length; i++) {
      if (toFarSide ? i < Math.ceil(line) : i >= Math.floor(line)) continue;
      const from = Math.round(2 * line - 1 - i);
      if (from < 0 || from >= length) continue;
      for (let j = 0; j < span; j++) {
        const si = horizontal ? (j * w + from) * 4 : (from * w + j) * 4;
        const di = horizontal ? (j * w + i) * 4 : (i * w + j) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    return out;
  }

  // 高清图片的半边镜像：中线吸附到源图像素边界，只做整列 / 整行搬运，尺寸不变、不重采样。
  function mirrorPlacementHalf(source, placement, line, horizontal, toFarSide) {
    const scale = horizontal ? source.width / placement.w : source.height / placement.h;
    const axis = Math.round((line - (horizontal ? placement.x : placement.y)) * scale);
    const length = horizontal ? source.width : source.height;
    if (!(axis > 0 && axis < length)) throw new Error('中线不在图片范围内，无法半边镜像；请把洋红参考线拖到图片上');
    const w = source.width, h = source.height;
    const out = new ImageData(new Uint8ClampedArray(source.data), w, h);
    const src = source.data, dst = out.data;
    for (let i = 0; i < length; i++) {
      if (toFarSide ? i < axis : i >= axis) continue;
      const from = 2 * axis - 1 - i;
      if (from < 0 || from >= length) continue;
      const span = horizontal ? h : w;
      for (let j = 0; j < span; j++) {
        const si = horizontal ? (j * w + from) * 4 : (from * w + j) * 4;
        const di = horizontal ? (j * w + i) * 4 : (i * w + j) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    out.placement = { ...placement };
    out.mirrorNote = `已按源图第 ${axis} 像素为中线的半边镜像（图片尺寸不变、无重采样）`;
    return out;
  }

  function mirrorImage(source, frame, options) {
    const horizontal = options.direction === 'horizontal';
    const frameLine = horizontal ? frame.width / 2 : frame.height / 2;
    const placement = source.placement;

    if (placement) {
      const contentLine = horizontal ? placement.x + placement.w / 2 : placement.y + placement.h / 2;
      const line = options.axis === 'content' ? contentLine : options.axis === 'frame' ? frameLine : options.axis;
      if (options.mode !== 'flip') return mirrorPlacementHalf(source, placement, line, horizontal, options.mode === 'forward');
      const out = flipPixels(source, horizontal);
      out.placement = horizontal
        ? { ...placement, x: 2 * line - (placement.x + placement.w) }
        : { ...placement, y: 2 * line - (placement.y + placement.h) };
      PE.utils.validateImagePlacement(out.placement, frame);
      return out;
    }

    const bounds = boundsOf(source);
    const contentLine = bounds ? (horizontal ? (bounds.minX + bounds.maxX + 1) / 2 : (bounds.minY + bounds.maxY + 1) / 2) : frameLine;
    const line = options.axis === 'content' ? contentLine : options.axis === 'frame' ? frameLine : options.axis;

    if (options.mode === 'flip') return flipPixels(source, horizontal);
    return mirrorHalf(source, horizontal, line, options.mode === 'forward');
  }

  // 实时镜像：把一笔画下的像素按当前图层中线补上镜像副本。
  function expandStroke(project, pixels) {
    if (!pixels || !pixels.length || !project) return pixels;
    const layer = project.getCurrentLayer?.();
    const state = layer?.mirror;
    if (!state?.enabled) return pixels;
    const frame = project.getCurrentFrame?.();
    if (!frame) return pixels;
    const horizontal = state.direction !== 'vertical';
    const line = lineOf(state, frame);
    const w = frame.width, h = frame.height;
    const seen = new Set(pixels.map(p => `${p.x}_${p.y}`));
    const out = pixels.slice();
    for (const p of pixels) {
      const x = horizontal ? Math.round(2 * line - 1 - p.x) : p.x;
      const y = horizontal ? p.y : Math.round(2 * line - 1 - p.y);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const key = `${x}_${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...p, x, y });
    }
    return out;
  }

  function samePixels(a, b) {
    if (a === b) return true;
    if (a.width !== b.width || a.height !== b.height) return false;
    const pa = a.placement, pb = b.placement;
    if (!!pa !== !!pb) return false;
    if (pa && (pa.x !== pb.x || pa.y !== pb.y || pa.w !== pb.w || pa.h !== pb.h)) return false;
    const da = a.data, db = b.data;
    for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) return false;
    return true;
  }

  function countPixels(data) {
    let n = 0;
    for (let i = 3; i < data.data.length; i += 4) if (data.data[i]) n++;
    return n;
  }

  function hasPixels(data) {
    return !!data && data.data.some((value, index) => index % 4 === 3 && value);
  }

  function resolve(app, layerIndex, actionIndex) {
    const project = app && app.project;
    if (!project || !project.spriteSheets?.length) throw new Error('请先打开工程');
    const sheetIndex = project.currentSheetIndex;
    const action = project.spriteSheets[sheetIndex]?.actions?.[actionIndex];
    const layer = project.layers[layerIndex];
    if (!action || !layer) throw new Error('请先选择有效图层与朝向');
    if (layer.isGroup) throw new Error('这里是图层分组，请选择组里的具体图层');
    if (layer.locked || layer.inheritedBase) throw new Error('当前图层已锁定或属于跟随底稿，不能镜像');
    if (PE.isHandLayer(layer)) throw new Error('手部参考层受保护，不能镜像');
    if (layer.sheetIndex !== undefined && layer.sheetIndex !== sheetIndex) throw new Error('当前图层不属于这个素材表');
    return { project, sheetIndex, action, layer, layerIndex };
  }

  function plan(app, options) {
    const o = normalizeOptions(options);
    if (app.toolManager?.isDrawing) throw new Error('请先结束当前绘画或拖动');
    const p = app.project;
    const layerIndex = Number.isSafeInteger(options?.layerIndex) ? options.layerIndex : p.currentLayerIndex;
    const actionIndex = Number.isSafeInteger(options?.actionIndex) ? options.actionIndex : p.currentActionIndex;
    const base = resolve(app, layerIndex, actionIndex);
    const frameIndexes = o.scope === 'action'
      ? base.action.frames.map((_, index) => index)
      : [Number.isSafeInteger(options?.frameIndex) ? options.frameIndex : p.currentFrameIndex];

    const edits = [];
    const notes = [];
    for (const frameIndex of frameIndexes) {
      const frame = base.action.frames[frameIndex];
      if (!frame) continue;
      const frameKey = `${base.sheetIndex}_${actionIndex}_${frameIndex}`;
      const before = base.layer.getFrameData(frameKey);
      if (!hasPixels(before)) continue;
      if (frame.locked || frame.lockedRegions?.length) throw new Error(`第 ${frameIndex + 1} 帧已锁定或含保护区域，不能镜像`);
      const after = mirrorImage(before, frame, o);
      if (after.mirrorNote && !notes.includes(after.mirrorNote)) notes.push(after.mirrorNote);
      if (samePixels(before, after)) continue;
      if (after.placement && PE.utils.imagePlacementLocked(after.placement, frame)) throw new Error(`第 ${frameIndex + 1} 帧的镜像结果超出保护区域`);
      edits.push({ frameIndex, frameKey, before, after, modified: countPixels(after) });
    }

    if (!edits.length) {
      throw new Error(o.scope === 'action' ? '当前图层在这个朝向没有可镜像的内容' : '当前图层在这一帧还没有内容');
    }
    return { ...base, edits, options: o, notes };
  }

  function record(app, description, undo, redo) {
    if (PE.FrameEditing && typeof PE.FrameEditing.record === 'function') {
      PE.FrameEditing.record(app, description, undo, redo);
      return;
    }
    const run = fn => {
      app.animationPlayer?.pause?.();
      fn();
      app.toolManager?.clearSelection?.();
      app.updateAll?.();
      app.canvasManager?.render?.();
      app.persistence?.markDirty?.();
    };
    run(redo);
    app.history.undoStack.push({ description, changes: [], undo: () => run(undo), redo: () => run(redo) });
    if (app.history.undoStack.length > app.history.maxSteps) app.history.undoStack.shift();
    app.history.redoStack = [];
    app.history._notifyChange();
  }

  function apply(app, prepared) {
    const layer = prepared.layer;
    const restore = side => {
      for (const edit of prepared.edits) layer.frameData.set(edit.frameKey, PE.utils.cloneImageData(edit[side]));
    };
    const label = { flip: '翻转', forward: '镜像复制', backward: '镜像复制' }[prepared.options.mode];
    const description = `镜像图层 · ${layer.name || '图层'} · ${label}`;
    record(app, description, () => restore('before'), () => restore('after'));
    return {
      layerIndex: prepared.layerIndex,
      layerName: layer.name || '图层',
      frameCount: prepared.edits.length,
      frames: prepared.edits.map(edit => edit.frameIndex),
      modifiedPixels: prepared.edits.reduce((total, edit) => total + edit.modified, 0)
    };
  }

  PE.LayerMirror = { plan, apply, mirrorImage, expandStroke, guide, setGuideAxis, mirrorStateOf };

  // 画笔侧接口：当前启用镜像的图层，笔触按镜像中线自动复制到另一侧。
  PE.Mirror = {
    strokeMode(layer) {
      const state = layer && layer.mirror;
      if (!state?.enabled) return null;
      return state.direction === 'vertical' ? 'y' : 'x';
    },
    lines(project, frame) {
      const fallback = { x: frame.width / 2, y: frame.height / 2 };
      const state = mirrorStateOf(project?.getCurrentLayer?.());
      if (!state?.enabled) return fallback;
      const horizontal = state.direction !== 'vertical';
      const line = lineOf(state, frame);
      return horizontal ? { x: line, y: fallback.y } : { x: fallback.x, y: line };
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    const button = document.getElementById('mirror-layer-btn');
    if (!app || !button) return;

    const liveButton = document.getElementById('mirror-live-btn');
    const canvas = document.getElementById('main-canvas');

    function currentLayer() {
      return app.project.getCurrentLayer();
    }

    function protectedLayer(layer) {
      return !layer || layer.locked || layer.inheritedBase || layer.isGroup || PE.isHandLayer(layer);
    }

    function syncLiveButton() {
      if (!liveButton) return;
      const state = mirrorStateOf(currentLayer());
      const on = !!state?.enabled;
      liveButton.classList.toggle('active', on);
      liveButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      liveButton.textContent = on ? '镜像绘制 开' : '镜像绘制';
    }

    if (liveButton) {
      liveButton.addEventListener('click', () => {
        const layer = currentLayer();
        if (!layer) return;
        if (protectedLayer(layer)) {
          alert('当前图层已锁定或受保护，不能开启镜像绘制');
          return;
        }
        const state = mirrorStateOf(layer);
        state.enabled = !state.enabled;
        syncLiveButton();
        app.canvasManager?.render();
      });
    }

    const paintLayerList = app.updateLayerList.bind(app);
    app.updateLayerList = () => {
      paintLayerList();
      syncLiveButton();
    };
    syncLiveButton();

    // 参考线拖动：靠近洋红参考线按下即拖动，双击回到画布正中
    const guideAt = event => {
      const g = guide(app.project);
      if (!g || !canvas || !app.canvasManager) return null;
      const point = app.canvasManager.screenToPixel(event.clientX, event.clientY, false);
      const zoom = app.canvasManager.zoom || 1;
      const distance = g.direction === 'vertical' ? Math.abs(point.y - g.axis) * zoom : Math.abs(point.x - g.axis) * zoom;
      return distance <= 8 ? g : null;
    };

    let dragging = false;

    window.addEventListener('mousedown', event => {
      if (event.button !== 0 || event.target !== canvas) return;
      const g = guideAt(event);
      if (!g) return;
      dragging = true;
      event.stopPropagation();
      event.preventDefault();
      canvas.style.cursor = g.direction === 'vertical' ? 'row-resize' : 'col-resize';
    }, true);

    window.addEventListener('mousemove', event => {
      if (!canvas || !app.canvasManager) return;
      if (dragging) {
        const frame = app.project.getCurrentFrame();
        const g = guide(app.project);
        if (!frame || !g) return;
        const point = app.canvasManager.screenToPixel(event.clientX, event.clientY, false);
        const horizontal = g.direction !== 'vertical';
        const limit = horizontal ? frame.width : frame.height;
        const axis = Math.max(0, Math.min(limit, Math.round((horizontal ? point.x : point.y) * 2) / 2));
        setGuideAxis(app.project, axis);
        if (runtime.dialog) {
          if (axisInput) axisInput.value = String(axis);
          review();
        }
        app.canvasManager.render();
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      if (event.target !== canvas) return;
      const near = guideAt(event);
      setTimeout(() => {
        if (!dragging) canvas.style.cursor = near ? (near.direction === 'vertical' ? 'row-resize' : 'col-resize') : '';
      }, 0);
    }, true);

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = '';
    }, true);

    canvas?.addEventListener('dblclick', event => {
      const g = guideAt(event);
      const layer = currentLayer();
      if (!g || !g.live || !layer) return;
      mirrorStateOf(layer).axis = 'frame';
      app.canvasManager?.render();
    });

    const dialog = document.createElement('dialog');
    dialog.className = 'advanced-dialog frame-copy-dialog';
    dialog.setAttribute('aria-label', '镜像图层');
    dialog.innerHTML = `<div class="dialog-title"><h2>镜像图层</h2><button type="button" data-close class="studio-button">关闭</button></div>
      <p data-source></p>
      <div class="frame-copy-fields">
        <label>方向 <select data-direction aria-label="镜像方向"><option value="horizontal">左右</option><option value="vertical">上下</option></select></label>
        <label>方式 <select data-mode aria-label="镜像方式"></select></label>
        <label>中线 <select data-axis aria-label="中线位置"><option value="frame">画布正中</option><option value="content">图层内容中线</option><option value="custom">自定义</option></select></label>
        <label data-custom>中线坐标 <input type="number" step="0.5" data-axis-value aria-label="自定义中线坐标"></label>
        <label>范围 <select data-scope aria-label="应用范围"><option value="frame">当前帧</option><option value="action">当前朝向全部帧</option></select></label>
        <label><input type="checkbox" data-live aria-label="边画边镜像"> 开启边画边镜像</label>
      </div>
      <p>中线默认画布正中；选“自定义”后直接在画布上拖动洋红色参考线即可定位置（双击参考线回到正中）。整层翻转把整个图层对折；左→右 / 右→左只写另一侧。开启边画边镜像后，在这一层上画一笔会自动在另一侧同步画出。高清图片图层只支持整层翻转。</p>
      <p data-summary aria-live="polite"></p>
      <button type="button" data-apply class="studio-button save-primary">镜像</button>`;
    document.body.append(dialog);

    const direction = dialog.querySelector('[data-direction]');
    const mode = dialog.querySelector('[data-mode]');
    const axis = dialog.querySelector('[data-axis]');
    const axisInput = dialog.querySelector('[data-axis-value]');
    const custom = dialog.querySelector('[data-custom]');
    const scope = dialog.querySelector('[data-scope]');
    const liveBox = dialog.querySelector('[data-live]');
    const source = dialog.querySelector('[data-source]');
    const summary = dialog.querySelector('[data-summary]');
    const applyButton = dialog.querySelector('[data-apply]');

    const MODE_LABELS = {
      horizontal: [['flip', '整层左右翻转'], ['forward', '左→右（保留左半）'], ['backward', '右→左（保留右半）']],
      vertical: [['flip', '整层上下翻转'], ['forward', '上→下（保留上半）'], ['backward', '下→上（保留下半）']]
    };

    function refreshModes() {
      const keep = mode.value;
      mode.replaceChildren();
      for (const [value, label] of MODE_LABELS[direction.value]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        mode.append(option);
      }
      mode.value = MODE_LABELS[direction.value].some(([value]) => value === keep) ? keep : 'flip';
    }

    function syncGuide() {
      if (axis.value !== 'custom') {
        runtime.dialog = null;
        app.canvasManager?.render();
        return;
      }
      const frame = app.project.getCurrentFrame();
      const fallback = direction.value === 'horizontal' ? (frame ? frame.width / 2 : 16) : (frame ? frame.height / 2 : 16);
      const value = Number(axisInput.value);
      runtime.dialog = { direction: direction.value, axis: Number.isFinite(value) ? value : fallback };
      app.canvasManager?.render();
    }

    function options() {
      return {
        layerIndex: app.project.currentLayerIndex,
        actionIndex: app.project.currentActionIndex,
        frameIndex: app.project.currentFrameIndex,
        direction: direction.value,
        mode: mode.value,
        axis: axis.value === 'custom' ? Number(axisInput.value) : axis.value,
        scope: scope.value
      };
    }

    function review() {
      custom.hidden = axis.value !== 'custom';
      if (axis.value === 'custom') {
        const frame = app.project.getCurrentFrame();
        const suggestion = direction.value === 'horizontal' ? (frame ? frame.width / 2 : 16) : (frame ? frame.height / 2 : 16);
        if (!axisInput.value) axisInput.value = String(suggestion);
        axisInput.max = String(direction.value === 'horizontal' ? (frame?.width ?? 999) : (frame?.height ?? 999));
      }
      try {
        const prepared = PE.LayerMirror.plan(app, options());
        const note = prepared.notes?.length ? ' ' + prepared.notes.join(' ') : '';
        summary.textContent = `将对“${prepared.layer.name || '图层'}”的 ${prepared.edits.length} 帧生效，共 ${prepared.edits.reduce((total, edit) => total + edit.modified, 0)} 个像素；可用 Ctrl+Z 一次撤销。${note}`;
        applyButton.disabled = false;
      } catch (error) {
        summary.textContent = error.message;
        applyButton.disabled = true;
      }
    }

    function open() {
      const layer = currentLayer();
      const frame = app.project.getCurrentFrame();
      if (!layer) return;
      source.textContent = `当前图层：${layer.name || '图层'} · 第 ${app.project.currentFrameIndex + 1} 帧${frame ? `（${frame.width} × ${frame.height}）` : ''}`;
      refreshModes();
      axis.value = 'frame';
      axisInput.value = '';
      scope.value = 'frame';
      liveBox.checked = !!mirrorStateOf(layer)?.enabled;
      runtime.dialog = null;
      review();
      dialog.showModal();
    }

    button.addEventListener('click', open);
    dialog.querySelector('[data-close]').onclick = () => {
      runtime.dialog = null;
      dialog.close();
      app.canvasManager?.render();
    };
    dialog.addEventListener('close', () => {
      runtime.dialog = null;
      app.canvasManager?.render();
    });
    direction.onchange = () => { refreshModes(); axisInput.value = ''; syncGuide(); review(); };
    mode.onchange = axis.onchange = scope.onchange = () => { syncGuide(); review(); };
    axisInput.oninput = () => { syncGuide(); review(); };
    liveBox.onchange = () => {
      const layer = currentLayer();
      if (!layer) return;
      if (!liveBox.checked) {
        mirrorStateOf(layer).enabled = false;
        syncLiveButton();
        app.canvasManager?.render();
        return;
      }
      if (protectedLayer(layer)) {
        liveBox.checked = false;
        summary.textContent = '当前图层已锁定或受保护，不能开启镜像绘制';
        return;
      }
      const state = mirrorStateOf(layer);
      state.enabled = true;
      state.direction = direction.value;
      state.axis = axis.value === 'custom' && Number.isFinite(Number(axisInput.value)) ? Number(axisInput.value) : 'frame';
      syncLiveButton();
      app.canvasManager?.render();
    };

    applyButton.onclick = () => {
      try {
        const result = PE.LayerMirror.apply(app, PE.LayerMirror.plan(app, options()));
        summary.textContent = `已镜像“${result.layerName}”：${result.frameCount} 帧、${result.modifiedPixels} 个像素，Ctrl+Z 可撤销。`;
      } catch (error) {
        summary.textContent = error.message;
      }
    };
  });
})();
