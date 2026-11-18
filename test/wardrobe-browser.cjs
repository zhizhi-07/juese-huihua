const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
const {chromium}=require('playwright'),{fixture}=require('./wardrobe.cjs'),JSZip=require('../js/vendor/jszip.min.js'),png=require('../scripts/png.cjs');
const root=path.resolve(__dirname,'..');
const WALL=[221,208,170,255],FLOOR=[199,178,127,255],WOOD=[139,107,74,255];
function pngURL(width,height,blocks){
  const rgba=new Uint8ClampedArray(width*height*4);
  for(const [x,y,w,h,color]of blocks)for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
    if(px<0||py<0||px>=width||py>=height)continue;
    const i=(py*width+px)*4;rgba[i]=color[0];rgba[i+1]=color[1];rgba[i+2]=color[2];rgba[i+3]=color[3]??255;
  }
  return 'data:image/png;base64,'+png.encode(width,height,rgba).toString('base64');
}
// 场景绘制工程：地面/装饰变成房间，“家具与设施”层里不相连的每一块像素就是一件家具。
function sceneProject(){
  const width=160,height=96;
  const data={version:'1.0',name:'衣柜试验房间',bgColor:'#b8c8c3',palette:[],currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:1,
    spriteSheets:[{name:'场景画布',frameWidth:width,frameHeight:height,columns:1,rows:1,imageDataURL:pngURL(width,height,[]),actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,sourceX:0,sourceY:0,width,height}]}]}],layers:[]};
  const layer=(name,blocks)=>data.layers.push({name,sheetIndex:0,visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width,height,dataURL:pngURL(width,height,blocks)}}});
  layer('地面',[[0,0,width,72,WALL],[0,72,width,height-72,FLOOR]]);
  layer('家具与设施',[[30,60,12,14,WOOD],[80,70,20,10,WOOD]]);
  layer('装饰',[[140,20,6,6,[110,140,113,255]]]);
  return data;
}
async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wardrobe-browser-'));
  console.log('TEST directory '+dir);
  for(const file of ['server.js','index.html'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
  for(const folder of ['js','js/vendor','css']){
    fs.mkdirSync(path.join(dir,folder),{recursive:true});
    for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true}))if(entry.isFile())fs.copyFileSync(path.join(root,folder,entry.name),path.join(dir,folder,entry.name));
  }
  console.log('TEST editor files copied');
  fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});const source=fixture();fs.writeFileSync(path.join(dir,'data/projects/draft-wardrobe-test.json'),JSON.stringify(source));
  console.log('TEST fixture generated');
  const reservation=net.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const server=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']}),base='http://127.0.0.1:'+port;
  console.log('TEST server launched');
  let browser;
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server timeout')),10000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:980},acceptDownloads:true}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));let approve=true;page.on('dialog',d=>approve?d.accept():d.dismiss());
    await page.goto(base+'/index.html?project=draft-wardrobe-test');await page.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    const original=await page.evaluate(async()=>{const a=PE.app;a.project.name='含未保存修改的草稿';a.persistence.markDirty();return {data:await a.exportManager.exportProject(false).text(),version:a.persistence.version,tool:a.toolManager.currentTool};});
    await page.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await page.getByText('这里还没有成品。',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>PE.WardrobeFurniture.layout.length),0,'the fitting room ships no furniture of its own');
    const dialog=page.locator('.wardrobe-dialog'),scene=page.getByLabel('换装测试场景：方向键或WASD移动，C坐下或站起，E拾取');
    await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();await dialog.getByLabel('成品名称').fill('已完成头发');
    await dialog.getByRole('checkbox',{name:'后发-完整头发 · 头发',exact:true}).uncheck();
    await dialog.getByRole('button',{name:'收录为新成品',exact:true}).click();await page.getByText('已独立保存：已完成头发',{exact:false}).waitFor();
    assert.equal(await page.locator('.wardrobe-item').count(),1);
    let projects=await fetch(base+'/api/projects').then(r=>r.json()),hairId=projects.find(p=>p.name==='已完成头发').id;
    const hair=await fetch(base+'/api/project?id='+hairId).then(r=>r.json());assert(hair.layers.every(l=>l.name.startsWith('头发 /')));assert(!JSON.stringify(hair).includes('半成品'));assert(hair.wardrobe);
    await dialog.getByRole('button',{name:'试穿',exact:true}).click();assert((await page.locator('.wardrobe-equipment').textContent()).includes('已完成头发'));
    await scene.focus();const startX=Number(await scene.getAttribute('data-x'));await page.keyboard.down('ArrowRight');await page.waitForTimeout(230);assert.equal(await scene.getAttribute('data-action'),'walk');await page.keyboard.up('ArrowRight');await page.waitForTimeout(80);assert(Number(await scene.getAttribute('data-x'))>startX);assert.equal(await scene.getAttribute('data-action'),'idle');
    await page.keyboard.press('c');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-action'),'sit');await page.keyboard.press('c');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-action'),'idle');
    await dialog.getByLabel('测试朝向').selectOption('up');await dialog.getByLabel('测试动作').selectOption('sit');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-direction'),'up');assert.equal(await scene.getAttribute('data-action'),'sit');
    await dialog.getByRole('button',{name:'重置场景',exact:true}).click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');await page.keyboard.press('e');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-picked'),'true');assert.equal(await scene.getAttribute('data-action'),'pickup');
    await dialog.getByRole('button',{name:'选中',exact:true}).click();await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();
    // A second writer changes the finished file after this window loaded its revision.
    let r=await fetch(base+'/api/project?id='+hairId),rev=r.headers.get('ETag'),changed=await r.json();changed.name='其他窗口更新的头发';
    r=await fetch(base+'/api/project?id='+hairId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(changed)});assert.equal(r.status,200);
    await dialog.getByRole('button',{name:'更新选中成品',exact:true}).click();await page.getByText('成品已被其他窗口修改',{exact:false}).waitFor();assert.equal((await fetch(base+'/api/project?id='+hairId).then(r=>r.json())).name,'其他窗口更新的头发');
    await dialog.getByRole('button',{name:'刷新成品列表',exact:true}).click();await page.getByText('其他窗口更新的头发',{exact:true}).waitFor();
    await dialog.getByLabel('成品名称').fill('其他窗口更新的头发');await dialog.getByRole('checkbox',{name:'后发-完整头发 · 头发',exact:true}).uncheck();await dialog.getByRole('button',{name:'更新选中成品',exact:true}).click();await page.getByText('已独立保存：其他窗口更新的头发',{exact:false}).waitFor();assert(fs.existsSync(path.join(dir,'data/projects',hairId+'.json.bak')),'updating a finished piece keeps its previous file');
    await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();await dialog.getByLabel('成品类别').selectOption('衣服');await dialog.getByLabel('成品名称').fill('已完成衣服');await dialog.getByRole('button',{name:'收录为新成品',exact:true}).click();await page.getByText('已独立保存：已完成衣服',{exact:false}).waitFor();
    const clothing=page.locator('.wardrobe-item').filter({has:page.getByText('已完成衣服',{exact:true})});await clothing.getByRole('button',{name:'试穿',exact:true}).click();assert((await page.locator('.wardrobe-equipment').textContent()).includes('已完成衣服'));
    const rear=await page.evaluate(async()=>PE.Wardrobe.snapshot(JSON.parse(await PE.app.exportManager.exportProject(false).text()),['后发-完整头发'],'独立后发','头发','draft-wardrobe-test'));
    r=await fetch(base+'/api/project?id=finished-rear-test',{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':'none'},body:JSON.stringify(rear)});assert.equal(r.status,200);
    const refresh=async()=>{await dialog.getByRole('button',{name:'刷新成品列表',exact:true}).click();await page.waitForFunction(()=>![...document.querySelectorAll('.wardrobe-dialog button')].find(b=>b.textContent==='刷新成品列表').disabled);};
    await refresh();const rearCard=page.locator('.wardrobe-item').filter({has:page.getByText('独立后发',{exact:true})}),frontCard=page.locator('.wardrobe-item').filter({has:page.getByText('其他窗口更新的头发',{exact:true})});
    assert((await fetch(base+'/api/project?id=finished-rear-test').then(r=>r.json())).wardrobe.sourceRevision,'legacy finished pieces acquire automatic sync metadata');
    await rearCard.getByRole('button',{name:'试穿',exact:true}).click();assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),3,'front hair, rear hair and clothing must stay equipped together');
    await dialog.getByRole('button',{name:'重置场景',exact:true}).click();await page.waitForTimeout(70);
    const hairPixels=()=>scene.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let front=0,rear=0;for(let i=0;i<d.length;i+=4){if(d[i]===40&&d[i+1]===87&&d[i+2]===106)front++;if(d[i]===68&&d[i+1]===111&&d[i+2]===131)rear++;}return {front,rear};});
    let pixels=await hairPixels();assert(pixels.front>0&&pixels.rear>0,'both separately stored hair pieces actually render');
    await rearCard.getByRole('button',{name:'脱下',exact:true}).click();await page.waitForTimeout(40);pixels=await hairPixels();assert(pixels.front>0&&pixels.rear===0,'taking off rear hair leaves front hair visible');assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),2);
    await rearCard.getByRole('button',{name:'试穿',exact:true}).click();await refresh();assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),3,'refresh retains all equipped IDs');
    await dialog.getByLabel('衣柜类别筛选').selectOption('衣服');assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),1);assert((await page.locator('.wardrobe-equipment').textContent()).includes('独立后发'),'category filtering does not take off hidden items');await dialog.getByLabel('衣柜类别筛选').selectOption('');
    await rearCard.getByRole('button',{name:'移出衣柜',exact:true}).click();await page.getByText('已移出衣柜；独立文件仍保留。',{exact:true}).waitFor();assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),2,'archiving one worn piece leaves the others worn');
    await dialog.getByRole('button',{name:'脱下全部',exact:true}).click();assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),0);await page.waitForTimeout(40);assert.deepEqual(await hairPixels(),{front:0,rear:0});
    await frontCard.getByRole('button',{name:'试穿',exact:true}).click();await clothing.getByRole('button',{name:'试穿',exact:true}).click();
    projects=await fetch(base+'/api/projects').then(r=>r.json());const clothesId=projects.find(p=>p.name==='已完成衣服').id;
    r=await fetch(base+'/api/project?id='+clothesId);rev=r.headers.get('ETag');const incomplete=await r.json();incomplete.spriteSheets[2].actions=[];incomplete.layers=incomplete.layers.filter(l=>l.sheetIndex!==2);
    // Only use this isolated fixture to test that missing actions do not silently freeze an idle frame.
    r=await fetch(base+'/api/project?id='+clothesId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(incomplete)});assert.equal(r.status,200);
    await dialog.getByRole('button',{name:'刷新成品列表',exact:true}).click();await page.waitForFunction(()=>![...document.querySelectorAll('.wardrobe-dialog button')].find(b=>b.textContent==='刷新成品列表').disabled);await dialog.getByLabel('测试动作').selectOption('sit');await page.waitForTimeout(100);assert((await page.locator('.wardrobe-warnings').textContent()).includes('已完成衣服缺少坐下'));
    const downloadPromise=page.waitForEvent('download');await clothing.getByRole('button',{name:'一键导出',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'已完成衣服-成品.zip');
    const zip=await JSZip.loadAsync(fs.readFileSync(await download.path()));assert(zip.file('成品.json'));assert(zip.file('original32_idle.png'));assert(!JSON.stringify(JSON.parse(await zip.file('成品.json').async('string'))).includes('半成品'));
    await dialog.getByRole('button',{name:'重置场景',exact:true}).click();await scene.focus();await page.keyboard.press('Control+z');await page.keyboard.press('e');await page.keyboard.press('a');
    assert.deepEqual(await page.evaluate(async()=>({data:await PE.app.exportManager.exportProject(false).text(),version:PE.app.persistence.version,tool:PE.app.toolManager.currentTool})),original,'scene controls never change editor pixels, selection, history or tool');assert(await page.evaluate(()=>PE.app.persistence.dirty));
    fs.mkdirSync(path.join(root,'test/output'),{recursive:true});await page.screenshot({path:path.join(root,'test/output/wardrobe-desktop-fixture.png')});
    await page.setViewportSize({width:620,height:860});await page.screenshot({path:path.join(root,'test/output/wardrobe-narrow-fixture.png')});
    assert(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1),'no horizontal overflow at 620px');
    // Automatic sync reads only saved API data, not this window's dirty draft.
    const savedSource=structuredClone(source);savedSource.name='已保存的新版原工程';
    const beforeSync=await fetch(base+'/api/project?id='+hairId).then(r=>r.text());let rejectSync=true;
    await page.route(base+'/api/project?id='+hairId,route=>{if(route.request().method()==='PUT'&&rejectSync){rejectSync=false;return route.fulfill({status:409,contentType:'application/json',body:'{}'});}return route.continue();});
    const changedPNG=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=36;c.height=36;c.getContext('2d').fillStyle='#123456';c.getContext('2d').fillRect(14,7,8,5);return c.toDataURL();});
    for(const l of savedSource.layers.filter(l=>l.sheetIndex===0&&l.name.endsWith('前发')))for(const d of Object.values(l.frameData))d.dataURL=changedPNG;
    r=await fetch(base+'/api/project?id=draft-wardrobe-test');rev=r.headers.get('ETag');
    r=await fetch(base+'/api/project?id=draft-wardrobe-test',{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(savedSource)});assert.equal(r.status,200);
    await page.getByText('成品同步遇到版本变化，已保留现有文件，稍后自动重试。',{exact:true}).waitFor();
    assert.equal(await fetch(base+'/api/project?id='+hairId).then(r=>r.text()),beforeSync,'failed automatic PUT never overwrites the finished file');
    await frontCard.locator('small').getByText('头发 · 已保存的新版原工程',{exact:true}).waitFor();
    const synced=await fetch(base+'/api/project?id='+hairId).then(r=>r.json());
    assert.equal(synced.name,'其他窗口更新的头发','sync retains finished name');assert(synced.layers.every(l=>l.name.endsWith('前发')),'sync retains originally selected parts only');
    assert.equal(synced.layers.find(l=>l.sheetIndex===0).frameData['0_0_0'].dataURL,changedPNG,'actual source pixels reach the saved finished file without selection or confirmation');
    await dialog.getByLabel('测试动作').selectOption('idle');await dialog.getByLabel('测试朝向').selectOption('down');
    await page.waitForFunction(()=>{const d=document.querySelector('.wardrobe-scene').getContext('2d').getImageData(0,0,320,224).data;return d.some((v,i)=>i%4===0&&v===18&&d[i+1]===52&&d[i+2]===86);});
    assert.equal(await page.locator('.wardrobe-item button[aria-pressed=true]').count(),2,'automatic refresh retains equipment');
    const unchangedRevision=(await fetch(base+'/api/project?id='+hairId)).headers.get('ETag');await page.waitForTimeout(2300);
    assert.equal((await fetch(base+'/api/project?id='+hairId)).headers.get('ETag'),unchangedRevision,'unchanged sources do not trigger repeated writes');
    assert.deepEqual(await page.evaluate(async()=>({data:await PE.app.exportManager.exportProject(false).text(),version:PE.app.persistence.version,tool:PE.app.toolManager.currentTool})),original,'saved-source synchronization never replaces the dirty editor');
    const renamed=structuredClone(savedSource);for(const l of renamed.layers.filter(l=>l.name.endsWith('前发')))l.name='头发 / 已改名 / 前发';
    r=await fetch(base+'/api/project?id=draft-wardrobe-test');rev=r.headers.get('ETag');
    r=await fetch(base+'/api/project?id=draft-wardrobe-test',{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(renamed)});assert.equal(r.status,200);
    await page.getByText('的原部件被删除或改名，已保留上次成品',{exact:false}).waitFor();
    assert.equal((await fetch(base+'/api/project?id='+hairId)).headers.get('ETag'),unchangedRevision,'missing or renamed source parts never erase a finished piece');
    r=await fetch(base+'/api/project?id=draft-wardrobe-test');rev=r.headers.get('ETag');
    r=await fetch(base+'/api/project?id=draft-wardrobe-test',{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(savedSource)});assert.equal(r.status,200);
    await page.getByText('成品自动同步已恢复',{exact:true}).waitFor();
    await dialog.getByRole('button',{name:'关闭衣柜',exact:true}).click();
    await page.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await page.getByText('其他窗口更新的头发',{exact:true}).waitFor();assert.equal(await page.locator('.wardrobe-item').count(),2,'items survive close/reopen');
    await clothing.getByRole('button',{name:'移出衣柜',exact:true}).click();await page.getByText('已移出衣柜；独立文件仍保留。',{exact:true}).waitFor();assert.equal(await page.locator('.wardrobe-item').count(),1);assert(fs.existsSync(path.join(dir,'data/projects',clothesId+'.json')));
    const fresh=await browser.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base+'/index.html?project=draft-wardrobe-test');await fresh.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);await fresh.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await fresh.getByText('其他窗口更新的头发',{exact:true}).waitFor();assert.equal(await fresh.locator('.wardrobe-item').count(),1,'finished pieces persist into a fresh page');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'data/projects/draft-wardrobe-test.json'),'utf8')),savedSource,'wardrobe never writes to the source project');assert.deepEqual(errors,[]);
    // Furniture tests run in the disposable editor, including a real built-in body rather than only colored fixture boxes.
    await fresh.getByRole('button',{name:'关闭衣柜',exact:true}).click();
    const qa=path.join(root,'自检记录/20261107-衣柜场景家具');fs.mkdirSync(qa,{recursive:true});
    const nativeInfo=await fresh.evaluate(async()=>{
      const app=PE.app,p=new PE.Project(),pack=PE_BUILTIN_PACKS.find(p=>p.name==='idle.aseprite');
      await PE.importAseprite(new File([Uint8Array.from(atob(pack.base64),c=>c.charCodeAt(0))],pack.name),p);
      for(const [pack,name,pose,direction]of [['idle.aseprite','original32_idle'],['walk.aseprite','original32_walk'],['hurt.aseprite','original32_sit','sit'],['death.aseprite','original32_sleep','sleep','down']])await PE.addOriginal32Action(p,pack,name,pose,direction);
      app.project=p;app.canvasManager.setProject(p);app.exportManager.init(p,app.canvasManager);app.persistence.markDirty();
      return p.spriteSheets.map(s=>({name:s.name,frames:s.actions.map(a=>({direction:a.direction,count:a.frames.length}))}));
    });
    fs.writeFileSync(path.join(qa,'内置人物测试动作.json'),JSON.stringify(nativeInfo,null,2));
    const beforeFurniture=await fresh.evaluate(()=>PE.app.exportManager.exportProject(false).text());
    // 场景绘制工程就是换装试验场的家具与房间来源；衣柜自己不内置任何家具。
    const sceneId='scene-wardrobe-test',sceneRaw=sceneProject();
    r=await fetch(base+'/api/project?id='+sceneId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':'none'},body:JSON.stringify(sceneRaw)});assert.equal(r.status,200);
    await fresh.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();
    const fd=fresh.locator('.wardrobe-dialog'),fc=fresh.locator('.wardrobe-scene');
    const saveScene=async name=>{const data=await fc.evaluate(c=>c.toDataURL().split(',')[1]);fs.writeFileSync(path.join(qa,name+'.png'),Buffer.from(data,'base64'));};
    await fresh.waitForFunction(()=>PE.WardrobeFurniture.layout.length===2);await saveScene('房间-场景工程原生');
    assert.equal(await fd.getByLabel('场景来源').evaluate(s=>s.value),sceneId,'the scene drawing project is picked automatically');
    assert.equal(await fc.evaluate(c=>c.width),160,'the drawn scene canvas becomes the room 1:1');assert.equal(await fc.evaluate(c=>c.height),96);
    const furniture=await fresh.evaluate(()=>PE.WardrobeFurniture.layout.map(f=>({id:f.id,x:f.x,y:f.y,w:f.art.width,h:f.art.height})));
    assert.deepEqual(furniture.map(f=>[f.x,f.y,f.w,f.h]),[[36,74,12,14],[90,80,20,10]],'drawn furniture keeps its drawn position and native pixel size');
    for(const f of furniture){
      await fd.getByLabel('测试家具',{exact:true}).selectOption(f.id);await fd.getByRole('button',{name:'就位测试',exact:true}).click();
      await fresh.waitForFunction(id=>document.querySelector('.wardrobe-scene').dataset.furniture===id,f.id);
      assert.equal(await fc.getAttribute('data-action'),'sit');assert(!(await fd.locator('.wardrobe-warnings').textContent()).includes('底稿缺少'),'drawn furniture can actually be sat on');
      await saveScene('就位-'+f.id);await fresh.keyboard.press('f');await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.furniture==='');assert.equal(await fc.getAttribute('data-action'),'idle');
    }
    // 站在家具旁就能用 F/C，走过去会被画好的家具挡住。
    await fd.getByRole('button',{name:'重置场景',exact:true}).click();await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.action==='idle');
    assert.equal(await fc.getAttribute('data-x'),'80');assert.equal(await fc.getAttribute('data-y'),'61');
    await fresh.keyboard.press('f');await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.furniture==='furniture-2');
    await fresh.keyboard.press('f');await fresh.waitForFunction(()=>!document.querySelector('.wardrobe-scene').dataset.furniture);
    await fresh.keyboard.press('c');await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.furniture==='furniture-2');
    await fresh.keyboard.down('ArrowDown');await fresh.waitForTimeout(700);await fresh.keyboard.up('ArrowDown');
    await fresh.waitForFunction(()=>!document.querySelector('.wardrobe-scene').dataset.furniture);
    assert(Number(await fc.getAttribute('data-y'))<=68,'walking never passes through the drawn furniture footprint');
    await fresh.keyboard.down('ArrowRight');await fresh.waitForTimeout(120);await fresh.keyboard.up('ArrowRight');
    await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.action==='idle');
    // 在场景绘制里多画一件家具，换装试验场刷新后自己就多摆一件。
    await fresh.getByRole('button',{name:'关闭衣柜',exact:true}).click();
    const grown=sceneProject();grown.layers[1].frameData['0_0_0']={width:160,height:96,dataURL:pngURL(160,96,[[30,60,12,14,WOOD],[80,70,20,10,WOOD],[120,50,10,16,WOOD]])};
    r=await fetch(base+'/api/project?id='+sceneId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':(await fetch(base+'/api/project?id='+sceneId)).headers.get('ETag')},body:JSON.stringify(grown)});assert.equal(r.status,200);
    await fresh.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();
    await fresh.waitForFunction(()=>PE.WardrobeFurniture.layout.length===3);await saveScene('房间-新增一件家具');
    assert.deepEqual(await fresh.evaluate(()=>PE.WardrobeFurniture.layout.map(f=>[f.x,f.y,f.art.width,f.art.height])),[[36,74,12,14],[90,80,20,10],[125,66,10,16]],'a newly drawn piece appears where it was drawn');
    await fd.getByLabel('场景来源').selectOption('');
    await fresh.waitForFunction(()=>PE.WardrobeFurniture.layout.length===0&&!PE.WardrobeFurniture.room);
    assert.equal(await fc.evaluate(c=>c.width),320,'without a scene the room falls back to the empty built-in room');await saveScene('房间-不使用场景');
    await fd.getByLabel('场景来源').selectOption(sceneId);
    await fresh.waitForFunction(()=>PE.WardrobeFurniture.layout.length===3);await saveScene('房间-重新读取场景');
    await fd.getByRole('button',{name:'重置场景',exact:true}).click();await fresh.waitForFunction(()=>document.querySelector('.wardrobe-scene').dataset.action==='idle');assert.equal(await fc.getAttribute('data-furniture'),'');assert.equal(await fc.getAttribute('data-direction'),'down');
    assert.equal(await fresh.evaluate(()=>PE.app.exportManager.exportProject(false).text()),beforeFurniture,'furniture never edits native character pixels or dirty project');assert(await fresh.evaluate(()=>PE.app.persistence.dirty));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'data/projects/draft-wardrobe-test.json'),'utf8')),savedSource);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'data/projects',sceneId+'.json'),'utf8')),grown,'the fitting room never writes the scene project');assert.deepEqual(errors,[]);
    console.log('PASS: furniture: room and furniture come only from the scene drawing project (native 1:1 pixels, drawn positions), nothing built in, 32×32-era placeholders gone, sit by F/C next to drawn furniture, footprint collision, movement exit, reset, newly drawn pieces appear on refresh, scene source can be switched off, original dirty pixels/file untouched; scene captures in 自检记录/20261107-衣柜场景家具.');
    console.log('PASS: real isolated save API + browser: automatic saved-source pixel sync without selection/confirmation, equipped rendering refresh, no repeated writes, dirty-draft protection; same-category multi-piece layering, individual/all removal, filter/archive retention, manual curation, walk/idle, facing, sit, pickup, stale-update rejection, backup, missing-action warning, ZIP download, fresh-page persistence; 1440x980 and 620x860 layouts.');
    console.log('Isolated test files retained at '+dir);
  }finally{await browser?.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
