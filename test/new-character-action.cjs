const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
for(const name of ['core','scene-materials','character-actions','export','visual-layers'])vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js',name+'.js'),'utf8'),{filename:name});
const out=path.resolve(__dirname,'../output/new-character-action-20261116'),ex=new PE.ExportManager();
const state=p=>JSON.stringify(p,(key,v)=>v instanceof Map?[...v]:v instanceof ImageData?{width:v.width,height:v.height,placement:v.placement,data:[...v.data]}:key==='image'?null:v);
(async()=>{
 const base='http://127.0.0.1:8765';
 const list=await fetch(base+'/api/projects');assert(list.ok);fs.writeFileSync(path.join(out,'projects.json'),await list.text());
 const status=await (await fetch(base+'/api/status')).json(),url=base+'/api/project?id='+encodeURIComponent(status.characterBaseProjectId);
 const response=await fetch(url);assert(response.ok);const raw=Buffer.from(await response.arrayBuffer()),sha=crypto.createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(path.join(out,'base-api.json'),raw);fs.writeFileSync(path.join(out,'base-api-meta.json'),JSON.stringify({url,ETag:response.headers.get('etag'),sha256:sha},null,2));
 const {project:p}=await ex.importProject(new Blob([raw]));
 const original=state(p),s=p.spriteSheets.find(s=>s.name==='original16_idle'),from=p.spriteSheets.indexOf(s),count=p.layers.length;
 const si=PE.addCharacterAction(p,'测试新动作'),copy=p.spriteSheets[si];
 assert(PE.VisualLayers.isIdleCopy(copy));assert.equal(copy.actions.length,s.actions.length);assert.equal(copy.getTotalFrames(),s.getTotalFrames());
 const sourceLayers=p.layers.slice(0,count),clones=p.layers.slice(count);let cells=0,hands=0;
 for(const l of clones){
  const old=sourceLayers.find(x=>x.name===l.name&&x.sheetIndex===from&&(!l.frameData.size||[...x.frameData.keys()].some(k=>k.startsWith(from+'_')&&l.frameData.has(si+'_'+k.slice(String(from).length+1)))));
  if(l.isGroup)continue;assert(old,'source layer exists');assert(!l.locked&&!l.inheritedBase);
  for(const [key,im]of l.frameData){
   const origin=old.frameData.get(from+'_'+key.slice(String(si).length+1));assert(origin);assert.notEqual(im,origin);assert.notEqual(im.data,origin.data);assert.deepEqual(im.data,origin.data);assert.deepEqual(im.placement,origin.placement);if(im.placement)assert.notEqual(im.placement,origin.placement);cells++;
  }
  if(PE.isHandLayer(l)){assert(!PE.isProtectedHandLayer(l));hands++;}
 }
 const afterSource={...p,spriteSheets:p.spriteSheets.slice(0,si),layers:sourceLayers};for(const k of ['currentSheetIndex','currentActionIndex','currentFrameIndex','currentLayerIndex'])afterSource[k]=JSON.parse(original)[k];
 assert.equal(state(afterSource),original,'original project data unchanged');
 const serialized=ex.exportProject(false),saved=JSON.parse(await serialized.text());
 const customBefore=JSON.stringify(saved.layers.filter(l=>l.sheetIndex===si));
 require('../js/character-sync.js')(saved,JSON.parse(raw),true);
 assert.equal(JSON.stringify(saved.layers.filter(l=>l.sheetIndex===si)),customBefore,'server branch inheritance must not relock or overwrite the independent action');
 const reopened=(await ex.importProject(serialized)).project;
 assert.equal(reopened.spriteSheets[si].copiedFromIdle,true);assert.equal(reopened.layers.filter(l=>l.sheetIndex===si&&PE.isHandLayer(l)).length,hands);
 const beforeInvalid=state(reopened),idle=reopened.spriteSheets.findIndex(s=>s.name==='original16_idle');
 reopened.spriteSheets[idle].name='missing';const missing=state(reopened);assert.throws(()=>PE.addCharacterAction(reopened,'缺少待机'),/没有完整/);assert.equal(state(reopened),missing);reopened.spriteSheets[idle].name='original16_idle';assert.equal(state(reopened),beforeInvalid);
 const oldHand=reopened.layers.filter(l=>l.sheetIndex===idle&&PE.isHandLayer(l));for(const l of oldHand){l.name='无手参考';l.referenceOnly=false;}const noHands=state(reopened);assert.throws(()=>PE.addCharacterAction(reopened,'缺少手层'),/缺少独立手部/);assert.equal(state(reopened),noHands);
 // A global HD layer retains placement without sharing pixels; an invalid parent fails atomically.
 const small=new PE.Project();small.layers=[];const sheet=new PE.SpriteSheet('original16_idle'),action=new PE.Action('side','side');action.frames=[new PE.Frame(0,0,0,16,16)];sheet.actions=[action];small.spriteSheets=[sheet];
 const hand=small.addLayer('hand');hand.sheetIndex=0;hand.referenceOnly=true;hand.frameData.set('0_0_0',new ImageData(16,16));
 const hd=small.addLayer('高清 / 参考'),im=new ImageData(8,8);im.placement={x:2.5,y:3,w:4,h:4};hd.frameData.set('0_0_0',im);PE.addCharacterAction(small,'高清动作');
 const hc=small.layers.find(l=>l.sheetIndex===1&&l.name===hd.name).getFrameData('1_0_0');assert.deepEqual(hc.placement,im.placement);hc.placement.x=5;hc.data[0]=12;assert.equal(im.placement.x,2.5);assert.equal(im.data[0],0);
 hand.parent=0;const invalid=state(small);assert.throws(()=>PE.addCharacterAction(small,'坏组'),/分组无效/);assert.equal(state(small),invalid);delete hand.parent;
 const capacity=small.spriteSheets.length;while(small.spriteSheets.length<128)small.spriteSheets.push(sheet);const full=state(small);assert.throws(()=>PE.addCharacterAction(small,'超限'),/容量上限/);assert.equal(state(small),full);small.spriteSheets.length=capacity;
 const latest=Buffer.from(await (await fetch(url)).arrayBuffer());assert.equal(crypto.createHash('sha256').update(latest).digest('hex'),sha,'real saved source not written');
 console.log(`PASS: saved source ${status.characterBaseProjectId}: ${copy.actions.length} directions/${copy.getTotalFrames()} frames, ${cells} independent cels, ${hands} editable hand/outline layers; originals and real API SHA unchanged; export/reopen; missing idle/hands, bad hierarchy, capacity fail atomically; global HD placement independent.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
