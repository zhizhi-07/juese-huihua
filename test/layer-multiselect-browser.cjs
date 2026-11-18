const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'output/layer-multiselect');
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
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=layer-multiselect-isolated-test`);
    await page.waitForFunction(()=>PE.app?.updateLayerList&&document.querySelector('.studio-loading')?.hidden);
    // 建筑风格的隔离工程：每层一块不同颜色的像素，方便验证合并 / 移动。
    await page.evaluate(()=>{
      const app=PE.app,p=app.project,s=new PE.SpriteSheet('建筑隔离测试'),a=new PE.Action('idle','none');
      s.frameWidth=s.frameHeight=16;s.imageData=new ImageData(16,16);a.frames=[new PE.Frame(0,0,0,16,16)];s.actions=[a];p.spriteSheets=[s];
      const colors=[[90,90,90,255],[170,110,60,255],[210,90,70,255],[80,140,200,255],[40,40,60,255]];
      const names=['地面','楼体','屋顶','窗户','阴影'];
      p.layers=[];
      names.forEach((name,i)=>{
        const l=new PE.Layer(name);l.sheetIndex=0;p.layers.push(l);
        const d=new ImageData(16,16);
        for(let y=0;y<4;y++)for(let x=i*3;x<i*3+3;x++)d.data.set(colors[i],(y*16+x)*4);
        l.frameData.set('0_0_0',d);
      });
      p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=0;
      app.toolManager.clearSelection();app.history.clear();app.persistence.ready=true;app.persistence.dirty=false;
      app.updateAll();app.canvasManager.render();document.activeElement.blur();
    });
    const state=()=>page.evaluate(()=>{
      const app=PE.app,p=app.project;
      return{
        names:p.layers.map(l=>l.name),
        selected:p.currentLayerIndex,
        selection:[...app.layerSelection].map(l=>p.layers.indexOf(l)).sort((a,b)=>a-b),
        undo:app.history.undoStack.length,
        groups:p.layers.filter(l=>l.isGroup).map(l=>l.name),
        parents:p.layers.map(l=>l.parent),
        rowCount:document.querySelectorAll('.layer-item[data-layer-index]').length,
        barCount:document.querySelector('.lm-count')?.textContent||'',
        highlighted:[...document.querySelectorAll('.layer-item.multi-selected')].map(r=>Number(r.dataset.layerIndex)),
        pixels:p.layers[0].isGroup?[]:null
      };
    });
    const row=index=>page.locator(`.layer-item[data-layer-index="${index}"] .layer-name`).first();
    const bar=act=>page.locator(`.layer-multi-bar button[data-act="${act}"]`);

    let s=await state();
    assert.deepEqual(s.names,['地面','楼体','屋顶','窗户','阴影']);
    assert.equal(s.rowCount,5);
    assert.equal(s.selection.length,1);

    await row(2).click();
    s=await state();
    assert.deepEqual(s.selection,[2]);
    assert.equal(s.selected,2);

    await row(4).click({modifiers:['Shift']});
    s=await state();
    assert.deepEqual(s.selection,[2,3,4]);
    assert.equal(s.selected,4);

    await row(1).click({modifiers:['Control']});
    s=await state();
    assert.deepEqual(s.selection,[1,2,3,4]);
    assert.equal(s.barCount.trim().startsWith('已选 4 层'),true);
    assert.deepEqual(s.highlighted.slice().sort((a,b)=>a-b),[1,2,3,4]);

    // Shift 从最后一次点选的锚点（楼体 1）连选，和 PS 一样
    await row(3).click({modifiers:['Shift']});
    s=await state();
    assert.deepEqual(s.selection,[1,2,3]);

    // 一起上移：屋顶+窗户 越过 阴影 一层
    await row(2).click();
    await row(3).click({modifiers:['Shift']});
    await bar('up').click();
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','阴影','屋顶','窗户']);
    assert.equal(s.undo,1);
    await page.keyboard.press('Control+z');
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','屋顶','窗户','阴影']);

    // 合并：界面不再有合并按钮，Ctrl+E 直接合并所选两层（结果留在最上面那层）
    await row(2).click();
    await row(1).click({modifiers:['Shift']});
    s=await state();
    assert.deepEqual(s.selection,[1,2]);
    await page.evaluate(()=>document.activeElement.blur());
    await page.keyboard.press('Control+e');
    s=await state();
    assert.deepEqual(s.names,['地面','屋顶','窗户','阴影']);
    const merged=await page.evaluate(()=>{
      const data=PE.app.project.layers[1].getFrameData('0_0_0');
      return {p1:[...data.data.slice((0*16+3)*4,(0*16+3)*4+4)],p2:[...data.data.slice((0*16+6)*4,(0*16+6)*4+4)]};
    });
    assert.deepEqual(merged.p1,[170,110,60,255]);
    assert.deepEqual(merged.p2,[210,90,70,255]);
    await page.keyboard.press('Control+z');
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','屋顶','窗户','阴影']);

    // 全局层和当前素材表专属层可以合并，不能丢掉全局层在其他表的像素。
    const mixed = await page.evaluate(() => {
      const app=PE.app,p=app.project,global=p.layers[1],local=p.layers[2];
      global.sheetIndex=undefined;
      global.opacity=.5;
      p.spriteSheets.push(p.spriteSheets[0]);
      global.frameData.set('1_0_0',PE.utils.cloneImageData(global.frameData.get('0_0_0')));
      app.layerSelection=new Set([global,local]);
      const ok=app.mergeSelectedLayers();
      if(!ok)return {ok};
      const result={ok,scope:local.sheetIndex,foreign:!!local.frameData.get('1_0_0'),foreignAlpha:local.frameData.get('1_0_0').data[3*4+3],opacity:local.opacity};
      app.history.undo(p);
      result.undo=global.opacity===.5&&global.sheetIndex===undefined&&local.sheetIndex===0&&p.layers.includes(global);
      app.history.redo(p);
      result.redo=local.sheetIndex===undefined&&!!local.frameData.get('1_0_0');
      app.history.undo(p);
      global.opacity=1;global.sheetIndex=0;global.frameData.delete('1_0_0');p.spriteSheets.pop();
      return result;
    });
    assert.deepEqual(mixed,{ok:true,scope:undefined,foreign:true,foreignAlpha:128,opacity:1,undo:true,redo:true});

    // 建组：界面不再有建组按钮，Ctrl+G 直接把所选两层收进一个组（默认名自动顺延）
    await row(2).click();
    await row(3).click({modifiers:['Shift']});
    await page.evaluate(()=>document.activeElement.blur());
    await page.keyboard.press('Control+g');
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','图层组','屋顶','窗户','阴影']);
    assert.deepEqual(s.parents,[null,null,null,2,2,null]);
    assert.deepEqual(s.groups,['图层组']);
    assert.deepEqual(s.selection,[3,4]);
    assert.equal(s.selected,4);
    await page.keyboard.press('Control+z');
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','屋顶','窗户','阴影']);
    assert.deepEqual(s.parents,[null,null,null,null,null]);

    // 方向键：所选两层像素一起右移一格
    await row(2).click();
    await row(3).click({modifiers:['Shift']});
    const before=await page.evaluate(()=>{
      const p=PE.app.project,key='0_0_0';
      return p.layers.slice(2,4).map(l=>{
        const d=l.getFrameData(key);let x0=99,x1=-1;
        for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(d.data[(y*16+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);}
        return [x0,x1];
      });
    });
    await page.evaluate(()=>document.activeElement.blur());
    await page.keyboard.press('ArrowRight');
    const after=await page.evaluate(()=>{
      const p=PE.app.project,key='0_0_0';
      return p.layers.slice(2,4).map(l=>{
        const d=l.getFrameData(key);let x0=99,x1=-1;
        for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(d.data[(y*16+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);}
        return [x0,x1];
      });
    });
    assert.deepEqual(after,before.map(([a,b])=>[a+1,b+1]));
    await page.keyboard.press('Control+z');

    // 删除所选：选两层一起删，一次撤销能整批回来
    await row(2).click();
    await row(3).click({modifiers:['Shift']});
    const deleted=await page.evaluate(()=>PE.app.deleteSelectedLayers());
    console.log('DEBUG del:',deleted,await page.evaluate(()=>[...PE.app.layerSelection].map(l=>l.name)),await page.evaluate(()=>[...document.querySelectorAll('.layer-toast')].map(t=>t.textContent)));
    assert.equal(deleted,true);
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','阴影']);
    await page.keyboard.press('Control+z');
    s=await state();
    assert.deepEqual(s.names,['地面','楼体','屋顶','窗户','阴影']);

    await page.screenshot({path:path.join(output,'panel.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: Shift 连选 / Ctrl 点选 / 一起上移 / 合并所选 / 建组 / 方向键整体移动 / 删除所选 + 撤销，无页面报错');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
