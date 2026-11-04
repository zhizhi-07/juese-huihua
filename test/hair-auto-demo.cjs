const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createCanvas } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..'), output = path.join(__dirname, 'output/hair-auto-demo-20261103');
const origin = 'http://127.0.0.1:8765', id = 'draft-hair-study-a-90dcd5b6-07e9-4cb1-bd1e-9c6f3f6d4b5e';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function image(w, h, draw, placement) {
  const c = createCanvas(w, h); draw(c.getContext('2d'));
  return { width: w, height: h, dataURL: c.toDataURL('image/png'), ...(placement ? { placement } : {}) };
}
function fixture(fpsOnly = false, missingHead = false) {
  const offsets = [[0, 0], [1, 1], [1, 1], [0, 0]], times = [40, 160, 80, 120];
  const p = { name: '只读测试', spriteSheets: [{ name: 'original32_walk', frameWidth: 16, frameHeight: 16, fps: 20,
    useFrameDurations: !fpsOnly, actions: ['side', 'down', 'up'].map(direction => ({ name: direction, direction,
      frames: times.map(duration => ({ width: 16, height: 16, duration })) })) }], layers: [] };
  for (const name of ['body', '头发 / 测试 / 后发', '头发 / 测试二 / 后发', 'head', '前发', '隐藏组', '隐藏内容']) {
    p.layers.push({ name, sheetIndex: 0, visible: name !== '隐藏组', isGroup: name === '隐藏组',
      parent: name === '隐藏内容' ? 5 : null, opacity: name.includes('后发') ? 0.5 : 1, frameData: {} });
  }
  for (let a = 0; a < 3; a++) for (let f = 0; f < 4; f++) {
    const key = `0_${a}_${f}`, [x, y] = offsets[f];
    p.layers[0].frameData[key] = image(16, 16, c => { c.fillStyle = '#1020a0'; c.fillRect(0, 8, 16, 8); });
    p.layers[1].frameData[key] = image(4, 10, c => {
      c.fillStyle = '#d03040'; c.fillRect(0, 0, 4, 1); c.fillRect(0, 1, 1, 9); c.fillRect(0, 9, 3, 1);
    }, { x: 5 + x, y: 2 + y, w: 4, h: 10 });
    p.layers[2].frameData[key] = image(3, 8, c => { c.fillStyle = '#a020c0'; c.fillRect(0, 0, 2, 8); }, { x: 11 + x, y: 2 + y, w: 3, h: 8 });
    if (!missingHead || !f) p.layers[3].frameData[key] = image(16, 16, c => {
      c.fillStyle = '#feede1'; c.fillRect(6 + x, 2 + y, 3, 3); c.fillRect(0, 0, 1, 1);
    });
    p.layers[4].frameData[key] = image(16, 16, c => { c.fillStyle = '#ffff00'; c.fillRect(8 + x, 4 + y, 1, 1); });
    p.layers[6].frameData[key] = image(16, 16, c => { c.fillStyle = '#00ff00'; c.fillRect(0, 0, 16, 16); });
  }
  return p;
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const response = await fetch(`${origin}/api/project?id=${id}`); assert.equal(response.status, 200);
  const before = await response.text(), etag = response.headers.get('etag');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], writes = [], checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.method() !== 'GET') writes.push(`${r.method()} ${r.url()}`); });
    const fixtures = { fixture: fixture(), 'fixture-fps': fixture(true), 'fixture-head-missing': fixture(false, true), 'fixture-slow': fixture() };
    const missing = fixture(); for (const l of missing.layers) if (l.name.includes('后发')) delete l.frameData['0_1_0'];
    fixtures['fixture-no-source'] = missing;
    const badSize = fixture(); badSize.spriteSheets[0].actions[1].frames[0].width = 0; fixtures['fixture-bad-size'] = badSize;
    await page.route('**/api/**', async route => {
      const u = new URL(route.request().url());
      if (u.pathname === '/api/projects') return route.fulfill({ json: [{ id, name: '真实授权工程' }, ...Object.keys(fixtures).map(id => ({ id, name: id }))] });
      const key = u.searchParams.get('id');
      if (key === id) return route.fulfill({ body: before, contentType: 'application/json' });
      if (key === 'fixture-slow') await new Promise(resolve => setTimeout(resolve, 200));
      if (fixtures[key]) return route.fulfill({ json: fixtures[key] });
      return route.abort();
    });
    await page.goto(`${origin}/hair-auto-demo.html?id=${id}`);
    const ready = () => page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('就绪'));
    await ready(); await page.click('#playBtn');
    await page.addScriptTag({ url: origin + '/js/canvas.js' });
    await page.addScriptTag({ url: origin + '/js/export.js' });
    await page.evaluate(async raw => {
      window.testModel = (await new PE.ExportManager().importProject(new Blob([raw]))).project;
      window.testManager = new PE.CanvasManager(document.createElement('canvas'), testModel);
      window.contact = document.createElement('canvas'); contact.width = 1920; contact.height = 840;
    }, before);
    async function seek(frame) {
      for (let tries = 0; tries < 32 && await page.evaluate(() => __demo.getFrame()) !== frame; tries++) await page.click('#nextFrame');
      assert.equal(await page.evaluate(() => __demo.getFrame()), frame);
      await page.waitForFunction(n => document.querySelector('#frameInfo').textContent.startsWith(`第 ${n + 1} /`), frame);
    }
    for (let dir = 0; dir < 3; dir++) {
      await page.click(`#dirBtns button[data-ai="${dir}"]`); await ready();
      for (let frame = 0; frame < 8; frame++) {
        await seek(frame);
        const result = await page.evaluate(({ dir, frame }) => {
          const expected = testManager.getCompositeImageData(7, dir, frame);
          const left = document.querySelector('#leftNative').getContext('2d').getImageData(0, 0, expected.width, expected.height);
          const right = document.querySelector('#rightNative').getContext('2d').getImageData(0, 0, expected.width, expected.height);
          const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
          const selected = PE.getRenderLayers(testModel, 7, dir).find(l => PE.isLayerVisible(testModel, l, 7) && /后发/.test(l.name) && l.getFrameData(`7_${dir}_0`));
          const key = `7_${dir}_${frame}`, saved = selected.frameData.get(key);
          selected.frameData.set(key, __demo.getGenerated()[frame]);
          const expectedAuto = testManager.getCompositeImageData(7, dir, frame);
          if (saved) selected.frameData.set(key, saved); else selected.frameData.delete(key);
          const ctx = contact.getContext('2d'); ctx.imageSmoothingEnabled = false;
          for (let bg = 0; bg < 2; bg++) {
            const x = frame * 240, y = (bg * 3 + dir) * 140;
            ctx.fillStyle = bg ? '#090b10' : '#ece8e0'; ctx.fillRect(x, y, 240, 140);
            ctx.fillStyle = bg ? '#ffffff' : '#111111'; ctx.font = '12px sans-serif';
            ctx.fillText(`${['side', 'front', 'back'][dir]} ${frame + 1}: orig / auto`, x + 4, y + 15);
            ctx.drawImage(document.querySelector('#leftNative'), x + 4, y + 24, expected.width * 3, expected.height * 3);
            ctx.drawImage(document.querySelector('#rightNative'), x + 122, y + 24, expected.width * 3, expected.height * 3);
          }
          const enlarged = document.querySelector('#left').getContext('2d').getImageData(0, 0, expected.width * 8, expected.height * 8).data;
          let scaled = true;
          for (let y = 0; y < expected.height * 8; y++) for (let x = 0; x < expected.width * 8; x++) {
            const si = (Math.floor(y / 8) * expected.width + Math.floor(x / 8)) * 4, di = (y * expected.width * 8 + x) * 4;
            for (let c = 0; c < 4; c++) if (enlarged[di + c] !== left.data[si + c]) scaled = false;
          }
          return { exact: same(expected.data, left.data), autoExact: same(expectedAuto.data, right.data), sourcePoseIntact: frame !== 0 || same(expected.data, right.data), scaled,
            leftNonempty: left.data.some((v, i) => i % 4 === 3 && v), rightNonempty: right.data.some((v, i) => i % 4 === 3 && v) };
        }, { dir, frame });
        assert.deepEqual(result, { exact: true, autoExact: true, sourcePoseIntact: true, scaled: true, leftNonempty: true, rightNonempty: true });
      }
    }
    await fs.writeFile(path.join(output, 'all-directions-frames.png'), Buffer.from((await page.evaluate(() => contact.toDataURL())).split(',')[1], 'base64'));
    checks.push('24 real original and generated composites match editor CanvasManager exactly; first pose intact; nonempty originals/generated; native and 8x views agree');
    await seek(0); await page.selectOption('#background', 'light'); await page.screenshot({ path: path.join(output, 'light.png'), fullPage: true });
    await page.selectOption('#background', 'dark'); await page.screenshot({ path: path.join(output, 'dark.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.selectOption('#projSel', 'fixture'); await ready();
    assert.deepEqual(await page.evaluate(() => __demo.getTiming()), { durations: [40, 160, 80, 120], starts: [0, 40, 200, 280], total: 400 });
    assert.deepEqual(await page.evaluate(() => [0, 39, 40, 199, 200, 279, 280, 399, 400, 440, -1].map(__demo.frameAt)), [0, 0, 1, 1, 2, 2, 3, 3, 0, 1, 3]);
    assert.deepEqual(await page.evaluate(() => __demo.getHeadOffsets()), [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }]);
    await page.evaluate(async raw => {
      window.fixtureModel = (await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
      window.fixtureManager = new PE.CanvasManager(document.createElement('canvas'), fixtureModel);
    }, fixtures.fixture);
    for (let dir = 0; dir < 3; dir++) {
      await page.click(`#dirBtns button[data-ai="${dir}"]`); await ready();
      await page.evaluate(() => { __demo.params.ampH = __demo.params.ampV = 0; __demo.generate(); });
      for (let f = 0; f < 4; f++) {
        await seek(f);
        assert(await page.evaluate(({ dir, f }) => {
          const expected = fixtureManager.getCompositeImageData(0, dir, f).data;
          return ['leftNative', 'rightNative'].every(id => {
            const actual = document.querySelector('#' + id).getContext('2d').getImageData(0, 0, 16, 16).data;
            return expected.every((v, i) => v === actual[i]);
          });
        }, { dir, f }));
      }
    }
    checks.push('12 synthetic source-over composites exact: 50% hair opacity, cropped placement, hidden parent, rear-view ordering, head-follow translation');
    await page.click('#dirBtns button[data-ai="1"]'); await ready();
    await seek(2);
    async function range(id, value) { await page.locator('#' + id).evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input')); }, String(value)); }
    await range('ampH', 3); await page.waitForFunction(() => document.querySelector('#frameInfo').textContent.startsWith('第 3 /'));
    assert.equal(await page.evaluate(() => __demo.getFrame()), 2);
    await page.click('#reset'); assert.equal(await page.evaluate(() => __demo.getFrame()), 2);
    await seek(0); await page.click('#prevFrame'); await page.waitForFunction(() => __demo.getFrame() === 3);
    checks.push('Unequal frame durations, boundaries, wrap, pause/edit/reset frame retention, head anchor ignores isolated dot, mobile width');
    await page.click('#playBtn'); const was = await page.evaluate(() => __demo.getFrame());
    await page.waitForFunction(was => __demo.getFrame() !== was, was); await page.click('#playBtn');
    assert.equal(await page.locator('#playBtn').textContent(), '播放');
    const stroke = async (x, y) => {
      await page.locator('#paint').scrollIntoViewIfNeeded(); const box = await page.locator('#paint').boundingBox();
      await page.mouse.click(box.x + (x + 0.5) / 16 * box.width, box.y + (y + 0.5) / 16 * box.height);
    };
    await range('brush', 1); await stroke(5, 10); await range('ampH', 6); await range('ampV', 4);
    const locked = await page.evaluate(() => {
      const frames = __demo.getGenerated(), src = frames[0].data, mask = __demo.getMask(), W = 16, offsets = __demo.getHeadOffsets();
      let count = 0, moving = 0;
      for (let f = 1; f < frames.length; f++) for (let i = 0; i < W * W; i++) {
        if (!src[i * 4 + 3]) continue;
        const x = i % W + offsets[f].x, y = Math.floor(i / W) + offsets[f].y, di = (y * W + x) * 4;
        const same = src.slice(i * 4, i * 4 + 4).every((v, c) => v === frames[f].data[di + c]);
        if (!mask[i]) { if (!same) throw new Error('Unpainted source pixel moved or overwritten'); count++; }
        else if (!same) moving++;
      }
      return { count, moving };
    });
    assert(locked.count > 0 && locked.moving > 0);
    await page.click('#eraseMask'); await stroke(5, 10);
    assert.equal(await page.evaluate(() => __demo.getMask().some(Boolean)), false);
    assert.equal(await page.evaluate(() => {
      const frames = __demo.getGenerated(), src = frames[0].data, offsets = __demo.getHeadOffsets();
      return frames.every((f, t) => { const expected = new Uint8ClampedArray(16 * 16 * 4);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          if (x + offsets[t].x < 16 && y + offsets[t].y < 16) expected.set(src.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 4), ((y + offsets[t].y) * 16 + x + offsets[t].x) * 4);
        } return f.data.every((v, i) => v === expected[i]); });
    }), true);
    await page.click('#clearMask'); assert.equal(await page.evaluate(() => __demo.getMask()), null);
    await page.click('#eraseMask'); await stroke(5, 10);
    await page.selectOption('#hairSel', '2'); await ready(); assert.equal(await page.evaluate(() => __demo.getMask()), null);
    await stroke(11, 8); await page.click('#dirBtns button[data-ai="0"]'); await ready(); assert.equal(await page.evaluate(() => __demo.getMask()), null);
    await stroke(5, 10); await page.selectOption('#projSel', 'fixture-fps'); await ready(); assert.equal(await page.evaluate(() => __demo.getMask()), null);
    assert.deepEqual(await page.evaluate(() => __demo.getTiming().durations), [50, 50, 50, 50]);
    checks.push('Real pointer brush/eraser, masked pixels alone deform with compression+sway, fixed pixels win, empty mask locks all, clear restores all, switch resets masks, fps fallback');
    for (const key of ['fixture-head-missing', 'fixture-no-source', 'fixture-bad-size']) {
      await page.click('#dirBtns button[data-ai="1"]'); await ready();
      await page.selectOption('#projSel', key); await page.waitForSelector('#status.err');
      assert.equal(await page.evaluate(() => __demo.getGenerated().length), 0);
      await page.selectOption('#projSel', 'fixture'); await ready();
    }
    await page.evaluate(() => {
      const sel = document.querySelector('#projSel'); sel.value = 'fixture-slow'; sel.dispatchEvent(new Event('change'));
      sel.value = 'fixture-fps'; sel.dispatchEvent(new Event('change'));
    });
    await ready(); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => __demo.getTiming().total), 200);
    await page.selectOption('#projSel', id); await ready();
    assert.equal(await page.locator('#cycles').getAttribute('step'), '1');
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    const after = await fetch(`${origin}/api/project?id=${id}`);
    assert.equal(sha(await after.text()), sha(before)); assert.equal(after.headers.get('etag'), etag);
    checks.push('Missing source/head and invalid dimensions fail visibly and recover; late requests cannot overwrite new selection; integer cycles; no JS errors or writes; actual project SHA256 and ETag unchanged');
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ checks, errors, writes, projectSHA256: sha(before), etag }, null, 2));
    console.log('PASS\n' + checks.join('\n'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
