const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
let saved={version:'1.0',name:'家具测试',palette:['#FEEDE1'],currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,spriteSheets:[{name:'场景画布',frameWidth:160,frameHeight:128,columns:1,rows:1,actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,width:160,height:128}]}]}],layers:[{name:'场景',sheetIndex:0,visible:true,opacity:1,frameData:{}}]};
let revision='"test"',puts=0;
await page.route('**/api/project?*',r=>{
  const request=r.request();
  assert.equal(new URL(request.url()).searchParams.get('id'),'scene-ui-test');
  if(request.method()==='PUT'){
    assert.equal(request.headers()['if-match'],revision);
    assert.equal(request.headers()['x-pixel-editor'],'1');
    saved=request.postDataJSON();revision='"saved"';puts++;
  }
  return r.fulfill({status:200,contentType:'application/json',headers:{ETag:revision},body:JSON.stringify(saved)});
});
await page.goto('http://127.0.0.1:8765/index.html?project=scene-ui-test');
await page.waitForFunction(()=>window.PE?.app?.persistence?.ready);
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
await page.locator('.sheet-item').filter({hasText:'场景画布'}).click();
assert.equal(await rename.isVisible(),false);
assert.equal(await page.locator('.sheet-item').count(),3);assert.deepEqual(errors,[]);
console.log('PASS: creates and switches materials, duplicates a frame, validates and renames only the selected sheet, saves with If-Match and reloads. API intercepted; no user project written.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});


