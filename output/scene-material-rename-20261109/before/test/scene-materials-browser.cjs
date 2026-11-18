const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
let saved={version:'1.0',name:'家具测试',palette:['#FEEDE1'],currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,spriteSheets:[{name:'场景画布',frameWidth:160,frameHeight:128,columns:1,rows:1,actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,width:160,height:128}]}]}],layers:[{name:'场景',sheetIndex:0,visible:true,opacity:1,frameData:{}}]};
await page.route('**/api/project?*',r=>r.fulfill({status:200,contentType:'application/json',headers:{ETag:'"test"'},body:JSON.stringify(saved)}));
await page.goto('http://127.0.0.1:8765/index.html?project=scene-ui-test');
await page.waitForFunction(()=>window.PE?.app?.persistence?.ready);
const answers=['床','32x48','台灯','16x16'];page.on('dialog',d=>d.accept(answers.shift()));
await page.getByRole('button',{name:'＋ 新建素材',exact:true}).click();
await page.getByRole('button',{name:'＋ 新建素材',exact:true}).click();
assert.equal(await page.locator('.sheet-item').count(),3);
await page.locator('.sheet-item').filter({hasText:'床'}).click();
assert.deepEqual(await page.evaluate(()=>{const p=PE.app.project;return [p.getCurrentSheet().name,p.getCurrentLayer().name,p.getCurrentFrame().width,p.getCurrentFrame().height]}),['床','床',32,48]);
await page.getByText('帧操作',{exact:true}).click();await page.locator('#duplicate-frame-btn').click();
assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),2);
saved=await page.evaluate(async()=>JSON.parse(await PE.app.exportManager.exportProject(false).text()));
await page.screenshot({path:'output/scene-materials-ui.png'});
await page.reload();await page.waitForFunction(()=>window.PE?.app?.persistence?.ready);
assert.equal(await page.evaluate(()=>PE.app.project.spriteSheets[1].actions[0].frames.length),2);
assert.equal(await page.locator('.sheet-item').count(),3);assert.deepEqual(errors,[]);
console.log('PASS: actual UI creates bed/lamp, switches matching layer, duplicates frame, exports and reloads; no page errors. API intercepted; no user project written.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});


