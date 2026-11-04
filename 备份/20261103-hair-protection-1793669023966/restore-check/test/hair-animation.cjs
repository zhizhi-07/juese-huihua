const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','history','canvas','tools','export','api','frame-tools','hair-animation'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../js/${name}.js`,'utf8'),{filename:name});
const H=PE.HairAnimation;
function fixture(){
  const p=new PE.Project();p.layers=[];
  p.spriteSheets=['idle','walk','sit'].map((name,si)=>{const s=new PE.SpriteSheet('original32_'+name);s.frameWidth=s.frameHeight=12;s.fps=10;s.actions=['down','side','up'].map(dir=>{const a=new PE.Action(dir,dir);a.frames=[0,1,2,3].map(()=>{const f=new PE.Frame(si,0,0,12,12);f.duration=100;return f;});return a;});return s;});
  const head=new PE.Layer('head');head.sheetIndex=0;
  for(let si=0;si<3;si++){const l=si?new PE.Layer('head'):head;l.sheetIndex=si;l.locked=true;p.layers.push(l);for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=new ImageData(12,12),dx=si===1?1:0,dy=fi>=2?2:0;for(let y=1;y<4;y++)for(let x=3;x<6;x++)im.data.set([254,237,225,255],((y+dy)*12+x+dx)*4);l.frameData.set(`${si}_${ai}_${fi}`,im);}}
  const hair=new PE.Layer('头发 / 测试 / 后发');hair.sheetIndex=0;p.layers.push(hair);
  for(let ai=0;ai<3;ai++){const im=new ImageData(12,12);for(let y=0;y<8;y++)im.data.set([120+ai,70,80,255],(y*12+3)*4);hair.frameData.set(`0_${ai}_0`,im);}
  p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(hair);
  const history=new PE.HistoryManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(120,120),{style:{}}),p),tools=new PE.ToolManager();tools.init(p,cm,history);
  const app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){}},updateAll(){},persistence:{markDirty(){}}};
  return {p,hair,app};
}
function raster(im,w=12,h=12){const c=createCanvas(w,h),ctx=c.getContext('2d');if(im)PE.utils.drawImageData(ctx,im);return ctx.getImageData(0,0,w,h).data;}
function pixel(im,x,y){return Array.from(raster(im).slice((y*12+x)*4,(y*12+x+1)*4));}
(async()=>{
 const {p,hair,app}=fixture(),heads=p.layers.filter(l=>l.name==='head').map(l=>[...l.frameData.values()].map(i=>i.data.slice()));
 const originalLayers=p.layers.slice(),originalSource=hair.getFrameData('0_0_0').data.slice();
 let result=H.sync(app,{live:true});assert.equal(result.edits.length,33);assert.equal(p.layers.length,6);assert(hair.hairAnimation.live);
 assert.deepEqual(hair.hairAnimation.offsets['original32_idle/down/2'],{x:0,y:2});assert.deepEqual(hair.hairAnimation.offsets['original32_walk/side/2'],{x:1,y:2});
 let walk=p.layers.find(l=>l.hairAnimationId===hair.hairAnimation.id&&l.sheetIndex===1);
 assert.equal(pixel(walk.getFrameData('1_0_2'),4,2)[3],255);assert.equal(pixel(walk.getFrameData('1_0_2'),3,0)[3],0);
 assert.deepEqual(hair.getFrameData('0_0_0').data,originalSource,'source never baked');
 app.history.undo(p);assert.deepEqual(p.layers,originalLayers);assert(!hair.hairAnimation);app.history.redo(p);assert(hair.hairAnimation.live);
 H.install(app);p.currentLayerIndex=p.layers.indexOf(hair);
 const mark=()=>app.toolManager.drawPixel(p.layers.indexOf(hair),'0_0_0',5,5,20,40,60,255);
 mark();assert.deepEqual(pixel(walk.getFrameData('1_0_2'),6,7),[20,40,60,255]);assert.equal(app.history.undoStack.length,2,'brush and its sync are one undo');
 app.history.undo(p);assert.equal(pixel(walk.getFrameData('1_0_2'),6,7)[3],0);app.history.redo(p);assert.equal(pixel(walk.getFrameData('1_0_2'),6,7)[3],255);
 H.transaction(app,'persistent sway',()=>{hair.hairAnimation.enabled=true;hair.hairAnimation.params.ampH=3;hair.hairAnimation.overrides.original32_sit={...H.params(),ampH:0,ampV:0};H.applyPlan(H.plan(p,hair));});
 const recipe=JSON.stringify(hair.hairAnimation),animated=raster(walk.getFrameData('1_0_1')).slice();
 const flat=H.plan(p,hair,{...hair.hairAnimation,enabled:false});assert.notDeepEqual(animated,raster(flat.edits.find(e=>e.layer===walk&&e.key==='1_0_1').image),'sway changes pixels');
 app.toolManager.drawPixel(p.layers.indexOf(hair),'0_0_0',6,6,255,100,0,255);assert.equal(JSON.stringify(hair.hairAnimation),recipe,'editing master preserves effect and per-action recipe');assert(hair.hairAnimation.enabled);
 const mask={width:12,height:12,data:Array(144).fill(0)};mask.data[7*12+3]=1;
 H.transaction(app,'mask',()=>{hair.hairAnimation.params.masks.down=mask;H.applyPlan(H.plan(p,hair));});
 assert.deepEqual(hair.hairAnimation.params.masks.down,mask);
 const cfg=JSON.stringify(hair.hairAnimation);H.sync(app);assert.equal(JSON.stringify(hair.hairAnimation),cfg,'manual sync keeps sway and mask');
 H.transaction(app,'live off',()=>hair.hairAnimation.live=false);const paused=walk.getFrameData('1_0_2').data.slice();p.currentLayerIndex=p.layers.indexOf(hair);
 app.toolManager.drawPixel(p.layers.indexOf(hair),'0_0_0',7,7,25,50,75,255);assert.deepEqual(walk.getFrameData('1_0_2').data,paused,'live off does not synchronize a stroke, even with sway enabled');assert(hair.hairAnimation.enabled);
 H.sync(app);assert.deepEqual(pixel(walk.getFrameData('1_0_2'),8,9),[25,50,75,255],'manual sync reapplies persistent sway after editing with live off');
 const ex=new PE.ExportManager();ex.project=p;const blob=ex.exportProject(false),saved=JSON.parse(await blob.text());assert(saved.layers.some(l=>l.hairAnimation));
 const restored=(await new PE.ExportManager().importProject(blob)).project,loaded=restored.layers.find(l=>l.hairAnimation);assert.deepEqual(loaded.hairAnimation,hair.hairAnimation);H.refresh(restored,true);
 for(const l of p.layers.filter(l=>l.hairAnimationId))for(const [k,d]of l.frameData)assert.deepEqual(raster(restored.layers.find(r=>r.sheetIndex===l.sheetIndex&&r.hairAnimationId===l.hairAnimationId).getFrameData(k)),raster(d),'save/reopen reproduces exact pixels');
 const cm=new PE.CanvasManager(Object.assign(createCanvas(120,120),{style:{}}),restored);ex.init(restored,cm);const png=await ex.exportFrameAsBlob(1,0,1);assert(png.size>50,'actual PNG export');
 H.transaction(app,'off',()=>{hair.hairAnimation.enabled=false;H.applyPlan(H.plan(p,hair));});assert(hair.hairAnimation.params.masks.down);assert(hair.hairAnimation.overrides.original32_sit);assert(!hair.hairAnimation.enabled);
 const bad=JSON.parse(await blob.text());bad.layers.find(l=>l.hairAnimation).hairAnimation.params.ampH=999;await assert.rejects(()=>new PE.ExportManager().importProject(new Blob([JSON.stringify(bad)])),/参数无效/);
 const old=walk.getFrameData('1_0_1'),config=JSON.stringify(hair.hairAnimation);p.spriteSheets[2].actions[0].frames[1].locked=true;
 assert.throws(()=>H.transaction(app,'atomic rejection',()=>{hair.hairAnimation.params.ampH=5;H.applyPlan(H.plan(p,hair));}),/保护/);assert.equal(walk.getFrameData('1_0_1'),old);assert.equal(JSON.stringify(hair.hairAnimation),config);p.spriteSheets[2].actions[0].frames[1].locked=false;
 p.layers.filter(l=>l.name==='head').forEach((l,i)=>[...l.frameData.values()].forEach((im,j)=>assert.deepEqual(im.data,heads[i][j],'protected base untouched')));
 const outside=new ImageData(12,12);outside.data.set([1,2,3,255],(11*12+11)*4);const off=H.deform(outside,p.getCurrentFrame(),{x:4,y:4},0,H.params(),null,false);assert.equal(off.clipped,1);assert(off.image.placement);assert.equal(off.image.data.filter((v,i)=>i%4===3&&v).length,1,'out-of-frame pixel preserved');
 const before=JSON.stringify(hair.hairAnimation);hair.locked=true;H.validate(p);hair.locked=false;assert.equal(JSON.stringify(hair.hairAnimation),before);
 const deleted=(await new PE.ExportManager().importProject(blob)).project,owner=deleted.layers.find(l=>l.hairAnimation);deleted.removeLayer(deleted.layers.indexOf(owner));ex.project=deleted;
 const detached=ex.exportProject(false);const detachedRaw=JSON.parse(await detached.text());assert(!detachedRaw.layers.some(l=>l.hairAnimationId),'deleting master detaches generated layers on save without deleting their pixels');await new PE.ExportManager().importProject(detached);
 console.log('PASS hair animation: directional offsets, new action layers, real-time drawing, one-step undo/redo, persistent sway, per-action overrides, masks, sync, save/reopen, real PNG, trust-boundary validation, atomic lock rejection, protected bases and out-of-frame preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
