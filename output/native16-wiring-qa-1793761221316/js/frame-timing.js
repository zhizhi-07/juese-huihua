/* Per-frame timing and frame ordering for the timeline strip.
   frame.duration = 毫秒；0 表示跟随素材表 fps。sheet.useFrameDurations === false 时整张表强制用 fps。 */
window.PE = window.PE || {};

(() => {
  'use strict';

  const MIN_MS = 10;
  const MAX_MS = 10000;

  const clampMs = value => Math.max(MIN_MS, Math.min(MAX_MS, Math.round(Number(value) || 0)));
  const sheetFps = sheet => Math.max(1, Math.min(60, Number(sheet?.fps) || 8));
  const usesPerFrameTiming = sheet => sheet?.useFrameDurations !== false;

  function effectiveDelay(sheet, frame) {
    if (usesPerFrameTiming(sheet) && frame?.duration) return clampMs(frame.duration);
    return Math.round(1000 / sheetFps(sheet));
  }

  function frameKeyOf(project, si, ai, fi) {
    return typeof project.getFrameKey === 'function' ? project.getFrameKey(si, ai, fi) : `${si}_${ai}_${fi}`;
  }

  // 帧号写在图层键里，重排时必须整体搬移，否则画面会跟着错位。
  function remapLayerKeys(project, si, ai, from, to) {
    if (from === to) return;
    const remap = index => {
      if (index === from) return to;
      if (from < to && index > from && index <= to) return index - 1;
      if (from > to && index >= to && index < from) return index + 1;
      return index;
    };
    for (const layer of project.layers) {
      if (!(layer.frameData instanceof Map)) continue;
      const moved = [];
      for (const [key, data] of layer.frameData) {
        const parts = key.split('_');
        if (parts.length !== 3) continue;
        const [ks, ka, kf] = parts.map(Number);
        if (ks !== si || ka !== ai) continue;
        moved.push([kf, data]);
      }
      if (!moved.length) continue;
      for (const [kf] of moved) layer.frameData.delete(`${si}_${ai}_${kf}`);
      for (const [kf, data] of moved) layer.frameData.set(`${si}_${ai}_${remap(kf)}`, data);
    }
  }

  function moveFrame(app, delta) {
    const project = app.project;
    const sheet = project.getCurrentSheet();
    const action = project.getCurrentAction();
    if (!sheet || !action) return false;
    const from = project.currentFrameIndex;
    const to = from + delta;
    if (to < 0 || to >= action.frames.length) return false;

    app.animationPlayer?.pause();
    const [frame] = action.frames.splice(from, 1);
    action.frames.splice(to, 0, frame);
    remapLayerKeys(project, project.currentSheetIndex, project.currentActionIndex, from, to);
    project.currentFrameIndex = to;

    app.toolManager?.clearSelection?.();
    app.updateAll?.();
    app.canvasManager?.render();
    if (app.animationPlayer) {
      app.animationPlayer.setAction(project.currentSheetIndex, project.currentActionIndex);
      app.animationPlayer.currentFrame = to;
      app.animationPlayer._renderPreviewFrame?.();
    }
    app.persistence?.markDirty?.();
    return true;
  }

  function applyDuration(app, milliseconds, allFrames) {
    const project = app.project;
    const sheet = project.getCurrentSheet();
    const action = project.getCurrentAction();
    if (!sheet || !action) return false;
    const ms = clampMs(milliseconds);

    sheet.useFrameDurations = true;
    if (allFrames) {
      for (const frame of action.frames) frame.duration = ms;
    } else {
      const frame = project.getCurrentFrame();
      if (!frame) return false;
      frame.duration = ms;
    }
    app.persistence?.markDirty?.();
    app.animationPlayer?._renderPreviewFrame?.();
    return true;
  }

  function totalDuration(sheet, action) {
    if (!action?.frames?.length) return 0;
    return action.frames.reduce((sum, frame) => sum + effectiveDelay(sheet, frame), 0);
  }

  PE.frameTiming = { effectiveDelay, totalDuration, applyDuration, moveFrame, remapLayerKeys, clampMs };

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    if (!app || !app.project) return;
    const $ = id => document.getElementById(id);
    const node = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    };

    const strip = $('frame-strip-wrapper');
    const header = strip?.querySelector('.timeline-header');
    if (!header) return;

    const group = node('div', 'timeline-timing');
    const durationLabel = node('label', 'timing-field', '帧时长');
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = String(MIN_MS);
    durationInput.max = String(MAX_MS);
    durationInput.step = '10';
    durationInput.id = 'frame-duration-input';
    durationInput.setAttribute('aria-label', '当前帧时长（毫秒）');
    const unit = node('span', 'timing-unit', 'ms');
    durationLabel.append(durationInput, unit);

    const applyAll = node('button', 'timing-button', '全部帧');
    applyAll.type = 'button';
    applyAll.title = '把当前输入框的时长应用到本朝向的每一帧';

    const perFrameLabel = node('label', 'timing-toggle');
    const perFrameBox = document.createElement('input');
    perFrameBox.type = 'checkbox';
    perFrameBox.id = 'use-frame-durations';
    perFrameLabel.append(perFrameBox, node('span', '', '逐帧时长'));

    const total = node('span', 'timing-total', '');

    const moveBack = node('button', 'timing-button', '◀');
    moveBack.type = 'button';
    moveBack.title = '当前帧前移一位';
    const moveForward = node('button', 'timing-button', '▶');
    moveForward.type = 'button';
    moveForward.title = '当前帧后移一位';

    group.append(durationLabel, applyAll, perFrameLabel, total, moveBack, moveForward);
    const hint = header.querySelector('.timeline-hint');
    if (hint) header.insertBefore(group, hint);
    else header.append(group);

    function refresh() {
      const project = app.project;
      const sheet = project.getCurrentSheet();
      const action = project.getCurrentAction();
      const frame = project.getCurrentFrame();
      const enabled = Boolean(sheet && action && frame);

      durationInput.disabled = !enabled;
      applyAll.disabled = !enabled;
      perFrameBox.disabled = !enabled;
      moveBack.disabled = !enabled || project.currentFrameIndex <= 0;
      moveForward.disabled = !enabled || project.currentFrameIndex >= (action?.frames.length || 1) - 1;

      if (!enabled) {
        durationInput.value = '';
        total.textContent = '';
        return;
      }

      durationInput.value = String(effectiveDelay(sheet, frame));
      perFrameBox.checked = usesPerFrameTiming(sheet);
      const sum = totalDuration(sheet, action);
      total.textContent = `${(sum / 1000).toFixed(2)}s / ${action.frames.length} 帧`;
      total.title = '本朝向按逐帧时长播放一遍的总时长';

      const list = $('frame-list');
      if (list) {
        for (const thumb of list.querySelectorAll('.frame-thumb')) {
          const index = Number(thumb.dataset.index);
          const target = action.frames[index];
          if (!target) continue;
          let badge = thumb.querySelector('.frame-duration');
          if (!badge) {
            badge = node('span', 'frame-duration', '');
            thumb.append(badge);
          }
          const ms = effectiveDelay(sheet, target);
          badge.textContent = `${ms}ms`;
          badge.classList.toggle('inherited', !target.duration || !usesPerFrameTiming(sheet));
          badge.title = target.duration && usesPerFrameTiming(sheet) ? '逐帧时长' : '跟随素材表帧率';
        }
      }
    }

    durationInput.addEventListener('change', () => {
      if (applyDuration(app, durationInput.value, false)) {
        app.updateFrameList();
        refresh();
      }
    });

    applyAll.addEventListener('click', () => {
      if (!applyDuration(app, durationInput.value, true)) return;
      app.updateFrameList();
      refresh();
    });

    perFrameBox.addEventListener('change', () => {
      const sheet = app.project.getCurrentSheet();
      const action = app.project.getCurrentAction();
      if (!sheet) return;
      sheet.useFrameDurations = perFrameBox.checked;
      if (perFrameBox.checked && action) {
        // 打开逐帧时长时把当前 fps 落成显式数值，之后每帧可独立修改。
        const base = Math.round(1000 / sheetFps(sheet));
        for (const frame of action.frames) if (!frame.duration) frame.duration = base;
        app.persistence?.markDirty?.();
      }
      app.updateFrameList();
      refresh();
    });

    moveBack.addEventListener('click', () => { if (moveFrame(app, -1)) refresh(); });
    moveForward.addEventListener('click', () => { if (moveFrame(app, 1)) refresh(); });

    // 帧率输入框仍控制默认节奏，改完要让时长标记跟着变。
    $('fps-input')?.addEventListener('change', () => setTimeout(refresh, 0));

    const updateFrameList = app.updateFrameList.bind(app);
    app.updateFrameList = function () {
      updateFrameList();
      refresh();
    };

    const updateAll = app.updateAll.bind(app);
    app.updateAll = function () {
      updateAll();
      refresh();
    };

    refresh();
  });
})();
