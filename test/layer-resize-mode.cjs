const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ImageData}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;
for(const name of ['core','history','tools'])vm.runInThisContext(fs.readFileSync('js/'+name+'.js','utf8'),{filename:name});
function fixture(hd=false){
  const p=new PE.Project(),s=new PE.SpriteSheet('resize'),a=new PE.Action('idle');
  s.actions=[a];a.frames=[new PE.Frame(0,0,0,16,16),new PE.Frame(0,0,0,16,16)];p.spriteSheets=[s];
  const key=p.getFrameKey(),layer=p.layers[0],image=new ImageData(hd?8:16,hd?4:16);
  for(let y=0;y<(hd?4:2);y++)for(let x=0;x<(hd?8:4);x++)image.data.set([x*20,y*30,100,x%2?128:255],((hd?y:y+3)*image.width+(hd?x:x+2))*4);
  if(hd)image.placement={x:2,y:3,w:4,h:2};layer.frameData.set(key,image);
  const history=new PE.HistoryManager(),tm=new PE.ToolManager();tm.init(p,null,history);tm.setSelection(2,3,4,2);
  return {p,layer,key,image,history,tm,data:()=>layer.getFrameData(key)};
}
const rgba=(d,x,y)=>[...d.data.slice((y*d.width+x)*4,(y*d.width+x+1)*4)];
{
  const {tm,data,image,history,p}=fixture();tm.imageResizeMode='hd';
  assert(tm.resizeSelection(.5));assert.deepEqual(data().placement,{x:2,y:3,w:2,h:1});
  assert.equal(data().width,4,'HD resize retains the original four source columns');
  for(let y=0;y<2;y++)for(let x=0;x<4;x++)assert.deepEqual(rgba(data(),x,y),rgba(image,x+2,y+3));
  history.undo(p);assert.equal(data(),image);history.redo(p);assert.equal(data().width,4);
  assert(tm.resizeSelection(2));assert.deepEqual(data().placement,{x:2,y:3,w:4,h:2});
  assert.equal(data().width,4);assert.equal(data().height,2);
}
{
  const {tm,data,image,history,p,layer}=fixture(true);tm.imageResizeMode='pixel';
  assert(tm.resizeSelection(.5));assert.equal(data().placement,undefined,'in-canvas ordinary resize produces editable frame pixels');
  assert.deepEqual(tm.selection,{x:2,y:3,w:2,h:1});
  assert.deepEqual(rgba(data(),2,3),rgba(image,2,2));assert.deepEqual(rgba(data(),3,3),rgba(image,6,2));
  assert.equal(rgba(data(),4,3)[3],0);history.undo(p);assert.equal(data(),image);history.redo(p);assert.equal(data().placement,undefined);
  assert.equal(layer.getFrameData('0_0_1'),null,'other frames stay untouched');
}
{
  const {tm,data,image,history,p}=fixture(true);tm.imageResizeMode='pixel';
  assert(tm.nudgeSelection(1,0));assert.equal(data().width,8,'moving alone must not resample');assert.deepEqual(data().data,image.data);history.undo(p);
  assert(tm.transformSelection(0,p.getFrameKey(),tm.selection,{x:-2,y:3,w:2,h:1}));
  assert.deepEqual(data().placement,{x:-2,y:3,w:2,h:1});assert.equal(data().width,2);assert.equal(data().height,1);assert.deepEqual(rgba(data(),0,0),rgba(image,2,2));history.undo(p);assert.equal(data(),image);
  assert.equal(tm.transformSelection(0,p.getFrameKey(),tm.selection,{x:2,y:3,w:2.5,h:1}),false,'ordinary mode rejects fractional pixel dimensions');
  assert.equal(tm.transformSelection(0,p.getFrameKey(),tm.selection,{x:2,y:3,w:4096,h:4097}),false,'resampling is capped at 16 million pixels');
  p.getCurrentFrame().addLockedRegion(2,3,1,1);const n=history.undoStack.length;assert.equal(tm.resizeSelection(.5),false);assert.equal(data(),image);assert.equal(history.undoStack.length,n);
}
{
  const {tm,data,image,p}=fixture();tm.imageResizeMode='hd';tm.setTool('move');
  tm.onMouseDown(6,5,0,true);tm.onMouseMove(4,4);assert.equal(data(),image,'drag previews do not change saved data');tm.onMouseUp();
  assert.equal(data().width,4);assert.deepEqual(data().placement,{x:2,y:3,w:2,h:1});
  const f=fixture();f.tm.imageResizeMode='hd';f.tm.setSelection(2,3,2,1);assert.equal(f.tm.resizeSelection(2),false,'HD resize must not discard pixels outside a partial selection');assert.equal(f.data(),f.image);
  const g=fixture();g.tm.imageResizeMode='pixel';assert(g.tm.transformSelection(0,g.key,g.tm.selection,{x:20,y:20,w:2,h:1}));assert.equal(g.data().width,2,'off-canvas ordinary resize must not silently become HD');
  const h=fixture();h.tm.imageResizeMode='pixel';h.tm.freeImagePlacement=true;assert(h.tm.transformSelection(0,h.key,h.tm.selection,{x:2.5,y:3.5,w:2,h:1}));assert.equal(h.data().width,2);assert.deepEqual(h.data().placement,{x:2.5,y:3.5,w:2,h:1});
}
console.log('PASS: selectable HD/pixel resizing, exact nearest RGBA, undo/redo, non-destructive drag preview, move-only preservation, off-canvas/fractional placement, dimension limits, locks, partial-selection and other-frame isolation.');
