const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),{spawn}=require('child_process');
const {apiBase,completion,drawingResult}=require('../ai-service.cjs'),A=require('../js/ai-edits.js');
const deps='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(deps,'playwright')),{createCanvas,loadImage}=require(path.join(deps,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..');
const pixel={x:2,y:3,r:110,g:60,b:80,a:255},edit={sheetIndex:0,actionIndex:0,frameIndex:0,pixels:[pixel]};
const project={currentSheetIndex:0,layers:[{sheetIndex:0}],spriteSheets:[{actions:[{frames:[{width:32,height:32}]}]}]};
assert.equal(A.validate(project,0,[edit]),1);
assert.throws(()=>A.motion(project,'hair',[edit]));A.motion(project,'hair',[edit],true);A.motion(project,'building',[edit]);project.spriteSheets[0].name='original32_idle';A.motion(project,'hair',[edit]);project.spriteSheets[0].name='original32_walk';assert.throws(()=>A.motion(project,'eyes',[edit]));project.spriteSheets[0].name='';
assert.throws(()=>A.validate(project,0,[{...edit,pixels:[{...pixel,x:32}]}]));
assert.throws(()=>A.validate(project,0,[{...edit,pixels:[{...pixel,a:256}]}]));
assert.throws(()=>A.validate(project,0,[{...edit,sheetIndex:1}]));
project.layers[0].locked=true;assert.throws(()=>A.validate(project,0,[edit]));project.layers[0].locked=false;
project.spriteSheets[0].actions[0].frames[0].isPixelLocked=()=>true;assert.throws(()=>A.validate(project,0,[edit]));delete project.spriteSheets[0].actions[0].frames[0].isPixelLocked;
assert.equal(apiBase('http://127.0.0.1:9182/v1/'),'http://127.0.0.1:9182');assert.throws(()=>apiBase('file:///etc/passwd'));
assert.equal(completion('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n'),'OK');
assert.throws(()=>completion('data: {"choices":[{"delta":{"content":"OK"}}]}\n'));
assert.throws(()=>completion('data: [DONE]\n'));assert.deepEqual(drawingResult('```json\n{"reply":"好","edits":[]}\n```'),{reply:'好',edits:[]});
assert.deepEqual(drawingResult('说明：\n```json\n{"reply":"完整","edits":[]}\n```\n结束'),{reply:'完整',edits:[]});
assert.throws(()=>drawingResult('{"reply":"半截","edits":['),e=>e.rawOutput.includes('半截')&&e.finishReason==='invalid_json');
assert.throws(()=>completion('data: '+JSON.stringify({choices:[{delta:{content:'{"reply":"截断"'},finish_reason:'length'}]})+'\n\ndata: [DONE]\n'),e=>e.rawOutput.includes('截断')&&e.finishReason==='length');
let browser,child,upstream,dir;
(async()=>{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixel-ai-test-'));
  for(const file of ['server.js','ai-service.cjs','index.html','后台工程读写约定.md','人物绘制AI要求与自检.md','像素发型教程与自检.md','眼睛绘制AI要求与自检.md','衣服绘制AI要求与自检.md','建筑绘制AI要求与自检.md','物品绘制AI要求与自检.md'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
  for(const folder of ['js','css'])fs.cpSync(path.join(root,folder),path.join(dir,folder),{recursive:true});
  const blank=createCanvas(32,32).toDataURL();
  const fixture={version:'1.0',name:'AI 接入测试分支',currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,palette:[],layers:[{name:'头发 / 测试 / 前发',sheetIndex:0,visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width:32,height:32,dataURL:blank}}}],spriteSheets:[{name:'待机测试素材表',frameWidth:32,frameHeight:32,imageDataURL:blank,columns:1,rows:1,actions:[{name:'正面',direction:'down',frames:[{sheetIndex:0,sourceX:0,sourceY:0,width:32,height:32}]}]}]};
  fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});fs.writeFileSync(path.join(dir,'data/projects/ai-test.json'),JSON.stringify(fixture));fs.writeFileSync(path.join(dir,'data/shared-project.json'),JSON.stringify(fixture));
  let received,hold,reviews=[],emptyRetries=0,formatReplies=0;
  upstream=http.createServer(async(req,res)=>{
    if(req.url.startsWith('/v1/models')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'claude-opus-5-5-medium'},{id:'gpt-6-sol'}]}));return;}
    let raw='';for await(const chunk of req)raw+=chunk;received=JSON.parse(raw);
    if(received.messages.at(-1).content[0]?.text?.includes('格式失败测试')&&formatReplies++===0){res.end('data: '+JSON.stringify({choices:[{delta:{content:'{"reply":"半截方案","edits":['},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');return;}
    if(received.messages.at(-1).content[0]?.text?.includes('空响应重试测试')&&emptyRetries++===0){res.end('data: [DONE]\n\n');return;}
    const review=received.messages.at(-1).content[0]?.text?.includes('本轮是看图自检');
    if(review){const images=received.messages.at(-1).content.filter(c=>c.type==='image_url');const img=await loadImage(images[0].image_url.url),canvas=createCanvas(img.width,img.height),ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);reviews.push({pixel:[...ctx.getImageData(24,56,1,1).data],images:images.length});}
    const noPixels=received.messages.at(-1).content[0]?.text?.includes('无像素测试');
    const send=()=>{const content=JSON.stringify({reply:review?'看图检查：已看到应用后的测试像素。':'已按规范生成测试像素。',edits:review||noPixels?[]:[edit]});res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\ndata: [DONE]\n\n');};
    if(received.messages.at(-1).content[0]?.text?.includes('等待测试'))hold=send;else send();
  });await new Promise(r=>upstream.listen(18769,'127.0.0.1',r));
  child=spawn(process.execPath,[path.join(dir,'server.js'),'18768'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
  const base='http://127.0.0.1:18768';
  const blocked=await fetch(base+'/api/ai/models',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json','X-Pixel-Editor':'1'},body:'{}'});assert.equal(blocked.status,403);
  const missingHeader=await fetch(base+'/api/ai/models',{method:'POST',body:'{}'});assert.equal(missingHeader.status,403);
  const retry=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1'},body:JSON.stringify({baseURL:'http://127.0.0.1:18769',model:'gpt-6-sol',category:'item',messages:[{role:'user',content:'空响应重试测试'}],image:blank})});assert.equal(retry.status,200);assert.equal(emptyRetries,2);
  const preflight=await fetch(base+'/api/ai/models',{method:'OPTIONS',headers:{Origin:'null','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-pixel-token,x-pixel-editor'}});assert(preflight.headers.get('Access-Control-Allow-Methods').includes('POST'));
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('pixel-ai-settings',JSON.stringify({baseURL:'http://127.0.0.1:18769'})));
  await page.goto(base+'/index.html?project=ai-test');
  try{await page.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('[data-id="model"]').value);}catch(e){console.error('Startup diagnostics',errors,await page.evaluate(()=>({ready:window.PE?.app?.persistence?.ready,status:document.querySelector('[data-id="status"]')?.textContent,save:document.querySelector('#save-status')?.textContent})));throw e;}
  assert.equal(await page.locator('[data-id="model"] option:disabled').textContent(),'GPT-6.1（服务暂未提供）');
  for(const [value,file] of [['eyes','眼睛绘制AI要求与自检.md'],['clothes','衣服绘制AI要求与自检.md']]){await page.locator('[data-id="category"]').selectOption(value);assert((await page.locator('[data-id="docs"]').textContent()).includes(file));}
  await page.locator('[data-id="category"]').selectOption('hair');
  const ref=createCanvas(3,3);ref.getContext('2d').fillStyle='#ff0000';ref.getContext('2d').fillRect(0,0,3,3);
  await page.locator('[data-id="files"]').setInputFiles({name:'红色参考.png',mimeType:'image/png',buffer:ref.toBuffer('image/png')});
  await page.waitForFunction(()=>document.querySelectorAll('.ai-attachments img').length===1);
  await page.evaluate(async dataURL=>{const blob=await fetch(dataURL).then(r=>r.blob()),dt=new DataTransfer();dt.items.add(new File([blob],'粘贴参考.png',{type:'image/png'}));document.querySelector('[data-id="input"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));},blank);
  await page.waitForFunction(()=>document.querySelectorAll('.ai-attachments img').length===2);
  await page.locator('.ai-attachments button').last().click();assert.equal(await page.locator('.ai-attachments img').count(),1);
  await page.locator('[data-id="files"]').setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  assert.equal(await page.locator('.ai-attachments img').count(),1);assert((await page.locator('[data-id="status"]').textContent()).includes('PNG'));
  await page.locator('[data-id="input"]').fill('在当前前发层添加测试像素');await page.locator('[data-id="send"]').click();await page.locator('[data-id="apply"]').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-id="apply"]').disabled);
  assert((await page.locator('[data-id="change-title"]').textContent()).includes('待应用'));assert.equal(await page.locator('[data-id="change-frames"] img').count(),2);assert((await page.locator('.ai-message.assistant').last().textContent()).includes('尚未应用'));
  fs.mkdirSync(path.join(root,'自检记录/AI网页接入-20261027'),{recursive:true});await page.locator('[data-id="changes"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'自检记录/AI网页接入-20261027/修改位置与前后预览.png')});
  await page.locator('[data-id="change-frames"] button').first().click();assert.equal(await page.locator('#ai-chat').isVisible(),false);await page.getByRole('button',{name:'AI 对话',exact:true}).click();
  assert(received.messages[0].content.includes('像素发型教程与自检.md'));assert(!received.messages[0].content.includes('## 建筑绘制AI要求与自检.md'));
  assert.equal(received.messages.at(-1).content.filter(c=>c.type==='image_url').length,2);assert(received.messages.at(-1).content.some(c=>c.text==='用户参考图：红色参考.png'));
  const beforeDisk=fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8');
  await page.locator('[data-id="apply"]').click();await page.waitForFunction(()=>!document.querySelector('[data-id="undo"]').disabled);
  await page.waitForFunction(()=>document.querySelector('[data-id="status"]').textContent.includes('看图检查已完成'));
  assert.equal(reviews.length,1);assert.deepEqual(reviews[0],{pixel:[110,60,80,255],images:2});
  assert.equal(await page.evaluate(()=>PE.app.project.layers[0].getPixel('0_0_0',2,3).a),255);assert.equal(await page.evaluate(()=>PE.app.persistence.dirty),true);
  assert.equal(fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8'),beforeDisk);
  await page.locator('[data-id="undo"]').click();await page.waitForFunction(()=>document.querySelector('[data-id="undo"]').disabled);
  assert.equal(await page.evaluate(()=>PE.app.project.layers[0].getPixel('0_0_0',2,3).a),0);
  await page.locator('[data-id="input"]').fill('等待测试');await page.locator('[data-id="send"]').click();
  await page.waitForTimeout(200);assert(hold);
  await page.evaluate(()=>{pixelAPI.setPixels(0,0,0,0,[{x:1,y:1,r:20,g:30,b:40,a:255}]);});hold();
  await page.waitForFunction(()=>!document.querySelector('[data-id="apply"]').disabled);await page.locator('[data-id="apply"]').click();
  assert((await page.locator('[data-id="status"]').textContent()).includes('已变化'));
  assert.equal(await page.evaluate(()=>PE.app.project.layers[0].getPixel('0_0_0',1,1).a),255);
  await page.locator('[data-id="category"]').selectOption('building');await page.locator('[data-id="input"]').fill('画一块建筑测试像素');await page.locator('[data-id="send"]').click();await page.waitForFunction(()=>!document.querySelector('[data-id="apply"]').disabled);
  assert(received.messages[0].content.includes('## 建筑绘制AI要求与自检.md'));assert(!received.messages[0].content.includes('## 人物绘制AI要求与自检.md'));
  await page.locator('[data-id="apply"]').click();await page.waitForFunction(()=>!document.querySelector('[data-id="undo"]').disabled);
  await page.waitForFunction(()=>document.querySelector('[data-id="status"]').textContent.includes('看图检查已完成'));
  await page.evaluate(()=>PE.app.persistence.saveNow());assert.notEqual(fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8'),beforeDisk);
  assert.deepEqual(errors,[]);
  for(const [category,specific,excluded] of [['eyes','眼睛绘制AI要求与自检.md','衣服绘制AI要求与自检.md'],['clothes','衣服绘制AI要求与自检.md','眼睛绘制AI要求与自检.md']]){
    const r=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1'},body:JSON.stringify({baseURL:'http://127.0.0.1:18769',model:'gpt-6-sol',category,messages:[{role:'user',content:'测试分类文档'}],image:blank,context:{sheetIndex:0,actions:[{actionIndex:0,isIdle:true}]}})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));assert.deepEqual(data.documents,['后台工程读写约定.md','人物绘制AI要求与自检.md',specific]);assert(received.messages[0].content.includes('## '+specific));assert(!received.messages[0].content.includes('## '+excluded));
  }
  for(const motionPolicy of [undefined,{idleConfirmed:true},{idleConfirmed:true,explicitOtherActions:true}]){const r=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1'},body:JSON.stringify({baseURL:'http://127.0.0.1:18769',model:'gpt-6-sol',category:'hair',messages:[{role:'user',content:'测试其他动作授权'}],image:blank,context:{sheetIndex:0,actions:[{actionIndex:0,isIdle:false}],motionPolicy}})});assert.equal(r.status,motionPolicy?.explicitOtherActions?200:502);}
  await page.locator('[data-id="other-actions"]').check();await page.locator('[data-id="input"]').fill('无像素测试');await page.locator('[data-id="send"]').click();await page.waitForFunction(()=>document.querySelector('[data-id="status"]').textContent.includes('未产生任何像素'));assert.equal(await page.locator('[data-id="apply"]').isDisabled(),true);assert((await page.locator('.ai-message.assistant').last().textContent()).includes('画面没有改变'));assert.equal(await page.locator('[data-id="other-actions"]').isChecked(),false);
  const stableDisk=fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8');
  await page.locator('[data-id="input"]').fill('格式失败测试');await page.locator('[data-id="send"]').click();await page.waitForFunction(()=>document.querySelector('[data-id="output"]').open&&document.querySelector('[data-id="status"]').textContent.includes('格式不完整'));
  assert((await page.locator('[data-id="raw-output"]').textContent()).includes('半截方案'));assert.equal(await page.locator('[data-id="retry"]').isEnabled(),true);assert.equal(await page.locator('[data-id="apply"]').isDisabled(),true);assert.equal(fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8'),stableDisk);
  const userTurns=await page.locator('.ai-message.user').count();await page.locator('[data-id="retry"]').click();await page.waitForFunction(()=>!document.querySelector('[data-id="send"]').disabled&&document.querySelector('[data-id="raw-output"]').textContent.includes('已按规范'));
  assert.equal(formatReplies,2);assert.equal(await page.locator('.ai-message.user').count(),userTurns);assert.equal(fs.readFileSync(path.join(dir,'data/projects/ai-test.json'),'utf8'),stableDisk);
  fs.mkdirSync(path.join(root,'自检记录/AI网页接入-20261027'),{recursive:true});await page.screenshot({path:path.join(root,'自检记录/AI网页接入-20261027/网页对话测试.png')});
  // Verify the production handler with the real worker, without opening or changing user projects.
  if(process.argv.includes('--live')){
    const response=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1'},body:JSON.stringify({baseURL:'http://127.0.0.1:9182',model:'gpt-6-sol',category:'hair',messages:[{role:'user',content:'这是隔离的空白测试工程，只做绘画连通性测试：在目标前发图层的当前帧 (2,3)、(3,3)、(4,3) 画三个不透明深棕色像素，RGBA=80,50,60,255。只生成这三个像素，不画其他帧。请返回规范 JSON。'}],image:blank,context:{projectId:'ai-test',sheetIndex:0,actionIndex:0,frameIndex:0,targetLayerIndex:0,targetLayerName:'头发 / 测试 / 前发',actions:[{actionIndex:0,isIdle:true,frames:[{frameIndex:0,width:32,height:32,targetLayerPixels:[]}]}]}}),signal:AbortSignal.timeout(185000)});
    const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(typeof data.reply,'string');assert.equal(A.validate(fixture,0,data.edits),3);console.log('LIVE PASS: real model returned 3 validated drawing pixels with image input:',data.reply);
    const scene=createCanvas(160,160),sc=scene.getContext('2d');sc.fillStyle='white';sc.fillRect(0,0,160,160);sc.fillStyle='#00cc00';sc.fillRect(40,40,80,80);
    const reference=createCanvas(160,160),rc=reference.getContext('2d');rc.fillStyle='white';rc.fillRect(0,0,160,160);rc.fillStyle='#ff0000';rc.beginPath();rc.arc(80,80,40,0,Math.PI*2);rc.fill();
    const vision=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1'},body:JSON.stringify({baseURL:'http://127.0.0.1:9182',model:'gpt-6-sol',category:'item',review:true,messages:[{role:'user',content:'只做看图测试，请分别说出工程图和用户参考图中央图形的颜色与形状。不要修改，不要推测未看到的内容。'}],image:scene.toDataURL(),references:[{name:'参考.png',dataURL:reference.toDataURL()}],context:{projectId:'ai-test',targetLayerIndex:0}}),signal:AbortSignal.timeout(185000)});
    const check=await vision.json();assert.equal(vision.status,200,JSON.stringify(check));assert.deepEqual(check.edits,[]);assert(/绿|green/i.test(check.reply)&&/红|red/i.test(check.reply)&&/方|square/i.test(check.reply)&&/圆|circle/i.test(check.reply),check.reply);console.log('LIVE VISION PASS:',check.reply);
  }
  console.log('PASS: upload/paste/remove references, multimodal request, automatic review sees actual rendered pixels, model discovery, document routing, apply/undo, stale draft protection, explicit save. Test fixture:',dir);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(child)child.kill();if(upstream)upstream.closeAllConnections();if(upstream)upstream.close();});
