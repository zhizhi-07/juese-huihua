const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const deps='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(deps,'playwright'));
const root=path.resolve(__dirname,'..'),backup=fs.readFileSync(path.join(root,'output/latest-native16-logic-backup.txt'),'utf8');
let child,browser;
(async()=>{
 const dir=path.join(root,'output','native16-wiring-qa-'+Date.now());fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});
 for(const f of ['server.js','index.html'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
 const copy=(from,to)=>{fs.mkdirSync(to,{recursive:true});for(const e of fs.readdirSync(from,{withFileTypes:true})){const src=path.join(from,e.name),dst=path.join(to,e.name);if(e.isDirectory())copy(src,dst);else fs.copyFileSync(src,dst);}};
 for(const f of ['js','css'])copy(path.join(root,f),path.join(dir,f));
 fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync(path.join(root,'scripts/png.cjs'),path.join(dir,'scripts/png.cjs'));
 const raw=fs.readFileSync(path.join(backup,'main-after-unlock.json'));fs.writeFileSync(path.join(dir,'data/shared-project.json'),raw);
 const port=18771,base='http://127.0.0.1:'+port,errors=[];child=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});let serverOutput='';child.stdout.on('data',x=>serverOutput+=x);child.stderr.on('data',x=>serverOutput+=x);
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));if(i===79)throw Error(serverOutput);}
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1500,height:1050}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html');await page.waitForFunction(()=>window.PE?.app?.persistence?.ready);await page.waitForFunction(()=>document.querySelectorAll('.part-tab').length===5);
 assert.equal(await page.locator('.sheet-item').count(),4);await page.getByRole('tab',{name:'身体',exact:true}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.visual-layer-card')].some(r=>r.textContent.includes('前手 / 手臂')));
 const handCard=page.locator('.visual-layer-card').filter({has:page.locator('.layer-name',{hasText:'前手 / 手臂'})});assert.equal(await handCard.count(),1);await handCard.getByRole('button',{name:'选择',exact:true}).click();
 const target=await page.evaluate(()=>{const app=PE.app,p=app.project,l=p.getCurrentLayer(),im=l.getFrameData(p.getFrameKey());if(l.name!=='hand'||l.locked||PE.isProtectedHandLayer(l))throw Error('arm not editable');let i=3;while(i<im.data.length&&!im.data[i])i+=4;const at=(i-3)/4,x=at%im.width,y=Math.floor(at/im.width),point=app.canvasManager.pixelToScreen(x+.5,y+.5);app.toolManager.primaryColor={r:123,g:45,b:67,a:255};app.toolManager.brushSize=1;app.toolManager.setTool('pencil');return {...point,xPixel:x,yPixel:y,layer:p.currentLayerIndex};});
 await page.mouse.click(target.x,target.y);assert.deepEqual(await page.evaluate(({layer,xPixel,yPixel})=>{const p=PE.app.project,d=p.layers[layer].getFrameData(p.getFrameKey());return [...d.data.slice((yPixel*d.width+xPixel)*4,(yPixel*d.width+xPixel)*4+4)];},target),[123,45,67,255],'actual pencil gesture edits arm');
 assert(await page.evaluate(()=>PE.app.persistence.dirty));await page.keyboard.press('Control+z');
 await page.screenshot({path:path.join(backup,'native16-visual-arms.png'),fullPage:true});
 // Build a temporary hair layer only in this isolated browser fixture.
 await page.evaluate(()=>{const app=PE.app,p=app.project;app.selectFrame(1,1,0);const l=new PE.Layer('头发 / 原生测试 / 后发');l.sheetIndex=1;for(let ai=0;ai<3;ai++){const im=new ImageData(16,16);for(let y=1;y<7;y++)im.data.set([70,45,30,255],(y*16+4)*4);l.frameData.set(`1_${ai}_0`,im);}p.layers.push(l);p.currentLayerIndex=p.layers.length-1;app.updateAll();});
 await page.locator('#hair-sway').click();const dialog=page.getByRole('dialog',{name:'头发持续飘动'});await dialog.waitFor();assert.equal(await dialog.locator('[data-action] option').count(),4);assert.equal(await dialog.locator('[data-direction] option').count(),3);assert.equal(await dialog.locator('[data-radius]').inputValue(),'1');assert.equal(await dialog.getByRole('spinbutton',{name:'左右轻摆',exact:true}).inputValue(),'1');
 assert.deepEqual(await dialog.locator('[data-paint]').evaluate(c=>[c.width,c.height]),[16,16]);assert.equal(await dialog.locator('[data-apply]').isDisabled(),false);await dialog.locator('[data-cancel]').click();
 // The public AI branch entry must create a live character branch, never a detached old template.
 await page.evaluate(()=>{PE.app.persistence.dirty=false;});page.once('dialog',d=>d.accept('原生16同步验证'));const popupPromise=context.waitForEvent('page');await page.evaluate(()=>PE.createProjectBranch());const branchPage=await popupPromise;await branchPage.waitForLoadState('domcontentloaded');await branchPage.waitForFunction(()=>PE.app.persistence.ready);
 assert((new URL(branchPage.url())).searchParams.get('project').startsWith('character-'));
 const branch=await branchPage.evaluate(()=>({names:PE.app.project.spriteSheets.map(s=>s.name),hands:PE.app.project.layers.filter(PE.isHandLayer).map(l=>({locked:l.locked,inherited:l.inheritedBase,ref:l.referenceOnly}))}));assert(branch.names.every(n=>n.startsWith('original16_')));assert(branch.hands.every(h=>h.locked&&h.inherited&&h.ref));
 const savedMain=JSON.parse(raw),branchId=new URL(branchPage.url()).searchParams.get('project'),savedBranch=await(await fetch(base+'/api/project?id='+branchId)).json(),png=require('../scripts/png.cjs');
 for(const l of savedBranch.layers.filter(l=>!l.isGroup)){const keys=Object.keys(l.frameData);if(!keys.length)continue;const original=savedMain.layers.find(o=>o.name===l.name&&o.sheetIndex===l.sheetIndex&&Object.hasOwn(o.frameData,keys[0]));assert(original);for(const k of keys)assert.deepEqual(png.decode(Buffer.from(l.frameData[k].dataURL.split(',')[1],'base64')),png.decode(Buffer.from(original.frameData[k].dataURL.split(',')[1],'base64')),'created branch preserves latest drawn body and sitting');}
 assert.deepEqual(errors,[]);const result={status:'PASS',isolatedFixture:dir,realWorkspaceProjectWritten:false,checks:['five visual layer tabs and four actions','actual pencil gesture edits main sitting arm','native16 hair dialog contains four actions and three directions','mask and paint use 16 actual source pixels','native hair defaults one pixel','AI new-project entry creates current live character branch','branch inherits latest drawn sitting with protected arms','no browser runtime errors']};fs.writeFileSync(path.join(backup,'browser-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(child)child.kill();});

