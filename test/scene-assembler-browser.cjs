const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/scene-assembler-20261118');fs.mkdirSync(out,{recursive:true});
const id='scene-noodle-shop-20261118',url='http://127.0.0.1:8765',live=process.argv.includes('--save-live');
(async()=>{
  const read=await fetch(url+'/api/project?id='+id),text=await read.text(),original=JSON.parse(text);
  assert.equal(read.status,200);fs.writeFileSync(path.join(out,live?'before-live.json':'source.json'),text);fs.writeFileSync(path.join(out,live?'before-live-meta.json':'source-meta.json'),JSON.stringify({etag:read.headers.get('etag'),sha256:crypto.createHash('sha256').update(text).digest('hex')},null,2));
  if(!live)delete original.sceneAssembly;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    let saved=structuredClone(original),etag='"fixture-1"',puts=0,conflict=false;
    if(!live)await page.route('**/api/project?*',async route=>{const req=route.request();assert.equal(new URL(req.url()).searchParams.get('id'),id);if(req.method()==='PUT'){assert.equal(req.headers()['if-match'],etag);assert.equal(req.headers()['x-pixel-editor'],'1');if(conflict)return route.fulfill({status:409,body:'{}'});saved=req.postDataJSON();etag='"fixture-'+(++puts+1)+'"';}await route.fulfill({status:200,contentType:'application/json',headers:{ETag:etag},body:JSON.stringify(saved)});});
    await page.goto(url+'/scene-assembler.html?project='+id);await page.waitForFunction(()=>window.sceneAssembler?.ready);
    const state=()=>page.evaluate(()=>sceneAssembler.scene),baseline=(await state()).objects.length;
    assert.equal(baseline,0,'验收需要没有已有拼装数据；不会清空现有场景');
    async function screen(x,y){return page.evaluate(({x,y})=>{const r=document.querySelector('#scene').getBoundingClientRect(),v=sceneAssembler.view,dpr=devicePixelRatio||1;return {x:r.left+Math.round(v.offset.x*dpr)/dpr+x*v.zoom,y:r.top+Math.round(v.offset.y*dpr)/dpr+y*v.zoom};},{x,y});}
    async function add(name,x,y){const b=page.getByRole('button',{name:'放置'+name,exact:true}),box=await b.boundingBox(),p=await screen(x,y);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:8});await page.mouse.up();}
    await add('桌子',24,42);await add('桌子',72,42);for(const [x,y]of [[14,47],[44,47],[62,47],[92,47]])await add('椅子',x,y);await add('灶台',110,20);
    assert.equal((await state()).objects.length,7);assert.equal((await state()).objects.filter(o=>o.material==='桌子').length,2);assert.equal((await state()).objects.filter(o=>o.material==='椅子').length,4);
    // The opaque stove body is directly draggable as one object, including its pot and smoke layers.
    const from=await screen(130,44),to=await screen(133,49);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:6});await page.mouse.up();
    assert.deepEqual((await state()).objects.at(-1).x,113);assert.equal((await state()).objects.at(-1).y,25);
    await page.locator('#copy').click();assert.equal((await state()).objects.length,8);const copy=(await state()).objects.at(-1);assert.notEqual(copy.id,(await state()).objects.at(-2).id);
    await page.locator('#delete').click();assert.equal((await state()).objects.length,7);await page.locator('#undo').click();assert.equal((await state()).objects.length,8);await page.locator('#redo').click();assert.equal((await state()).objects.length,7);
    const before=await state();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已保存并回读核对'));
    if(!live){assert.equal(puts,1);const {sceneAssembly,...rest}=saved;assert.deepEqual(rest,original);assert.deepEqual(sceneAssembly,before);}
    await page.reload();await page.waitForFunction(()=>window.sceneAssembler?.ready);assert.deepEqual(await state(),before);
    const p=await screen(30,52);await page.mouse.click(p.x,p.y);await page.keyboard.press('ArrowRight');const after=await state();assert.equal(after.objects[0].x,before.objects[0].x+1);assert.deepEqual(after.objects.slice(1),before.objects.slice(1));await page.locator('#undo').click();assert.deepEqual(await state(),before);
    await page.screenshot({path:path.join(out,live?'saved-scene.png':'scene-ui.png')});
    async function download(button,file){const event=page.waitForEvent('download');await page.locator(button).click();const d=await event;await d.saveAs(path.join(out,file));}
    await page.locator('#play').click();const paused=await page.evaluate(()=>sceneAssembler.time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>sceneAssembler.time),paused);await download('#png',live?'scene.png':'fixture.png');await download('#gif',live?'scene.gif':'fixture.gif');await page.locator('#play').click();await page.waitForTimeout(150);assert((await page.evaluate(()=>sceneAssembler.time))>paused);
    if(!live){
      await add('锅',55,84);await page.locator('#variant').selectOption('番茄汤');assert.equal((await state()).objects.at(-1).variant,'番茄汤');await page.locator('#flip').click();assert.equal((await state()).objects.at(-1).flip,true);await page.locator('#back').click();assert.equal((await state()).objects.at(-2).material,'锅');await page.locator('#front').click();
      await download('#gif','stove-and-tomato-soup.gif');
      await page.locator('#snap').check();const pot=await screen(65,103),moved=await screen(68,105);await page.mouse.move(pot.x,pot.y);await page.mouse.down();await page.mouse.move(moved.x,moved.y);await page.mouse.up();assert.equal((await state()).objects.at(-1).x%8,0);assert.equal((await state()).objects.at(-1).y%8,0);
      const layout=await state();saved.layers[0].opacity=.5;await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('源素材已更新')).catch(async e=>{throw Error(await page.locator('#status').textContent()+': '+e.message);});assert.deepEqual(await state(),layout);assert.equal(await page.evaluate(()=>sceneAssembler.project.layers[0].opacity),.5);
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已保存并回读核对'));await page.reload();await page.waitForFunction(()=>window.sceneAssembler?.ready);assert.deepEqual(await state(),layout);
      // A pending drawing draft blocks writes without consuming its IndexedDB record.
      await page.evaluate(async id=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pixel-workbench',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise(resolve=>{const t=db.transaction('projects','readwrite'),s=t.objectStore('projects');s.put(new Blob(['drawing draft']),'project-'+id);s.put({pending:true},'project-'+id+'-meta');t.oncomplete=resolve;});},id);
      const count=puts;await page.keyboard.press('ArrowRight');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('绘画编辑器有未保存草稿'));assert.equal(puts,count);
      await page.evaluate(async id=>{const r=indexedDB.open('pixel-workbench',1);await new Promise(resolve=>{r.onsuccess=()=>{const t=r.result.transaction('projects','readwrite');t.objectStore('projects').delete('project-'+id);t.objectStore('projects').delete('project-'+id+'-meta');t.oncomplete=resolve;};});},id);
      conflict=true;await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('草稿已保留'));assert.equal(puts,count);await page.reload();await page.waitForFunction(()=>window.sceneAssembler?.ready);assert.deepEqual(await state(),saved.sceneAssembly);
      // Mobile uses the same pointer events; tapping a material then the scene works without HTML drag/drop.
      const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.route('**/api/project?*',r=>r.fulfill({status:200,contentType:'application/json',headers:{ETag:etag},body:JSON.stringify(original)}));const mp=await mobile.newPage();await mp.goto(url+'/scene-assembler.html?project='+id);await mp.waitForFunction(()=>window.sceneAssembler?.ready);await mp.getByRole('button',{name:'放置桌子',exact:true}).tap();const box=await mp.locator('#scene').boundingBox();await mp.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.equal(await mp.evaluate(()=>sceneAssembler.scene.objects.length),1);await mp.screenshot({path:path.join(out,'mobile.png')});await mobile.close();
      const editor=await context.newPage();await editor.route('**/api/project?*',r=>r.fulfill({status:200,contentType:'application/json',headers:{ETag:etag},body:JSON.stringify(saved)}));await editor.goto(url+'/index.html?project='+id);await editor.waitForFunction(()=>window.PE?.app?.persistence?.ready);assert.deepEqual(await editor.evaluate(async()=>JSON.parse(await PE.app.exportManager.exportProject(false).text()).sceneAssembly),saved.sceneAssembly);assert.match(await editor.getByRole('link',{name:'场景拼装器',exact:true}).getAttribute('href'),/scene-assembler.html\?project=scene-noodle-shop/);await editor.close();
    }else{
      const r=await fetch(url+'/api/project?id='+id),readback=await r.json();assert.deepEqual(readback.sceneAssembly,before);const {sceneAssembly,...source}=readback;assert.deepEqual(source,original);fs.writeFileSync(path.join(out,'readback.json'),JSON.stringify(readback));
    }
    assert.deepEqual(errors,[]);console.log('PASS '+(live?'LIVE saved and reopened 2 tables, 4 chairs, 1 stove; source unchanged':'isolated acceptance, variants, animation, undo/redo, source refresh, conflict and draft protection, mobile')+'; PNG/GIF in '+out);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
