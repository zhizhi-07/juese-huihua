const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]||path.join(root,'output/main-clothing-sync-20261104-1793781420870'));
for(const name of ['core','history','canvas','tools','export','api','frame-tools','hair-animation','clothing-fit','clothing-sync']){if(name==='clothing-fit')PE.ClothingFit=require('../js/clothing-fit.js');else vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});}
const C=PE.ClothingSync,png=require('../scripts/png.cjs');
async function fixture(){const raw=JSON.parse(fs.readFileSync(dir+'/before.json')),p=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project,history=new PE.HistoryManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(160,160),{style:{}}),p),tools=new PE.ToolManager();p.currentSheetIndex=1;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.name==='服装 / 衣服'&&l.sheetIndex===1);tools.init(p,cm,history);const app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){},_renderPreviewFrame(){}},updateAll(){},selectFrame(si,ai,fi){p.currentSheetIndex=si;p.currentActionIndex=ai;p.currentFrameIndex=fi;},persistence:{markDirty(){}}};return {p,raw,app};}
function bytes(p){return p.layers.map(l=>({l,parent:l.parent==null?null:p.layers[l.parent],frames:new Map(l.frameData),visible:l.visible}));}
async function main(){
  const {p,raw,app}=await fixture(),old=bytes(p),source=p.getCurrentLayer(),sourceFirst=new Map([0,1,2].map(ai=>[ai,source.getFrameData(`1_${ai}_0`)]));assert.equal(source.name,'服装 / 衣服');
  const result=C.sync(app,{live:true});C.validate(p);assert(result.edits.length>40);assert(source.clothingSync.live);assert(!result.sitPending);assert(result.edits.some(e=>e.key.startsWith('3_')),'blank sitting is generated from the idle masters');assert.deepEqual(source.clothingSync.sitGenerated,p.spriteSheets[3].actions.map((_,ai)=>`3_${ai}_0`));
  for(const v of old)if(PE.classifyPart(v.l.name)?.category!=='衣服'){assert.deepEqual([...v.l.frameData],[...v.frames]);assert.equal(v.l.visible,v.visible);assert.equal(v.l.parent==null?null:p.layers[v.l.parent],v.parent);}
  for(const [ai,im]of sourceFirst)assert.equal(source.getFrameData(`1_${ai}_0`),im);
  const preserved=new Map();for(const key of source.clothingSync.preserved){const l=p.layers.find(l=>l.clothingSyncId===source.clothingSync.id&&l.getFrameData(key));preserved.set(key,l.getFrameData(key));}
  const exported=new PE.ExportManager();exported.project=p;const blob=exported.exportProject(false),data=JSON.parse(await blob.text()),loaded=(await exported.importProject(blob)).project;assert.deepEqual(loaded.layers.find(l=>l.clothingSync).clothingSync,source.clothingSync);C.validate(loaded);
  // Candidate construction keeps original raw base PNG bytes and unknown fields, not an export round-trip.
  const candidate=structuredClone(raw);candidate.currentLayerIndex=p.layers.indexOf(old[raw.currentLayerIndex].l);candidate.layers=p.layers.map(l=>{
    const original=old.find(v=>v.l===l),index=original?old.indexOf(original):-1,base=original?structuredClone(raw.layers[index]):{name:l.name,sheetIndex:l.sheetIndex,locked:l.locked,opacity:l.opacity,depth:l.depth,frameData:{}};
    if(original&&!Object.hasOwn(base,'parent')&&l.parent==null)delete base.parent;else base.parent=l.parent;base.visible=l.visible;if(l.clothingSync)base.clothingSync=structuredClone(l.clothingSync);if(l.clothingSyncId)base.clothingSyncId=l.clothingSyncId;
    for(const [key,im]of l.frameData)if(!original||original.frames.get(key)!==im)base.frameData[key]={width:im.width,height:im.height,...(im.placement?{placement:{...im.placement}}:{}),dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')};return base;
  });fs.writeFileSync(dir+'/candidate.json',JSON.stringify(candidate));
  fs.writeFileSync(dir+'/trial.json',JSON.stringify({generated:result.edits.length,preserved:source.clothingSync.preserved,sourceFramesUnchanged:3,baseUntouched:true,layerCountBefore:old.length,layerCountAfter:p.layers.length,originalLayerIndices:old.map(v=>p.layers.indexOf(v.l))},null,2));
  app.history.undo(p);assert.deepEqual(p.layers,old.map(v=>v.l));assert(!source.clothingSync);app.history.redo(p);assert(source.clothingSync.live);
  C.install(app);const key='1_1_0',im=source.getFrameData(key),i=(14*im.width+8)*4,was=Array.from(im.data.slice(i,i+4));app.toolManager.drawPixel(p.layers.indexOf(source),key,8,14,210,211,212,255);C.refresh(p);assert(p.layers.some(l=>l.sheetIndex===2&&[...l.frameData.values()].some(im=>im.data.some((v,i)=>i%4===0&&v===210&&im.data[i+1]===211))),'live brush reaches pickup');
  for(const [key,image]of preserved)assert(p.layers.some(l=>l.frameData.get(key)===image),'manual frame replaced');
  app.history.undo(p);assert.deepEqual(Array.from(source.getFrameData(key).data.slice(i,i+4)),was);app.history.redo(p);assert.equal(source.getFrameData(key).data[i],210);
  const target=p.layers.find(l=>l.clothingSyncId===source.clothingSync.id&&l.sheetIndex===1&&l.getFrameData('1_1_1'));p.currentSheetIndex=1;p.currentActionIndex=1;p.currentFrameIndex=1;p.currentLayerIndex=p.layers.indexOf(target);const keep=C.preserve(app);assert(keep);const manual=target.getFrameData('1_1_1');source.getFrameData('1_1_0').data[i]=211;C.refresh(p);assert.equal(target.getFrameData('1_1_1'),manual);assert(!C.preserve(app));
  const sitSources=[];
  for(let ai=0;ai<2;ai++){
    const l=p.layers.find(l=>l.clothingSyncId===source.clothingSync.id&&l.sheetIndex===3&&PE.isLayerInAction(p,l,3,ai));
    const key=`3_${ai}_0`,body=C.base(p,3,ai,0,'body'),ink=new ImageData(body.width,body.height);
    for(let i=0;i<ink.data.length;i+=4)if(body.data[i+3]&&body.data[i]!==70)ink.data.set([33,190,111,255],i);
    p.currentSheetIndex=3;p.currentActionIndex=ai;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(l);
    l.frameData.delete(key);assert.throws(()=>C.preserve(app),/手画/);
    l.frameData.set(key,ink);sitSources.push([l,key,ink]);assert(C.preserve(app));
    assert(!source.clothingSync.sitGenerated.includes(key),'a confirmed first frame is no longer auto-generated');
    const seat=C.plan(p,source);assert(!seat.sitPending);assert(!seat.edits.some(e=>e.key===key),'a confirmed first frame is the master');C.apply(seat);
    for(const [layer,k,im] of sitSources)assert.equal(layer.getFrameData(k),im);
  }
  for(const [l,k] of sitSources)assert(l.getFrameData(k.replace(/0$/,'1')).data.some((v,i)=>i%4===0&&v===33));
  assert(p.layers.some(l=>l.clothingSyncId===source.clothingSync.id&&l.getFrameData('3_2_0')?.data.some((v,i)=>i%4===3&&v)));
  assert(!C.preserve(app));assert(C.plan(p,source).sitPending);
  p.spriteSheets[3].actions.length=1;
  const sideOnly=C.plan(p,source);
  assert(!sideOnly.sitPending,'side-only sitting must not wait for a front view');
  assert(!sideOnly.edits.some(e=>/^3_[12]_/.test(e.key)));
  const atom=await fixture(),frame=atom.p.spriteSheets[2].actions[0].frames[2];frame.locked=true;const snapshot=atom.p.layers.slice();assert.throws(()=>C.sync(atom.app),/保护/);assert.deepEqual(atom.p.layers,snapshot);assert(!atom.p.getCurrentLayer().clothingSync);
  const bad=structuredClone(data);bad.layers.find(l=>l.clothingSync).clothingSync.preserved=['1_1_0'];await assert.rejects(()=>exported.importProject(new Blob([JSON.stringify(bad)])),/保留/);
  console.log('PASS clothing: 3 idle masters; blank sitting generated, painted first frames kept; base/geometry unchanged; atomic locks; undo/redo; live brush; manual keep/unkeep; PNG/config roundtrip; invalid config rejected.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});module.exports={fixture};
