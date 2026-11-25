const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
let saved={version:'1.0',name:'家具测试',palette:['#FEEDE1'],currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,spriteSheets:[{name:'场景画布',frameWidth:160,frameHeight:128,columns:1,rows:1,actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,width:160,height:128}]}]}],layers:[{name:'场景',sheetIndex:0,visible:true,opacity:1,frameData:{}}]};
let revision='"test"',puts=0;
await page.route('**/api/project?*',r=>{
  const request=r.request();
  assert.equal(new URL(request.url()).searchParams.get('id'),'scene-inn-20261119');
  if(request.method()==='PUT'){
    assert.equal(request.headers()['if-match'],revision);
    assert.equal(request.headers()['x-pixel-editor'],'1');
    saved=request.postDataJSON();revision='"saved"';puts++;
  }
  return r.fulfill({status:200,contentType:'application/json',headers:{ETag:revision},body:JSON.stringify(saved)});
});
await page.goto('http://localhost:8765/index.html?project=scene-inn-20261119');
await page.waitForFunction(()=>window.PE?.app?.persistence?.ready,undefined,{timeout:8000}).catch(error=>{throw new Error(errors.join('; ')||error.message);});
const answers=['床','32x48','台灯','16x16'];page.on('dialog',async d=>{
  if(d.type()==='alert'){alerts.push(d.message());await d.accept();return;}
  const answer=answers.shift();if(answer===null)await d.dismiss();else await d.accept(answer);
});
const alerts=[];
await page.getByRole('button',{name:'＋ 新建素材',exact:true}).click();
await page.getByRole('button',{name:'＋ 新建素材',exact:true}).click();
assert.equal(await page.locator('.sheet-item').count(),3);
await page.locator('.sheet-item').filter({hasText:'床'}).click();
assert.deepEqual(await page.evaluate(()=>{const p=PE.app.project;return [p.getCurrentSheet().name,p.getCurrentLayer().name,p.getCurrentFrame().width,p.getCurrentFrame().height]}),['床','床',32,48]);
await page.evaluate(()=>PE.app.project.getCurrentLayer().getFrameData('1_0_0').data.set([254,237,225,255]));
await page.getByText('帧操作',{exact:true}).click();await page.locator('#duplicate-frame-btn').click();
assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),2);
const snapshot=()=>page.evaluate(async()=>JSON.parse(await PE.app.exportManager.exportProject(false).text()));
const before=await snapshot(),rename=page.getByRole('button',{name:'重命名素材',exact:true});
assert.equal(await rename.isVisible(),true,'selected scene material needs a rename button');
answers.push(null,'   ','台灯','original16_idle','  双人床  ');
for(let i=0;i<4;i++){await rename.click();assert.deepEqual(await snapshot(),before);}
assert.equal(alerts.length,3);
await rename.click();
before.spriteSheets[1].name='双人床';
assert.deepEqual(await snapshot(),before);
assert.equal(await page.locator('.sheet-item.active strong').textContent(),'双人床');
assert.match(await page.locator('.canvas-title strong').textContent(),/^双人床/);
assert.equal(await page.evaluate(()=>PE.app.persistence.dirty),true);
assert.equal(puts,0);
const response=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/api/project?'));
await page.getByRole('button',{name:'保存工程',exact:true}).click();
assert.equal((await response).status(),200);
await page.waitForFunction(()=>!PE.app.persistence.dirty);
assert.equal(puts,1);assert.deepEqual(saved,before);
await page.reload();await page.waitForFunction(()=>window.PE?.app?.persistence?.ready);
assert.deepEqual(await snapshot(),before);
assert.equal(await page.evaluate(()=>PE.app.project.spriteSheets[1].actions[0].frames.length),2);
assert.equal(await page.locator('.sheet-item.active strong').textContent(),'双人床');
// Use a real browser file handle and writable stream without opening a native picker.
await page.addInitScript(()=>{
  window.showDirectoryPicker=async()=>{
    const root=await navigator.storage.getDirectory();
    return root.getDirectoryHandle('旅馆',{create:true});
  };
  window.showSaveFilePicker=async()=>{
    window.pickerCalls=(window.pickerCalls||0)+1;
    if(window.cancelPicker)throw new DOMException('取消','AbortError');
    const root=await navigator.storage.getDirectory();
    return root.getFileHandle('旅馆-桌子.png',{create:true});
  };
});
const selectBed=()=>page.locator('.sheet-item').filter({hasText:'双人床'}).click();
const menu=()=>page.locator('.dropdown-toggle').hover();
const exportFrame=page.locator('#studio-header .primary-actions > #export-frame-btn');
const target=()=>page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory();
  const file=await (await root.getFileHandle('旅馆-桌子.png')).getFile();
  return [...new Uint8Array(await file.arrayBuffer())];
});
await page.reload();await page.waitForFunction(()=>PE.app.persistence.ready);await selectBed();
await page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory();
  const handle=await root.getFileHandle('旅馆-桌子.png',{create:true});
  const writer=await handle.createWritable();await writer.write('old-file-content');await writer.close();
});
await menu();await page.locator('#set-scene-png').click();
await page.waitForFunction(()=>!document.querySelector('#set-scene-png').disabled);
assert.match(await page.locator('#export-notice.show').textContent(),/已写入 PNG：旅馆-桌子.png/);
assert.deepEqual((await target()).slice(0,8),[137,80,78,71,13,10,26,10]);
assert.equal(await page.evaluate(()=>window.pickerCalls),1,'choosing a location must export in the same action');
await page.reload();await page.waitForFunction(()=>PE.app.persistence.ready);await selectBed();
assert.equal(await exportFrame.isVisible(),true,'current PNG export is visible without opening the menu');
await exportFrame.click();
await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('已写入 PNG'));
assert.match(await page.locator('#export-notice.show').textContent(),/已写入 PNG/);
const expected=await page.evaluate(async()=>{
  const {project:p,exportManager:e}=PE.app;
  return [...new Uint8Array(await (await e.exportFrameAsBlob(p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex)).arrayBuffer())];
});
assert.deepEqual(await target(),expected);
assert.equal(await page.evaluate(()=>window.pickerCalls),undefined,'bound export must not open picker again');
await page.locator('.sheet-item').filter({hasText:'台灯'}).click();
await menu();
const download=page.waitForEvent('download');
await page.locator('#download-scene-png').click();
assert.equal((await download).suggestedFilename(),'台灯.png');
assert.match(await page.locator('#export-notice.show').textContent(),/已交给浏览器下载：台灯\.png/);
assert.deepEqual(await target(),expected);
await selectBed();await menu();answers.push('');
await page.locator('#clear-scene-png').click();
await page.waitForFunction(()=>!document.querySelector('#clear-scene-png').disabled);
const unboundDownload=page.waitForEvent('download');
await exportFrame.click();
assert.equal((await unboundDownload).suggestedFilename(),'双人床.png');
assert.equal(await page.evaluate(()=>window.pickerCalls),undefined,'unbound toolbar export downloads without opening the picker');
await menu();
await page.evaluate(()=>window.cancelPicker=true);
await page.locator('#set-scene-png').click();
await page.waitForFunction(()=>window.pickerCalls===1&&!document.querySelector('#set-scene-png').disabled);
assert.equal(await page.locator('#export-notice.show').textContent(),'已取消，未导出 PNG');
assert.deepEqual(await target(),expected);
await page.evaluate(()=>window.cancelPicker=false);
await menu();await page.locator('#set-scene-png').click();
await page.waitForFunction(()=>window.pickerCalls===2&&!document.querySelector('#set-scene-png').disabled);
assert.match(await page.locator('#save-status').textContent(),/已写入 PNG/);
assert.deepEqual(await target(),expected);
await menu();await page.locator('#set-scene-png-folder').click();
await page.waitForFunction(()=>!document.querySelector('#set-scene-png-folder').disabled);
assert.match(alerts.at(-1),/已记住文件夹「旅馆」/);
await page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory();
  const dir=await root.getDirectoryHandle('旅馆');
  const file=await dir.getFileHandle('台灯.png',{create:true});
  const writer=await file.createWritable();await writer.write('old lamp');await writer.close();
});
await page.reload();await page.waitForFunction(()=>PE.app.persistence.ready);
await page.locator('.sheet-item').filter({hasText:'台灯'}).click();
await exportFrame.click();
await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('旅馆/台灯.png'));
const lamp=await page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle('旅馆');
  const f=await (await dir.getFileHandle('台灯.png')).getFile();
  return [...new Uint8Array(await f.arrayBuffer())];
});
assert.deepEqual(lamp.slice(0,8),[137,80,78,71,13,10,26,10]);
assert.equal(await page.evaluate(()=>window.pickerCalls),undefined,'folder fallback must not open file picker');
await selectBed();await exportFrame.click();
await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('已写入 PNG：旅馆-桌子.png'));
assert.deepEqual(await target(),expected,'individual binding takes precedence over folder');
await page.evaluate(()=>{
  FileSystemFileHandle.prototype.queryPermission=async()=> 'prompt';
  FileSystemFileHandle.prototype.requestPermission=async()=> 'denied';
});
await exportFrame.click();
await page.waitForFunction(()=>document.querySelector('#export-notice').textContent.includes('没有「旅馆-桌子.png」的写入权限'));
assert.match(alerts.at(-1),/PNG 导出失败：没有「旅馆-桌子.png」的写入权限/);
assert.deepEqual(await target(),expected,'denied write permission must leave the bound file untouched');
assert.equal(puts,1,'PNG settings and export must not save project data');
await page.locator('.sheet-item').filter({hasText:'场景画布'}).click();
assert.equal(await rename.isVisible(),false);
const del=page.getByRole('button',{name:'删除素材',exact:true});
assert.equal(await del.isVisible(),false,'scene canvas must not show delete button');
await menu();assert.equal(await page.locator('#set-scene-png').isVisible(),false);
assert.equal(await page.locator('.sheet-item').count(),3);
await page.locator('.sheet-item').filter({hasText:'台灯'}).click();
await page.evaluate(()=>PE.app.project.getCurrentLayer().getFrameData('2_0_0').data.set([12,34,56,255]));
await selectBed();
assert.equal(await del.isVisible(),true,'selected scene material needs a delete button');
answers.push(null);
await del.click();
assert.equal(await page.locator('.sheet-item').count(),3,'canceling delete must keep material');
answers.push('');
await del.click();
assert.equal(await page.locator('.sheet-item').count(),2);
assert.deepEqual(await page.evaluate(()=>{
  const p=PE.app.project,l=p.layers.find(x=>x.name==='台灯');
  return [p.spriteSheets.map(s=>s.name),p.spriteSheets[1].actions[0].frames[0].sheetIndex,l.sheetIndex,[...l.frameData.keys()],[...l.getFrameData('1_0_0').data.slice(0,4)]];
}),[['场景画布','台灯'],1,1,['1_0_0'],[12,34,56,255]]);
assert.equal(await page.evaluate(()=>PE.app.persistence.dirty),true);
const delSave=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/api/project?'));
await page.getByRole('button',{name:'保存工程',exact:true}).click();
assert.equal((await delSave).status(),200);
await page.waitForFunction(()=>!PE.app.persistence.dirty);
assert.equal(puts,2);
assert.deepEqual(errors,[]);
console.log('PASS: inn URL; rename, delete with sheetIndex reindex, project folder and individual binding survive reload. API intercepted.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
