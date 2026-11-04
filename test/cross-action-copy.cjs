const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,ImageData}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
for(const name of ['core','history','canvas','tools','export','api','frame-tools'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),{filename:name});
const p=new PE.Project();p.spriteSheets=['walk','idle','sit'].map((name,si)=>{
  const s=new PE.SpriteSheet('original32_'+name);s.actions=['down','side'].map(d=>{const a=new PE.Action(d,d);a.frames=[0,1].map(()=>new PE.Frame(si,0,0,8,8));return a;});return s;
});
const hair=new PE.Layer('头发 / 测试 / 后发'),idleHair=new PE.Layer(hair.name),body=new PE.Layer('body');
hair.sheetIndex=0;idleHair.sheetIndex=1;body.sheetIndex=2;body.inheritedBase=body.locked=true;
const source=new ImageData(8,8);source.data.set([230,80,100,255],(2*8+3)*4);hair.frameData.set('0_0_0',source);
p.layers=[hair,idleHair,body];p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=p.currentLayerIndex=0;
const history=new PE.HistoryManager(),tools=new PE.ToolManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(64,64),{style:{}}),p);tools.init(p,cm,history);
const app=PE.app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){}},updateAll(){},persistence:{markDirty(){}}};
assert(pixelAPI.copyLayerFrame().success);
p.selectFrame(1,0,0);p.currentLayerIndex=2;
let result=pixelAPI.pasteLayerFrames();assert(result.success,result.error);
assert.deepEqual(idleHair.getFrameData('1_0_0').data,source.data,'cross-action paste finds the matching hair, not the automatically selected body');
assert.equal(body.frameData.size,0);assert.equal(p.currentLayerIndex,p.layers.indexOf(idleHair));
history.undo(p);assert.equal(idleHair.getFrameData('1_0_0'),null);history.redo(p);
assert.notEqual(idleHair.getFrameData('1_0_0'),source);

p.selectFrame(2,0,0);p.currentLayerIndex=p.layers.indexOf(body);
const oldLayers=p.layers.slice(),oldParents=p.layers.map(l=>l.parent),oldSelected=p.currentLayerIndex;
const planned=PE.FrameEditing.plan(app,app.frameClipboard,[{}, {frameIndex:1}]);
assert.deepEqual(p.layers,oldLayers,'preview must not create layers');
result=PE.FrameEditing.apply(app,planned,'test cross-action paste');assert.equal(result.targetCount,2);
const sitHair=p.getCurrentLayer();assert.equal(sitHair.name,hair.name);assert.equal(sitHair.sheetIndex,2);
assert.equal(p.layers.length,oldLayers.length+1);assert(p.layers.indexOf(sitHair)<p.layers.indexOf(body),'rear hair stays behind the body');
assert.deepEqual(sitHair.getFrameData('2_0_0').data,source.data);assert.deepEqual(sitHair.getFrameData('2_0_1').data,source.data);
assert.notEqual(sitHair.getFrameData('2_0_0'),sitHair.getFrameData('2_0_1'));
history.undo(p);assert.deepEqual(p.layers,oldLayers);assert.deepEqual(p.layers.map(l=>l.parent),oldParents);assert.equal(p.currentLayerIndex,oldSelected);
history.redo(p);assert.equal(p.getCurrentLayer(),sitHair);assert.deepEqual(sitHair.getFrameData('2_0_1').data,source.data);
assert.equal(body.frameData.size,0);assert.deepEqual(hair.getFrameData('0_0_0').data,source.data);

const steps=history.undoStack.length;idleHair.locked=true;
result=pixelAPI.copyLayerToFrames({sheetIndex:0,actionIndex:0,frameIndex:0,layerIndex:p.layers.indexOf(hair)},[{sheetIndex:2,frameIndex:0},{sheetIndex:1,frameIndex:1}]);
assert.equal(result.success,false);assert.equal(history.undoStack.length,steps);assert.equal(idleHair.getFrameData('1_0_1'),null);idleHair.locked=false;
assert.equal(pixelAPI.pasteLayerFrames([{sheetIndex:2,layerIndex:p.layers.indexOf(body)}]).success,false,'explicit protected targets must still fail');
assert(pixelAPI.copyLayerToFrames({sheetIndex:0,actionIndex:0,frameIndex:0,layerIndex:p.layers.indexOf(hair)},[{sheetIndex:1,frameIndex:1}]).success);
assert.deepEqual(idleHair.getFrameData('1_0_1').data,source.data);
const duplicate=new PE.Layer(hair.name);duplicate.sheetIndex=1;p.layers.push(duplicate);
assert.equal(pixelAPI.pasteLayerFrames([{sheetIndex:1}]).success,false,'ambiguous names must not silently choose a layer');p.layers.pop();
const other=new PE.Project();app.project=other;assert.equal(pixelAPI.pasteLayerFrames().success,false);app.project=p;
const exporter=new PE.ExportManager();exporter.init(p,cm);
exporter.exportProject(false).text().then(raw=>{
  const saved=JSON.parse(raw),layer=saved.layers.find(l=>l.name===hair.name&&l.sheetIndex===2);
  assert(layer.frameData['2_0_0']);assert(layer.frameData['2_0_1']);
  console.log('PASS: walk/front to idle and sit; matching or new independent hair layer; protected-body safety; dry-run; atomic batch; layer order; undo/redo; ambiguous targets; project boundary; saved pixels.');
}).catch(e=>{console.error(e);process.exitCode=1;});
