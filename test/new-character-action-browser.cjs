const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=path.resolve(__dirname,'../output/new-character-action-20261116');
const cv=createCanvas(16,16),ctx=cv.getContext('2d');ctx.fillStyle='#FEEDE1';ctx.fillRect(7,4,2,8);
const cel={width:16,height:16,dataURL:cv.toDataURL('image/png')};
const pngCache=new Map();
async function normalized(p){
  p=structuredClone(p);
  for(const l of p.layers)for(const c of Object.values(l.frameData)){
    if(!pngCache.has(c.dataURL)){
      const im=await loadImage(c.dataURL),canvas=createCanvas(im.width,im.height),context=canvas.getContext('2d');context.drawImage(im,0,0);
      pngCache.set(c.dataURL,Buffer.from(context.getImageData(0,0,im.width,im.height).data).toString('base64'));
    }c.dataURL=pngCache.get(c.dataURL);
  }return p;
}
function fixture(){
  const dirs=['down','side','up'],layers=[];
  dirs.forEach((dir,ai)=>{
    const parent=layers.length;layers.push({name:dir,isGroup:true,parent:null,sheetIndex:0,frameData:{}});
    for(const name of ['hand 2','body','head','hand','hand 描边','hand 2 描边','眼睛 / 测试'])layers.push({name,sheetIndex:0,parent,depth:1,visible:true,opacity:1,locked:true,inheritedBase:true,referenceOnly:/^hand/.test(name)?true:undefined,frameData:Object.fromEntries(Array.from({length:4},(_,fi)=>[`0_${ai}_${fi}`,cel]))});
  });
  return {name:'隔离动作测试',version:'1.0',spriteSheets:[{name:'original16_idle',frameWidth:16,frameHeight:16,fps:8,useFrameDurations:true,actions:dirs.map(direction=>({name:direction,direction,frames:Array.from({length:4},(_,fi)=>({sheetIndex:0,width:16,height:16,duration:100+fi*40}))}))},{name:'original16_sit',frameWidth:16,frameHeight:16,actions:[{name:'side',direction:'side',frames:[{sheetIndex:1,width:16,height:16}]}]}],layers,currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:2};
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],alerts=[],answers=[];page.on('pageerror',e=>errors.push(e.message));
  let saved=fixture(),revision='"initial"',puts=0;
  await page.route('**/api/project?*',r=>{
   assert.equal(new URL(r.request().url()).searchParams.get('id'),'action-ui-test');
   if(r.request().method()==='PUT'){
    assert.equal(r.request().headers()['if-match'],revision);assert.equal(r.request().headers()['x-pixel-editor'],'1');
    saved=r.request().postDataJSON();revision='"saved"';puts++;
   }
   return r.fulfill({status:200,contentType:'application/json',headers:{ETag:revision},body:JSON.stringify(saved)});
  });
  await page.goto('http://127.0.0.1:8765/?project=action-ui-test');await page.waitForFunction(()=>PE.app?.persistence?.ready);
  const add=page.getByRole('button',{name:'＋ 新建动作',exact:true});
  assert.equal(await add.count(),1,'人物动作列表应提供新建动作按钮');
  page.on('dialog',async d=>{if(d.type()==='alert'){alerts.push(d.message());await d.accept();}else{const a=answers.shift();if(a===null)await d.dismiss();else await d.accept(a);}});
  const snapshot=async()=>normalized(await page.evaluate(async()=>JSON.parse(await PE.app.exportManager.exportProject(false).text())));
  const before=await snapshot();answers.push(null,' ','original16_idle','场景画布','sleep','待机');
  for(let i=0;i<6;i++){await add.click();assert.deepEqual(await snapshot(),before);}
  assert.equal(alerts.length,5);answers.push('  挥手  ');await add.click();
  const copied=await snapshot(),si=2;
  assert.equal(copied.spriteSheets[si].name,'挥手');assert.equal(copied.spriteSheets[si].copiedFromIdle,true);
  assert.deepEqual(copied.spriteSheets.slice(0,si),before.spriteSheets);assert.deepEqual(copied.layers.slice(0,before.layers.length),before.layers);
  assert.deepEqual(copied.spriteSheets[si].actions,copied.spriteSheets[0].actions.map(a=>({...a,frames:a.frames.map(f=>({...f,sheetIndex:si}))})));
  assert.equal(copied.layers.length,before.layers.length*2);
  for(let i=0;i<before.layers.length;i++){
   const a=before.layers[i],b=copied.layers[before.layers.length+i];assert.equal(b.name,a.name);assert.equal(b.sheetIndex,si);assert.equal(b.locked,false);assert(!b.inheritedBase);
   assert.equal(b.parent,a.parent==null?a.parent:before.layers.length+a.parent);
   assert.deepEqual(b.frameData,Object.fromEntries(Object.entries(a.frameData).map(([k,v])=>[k.replace(/^0_/,'2_'),v])));
   if(/^hand/.test(b.name))assert.equal(b.referenceOnly,false);
  }
  const pixels=await page.evaluate(()=>{
   const app=PE.app,p=app.project,l=p.layers.find(l=>l.sheetIndex===2&&l.name==='hand'&&l.frameData.has('2_0_0'));
   p.currentLayerIndex=p.layers.indexOf(l);app.updateAll();app.toolManager.setTool('pencil');
   const cm=app.canvasManager,point=cm.pixelToScreen(7,8);return {x:point.x,y:point.y,zoom:cm.zoom,editable:!l.locked&&!PE.isProtectedHandLayer(l),index:p.currentLayerIndex};
  });assert.equal(pixels.editable,true);
  await page.mouse.click(pixels.x+pixels.zoom/2,pixels.y+pixels.zoom/2);
  const painted=await snapshot();assert.notDeepEqual(painted.layers[pixels.index].frameData['2_0_0'],copied.layers[pixels.index].frameData['2_0_0']);
  assert.deepEqual(painted.layers.slice(0,before.layers.length),before.layers);
  await page.locator('#undo-btn').click();assert.deepEqual((await snapshot()).layers[pixels.index].frameData,copied.layers[pixels.index].frameData);
  await page.locator('#redo-btn').click();
  const final=await snapshot();await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty);
  assert.equal(puts,1);assert.deepEqual(await normalized(saved),final);
  await page.reload();await page.waitForFunction(()=>PE.app?.persistence?.ready);assert.deepEqual(await snapshot(),final);
  assert(await page.getByRole('tab',{name:'身体',exact:true}).count());
  const selected=await page.evaluate(()=>{const p=PE.app.project;return p.layers.filter(l=>l.sheetIndex===2&&PE.isHandLayer(l)).every(l=>!l.locked&&!PE.isProtectedHandLayer(l));});assert(selected);
  await page.screenshot({path:path.join(out,'browser.png'),fullPage:true});
  saved={version:'1.0',name:'场景隔离',spriteSheets:[{name:'场景画布',frameWidth:16,frameHeight:16,actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,width:16,height:16}]}]}],layers:[{name:'场景',sheetIndex:0,frameData:{}}]};revision='"scene"';
  await page.reload();await page.waitForFunction(()=>PE.app?.persistence?.ready);
  assert.equal(await add.isVisible(),false);assert.equal(await page.getByRole('button',{name:'＋ 新建素材',exact:true}).isVisible(),true);
  assert.deepEqual(errors,[]);console.log('PASS: button, cancelled/invalid/duplicate/reserved names; exact 3-direction 12-frame idle copy, hierarchy, both hands/outlines editable; real pencil/undo/redo; originals unchanged; If-Match save and reopen. API writes intercepted.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
