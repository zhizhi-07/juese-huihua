const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,ImageData}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;
const ready=[],keys=[];
global.document={activeElement:{tagName:'BODY'},addEventListener(type,fn){if(type==='DOMContentLoaded')ready.push(fn);},
  createElement(tag){return tag==='canvas'?createCanvas(1,1):{style:{},classList:{add(){},remove(){}},setAttribute(){}};},
  body:{append(){}},querySelector(){return null;},getElementById(){return null;}};
global.addEventListener=(type,fn)=>{if(type==='keydown')keys.push(fn);};
global.setTimeout=()=>0;
const root=path.resolve(process.argv[2]||'.');
for(const name of ['core','history','tools','frame-tools','app','layer-shortcuts']){
  const file=path.join(root,'js',name+'.js');
  vm.runInThisContext(fs.readFileSync(fs.existsSync(file)?file:path.join('js',name+'.js'),'utf8'),{filename:name});
}
const init=ready.at(-1);
function fixture(){
  const p=new PE.Project(),s=new PE.SpriteSheet('test'),a=new PE.Action('idle','down');
  a.frames=[new PE.Frame(0,0,0,4,4),new PE.Frame(0,0,0,4,4)];s.actions=[a];p.spriteSheets=[s];
  const h=new PE.HistoryManager(),tm=new PE.ToolManager();tm.init(p,null,h);
  const app={project:p,history:h,toolManager:tm,canvasManager:{render(){}},animationPlayer:{pause(){}},
    persistence:{dirty:false,markDirty(){this.dirty=true;}},updateAll(){},updateHistoryButtons(){},updateFrameList(){}};
  PE.app=app;init();return {p,h,tm,app};
}
function pixels(color,w=4,h=4){const d=new ImageData(w,h);for(let i=0;i<d.data.length;i+=4)d.data.set(color,i);return d;}
function add(p,name,color){const l=new PE.Layer(name);l.sheetIndex=0;l.frameData.set('0_0_0',pixels(color));p.layers.push(l);return l;}
const data=l=>l.getFrameData('0_0_0');
const rgba=(d,x=0,y=0)=>[...d.data.slice((y*d.width+x)*4,(y*d.width+x+1)*4)];
{
  const {p,h,app}=fixture(),l=p.layers[0];l.name='paint';l.parent=null;l.frameData.set('0_0_0',pixels([10,20,30,255]));l.frameData.set('0_0_1',pixels([40,50,60,255]));
  app.duplicateCurrentLayer();assert.equal(p.layers.length,2);assert.equal(p.currentLayerIndex,1);
  const copy=p.layers[1];assert.deepEqual(data(copy).data,data(l).data);assert.notEqual(data(copy).data,data(l).data);
  assert.notEqual(copy.getFrameData('0_0_1').data,l.getFrameData('0_0_1').data);assert(app.persistence.dirty);assert.equal(h.undoStack.length,1);
  h.undo(p);assert.deepEqual(p.layers,[l]);h.redo(p);assert.deepEqual(p.layers,[l,copy]);
}
{
  const {p,h,tm,app}=fixture(),l=p.layers[0];l.name='paint';l.frameData.set('0_0_0',pixels([10,20,30,255]));l.frameData.set('0_0_1',pixels([40,50,60,255]));
  tm.setSelection(1,1,2,2);app.duplicateCurrentLayer();const copy=p.layers[1];
  assert.equal(copy.frameData.size,1,'selection copies only the active frame');assert.equal(rgba(data(copy),0,0)[3],0);assert.deepEqual(rgba(data(copy),1,1),[10,20,30,255]);
  assert.equal(rgba(data(copy),3,3)[3],0);assert.deepEqual(rgba(data(l),0,0),[10,20,30,255]);assert.equal(tm.selection,null);h.undo(p);h.redo(p);assert.equal(p.layers.length,2);
}
{
  const {p,tm,app}=fixture(),l=p.layers[0];l.name='paint';l.frameData.set('0_0_0',pixels([10,20,30,255]));
  tm.setSelection(0,0,2,2);PE.insideSelection=(x,y)=>x===y;
  app.duplicateCurrentLayer();assert.equal(rgba(data(p.layers[1]),1,0)[3],0);assert.equal(rgba(data(p.layers[1]),1,1)[3],255);delete PE.insideSelection;
}
{
  const {p,h,app}=fixture();p.layers=[];const g=add(p,'group',[0,0,0,0]);g.isGroup=true;g.parent=null;
  const a=add(p,'paint',[255,0,0,255]);a.parent=0;const later=add(p,'later group',[0,0,0,0]);later.isGroup=true;later.parent=null;
  const child=add(p,'child',[1,2,3,255]);child.parent=2;p.currentLayerIndex=1;app.duplicateCurrentLayer();
  assert.equal(p.layers[2].parent,0);assert.equal(child.parent,3);h.undo(p);assert.equal(child.parent,2);h.redo(p);assert.equal(child.parent,3);
}
{
  const {p,h,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);
  bottom.opacity=.5;top.opacity=.5;p.currentLayerIndex=1;app.mergeLayerDown();
  assert.equal(p.layers.length,1);assert.equal(bottom.opacity,1);const color=rgba(data(bottom));
  assert(Math.abs(color[0]-170)<=1);assert(Math.abs(color[2]-85)<=1);assert(Math.abs(color[3]-192)<=1);
  h.undo(p);assert.equal(p.layers.length,2);assert.equal(bottom.opacity,.5);assert.deepEqual(rgba(data(bottom)),[0,0,255,255]);h.redo(p);assert.equal(p.layers.length,1);assert.equal(bottom.opacity,1);
}
{
  const {p,h,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);
  bottom.frameData.set('0_0_1',pixels([0,255,0,255]));p.currentLayerIndex=1;app.mergeLayerDown();
  assert.deepEqual(rgba(bottom.getFrameData('0_0_1')),[0,255,0,255]);assert.deepEqual(rgba(data(bottom)),[255,0,0,255]);h.undo(p);assert.equal(top.getFrameData('0_0_1'),null);
}
{
  const {p,h,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);
  const hd=pixels([255,0,0,255],8,4);for(let y=0;y<4;y++)for(let x=0;x<8;x++)hd.data.set([x*30,y*50,50,255],(y*8+x)*4);
  hd.placement={x:-1,y:1,w:4,h:2};top.frameData.set('0_0_0',hd);p.currentLayerIndex=1;app.mergeLayerDown();
  const result=data(bottom);assert(result.width>=10);assert.equal(result.placement.x,-1);assert.equal(result.placement.w,5);
  for(let y=0;y<4;y++)for(let x=0;x<8;x++)assert.deepEqual(rgba(result,x,y+2),rgba(hd,x,y));
  h.undo(p);assert.deepEqual(data(top).data,hd.data);assert.deepEqual(data(top).placement,hd.placement);h.redo(p);assert.deepEqual(data(bottom).data,result.data);
}
{
  const {p,tm,app}=fixture(),l=p.layers[0],hd=pixels([1,2,3,255],8,4);hd.placement={x:0,y:1,w:4,h:2};l.name='paint';l.frameData.set('0_0_0',hd);
  tm.setSelection(1,1,1,1);app.duplicateCurrentLayer();const copy=data(p.layers[1]);assert.equal(copy.width,2);assert.equal(copy.height,2);assert.deepEqual(copy.placement,{x:1,y:1,w:1,h:1});assert.deepEqual(rgba(copy),[1,2,3,255]);
}
for(const guard of ['sourceLocked','targetLocked','sourceHidden','targetHidden','sheet','sourceGroup','targetGroup','protected','hand','drawing','frame','region','children']){
  const {p,h,tm,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);p.currentLayerIndex=1;
  if(guard==='sourceLocked')top.locked=true;if(guard==='targetLocked')bottom.locked=true;
  if(guard==='sourceHidden')top.visible=false;if(guard==='targetHidden')bottom.visible=false;
  if(guard==='sheet')bottom.sheetIndex=1;if(guard==='sourceGroup')top.isGroup=true;if(guard==='targetGroup')bottom.isGroup=true;
  if(guard==='protected')top.inheritedBase=true;if(guard==='hand')bottom.name='hand';if(guard==='drawing')tm.isDrawing=true;
  if(guard==='frame')p.getCurrentFrame().locked=true;if(guard==='region')p.getCurrentFrame().addLockedRegion(0,0,1,1);
  if(guard==='children'){const child=add(p,'child',[0,255,0,255]);child.parent=1;}
  const layers=p.layers.slice(),bytes=data(bottom).data.slice();app.mergeLayerDown();assert.deepEqual(p.layers,layers,guard);assert.deepEqual(data(bottom).data,bytes,guard);assert.equal(h.undoStack.length,0,guard);
}
{
  const {p,h,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);
  const group=add(p,'group',[0,0,0,0]);group.isGroup=true;const child=add(p,'child',[0,0,0,0]);child.parent=2;
  p.currentLayerIndex=1;app.mergeLayerDown();assert.equal(child.parent,1);assert.equal(p.layers[1],group);h.undo(p);assert.equal(child.parent,2);h.redo(p);assert.equal(child.parent,1);
}
for(const guard of ['oversize','interleaved','rearOrder','laterFrame']){
  const {p,h,app}=fixture();p.layers=[];const bottom=add(p,'bottom',[0,0,255,255]),top=add(p,'top',[255,0,0,255]);p.currentLayerIndex=1;
  if(guard==='oversize')data(top).placement={x:1e9,y:0,w:1,h:1};
  if(guard==='interleaved'){const between=add(p,'between',[0,255,0,255]);between.parent=0;p.layers.splice(1,0,p.layers.pop());p.currentLayerIndex=2;}
  if(guard==='rearOrder'){p.getCurrentAction().direction='up';bottom.name='头发 / fixture / 后发';}
  if(guard==='laterFrame'){top.frameData.set('0_0_1',pixels([0,255,0,255]));p.getCurrentAction().frames[1].locked=true;}
  const layers=p.layers.slice(),bytes=data(bottom).data.slice();app.mergeLayerDown();assert.deepEqual(p.layers,layers,guard);assert.deepEqual(data(bottom).data,bytes,guard);assert.equal(h.undoStack.length,0,guard);
}
{
  const {p,h,tm,app}=fixture();p.layers[0].name='paint';p.layers[0].frameData.set('0_0_0',pixels([1,2,3,255]));tm.isDrawing=true;
  app.duplicateCurrentLayer();assert.equal(p.layers.length,1);assert.equal(h.undoStack.length,0);
}
{
  const {app}=fixture();let copies=0,merges=0;app.duplicateCurrentLayer=()=>copies++;app.mergeLayerDown=()=>merges++;
  PE.App.prototype.bindKeyboardShortcuts.call(app);const key=keys.at(-1);
  function press(value,extra={}){let prevented=false;key({key:value,ctrlKey:true,preventDefault(){prevented=true;},...extra});return prevented;}
  assert(press('j'));assert(press('E'));assert.equal(copies,1);assert.equal(merges,1);
  document.activeElement={tagName:'INPUT'};assert.equal(press('j'),false);document.activeElement={tagName:'DIV',isContentEditable:true};assert.equal(press('e'),false);
  document.activeElement={tagName:'BODY'};assert.equal(press('j',{repeat:true}),true);assert.equal(press('e',{shiftKey:true}),false);assert.equal(press('j',{altKey:true}),false);
  assert.equal(copies,1);assert.equal(merges,1);
}
console.log('PASS: Ctrl+J layer/rect/mask/native-HD selection copy; independent frames/parents; Ctrl+E alpha/native-HD/all-frame merge; undo/redo, dirty state, protection/gesture/input/modifier guards.');
