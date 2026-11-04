const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,ImageData}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;
global.document={addEventListener(){},createElement:()=>createCanvas(1,1)};
for(const name of ['core','history','tools','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),{filename:name});
const p=new PE.Project(),sheet=new PE.SpriteSheet('fixture'),action=new PE.Action('idle','down');
sheet.actions=[action];action.frames=[new PE.Frame(0,0,0,8,8),new PE.Frame(0,0,0,8,8)];p.spriteSheets=[sheet];
const data=new ImageData(8,8),layer=p.layers[0];layer.frameData.set('0_0_0',data);
for(let y=2;y<4;y++)for(let x=2;x<5;x++)data.data.set([x*50,y*50,100,x===2?64:255],(y*8+x)*4);
data.data.set([48,48,48,255],0);
const original=data.data.slice(),history=new PE.HistoryManager(),tools=new PE.ToolManager();tools.init(p,null,history);tools.setSelection(2,2,3,2);
assert(tools.editSelection(p=>PE.flipImagePixels(p),'水平翻转'));
assert.deepEqual([...data.data.slice((2*8+2)*4,(2*8+3)*4)],[200,100,100,255]);
assert.deepEqual([...data.data.slice((2*8+4)*4,(2*8+5)*4)],[100,100,100,64]);
assert.deepEqual([...data.data.slice(0,4)],[48,48,48,255]);assert.equal(history.undoStack.length,1);
const flipped=data.data.slice();history.undo(p);assert.deepEqual(data.data,original);history.redo(p);assert.deepEqual(data.data,flipped);
assert(tools.editSelection(p=>PE.flipImagePixels(p,true),'上下翻转'));assert.equal(data.data[(2*8+2)*4+1],150);history.undo(p);
tools.setSelection(0,0,8,8);assert(tools.editSelection(p=>PE.removeImageColor(p,{rgb:[48,48,48]}),'抠图'));assert.equal(data.data[3],0);history.undo(p);assert.deepEqual(data.data,flipped);
const steps=history.undoStack.length;
for(const protect of ['layer','frame','region','inherited']){
  layer.locked=protect==='layer';layer.inheritedBase=protect==='inherited';p.getCurrentFrame().locked=protect==='frame';p.getCurrentFrame().lockedRegions=[];
  if(protect==='region')p.getCurrentFrame().addLockedRegion(2,2,1,1);
  assert.equal(tools.editSelection(p=>PE.flipImagePixels(p),'拒绝'),false);assert.deepEqual(data.data,flipped);assert.equal(history.undoStack.length,steps);
}
layer.locked=false;layer.inheritedBase=false;p.getCurrentFrame().locked=false;p.getCurrentFrame().lockedRegions=[];
assert.throws(()=>tools.editSelection(p=>PE.removeImageColor(p,{rgb:[0,0,0],tolerance:-1}),'错误'),/容差/);assert.deepEqual(data.data,flipped);assert.equal(history.undoStack.length,steps);
assert.equal(layer.getFrameData('0_0_1'),null);tools.clearSelection();assert.equal(tools.editSelection(()=>{},'无选区'),false);
console.log('PASS: canvas flips preserve RGBA; selection isolation; keying; atomic undo/redo; protected layer/frame/region rejection; invalid input leaves pixels unchanged.');
