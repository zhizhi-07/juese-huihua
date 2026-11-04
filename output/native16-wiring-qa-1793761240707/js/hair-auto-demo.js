/* Read-only comparison: never writes project data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search), SCALE = 8;
  const defaults = { ampV: 0, ampH: 2, cycles: 1, lag: 0.6 };
  const params = { ...defaults };
  let projectId = qs.get('id') || 'draft-user-canvas-merged-1793608789349-dbd059d3';
  let ai = [0, 1, 2].includes(Number(qs.get('ai'))) ? Number(qs.get('ai')) : 1;
  if (!qs.has('ai')) ai = 1;
  let project, sheetIndex, hairLayerIndex, visibleLayers = [], imgCache = {};
  let N = 0, FW = 32, FH = 36, baseHair = null, headOffsets = [], generated = [];
  let durations = [], starts = [], total = 0, clipped = 0;
  let mask = null, painting = false, erasing = false, previousPoint = null;
  let ready = false, loadVersion = 0, playing = true, currentFrame = 0, lastFrame = -1, startTime = null;
  const comp = document.createElement('canvas'), cctx = comp.getContext('2d');
  const gen = document.createElement('canvas'), gctx = gen.getContext('2d');
  const paint = $('paint'), pctx = paint.getContext('2d');

  function sizeCanvases() {
    for (const id of ['left', 'right', 'paint', 'leftNative', 'rightNative']) {
      const c = $(id), scale = id.endsWith('Native') ? 1 : SCALE;
      c.width = FW * scale; c.height = FH * scale;
      c.getContext('2d').imageSmoothingEnabled = false;
    }
    comp.width = gen.width = FW; comp.height = gen.height = FH;
    cctx.imageSmoothingEnabled = gctx.imageSmoothingEnabled = false;
    paint.closest('.panel').style.width = `${FW * SCALE + 30}px`;
    paint.closest('.panel').style.maxWidth = '100%';
    mask = null; painting = false; previousPoint = null;
  }

  function loadImg(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  }

  function drawImage(ctx, img, fd) {
    const r = fd.placement || { x: 0, y: 0, w: img.width, h: img.height };
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  }

  // Ignore isolated stray pixels: anchor to the largest connected head component.
  function headAnchor(data, w, h) {
    const seen = new Uint8Array(w * h);
    let best = null;
    for (let i = 0; i < seen.length; i++) {
      if (seen[i] || !data[i * 4 + 3]) continue;
      const queue = [i]; seen[i] = 1;
      let left = w, right = 0, top = h;
      for (let j = 0; j < queue.length; j++) {
        const at = queue[j], x = at % w, y = Math.floor(at / w);
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y);
        for (const next of [x > 0 ? at - 1 : -1, x + 1 < w ? at + 1 : -1, at - w, at + w]) {
          if (next < 0 || next >= seen.length || seen[next] || !data[next * 4 + 3]) continue;
          seen[next] = 1; queue.push(next);
        }
      }
      if (!best || queue.length > best.count) best = { x: (left + right) / 2, y: top, count: queue.length };
    }
    return best;
  }

  function frameAt(elapsed) {
    const t = ((elapsed % total) + total) % total;
    for (let i = 0; i < N; i++) if (t < starts[i] + durations[i]) return i;
    return N - 1;
  }

  function generate() {
    if (!baseHair) return;
    const src = baseHair.data;
    let top = FH, bottom = -1;
    for (let i = 0; i < FW * FH; i++) {
      if (!src[i * 4 + 3] || (mask && !mask[i])) continue;
      top = Math.min(top, Math.floor(i / FW)); bottom = Math.max(bottom, Math.floor(i / FW));
    }
    const span = Math.max(1, bottom - top);
    generated = []; clipped = 0;
    for (let t = 0; t < N; t++) {
      const phase = 2 * Math.PI * starts[t] / total;
      const bob = 0.5 - 0.5 * Math.cos(2 * phase);
      const out = new ImageData(FW, FH), locked = new Uint8Array(FW * FH);
      const offset = headOffsets[t];
      // Fixed pixels win collisions, so moving a selected fragment cannot erase its neighbours.
      for (let pass = 0; pass < 2; pass++) for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const i = y * FW + x, si = i * 4;
        if (!src[si + 3]) continue;
        const w = mask && !mask[i] ? 0 : Math.max(0, Math.min(1, (y - top) / span));
        if ((w === 0 ? 0 : 1) !== pass) continue;
        // Subtract the initial displacement to keep the source pose intact at frame one.
        const dx = Math.round(params.ampH * w * (Math.sin(params.cycles * phase - params.lag * w) - Math.sin(-params.lag * w)));
        const dy = -Math.round(params.ampV * bob * w);
        const X = x + offset.x + dx, Y = y + offset.y + dy;
        if (X < 0 || X >= FW || Y < 0 || Y >= FH) { clipped++; continue; }
        const di = Y * FW + X;
        if (pass && locked[di]) continue;
        out.data.set(src.subarray(si, si + 4), di * 4);
        if (!pass) locked[di] = 1;
      }
      generated.push(out);
    }
    lastFrame = -1;
    $('status').textContent = `就绪 · 行走 · ${FW}×${FH} · ${N}帧 / ${Math.round(total)}ms · 按工程时长播放` +
      (clipped ? ` · 警告：各帧合计${clipped}个源像素超出画布，请减小幅度` : '');
  }

  function paintRender() {
    pctx.clearRect(0, 0, paint.width, paint.height);
    if (!baseHair) return;
    gctx.clearRect(0, 0, FW, FH); gctx.putImageData(baseHair, 0, 0);
    pctx.globalAlpha = 0.6;
    pctx.drawImage(gen, 0, 0, paint.width, paint.height); pctx.globalAlpha = 1;
    if (mask) {
      pctx.fillStyle = 'rgba(120,220,255,.6)';
      for (let i = 0; i < mask.length; i++) if (mask[i]) pctx.fillRect(i % FW * SCALE, Math.floor(i / FW) * SCALE, SCALE, SCALE);
    }
  }

  function stampMask(e) {
    if (!ready) return;
    const rect = paint.getBoundingClientRect();
    const point = { x: Math.floor((e.clientX - rect.left) / rect.width * FW), y: Math.floor((e.clientY - rect.top) / rect.height * FH) };
    if (!mask) mask = new Uint8Array(FW * FH);
    const from = previousPoint || point, steps = Math.max(1, Math.abs(point.x - from.x), Math.abs(point.y - from.y));
    const r = Number($('brush').value);
    for (let step = 0; step <= steps; step++) {
      const cx = Math.round(from.x + (point.x - from.x) * step / steps), cy = Math.round(from.y + (point.y - from.y) * step / steps);
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const X = cx + x, Y = cy + y;
        if (x * x + y * y <= r * r && X >= 0 && X < FW && Y >= 0 && Y < FH) mask[Y * FW + X] = erasing ? 0 : 1;
      }
    }
    previousPoint = point; paintRender(); generate();
  }

  function drawComposite(frame, auto) {
    cctx.globalAlpha = 1; cctx.clearRect(0, 0, FW, FH);
    for (const { i, layer } of visibleLayers) {
      cctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));
      if (i === hairLayerIndex && auto) {
        gctx.clearRect(0, 0, FW, FH); gctx.putImageData(generated[frame], 0, 0);
        cctx.drawImage(gen, 0, 0);
      } else {
        const img = imgCache[`${i}_${frame}`], fd = layer.frameData[`${sheetIndex}_${ai}_${frame}`];
        if (img) drawImage(cctx, img, fd);
      }
    }
    const id = auto ? 'right' : 'left';
    for (const name of [id, id + 'Native']) {
      const canvas = $(name), ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(comp, 0, 0, canvas.width, canvas.height);
    }
  }

  function render(now) {
    if (ready) {
      if (playing) {
        if (startTime === null) startTime = now - starts[currentFrame];
        currentFrame = frameAt(now - startTime);
      }
      if (lastFrame !== currentFrame) {
        drawComposite(currentFrame, false); drawComposite(currentFrame, true);
        $('frameInfo').textContent = `第 ${currentFrame + 1} / ${N} 帧 · ${Math.round(durations[currentFrame])}ms`;
        lastFrame = currentFrame;
      }
    }
    requestAnimationFrame(render);
  }

  function showError(e) {
    ready = false; $('status').classList.add('err'); $('status').textContent = e.message;
  }

  function beginLoad() {
    ready = false; baseHair = null; generated = []; mask = null;
    $('status').classList.remove('err'); $('status').textContent = '加载素材…'; $('frameInfo').textContent = '';
    for (const id of ['left', 'right', 'leftNative', 'rightNative', 'paint']) {
      const c = $(id); c.getContext('2d').clearRect(0, 0, c.width, c.height);
    }
    return ++loadVersion;
  }

  async function loadDir(version) {
    const p = project, si = sheetIndex, dir = ai, hi = hairLayerIndex, layers = visibleLayers;
    const count = N, cache = {};
    await Promise.all(layers.flatMap(({ i, layer }) => Array.from({ length: count }, async (_, t) => {
      const fd = layer.frameData[`${si}_${dir}_${t}`];
      if (fd) cache[`${i}_${t}`] = await loadImg(fd.dataURL);
    })));
    if (version !== loadVersion) return;
    if (!cache[`${hi}_0`]) throw new Error('所选后发没有第一帧，不能生成');
    const head = layers.find(({ i, layer }) => /^(head|头部)$/.test(layer.name) && cache[`${i}_0`]);
    if (!head) throw new Error('缺少可见独立头部层，无法可靠跟随发根');
    const anchors = [];
    for (let t = 0; t < count; t++) {
      const img = cache[`${head.i}_${t}`];
      if (!img) throw new Error(`头部第${t + 1}帧缺失，无法跟随`);
      gctx.clearRect(0, 0, FW, FH); drawImage(gctx, img, head.layer.frameData[`${si}_${dir}_${t}`]);
      const a = headAnchor(gctx.getImageData(0, 0, FW, FH).data, FW, FH);
      if (!a) throw new Error(`头部第${t + 1}帧为空，无法跟随`);
      anchors.push(a);
    }
    // shortcut: track head translation, not head reshaping; larger pose changes need a separate adapter.
    headOffsets = anchors.map(a => ({ x: Math.round(a.x - anchors[0].x), y: a.y - anchors[0].y }));
    imgCache = cache;
    gctx.clearRect(0, 0, FW, FH); drawImage(gctx, cache[`${hi}_0`], p.layers[hi].frameData[`${si}_${dir}_0`]);
    baseHair = gctx.getImageData(0, 0, FW, FH);
    if (!baseHair.data.some((v, i) => i % 4 === 3 && v)) throw new Error('所选后发第一帧为空');
    currentFrame = 0; startTime = null; ready = true;
    generate(); paintRender();
  }

  async function openProject() {
    const version = beginLoad();
    try {
      const res = await fetch('/api/project?id=' + encodeURIComponent(projectId));
      if (!res.ok) throw new Error('读取工程失败 HTTP ' + res.status);
      const p = await res.json();
      if (version !== loadVersion) return;
      project = p;
      sheetIndex = p.spriteSheets.findIndex(s => s.name === 'original32_walk');
      if (sheetIndex < 0) throw new Error('该工程没有 original32_walk 动作表');
      const sheet = p.spriteSheets[sheetIndex], act = sheet.actions[ai];
      if (!act?.frames?.length) throw new Error('该方向没有动作帧');
      N = act.frames.length;
      if (!act.frames.every(f => Number.isSafeInteger(f.width) && Number.isSafeInteger(f.height) && f.width > 0 && f.height > 0)) throw new Error('动作帧尺寸无效');
      FW = Math.max(...act.frames.map(f => f.width)); FH = Math.max(...act.frames.map(f => f.height));
      if (FW * SCALE > 32767 || FH * SCALE > 32767 || FW * FH * SCALE * SCALE > 16 * 1024 * 1024) throw new Error('预览尺寸过大');
      const fps = Number.isFinite(sheet.fps) && sheet.fps > 0 ? sheet.fps : 8;
      durations = act.frames.map(f => sheet.useFrameDurations !== false && Number.isFinite(f.duration) && f.duration > 0 ? f.duration : 1000 / fps);
      total = 0; starts = durations.map(d => { const start = total; total += d; return start; });
      visibleLayers = PE.getRenderLayers(p, sheetIndex, ai)
        .filter(layer => PE.isLayerVisible(p, layer, sheetIndex) && (layer.opacity ?? 1) > 0 && layer.frameData)
        .map(layer => ({ i: p.layers.indexOf(layer), layer }));
      const candidates = visibleLayers.filter(({ layer }) => /后发/.test(layer.name) && layer.frameData[`${sheetIndex}_${ai}_0`]);
      $('hairSel').replaceChildren(...candidates.map(({ i, layer }) => new Option(layer.name, i)));
      if (!candidates.length) throw new Error('该方向没有可见且含第一帧的后发');
      hairLayerIndex = candidates[0].i; sizeCanvases();
      await loadDir(version);
    } catch (e) { if (version === loadVersion) showError(e); }
  }

  function setPlaying(value) {
    playing = value; startTime = null;
    $('playBtn').textContent = playing ? '暂停' : '播放';
    $('playBtn').classList.toggle('active', playing);
  }
  $('playBtn').addEventListener('click', () => setPlaying(!playing));
  for (const [id, step] of [['prevFrame', -1], ['nextFrame', 1]]) $(id).addEventListener('click', () => {
    if (!ready) return;
    setPlaying(false); currentFrame = (currentFrame + step + N) % N; lastFrame = -1;
  });
  for (const key of Object.keys(params)) $(key).addEventListener('input', () => {
    params[key] = Number($(key).value); $(key + 'v').textContent = $(key).value; generate();
  });
  $('reset').addEventListener('click', () => {
    Object.assign(params, defaults);
    for (const [key, value] of Object.entries(defaults)) { $(key).value = value; $(key + 'v').textContent = value; }
    generate();
  });
  $('brush').addEventListener('input', () => { $('brushv').textContent = $('brush').value; });
  $('eraseMask').addEventListener('click', () => {
    erasing = !erasing; $('eraseMask').classList.toggle('active', erasing); $('eraseMask').setAttribute('aria-pressed', String(erasing));
  });
  $('clearMask').addEventListener('click', () => { mask = null; paintRender(); generate(); });
  paint.addEventListener('pointerdown', e => {
    if (!ready || e.button !== 0) return;
    painting = true; previousPoint = null; paint.setPointerCapture(e.pointerId); stampMask(e);
  });
  paint.addEventListener('pointermove', e => { if (painting) stampMask(e); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) paint.addEventListener(event, () => { painting = false; previousPoint = null; });
  $('background').addEventListener('change', () => { document.body.dataset.background = $('background').value; });
  document.querySelectorAll('#dirBtns button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.ai) === ai);
    b.addEventListener('click', () => {
      ai = Number(b.dataset.ai);
      document.querySelectorAll('#dirBtns button').forEach(x => x.classList.toggle('active', x === b));
      openProject();
    });
  });
  $('hairSel').addEventListener('change', async () => {
    const version = beginLoad(); hairLayerIndex = Number($('hairSel').value);
    try { await loadDir(version); } catch (e) { if (version === loadVersion) showError(e); }
  });
  $('projSel').addEventListener('change', () => {
    projectId = $('projSel').value;
    const u = new URL(location.href); u.searchParams.set('id', projectId); history.replaceState(null, '', u);
    openProject();
  });
  (async () => {
    const version = loadVersion;
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('工程列表读取失败');
      const list = await res.json();
      $('projSel').replaceChildren(...list.map(p => new Option(p.name, p.id)));
      if (!list.some(p => p.id === projectId)) $('projSel').add(new Option(projectId, projectId));
      $('projSel').value = projectId;
    } catch (_) { $('projSel').add(new Option(projectId, projectId)); }
    if (version === loadVersion) openProject();
  })();
  requestAnimationFrame(render);
  window.__demo = { getGenerated: () => generated, getMask: () => mask, getFrame: () => currentFrame,
    getFW: () => FW, getFH: () => FH, getHeadOffsets: () => headOffsets,
    getTiming: () => ({ durations, starts, total }), frameAt, headAnchor, params, generate };
})();
