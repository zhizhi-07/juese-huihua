const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '自检记录/界面重做-黑白参考-20261102');
const before = process.argv.includes('--before');

(async () => {
  await fs.mkdir(output, {recursive:true});
  let writes = 0;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET') { writes++; res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/projects') { res.writeHead(200, {'Content-Type':'application/json'}).end('[]'); return; }
    if (url.pathname.startsWith('/api/')) { res.writeHead(404, {'Content-Type':'application/json'}).end('{}'); return; }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', ({'.js':'text/javascript', '.css':'text/css', '.html':'text/html'})[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge', headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:960}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.waitForFunction(() => window.PE?.app?.persistence?.ready && document.querySelector('.studio-loading')?.hidden);
    await page.screenshot({path:path.join(output, before ? 'before.png' : 'after.png')});
    if (!before) {
      const chrome = await page.evaluate(() => ({
        surface:getComputedStyle(document.querySelector('.studio-header')).backgroundColor,
        primary:getComputedStyle(document.querySelector('.save-primary')).backgroundColor,
        mat:[...PE.app.canvasManager.ctx.getImageData(1,1,1,1).data],
        preview:PE.app.project.bgColor
      }));
      assert.equal(chrome.surface,'rgb(255, 255, 255)');
      assert.equal(chrome.primary,'rgb(37, 37, 37)');
      assert.deepEqual(chrome.mat,[242,242,242,255]);
      assert.equal(chrome.preview,'#b8c8c3','Saved preview color is separate from neutral workspace mat');
      assert.equal(await page.getByLabel('画布抠图容差',{exact:true}).isVisible(),false);
      await page.locator('.image-edit-toolbar > .workspace-menu > summary').click();
      const tolerance = page.getByLabel('画布抠图容差',{exact:true});
      assert(await tolerance.isVisible());
      await tolerance.fill('48'); await tolerance.press('Tab');
      assert.equal(await tolerance.inputValue(),'48');
      await page.keyboard.press('Escape');
      assert.equal(await tolerance.isVisible(),false);
      assert(await page.locator('#copy-cel-btn').isVisible());
      assert(await page.locator('#copy-next-cel-btn').isVisible());
      await page.locator('.aux-toggle').click();
      assert.equal(await page.locator('.image-edit-toolbar').isVisible(),false);
      assert.equal(await page.locator('.frame-edit-toolbar').isVisible(),false);
      await page.locator('.aux-toggle').click();
      assert(await page.locator('#copy-cel-btn').isVisible());
      assert.equal(await page.locator('#duplicate-frame-btn').isVisible(),false);
      await page.locator('.frame-edit-toolbar > .workspace-menu > summary').click();
      assert(await page.locator('#duplicate-frame-btn').isVisible());
      await page.keyboard.press('Escape');
      assert(await page.locator('#mirror-layer-btn').isVisible());
      assert(await page.locator('#mirror-live-btn').isVisible());
      assert(await page.locator('.timeline-timing').isVisible());
      const visibility = page.locator('.visual-layer-card.active .layer-icon-btn').first();
      assert(await visibility.locator('svg').count());
      const layerVisible = await page.evaluate(() => PE.app.project.getCurrentLayer().visible);
      await visibility.click();
      assert.equal(await page.evaluate(() => PE.app.project.getCurrentLayer().visible), !layerVisible);
      await visibility.click();
      assert.equal(await page.evaluate(() => PE.app.project.getCurrentLayer().visible), layerVisible);
      await page.locator('#play-btn').click();
      assert(await page.evaluate(() => PE.app.animationPlayer.playing));
      await page.locator('#pause-btn').click();
      assert.equal(await page.evaluate(() => PE.app.animationPlayer.playing), false);
      await page.locator('#tool-eraser').click();
      assert.equal(await page.evaluate(() => PE.app.toolManager.currentTool), 'eraser');
      await page.locator('#tool-pencil').click();
      const number = page.locator('#brush-size-number');
      await number.fill('24'); await number.press('Tab');
      assert.equal(await page.evaluate(() => PE.app.toolManager.brushSize), 24);
      await page.locator('.view-actions .workspace-menu > summary').click();
      assert(await page.locator('#grid-toggle').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.view-actions .workspace-menu').getAttribute('open'), null);
      const initial = await page.evaluate(() => ({name:PE.app.project.name,layers:PE.app.project.layers.length,frames:PE.app.project.getCurrentAction().frames.length}));
      await page.getByRole('button', {name:'更多 ···',exact:true}).click();
      assert(await page.locator('#advanced-dialog').isVisible());
      await page.locator('#advanced-dialog').getByRole('button', {name:'关闭',exact:true}).click();
      assert.deepEqual(await page.evaluate(() => ({name:PE.app.project.name,layers:PE.app.project.layers.length,frames:PE.app.project.getCurrentAction().frames.length})), initial);
      const untouched = await page.evaluate(async () => {
        PE.app.persistence.dirty = true;
        const before = await PE.app.exportManager.exportProject(false).text();
        const theme = document.querySelector('link[href*="studio-theme.css"]');
        theme.disabled = true;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        theme.disabled = false;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return before === await PE.app.exportManager.exportProject(false).text() && PE.app.persistence.dirty;
      });
      assert(untouched, 'Theme application preserves the complete unsaved project');
      for (const [width,height] of [[1440,960],[1100,800],[800,900],[620,900]]) {
        await page.setViewportSize({width,height});
        assert(await number.isVisible());
        const metrics = await page.evaluate(() => {
          const box = document.querySelector('#canvas-container').getBoundingClientRect();
          const rect = document.querySelector('#brush-size-number').getBoundingClientRect();
          const view = document.querySelector('.canvas-viewbar').getBoundingClientRect();
          const tools = document.querySelector('.image-edit-toolbar').getBoundingClientRect();
          return {width:box.width,height:box.height,inputRight:rect.right,overlap:view.bottom > tools.top + 1,overflow:document.documentElement.scrollWidth > innerWidth};
        });
        assert(metrics.width >= 220 && metrics.height >= 120, JSON.stringify({width,...metrics}));
        assert(metrics.inputRight <= width && !metrics.overflow, JSON.stringify({width,...metrics}));
        assert(!metrics.overlap, JSON.stringify({width,...metrics}));
        console.log('LAYOUT '+JSON.stringify({width,...metrics}));
      }
      await page.screenshot({path:path.join(output,'after-narrow.png')});
    }
    assert.deepEqual(errors, []);
    assert.equal(writes, 0, 'Preview never writes projects');
    console.log('PASS: ' + (before ? 'original UI renders' : 'new UI renders; tools, brush, menus, dialog, responsive canvas') + '; zero page errors; zero project writes.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error); process.exitCode = 1;});
