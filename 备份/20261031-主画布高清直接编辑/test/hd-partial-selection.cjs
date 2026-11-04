const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','history','canvas','tools','export'])vm.runInThisContext(fs.readFileSync('js/'+f+'.js','utf8'));
(async()=>{
  const p=new PE.Project(),s=new PE.SpriteSheet('fixture'),a=new PE.Action('idle','side');a.frames=[new PE.Frame(0,0,0,32,32)];s.actions=[a];p.spriteSheets=[s];
  const l=p.layers[0],key='0_0_0',original=new ImageData(24,16);original.placement={x:10,y:12,w:6,h:4};for(let y=0;y<16;y++)for(let x=0;x<24;x++)original.data.set([x*9,y*15,123,255],(y*24+x)*4);l.frameData.set(key,original);
  const history=new PE.HistoryManager(),tm=new PE.ToolManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(512,512),{style:{}}),p);cm.zoom=16;tm.init(p,cm,history);tm.setTool('move');tm.setSelection(10,12,2,2);
  tm.onMouseDown(11,13,0,false);assert.deepEqual(tm._transform.source,{x:10,y:12,w:2,h:2},'Marquee must not become the whole image');tm.onMouseMove(9,13);assert.equal(l.getFrameData(key),original,'Drag is preview only');assert.deepEqual(tm.selection,{x:8,y:12,w:2,h:2});tm.onMouseUp();
  const moved=l.getFrameData(key);assert.deepEqual(moved.placement,{x:8,y:12,w:8,h:4});assert.deepEqual([moved.width,moved.height],[32,16]);
  const expected=new ImageData(32,16);for(let y=0;y<16;y++)expected.data.set(original.data.subarray(y*24*4,(y+1)*24*4),(y*32+8)*4);for(let y=0;y<8;y++){expected.data.fill(0,(y*32+8)*4,(y*32+16)*4);expected.data.set(original.data.subarray(y*24*4,(y*24+8)*4),y*32*4);}assert.deepEqual(moved.data,expected.data,'Only source and destination change; every other source byte exact');
  history.undo(p);assert.equal(l.getFrameData(key),original);assert.deepEqual(tm.selection,{x:10,y:12,w:2,h:2});history.redo(p);assert.equal(l.getFrameData(key),moved);history.undo(p);
  assert.equal(tm.editSelection(d=>d.data.fill(0),'must not edit whole source'),false);assert.equal(l.getFrameData(key),original);
  assert.equal(tm.transformSelection(0,key,{x:10,y:12,w:2,h:2},{x:10,y:12,w:3,h:2}),false,'Partial resize is explicitly rejected');
  assert(tm.moveSelection(0,key,9,11,8,6,9.1,11));assert(Math.abs(l.getFrameData(key).placement.x-10.1)<1e-6);assert.deepEqual(l.getFrameData(key).data,original.data,'A padded marquee around the entire HD image still uses lossless free placement');history.undo(p);
  const stepCount=history.undoStack.length;
  for(const protection of ['layer','frame','source-region','target-region','hand','inherited']){
    l.locked=protection==='layer';l.inheritedBase=protection==='inherited';l.name=protection==='hand'?'hand':'normal';a.frames[0].locked=protection==='frame';a.frames[0].lockedRegions=protection==='source-region'?[{x:10,y:12,w:1,h:1}]:protection==='target-region'?[{x:8,y:12,w:1,h:1}]:[];
    assert.equal(tm.moveSelection(0,key,10,12,2,2,8,12),false);assert.equal(l.getFrameData(key),original);assert.equal(history.undoStack.length,stepCount);
  }
  l.locked=false;l.inheritedBase=false;l.name='normal';a.frames[0].locked=false;a.frames[0].lockedRegions=[];
  assert(tm.moveSelection(0,key,10,12,2,2,-1,12));assert.equal(l.getFrameData(key).placement.x,-1);assert.equal(tm.selection.x,-1);history.undo(p);assert.equal(l.getFrameData(key),original);
  assert(tm.moveSelection(0,key,10,12,2,2,10.25,12));assert.equal(l.getFrameData(key).data[3],0,'Native-grid quarter-pixel movement preserves cut semantics');history.undo(p);
  assert(tm.moveSelection(0,key,10,12,2,2,11,12));const overlap=l.getFrameData(key);for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.deepEqual([...overlap.data.subarray((y*24+x+4)*4,(y*24+x+5)*4)],[...original.data.subarray((y*24+x)*4,(y*24+x+1)*4)],'Overlapping moves read original pixels');history.undo(p);
  assert(tm.moveSelection(0,key,10,12,2,2,8,12));const ex=new PE.ExportManager();ex.init(p,cm);const saved=JSON.parse(await ex.exportProject(false).text()),loaded=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(saved)]))).project;assert.deepEqual(loaded.layers[0].getFrameData(key).data,expected.data);assert.deepEqual(loaded.layers[0].getFrameData(key).placement,moved.placement);
  console.log('PASS: HD marquee retained; partial preview/commit; exact RGBA and unselected area; source expansion without resampling; overlapping move; native-grid fractional move; undo/redo; lock/hand/bounds guards; partial edit/resize rejection; save/reload.');
})().catch(e=>{console.error(e);process.exitCode=1;});
