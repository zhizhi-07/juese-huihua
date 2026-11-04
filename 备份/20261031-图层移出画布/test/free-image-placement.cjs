const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement(){return Object.assign(createCanvas(1,1),{style:{}});}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','history','canvas','tools','export','frame-tools','pixel-import','hd-canvas'])vm.runInThisContext(fs.readFileSync('js/'+f+'.js','utf8'),{filename:f});
(async()=>{
  const p=new PE.Project(),s=new PE.SpriteSheet('fixture'),a=new PE.Action('idle','down');s.frameWidth=s.frameHeight=32;s.imageData=new ImageData(64,32);s.actions=[a];a.frames=[new PE.Frame(0,0,0,32,32),new PE.Frame(0,32,0,32,32)];p.spriteSheets=[s];
  const canvas=Object.assign(createCanvas(512,512),{style:{},getBoundingClientRect(){return {left:0,top:0,width:512,height:512};}}),cm=new PE.CanvasManager(canvas,p),history=new PE.HistoryManager(),tm=new PE.ToolManager();cm.zoom=16;tm.init(p,cm,history);
  const app={project:p,toolManager:tm,canvasManager:cm,history,animationPlayer:{pause(){}},updateAll(){},updateToolbar(){},persistence:{markDirty(){}}};
  const pixels=new ImageData(32,16);for(let i=0;i<pixels.data.length;i+=4)pixels.data.set([i%251,50,200,255],i);pixels.placement={x:0,y:0,w:8,h:4};const layer=PE.addImageLayer(app,pixels,'eye'),key=p.getFrameKey(),original=layer.getFrameData(key).data.slice(),data=()=>layer.getFrameData(key);
  assert.equal(tm.freeImagePlacement,false);assert.deepEqual(cm.screenToPixel(24,40),{x:1,y:2});assert.deepEqual(cm.screenToPixel(24,40,false),{x:1.5,y:2.5});
  tm.freeImagePlacement=true;tm.onMouseDown(14,15,0,false);tm.onMouseMove(14.5,15.25);assert.deepEqual(tm.selection,{x:12.5,y:14.25,w:8,h:4});assert.equal(data().placement.x,12,'drag remains preview only');tm.onMouseUp();assert.deepEqual(data().placement,{x:12.5,y:14.25,w:8,h:4});assert.deepEqual(data().data,original);
  history.undo(p);assert.equal(data().placement.x,12);history.redo(p);assert.equal(data().placement.x,12.5);assert(tm.nudgeSelection(1,0));assert.equal(data().placement.x,12.6);history.undo(p);
  tm.freeImagePlacement=false;assert.equal(data().placement.x,12.5,'turning option off must not move existing artwork');tm.onMouseDown(14,15,0,false);tm.onMouseMove(15,15);tm.onMouseUp();assert(Number.isInteger(data().placement.x));assert(Number.isInteger(data().placement.y));history.undo(p);
  const bounds={...data().placement};p.getCurrentFrame().addLockedRegion(20.4,15,1,1);assert.equal(tm.transformSelection(p.currentLayerIndex,key,bounds,bounds),false,'fractional placement must protect even a thin overlap near right edge');p.getCurrentFrame().lockedRegions=[];
  for(const x of [NaN,Infinity,-.01,24.01])assert.throws(()=>PE.utils.validateImagePlacement({x,y:2,w:8,h:4},p.getCurrentFrame()));assert.throws(()=>PE.utils.validateImagePlacement({x:1,y:2,w:8.5,h:4},p.getCurrentFrame()));
  PE.FrameEditing.copy(app,{rect:bounds});PE.FrameEditing.paste(app,[{frameIndex:1}],{mode:'replace'});assert.deepEqual(layer.getFrameData('0_0_1').placement,bounds);assert.deepEqual(layer.getFrameData('0_0_1').data,original);history.undo(p);
  const session=new PE.HDCanvasSession(app);assert.equal(session.original.placement.x,12.5);
  const exporter=new PE.ExportManager();exporter.init(p,cm);const raw=JSON.parse(await exporter.exportProject(false).text()),loaded=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;assert.deepEqual(loaded.layers[1].getFrameData(key).placement,bounds);assert.deepEqual(loaded.layers[1].getFrameData(key).data,original);
  raw.spriteSheets[0].name='original32_idle';require('../js/idle-canvas.cjs')(raw,36);assert.equal(raw.layers[1].frameData[key].placement.x,14.5);assert.equal(raw.layers[1].frameData[key].placement.y,16.25);
  p.currentLayerIndex=0;const normal=new ImageData(32,32);normal.data.set([10,20,30,255],(2*32+2)*4);p.layers[0].frameData.set(key,normal);tm.clearSelection();tm.freeImagePlacement=true;assert(tm.selectLayerAt(2.25,2.25));assert.equal(p.currentLayerIndex,0);
  tm.onMouseDown(2.25,2.25,0,false);tm.onMouseMove(2.75,2.25);assert.equal(p.layers[0].getFrameData(key),normal,'Normal free drag is preview-only');assert.deepEqual(tm.selection,{x:2.5,y:2,w:1,h:1});tm.onMouseUp();
  const moved=()=>p.layers[0].getFrameData(key);assert.deepEqual(moved().placement,{x:2.5,y:2,w:1,h:1});assert.deepEqual([...moved().data],[10,20,30,255]);
  history.undo(p);assert.equal(moved(),normal);assert.deepEqual(normal.data[(2*32+2)*4+3],255);history.redo(p);assert.equal(moved().placement.x,2.5);
  assert(tm.nudgeSelection(1,0));assert.equal(moved().placement.x,2.6);assert.equal(PE.utils.imageScale(p,0),10,'Fractional native layers need higher-density export');
  const normalRaw=JSON.parse(await exporter.exportProject(false).text()),normalLoaded=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(normalRaw)]))).project;assert.deepEqual(normalLoaded.layers[0].getFrameData(key).placement,moved().placement);assert.deepEqual(normalLoaded.layers[0].getFrameData(key).data,moved().data);
  assert.deepEqual([...(new PE.HDCanvasSession(app)).original.data],[10,20,30,255],'Native source remains editable without upscaling');
  history.undo(p);history.undo(p);assert.equal(moved(),normal);tm.setSelection(2,2,1,1);
  const startSteps=history.undoStack.length;
  for(const protection of ['layer','hand','frame','region','inherited']){
    p.layers[0].locked=protection==='layer';p.layers[0].referenceOnly=protection==='hand';p.layers[0].name=protection==='hand'?'hand':'Normal';p.layers[0].inheritedBase=protection==='inherited';p.getCurrentFrame().locked=protection==='frame';p.getCurrentFrame().lockedRegions=protection==='region'?[{x:3.05,y:2,w:.1,h:1}]:[];
    assert.equal(tm.moveSelection(0,key,2,2,1,1,2.1,2),false);assert.equal(moved(),normal);assert.equal(history.undoStack.length,startSteps);
  }
  p.layers[0].locked=false;p.layers[0].referenceOnly=false;p.layers[0].name='Normal';p.layers[0].inheritedBase=false;p.getCurrentFrame().locked=false;p.getCurrentFrame().lockedRegions=[];
  assert.equal(tm.moveSelection(0,key,2,2,1,1,-.1,2),false);assert.equal(moved(),normal);
  normal.data.set([40,50,60,255],(5*32+5)*4);tm.setSelection(2,2,1,1);assert(tm.nudgeSelection(1,0));assert.equal(moved().placement,undefined,'Partial selections retain ordinary on-grid behavior');assert.equal(tm.selection.x,3);assert.deepEqual([...moved().data.slice((5*32+5)*4,(5*32+6)*4)],[40,50,60,255]);history.undo(p);
  tm.freeImagePlacement=false;tm.clearSelection();assert(tm.selectLayerAt(2,2));tm.onMouseDown(2.25,2.25,0,false);tm.onMouseMove(2.75,2.25);tm.onMouseUp();assert.equal(moved().placement,undefined,'Unchecked native movement remains native');assert(Number.isInteger(tm.selection.x));
  console.log('PASS: HD/native free drag, preview-only state, 0.1 nudge, exact native crop, native undo/redo, native JSON/source edit, fractional export density, protected native layers/frame/regions/hand, bounds, partial-selection isolation and unchecked snapping.');
})().catch(e=>{console.error(e);process.exitCode=1;});
