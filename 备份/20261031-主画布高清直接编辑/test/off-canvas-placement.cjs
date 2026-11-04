const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','history','canvas','tools','export','frame-tools'])vm.runInThisContext(fs.readFileSync('js/'+f+'.js','utf8'));
(async()=>{
  const p=new PE.Project(),s=new PE.SpriteSheet('fixture'),a=new PE.Action('idle','down');a.frames=[new PE.Frame(0,0,0,32,32),new PE.Frame(0,32,0,32,32)];s.actions=[a];p.spriteSheets=[s];
  const l=p.layers[0],key='0_0_0',original=new ImageData(8,8);for(let i=0;i<original.data.length;i+=4)original.data.set([i%251,40,90,255],i);original.placement={x:2,y:2,w:4,h:4};l.frameData.set(key,original);
  const history=new PE.HistoryManager(),tm=new PE.ToolManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(768,768),{style:{}}),p);cm.zoom=16;tm.init(p,cm,history);tm.setTool('move');tm.setSelection(2,2,4,4);
  const data=()=>l.getFrameData(key),r=()=>({...data().placement});
  tm.onMouseDown(3,3,0,false);tm.onMouseMove(-2,-3);assert.equal(data(),original);assert.deepEqual(tm.selection,{x:-3,y:-4,w:4,h:4});tm.onMouseUp();assert.deepEqual(r(),tm.selection);assert.deepEqual(data().data,original.data);
  assert(tm.selectLayerAt(-2,-3),'Off-canvas image box remains selectable');assert.deepEqual(tm.selection,r());assert(tm.nudgeSelection(-1,0));assert.equal(r().x,-4);history.undo(p);history.undo(p);assert.equal(data(),original);history.redo(p);assert.equal(r().x,-3);history.undo(p);
  assert(tm.transformSelection(0,key,r(),{x:40,y:50,w:4,h:4}));assert.deepEqual(data().data,original.data);assert.deepEqual(tm.selection,r());assert(tm.resizeSelection(2));assert.deepEqual(r(),{x:40,y:50,w:8,h:8});assert.deepEqual(data().data,original.data);history.undo(p);
  const ex=new PE.ExportManager();ex.init(p,cm);const raw=await ex.exportProject(false).text(),loaded=(await new PE.ExportManager().importProject(new Blob([raw]))).project;assert.deepEqual(loaded.layers[0].getFrameData(key).placement,r());assert.deepEqual(loaded.layers[0].getFrameData(key).data,original.data);
  const app={project:p,toolManager:tm,history,canvasManager:cm,animationPlayer:{pause(){}},persistence:{markDirty(){}},updateAll(){}};PE.FrameEditing.copy(app);PE.FrameEditing.paste(app,[{frameIndex:1}],{mode:'replace'});assert.deepEqual(l.getFrameData('0_0_1').placement,r());assert.deepEqual(l.getFrameData('0_0_1').data,original.data);history.undo(p);
  const clipped=createCanvas(32,32);PE.utils.drawImageData(clipped.getContext('2d'),data());assert(clipped.getContext('2d').getImageData(0,0,32,32).data.every(v=>v===0),'Fully outside renders empty, but source remains saved');
  assert(tm.transformSelection(0,key,r(),original.placement));assert.deepEqual(data().data,original.data);const returned=createCanvas(32,32);PE.utils.drawImageData(returned.getContext('2d'),data());assert(returned.getContext('2d').getImageData(2,2,1,1).data[3]===255,'Dragging back restores visible art');
  const frame=a.frames[0];frame.lockedRegions=[{x:0,y:2,w:1,h:1}];assert.equal(tm.transformSelection(0,key,r(),{...r(),x:-1}),false,'Partial overlap with protection stays blocked');frame.lockedRegions=[];
  for(const bad of [{x:NaN,y:0,w:1,h:1},{x:Infinity,y:0,w:1,h:1},{x:0,y:0,w:0,h:1},{x:0,y:0,w:1.5,h:1},{x:Number.MAX_VALUE,y:0,w:1,h:1}])assert.throws(()=>PE.utils.validateImagePlacement(bad,frame));
  for(const free of [false,true]){
    const native=new ImageData(32,32);native.data.set([10,20,30,255],(2*32+2)*4);native.data.set([40,50,60,255],(3*32+3)*4);l.frameData.set(key,native);tm.clearSelection();tm.freeImagePlacement=free;tm.setSelection(2,2,2,2);
    tm.onMouseDown(2.5,2.5,0,false);tm.onMouseMove(free?-1:-1.5,35.5);assert.equal(data(),native);tm.onMouseUp();assert.deepEqual(r(),{x:free?-1.5:-2,y:35,w:2,h:2});assert.deepEqual(tm.selection,r());assert.deepEqual([...data().data],[10,20,30,255,0,0,0,0,0,0,0,0,40,50,60,255]);history.undo(p);assert.equal(data(),native);history.redo(p);assert(data().placement);history.undo(p);
    assert.equal(tm.moveSelection(0,key,-1,2,2,2,-1,2),false,'Native source outside its stored pixels stays invalid');
    tm.freeImagePlacement=false;assert(tm.moveSelection(0,key,2,2,1,1,-1,2));const partial=data();assert.equal(partial.placement.x,-1);assert.deepEqual([...partial.data.subarray((2*partial.width)*4,(2*partial.width+1)*4)],[10,20,30,255]);assert.deepEqual([...partial.data.subarray((3*partial.width+4)*4,(3*partial.width+5)*4)],[40,50,60,255],'Unselected native pixel retained');history.undo(p);assert.equal(data(),native);
  }
  console.log('PASS: outside drag preview/commit; negative and beyond-frame boxes; native/HD and partial preservation; pick/nudge; outside resize; undo/redo; JSON reload; frame copy; clipped output and exact return; locks and invalid coordinates.');
})().catch(e=>{console.error(e);process.exitCode=1;});
