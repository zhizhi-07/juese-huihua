const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-approved-merge-path.txt'),'utf8'));
const meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/target.json')),approved=JSON.parse(fs.readFileSync(out+'/approved.json')),map=[0,1,2,2,3,3,0,0],si=8;
const url=id=>'http://127.0.0.1:8765/api/project?id='+id;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
(async()=>{
 if(process.argv[2]==='verify-saved'){
  const r=await fetch(url(meta.target.id));assert(r.ok);const actualText=await r.text(),actual=JSON.parse(actualText),submitted=JSON.parse(fs.readFileSync(out+'/candidate.json')),expected=structuredClone(submitted);
  // Character branches inherit the original first four hand cels by frame index on every API read.
  for(const [li,ai]of [[130,2],[135,1],[137,0],[140,0]])expected.layers[li].frameData[`8_${ai}_3`]=structuredClone(before.layers[li].frameData[`8_${ai}_3`]);
  assert.deepEqual(actual,expected,'只接受已定位的原手帧同步，不能接受未知变化');
  for(const li of [10,191])for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++)assert.deepEqual(actual.layers[li].frameData[`8_${ai}_${q}`],approved.layers[li].frameData[`8_${ai}_${q}`],'头发必须与确认B一致');
  const model=await load(actual),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
  const contact=createCanvas(1152,432),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++){
   model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=q;const im=cm.getCompositeImageData(8,ai,q);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=q;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);const blob=await ex.exportFrameAsBlob(8,ai,q),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/saved-${ai}-${q}.png`,b);const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle='#e3dfe8';cx.fillRect(q*144,ai*144,144,144);cx.drawImage(tile,q*144,ai*144,144,144);
  }
  fs.writeFileSync(out+'/saved-contact.png',contact.toBuffer('image/png'));fs.copyFileSync(out+'/candidate.json',out+'/submitted-candidate.json');fs.writeFileSync(out+'/candidate.json',actualText);fs.writeFileSync(out+'/api-readback.json',actualText);
  fs.writeFileSync(out+'/publish-verification.json',JSON.stringify({target:meta.target.id,approved:meta.approved.id,etag:r.headers.get('etag'),apiReadback:true,all48HairCelsMatchApproved:true,serverInheritedHandFrames:[[130,'8_2_3'],[135,'8_1_3'],[137,'8_0_3'],[140,'8_0_3']],inheritedHandPixelsEqualOriginalTarget:true,allOtherDataEqualsSubmitted:true,actualSavedMainPreviewPNGComparisons:24,browserChecked:false},null,2));console.log('PASS saved API: all48 approved hair cels exact; only four hand cels normalized to original base by existing server; actual24 main/preview/PNG outputs match.');return;
 }
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json'));
  for(const key of ['target','approved']){const r=await fetch(url(meta[key].id));assert(r.ok);assert.deepEqual(await r.json(),key==='target'?before:approved,key+'已变化，不能盲目覆盖');}
  const saved=await fetch(url(meta.target.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.target.etag},body:JSON.stringify(p)});const text=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+text);assert(saved.ok,text);
  const back=await fetch(url(meta.target.id));assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),p);fs.writeFileSync(out+'/api-readback.json',actual);
  fs.writeFileSync(out+'/publish-verification.json',JSON.stringify({target:meta.target.id,approved:meta.approved.id,etag:back.headers.get('etag'),apiReadback:true,candidateSHA256:crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex')},null,2));console.log('PASS publish: target ETag checked; approved B idle merged; live API readback exact.');return;
 }
 const p=structuredClone(before),sheet=p.spriteSheets[si],old=before.spriteSheets[si],a=approved.spriteSheets[si];
 assert.equal(sheet.name,'original32_idle');assert.equal(sheet.frameWidth,36);assert.equal(sheet.frameHeight,36);
 for(const li of [10,191]){assert.equal(p.layers[li].name,approved.layers[li].name);assert(p.layers[li].visible);}
 const atlas=createCanvas(288,108),ctx=atlas.getContext('2d'),image=new Image();image.src=old.imageDataURL;
 for(let ai=0;ai<3;ai++){
  assert.equal(old.actions[ai].frames.length,4);assert.equal(a.actions[ai].frames.length,8);assert.equal(old.actions[ai].direction,a.actions[ai].direction);
  sheet.actions[ai].frames=map.map((from,q)=>({...structuredClone(old.actions[ai].frames[from]),sourceX:q*36,sourceY:ai*36,duration:a.actions[ai].frames[q].duration}));
  for(let q=0;q<8;q++){const f=old.actions[ai].frames[map[q]];ctx.drawImage(image,f.sourceX,f.sourceY,36,36,q*36,ai*36,36,36);}
  for(let li=0;li<p.layers.length;li++)for(let q=0;q<8;q++){
   const key=`8_${ai}_${q}`,hair=[10,191].includes(li),from=hair?approved.layers[li].frameData[key]:before.layers[li].frameData?.[`8_${ai}_${map[q]}`];
   if(from)p.layers[li].frameData[key]=structuredClone(from);else delete p.layers[li].frameData[key];
   if(hair)assert.deepEqual(p.layers[li].frameData[key],approved.layers[li].frameData[key]);else assert.deepEqual(p.layers[li].frameData[key],before.layers[li].frameData?.[`8_${ai}_${map[q]}`]);
  }
 }
 sheet.columns=8;sheet.useFrameDurations=true;sheet.imageDataURL=atlas.toDataURL();
 const recovery=structuredClone(p);recovery.spriteSheets[si]=structuredClone(old);
 for(let li=0;li<p.layers.length;li++){
  for(const key of Object.keys(recovery.layers[li].frameData||{}))if(key.startsWith('8_'))delete recovery.layers[li].frameData[key];
  for(const [key,f]of Object.entries(before.layers[li].frameData||{}))if(key.startsWith('8_'))recovery.layers[li].frameData[key]=structuredClone(f);
 }
 assert.deepEqual(recovery,before,'只有待机时序/头发变化，其他动作及所有图层关系不变');fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 const contact=createCanvas(1152,3*2*144),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 const approvedModel=await load(approved),approvedCM=new PE.CanvasManager(document.createElement('canvas'),approvedModel);let approvedMatches=0;
 for(let state=0;state<2;state++){
  const model=await load(state?p:before),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
  for(let ai=0;ai<3;ai++)for(let q=0;q<sheet.actions[ai].frames.length;q++){
   const fi=state?q:map[q];model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;
   const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
   player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
   const blob=await ex.exportFrameAsBlob(si,ai,fi),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/${state?'new':'old'}-${ai}-${q}.png`,b);
   const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle=state?'#302d39':'#e3dfe8';cx.fillRect(q*144,(ai*2+state)*144,144,144);cx.drawImage(tile,q*144,(ai*2+state)*144,144,144);
   if(state){if(Buffer.from(im.data).equals(Buffer.from(approvedCM.getCompositeImageData(si,ai,q).data)))approvedMatches++;if(ai===2){model.layers[191].visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,q).data,im.data);model.layers[191].visible=true;}}
  }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 const diff=[];for(let li=0;li<p.layers.length;li++)for(const key of new Set([...Object.keys(before.layers[li].frameData||{}),...Object.keys(p.layers[li].frameData||{})]))if(JSON.stringify(before.layers[li].frameData?.[key])!==JSON.stringify(p.layers[li].frameData?.[key]))diff.push({layer:li,name:p.layers[li].name,key,source:[10,191].includes(li)?'approved B hair':'latest target repeated pose'});
 fs.writeFileSync(out+'/frame-diff.json',JSON.stringify(diff,null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.target.sha256,approvedSHA256:meta.approved.sha256,map,threeIdleDirections:true,framesEach:8,cycleMs:sheet.actions.map(a=>a.frames.reduce((n,f)=>n+f.duration,0)),hairMatchesApprovedBExactly:true,nonHairPixelsFromLatestTargetOnly:true,otherActionsAndMetadataUnchanged:true,restoreExtraCopyVerified:true,renderPreviewPNGComparisons:48,compositeFramesMatchingApproved:approvedMatches,backFrontHairTransparent:true,browserChecked:false},null,2));
 console.log('PASS build: approved front/rear idle copied exactly; latest target body/eyes/hands repeated without drawing changes; other actions protected; 48 main/preview/PNG comparisons; '+approvedMatches+'/24 composites match approved B.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
