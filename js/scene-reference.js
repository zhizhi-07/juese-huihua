/* 场景绘制里的人物比对：把画好的小人拖到画布上当比例参考，只叠加显示，不写进工程。 */
window.PE = window.PE || {};
document.addEventListener('DOMContentLoaded', () => {
  const app = PE.app, W = PE.Wardrobe, cm = app && app.canvasManager, canvas = cm && cm.canvas;
  if (!app || !W || !cm || !canvas) return;
  const p = app.persistence;
  const POSES = [['idle', '待机'], ['walk', '行走'], ['sit', '坐姿'], ['pickup', '拾取']];
  const DIRS = [['down', '正面'], ['up', '背面'], ['left', '左侧'], ['right', '右侧']];
  const BASE_ID = 'draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
  const state = {
    active: false, pose: 'idle', direction: 'down', frame: 0, alpha: 0.6,
    x: null, y: null, playing: false, guides: true, draggable: true,
    project: null, projectId: '', projectName: '', cache: new Map(),
    drag: null, raf: 0, elapsed: 0, lastTick: 0, busy: false
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // ---------- 画面：把人物画成参考底图 ----------
  function locate() {
    if (!state.project) return null;
    const exact = W.locate(state.project, state.pose, state.direction);
    if (exact) return exact;
    const idle = W.locate(state.project, 'idle', state.direction) || W.locate(state.project, 'idle', 'down');
    if (idle) return idle;
    return state.project.spriteSheets.flatMap((sheet, si) => sheet.actions.map((action, ai) => ({ si, ai, sheet, action, flip: false }))).find(location => location.action.frames?.length) || null;
  }
  function measure(canvas2d) {
    const data = canvas2d.getContext('2d').getImageData(0, 0, canvas2d.width, canvas2d.height).data;
    let left = canvas2d.width, top = canvas2d.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas2d.height; y++) for (let x = 0; x < canvas2d.width; x++) if (data[(y * canvas2d.width + x) * 4 + 3]) {
      if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
    }
    return right < 0 ? null : { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
  }
  function ghost() {
    const location = locate();
    if (!location || !location.action.frames?.length) return null;
    const index = clamp(Math.round(state.frame) || 0, 0, location.action.frames.length - 1);
    state.frame = index;
    const key = [state.projectId, location.si, location.ai, location.flip ? 1 : 0, index].join('|');
    const cached = state.cache.get(key);
    if (cached) return cached;
    const frame = location.action.frames[index];
    const width = Math.max(1, frame.width), height = Math.max(1, frame.height);
    // 高清图层按源像素铺开，不压回画布格：和主画布上看到的清晰度一致。
    const scale = PE.utils.displayScale ? PE.utils.displayScale(state.project, location.si, location.ai, index, 8) : 1;
    const art = document.createElement('canvas');
    art.width = width * scale;
    art.height = height * scale;
    art.scale = scale;
    const ctx = art.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const frameKey = state.project.getFrameKey(location.si, location.ai, index);
    const anchorPixelX = Math.floor(width / 2) * scale, anchorPixelY = Math.floor(height / 2) * scale;
    for (const layer of PE.getRenderLayers(state.project, location.si, location.ai)) {
      if (!PE.isLayerVisible(state.project, layer, location.si) || !(layer.opacity > 0)) continue;
      const image = layer.getFrameData(frameKey);
      if (!image) continue;
      ctx.save();
      ctx.globalAlpha = clamp(layer.opacity ?? 1, 0, 1);
      ctx.translate(anchorPixelX, anchorPixelY);
      if (location.flip) ctx.scale(-1, 1);
      PE.utils.drawImageData(ctx, image, -anchorPixelX, -anchorPixelY, scale);
      ctx.restore();
    }
    // 以“内容中线 + 脚底”做锚，拖动和贴地才对得上家具。
    art.size = measure(art);
    art.anchorX = art.size ? (art.size.left + art.size.right) / 2 / scale : width / 2;
    art.anchorY = art.size ? art.size.bottom / scale : height - 1;
    if (state.cache.size > 48) state.cache.clear();
    state.cache.set(key, art);
    return art;
  }
  function frameOfScene() {
    const frame = app.project && app.project.getCurrentFrame();
    return frame || null;
  }
  function resetPosition(frame) {
    const target = frame || frameOfScene();
    if (!target) return;
    state.x = Math.floor(target.width / 2);
    state.y = target.height - 1;
  }
  function drawGhost() {
    const art = ghost(), frame = frameOfScene();
    if (!art || !frame) return;
    if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) resetPosition(frame);
    state.x = clamp(state.x, 0, frame.width - 1);
    state.y = clamp(state.y, 0, frame.height - 1);
    const zoom = cm.zoom, ctx = cm.ctx;
    const k = zoom / (art.scale || 1);
    const left = Math.round(cm.offsetX + (state.x - art.anchorX) * zoom);
    const top = Math.round(cm.offsetY + (state.y - art.anchorY) * zoom);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = clamp(state.alpha, 0.05, 1);
    ctx.drawImage(art, left, top, art.width * k, art.height * k);
    ctx.restore();
    if (state.guides) {
      const box = art.size
        ? { x: left + art.size.left * k, y: top + art.size.top * k, w: (art.size.right - art.size.left + 1) * k, h: (art.size.bottom - art.size.top + 1) * k }
        : { x: left, y: top, w: art.width * k, h: art.height * k };
      ctx.save();
      ctx.strokeStyle = 'rgba(255,79,216,.9)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(Math.round(box.x) - 0.5, Math.round(box.y) - 0.5, Math.round(box.w) + 1, Math.round(box.h) + 1);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,79,216,.5)';
      const baseline = Math.round(box.y + box.h) + 0.5;
      ctx.beginPath();
      ctx.moveTo(cm.offsetX, baseline);
      ctx.lineTo(cm.offsetX + frame.width * zoom, baseline);
      ctx.stroke();
      ctx.restore();
    }
  }
  const renderScene = cm.render.bind(cm);
  cm.render = () => {
    renderScene();
    if (!state.active) return;
    try { drawGhost(); } catch (error) { console.error('人物比对绘制失败', error); }
  };

  // ---------- 面板 ----------
  const panel = el('section', 'reference-panel');
  panel.hidden = true;
  panel.setAttribute('aria-label', '人物比对');
  const head = el('div', 'reference-head');
  const titles = el('div', 'reference-titles');
  titles.append(el('strong', '', '人物比对'), el('small', '', '拖到家具旁量比例'));
  const closeBtn = el('button', 'reference-close', '×');
  closeBtn.type = 'button';
  closeBtn.title = '关闭比对（人物不会被保存进工程）';
  closeBtn.onclick = () => setActive(false);
  head.append(titles, closeBtn);

  const sourceSelect = el('select', 'reference-select');
  sourceSelect.setAttribute('aria-label', '比对用的人物工程');
  sourceSelect.onchange = () => loadSource(sourceSelect.value);
  const readBtn = el('button', 'reference-mini', '重新读取');
  readBtn.type = 'button';
  readBtn.title = '人物在另一页保存后，点这里读取最新版本';
  readBtn.onclick = () => loadSource(state.projectId || sourceSelect.value);
  const sourceRow = el('div', 'reference-row');
  sourceRow.append(el('span', 'reference-label', '人物'), sourceSelect, readBtn);

  function chips(pairs, pick) {
    const wrap = el('div', 'reference-chips');
    const buttons = pairs.map(([key, label]) => {
      const b = el('button', 'reference-chip', label);
      b.type = 'button';
      b.onclick = () => pick(key);
      wrap.append(b);
      return b;
    });
    return { wrap, buttons };
  }
  const poseChips = chips(POSES, value => { state.pose = value; state.frame = 0; state.elapsed = 0; cm.render(); syncControls(); });
  const dirChips = chips(DIRS, value => { state.direction = value; state.frame = 0; state.elapsed = 0; cm.render(); syncControls(); });
  const poseRow = el('div', 'reference-row');
  poseRow.append(el('span', 'reference-label', '动作'), poseChips.wrap);
  const dirRow = el('div', 'reference-row');
  dirRow.append(el('span', 'reference-label', '朝向'), dirChips.wrap);

  const framePrev = el('button', 'reference-mini', '◀');
  framePrev.type = 'button';
  framePrev.onclick = () => stepFrame(-1);
  const frameNext = el('button', 'reference-mini', '▶');
  frameNext.type = 'button';
  frameNext.onclick = () => stepFrame(1);
  const frameText = el('span', 'reference-frame', '—');
  const playLabel = el('label', 'reference-check');
  const playBox = el('input');
  playBox.type = 'checkbox';
  playBox.onchange = () => { state.playing = playBox.checked; if (state.playing) startPlay(); else stopPlay(); cm.render(); };
  playLabel.append(playBox, el('span', '', '动起来'));
  const frameRow = el('div', 'reference-row');
  frameRow.append(el('span', 'reference-label', '帧'), framePrev, frameText, frameNext, playLabel);

  const alphaInput = el('input', 'reference-alpha');
  alphaInput.type = 'range';
  alphaInput.min = '5';
  alphaInput.max = '100';
  alphaInput.step = '5';
  alphaInput.oninput = () => { state.alpha = Number(alphaInput.value) / 100; alphaText.textContent = alphaInput.value + '%'; cm.render(); };
  const alphaText = el('span', 'reference-frame', '60%');
  const alphaRow = el('div', 'reference-row');
  alphaRow.append(el('span', 'reference-label', '透明度'), alphaInput, alphaText);

  const xInput = el('input', 'reference-number');
  xInput.type = 'number'; xInput.min = '0'; xInput.step = '1'; xInput.setAttribute('aria-label', '人物脚底 X');
  const yInput = el('input', 'reference-number');
  yInput.type = 'number'; yInput.min = '0'; yInput.step = '1'; yInput.setAttribute('aria-label', '人物脚底 Y');
  xInput.onchange = () => { state.x = Number(xInput.value); cm.render(); syncPosition(); };
  yInput.onchange = () => { state.y = Number(yInput.value); cm.render(); syncPosition(); };
  const groundBtn = el('button', 'reference-mini', '贴地');
  groundBtn.type = 'button';
  groundBtn.title = '把脚底对齐到画布底边';
  groundBtn.onclick = () => { const frame = frameOfScene(); if (frame) state.y = frame.height - 1; cm.render(); syncPosition(); };
  const centerBtn = el('button', 'reference-mini', '居中');
  centerBtn.type = 'button';
  centerBtn.onclick = () => { const frame = frameOfScene(); if (frame) state.x = Math.floor(frame.width / 2); cm.render(); syncPosition(); };
  const positionRow = el('div', 'reference-row');
  positionRow.append(el('span', 'reference-label', '脚底'), xInput, yInput, groundBtn, centerBtn);

  const guideLabel = el('label', 'reference-check');
  const guideBox = el('input');
  guideBox.type = 'checkbox';
  guideBox.checked = true;
  guideBox.onchange = () => { state.guides = guideBox.checked; cm.render(); };
  guideLabel.append(guideBox, el('span', '', '辅助线'));
  const dragLabel = el('label', 'reference-check');
  const dragBox = el('input');
  dragBox.type = 'checkbox';
  dragBox.checked = true;
  dragBox.onchange = () => { state.draggable = dragBox.checked; };
  dragLabel.title = '开启时，在人物身上按住就能拖动；在别处照常绘画';
  dragLabel.append(dragBox, el('span', '', '可以直接拖'));
  const optionRow = el('div', 'reference-row');
  optionRow.append(guideLabel, dragLabel);

  const sizeText = el('p', 'reference-size', '');
  const status = el('p', 'reference-status', '');
  status.setAttribute('role', 'status');
  const note = el('p', 'reference-note', '比对人物只是屏幕上的参考，不会被保存进工程，也不会出现在导出图里。');

  panel.append(head, sourceRow, poseRow, dirRow, frameRow, alphaRow, positionRow, optionRow, sizeText, status, note);
  const container = document.getElementById('canvas-container');
  container?.append(panel);

  const toggle = el('button', 'subtle-button reference-toggle', '人物比对');
  toggle.type = 'button';
  toggle.hidden = true;
  toggle.setAttribute('aria-pressed', 'false');
  toggle.title = '把画好的人物拖进场景，和床、沙发比对比例（只作参考显示）';
  toggle.onclick = () => setActive(!state.active);
  const viewActions = document.querySelector('.canvas-viewbar .view-actions');
  (viewActions || document.querySelector('.canvas-viewbar'))?.prepend(toggle);

  // ---------- 状态同步 ----------
  function missingPose() {
    if (!state.project || W.locate(state.project, state.pose, state.direction)) return '';
    const label = POSES.find(([key]) => key === state.pose)?.[1] || '这个动作';
    return label + '还没有画，先用待机显示';
  }
  function syncPosition() {
    if (document.activeElement !== xInput) xInput.value = String(Math.round(state.x ?? 0));
    if (document.activeElement !== yInput) yInput.value = String(Math.round(state.y ?? 0));
    const art = ghost();
    sizeText.textContent = art?.size
      ? '当前人物 ' + Math.round(art.size.width / (art.scale || 1)) + '×' + Math.round(art.size.height / (art.scale || 1)) + ' 格'
        + (art.scale > 1 ? ' · 高清源像素 ' + art.scale + '×（按原像素显示，不压缩）' : '')
        + ' · 脚底在 X' + Math.round(state.x ?? 0) + ' Y' + Math.round(state.y ?? 0)
      : '';
  }
  function syncControls() {
    poseChips.buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(POSES[i][0] === state.pose)));
    dirChips.buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(DIRS[i][0] === state.direction)));
    const location = locate();
    const frames = location?.action.frames.length || 0;
    frameText.textContent = frames ? clamp(Math.round(state.frame), 0, frames - 1) + 1 + ' / ' + frames : '—';
    playBox.disabled = frames < 2;
    alphaText.textContent = Math.round(state.alpha * 100) + '%';
    if (document.activeElement !== alphaInput) alphaInput.value = String(Math.round(state.alpha * 100));
    playBox.checked = state.playing;
    guideBox.checked = state.guides;
    dragBox.checked = state.draggable;
    syncPosition();
  }
  function say(text, error = false) {
    status.textContent = text;
    status.classList.toggle('reference-error', !!error);
  }
  function stepFrame(step) {
    const location = locate();
    if (!location) return;
    const frames = location.action.frames.length;
    state.playing = false; stopPlay(); playBox.checked = false;
    state.frame = (clamp(Math.round(state.frame), 0, frames - 1) + step + frames) % frames;
    cm.render(); syncControls();
  }
  function startPlay() {
    stopPlay();
    state.elapsed = 0; state.lastTick = 0;
    state.raf = requestAnimationFrame(tick);
  }
  function stopPlay() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }
  function tick(now) {
    if (!state.active || !state.playing) { state.raf = 0; return; }
    const location = locate();
    const frames = location?.action.frames.length || 0;
    if (frames < 2) { state.lastTick = now; state.raf = requestAnimationFrame(tick); return; }
    const dt = state.lastTick ? Math.min(80, now - state.lastTick) : 0;
    state.lastTick = now;
    state.elapsed += dt;
    const index = W.frameAt(location.sheet, location.action, state.elapsed, true);
    if (index !== state.frame) {
      state.frame = index;
      cm.render();
      frameText.textContent = index + 1 + ' / ' + frames;
    }
    state.raf = requestAnimationFrame(tick);
  }

  // ---------- 读取人物工程 ----------
  function rank(item) {
    if (item.id === 'main') return 0;
    if (item.id === BASE_ID) return 1;
    if (item.id.startsWith('character-')) return 2;
    if (item.id.startsWith('draft-')) return 3;
    return 4;
  }
  async function refreshSourceOptions(preferred) {
    const response = await fetch(p.base + '/api/projects', { headers: p.headers, cache: 'no-store' });
    if (!response.ok) throw new Error('工程列表读取失败：' + response.status);
    const list = (await response.json()).filter(item => !item.id.startsWith('finished-') && !item.id.startsWith('scene-')).sort((a, b) => rank(a) - rank(b));
    sourceSelect.replaceChildren(...list.map(item => new Option(item.name || item.id, item.id)));
    const wanted = [preferred, state.projectId, 'main', BASE_ID].find(id => id && list.some(item => item.id === id)) || (list[0]?.id || '');
    sourceSelect.value = wanted;
    if (!list.length) throw new Error('没有可用的人物工程');
    return wanted;
  }
  async function loadSource(id) {
    if (!id || state.busy) return;
    state.busy = true;
    say('正在读取人物工程…');
    try {
      const response = await fetch(p.base + '/api/project?id=' + encodeURIComponent(id), { headers: p.headers, cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 404 ? '这个工程还没有保存过，找不到文件' : '人物工程读取失败：' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.spriteSheets) || !data.spriteSheets.some(PE.isCharacterSheet)) throw new Error('这个工程里没有人物动作，请选人物工程');
      state.project = await W.decode(data);
      state.projectId = id;
      state.projectName = data.name || id;
      state.cache.clear();
      state.frame = 0;
      if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) resetPosition(frameOfScene());
      if (state.playing) startPlay(); else stopPlay();
      cm.render(); syncControls();
      say('已读取「' + state.projectName + '」' + (missingPose() ? '：' + missingPose() : ''));
    } catch (error) {
      say(error.message, true);
    } finally {
      state.busy = false;
    }
  }

  // ---------- 拖动 ----------
  function pointOf(event) { return cm.screenToPixel(event.clientX, event.clientY, false); }
  function onGhost(event) {
    const art = ghost();
    if (!art) return false;
    const point = pointOf(event);
    const scale = art.scale || 1;
    // 角标是画布格坐标：高清画布按源像素画，判断时要换回格子宽高。
    const left = state.x - art.anchorX, top = state.y - art.anchorY;
    return point.x >= left - 1 && point.x <= left + art.width / scale + 1 && point.y >= top - 1 && point.y <= top + art.height / scale + 1;
  }
  canvas.addEventListener('mousedown', event => {
    if (!state.active || !state.draggable || state.drag || event.button !== 0 || event.altKey || app.isSpacePressed) return;
    if (!onGhost(event)) return;
    const point = pointOf(event);
    state.drag = { dx: state.x - point.x, dy: state.y - point.y };
    event.preventDefault();
    event.stopPropagation();
    canvas.style.cursor = 'grabbing';
  }, true);
  window.addEventListener('mousemove', event => {
    if (!state.drag) return;
    const frame = frameOfScene();
    if (!frame) return;
    const point = pointOf(event);
    state.x = clamp(Math.round(point.x + state.drag.dx), 0, frame.width - 1);
    state.y = clamp(Math.round(point.y + state.drag.dy), 0, frame.height - 1);
    event.preventDefault();
    event.stopPropagation();
    cm.render(); syncPosition();
  }, true);
  window.addEventListener('mouseup', event => {
    if (!state.drag) return;
    state.drag = null;
    canvas.style.cursor = '';
    event.stopPropagation();
    cm.render(); syncPosition();
  }, true);

  // ---------- 开关 ----------
  async function setActive(on) {
    on = !!on;
    if (on === state.active) return;
    state.active = on;
    toggle.setAttribute('aria-pressed', String(on));
    panel.hidden = !on;
    if (!on) {
      state.playing = false;
      stopPlay();
      cm.render();
      return;
    }
    try {
      if (!state.project) {
        const pick = await refreshSourceOptions();
        await loadSource(pick);
      }
      const frame = frameOfScene();
      if (frame && (!Number.isFinite(state.x) || !Number.isFinite(state.y))) resetPosition(frame);
      syncControls();
      cm.render();
      if (!status.textContent) say('切到坐姿检查床面高度，切到行走看地面位置；画家具时人物不会挡住落笔。');
    } catch (error) {
      say(error.message, true);
    }
  }
  function isScene() {
    try { return !!(PE.isSceneProject && app.project && PE.isSceneProject(app.project)); } catch (error) { return false; }
  }
  function syncScene() {
    const scene = isScene();
    toggle.hidden = !scene;
    if (!scene && state.active) {
      state.active = false;
      toggle.setAttribute('aria-pressed', 'false');
      panel.hidden = true;
      state.playing = false;
      stopPlay();
      cm.render();
    }
  }
  const updateAll = app.updateAll ? app.updateAll.bind(app) : null;
  if (updateAll) app.updateAll = () => { updateAll(); syncScene(); };
  syncScene();
  setTimeout(syncScene, 400);
  window.addEventListener('focus', syncScene);

  // 供自检与本地调试读取比对状态（不影响绘画）
  PE.SceneReference = { state, toggle: setActive, ghost, locate, render: () => cm.render(), load: loadSource };
});
