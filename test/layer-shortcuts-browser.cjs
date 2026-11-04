const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'output/ps-layer-shortcuts-20261101');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=ps-layer-shortcuts-isolated-test`);
    await page.waitForFunction(()=>PE.app?.duplicateCurrentLayer&&document.querySelector('.studio-loading')?.hidden);
    await page.evaluate(()=>{
      const app=PE.app,p=app.project,s=new PE.SpriteSheet('快捷键隔离测试'),a=new PE.Action('idle','down');
      s.frameWidth=s.frameHeight=8;s.imageData=new ImageData(8,8);a.frames=[new PE.Frame(0,0,0,8,8)];s.actions=[a];p.spriteSheets=[s];
      p.layers=[new PE.Layer('测试绘画')];p.layers[0].sheetIndex=0;p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=p.currentLayerIndex=0;
      const d=new ImageData(8,8);for(let y=2;y<6;y++)for(let x=2;x<6;x++)d.data.set([200,40,80,255],(y*8+x)*4);p.layers[0].frameData.set('0_0_0',d);
      app.toolManager.clearSelection();app.history.clear();app.persistence.ready=true;app.persistence.dirty=false;app.updateAll();app.canvasManager.render();document.activeElement.blur();
    });
    const state=()=>page.evaluate(()=>{const app=PE.app,p=app.project;return {names:p.layers.map(l=>l.name),selected:p.currentLayerIndex,undo:app.history.undoStack.length,dirty:app.persistence.dirty,rgba:[...p.getCurrentLayer().getFrameData(p.getFrameKey()).data]};});
    const original=await state();await page.keyboard.press('Control+j');let copy=await state();assert.equal(copy.names.length,2);assert.equal(copy.selected,1);assert.equal(copy.undo,1);assert(copy.dirty);assert.deepEqual(copy.rgba,original.rgba);
    await page.keyboard.press('Control+z');assert.equal((await state()).names.length,1);await page.keyboard.press('Control+y');assert.equal((await state()).names.length,2);
    await page.keyboard.press('Control+e');assert.equal((await state()).names.length,1);await page.keyboard.press('Control+z');assert.equal((await state()).names.length,2);
    await page.evaluate(()=>{const a=PE.app;a.history.undo(a.project);a.toolManager.setSelection(2,2,2,2);a.canvasManager.render();});
    await page.keyboard.press('Control+j');copy=await state();assert.equal(copy.names.length,2);assert.equal(copy.rgba[(2*8+2)*4+3],255);assert.equal(copy.rgba[(5*8+5)*4+3],0);
    await page.locator('.layer-header-actions summary').click();
    await page.getByRole('button',{name:'复制当前图层；有选区时仅复制选区到新图层（Ctrl+J）',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await state()).names.length,3);
    await page.locator('.layer-header-actions summary').click();
    await page.getByRole('button',{name:'把当前图层向下合并到下面那层（Ctrl+E，同 Photoshop）',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await state()).names.length,2);
    await page.evaluate(()=>{const input=document.createElement('input');input.id='shortcut-input-fixture';document.body.append(input);input.focus();});
    await page.keyboard.press('Control+j');assert.equal((await state()).names.length,2);
    await page.evaluate(()=>{const d=document.createElement('div');d.contentEditable='true';d.textContent='editable';document.body.append(d);d.focus();});
    await page.keyboard.press('Control+e');assert.equal((await state()).names.length,2);
    await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Control+Shift+e');assert.equal((await state()).names.length,2);
    const saved=await page.evaluate(async()=>JSON.parse(await PE.app.exportManager.exportProject(false).text()));
    assert.equal(saved.layers.length,2);assert.equal(saved.layers[1].frameData['0_0_0'].width,8);
    await fs.writeFile(path.join(output,'isolated-fixture-project.json'),JSON.stringify(saved,null,2));
    await page.screenshot({path:path.join(output,'isolated-fixture.png')});
    assert.deepEqual(errors,[]);console.log('PASS: real Ctrl+J / Ctrl+E, Ctrl+Z / Ctrl+Y, selected region, panel button keyboard activation, input/contenteditable/Shift guards, dirty state and JSON export; no page errors; isolated fixture only.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
