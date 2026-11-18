// Synthetic pixels only: never read or save a user's project.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),before=process.argv.includes('--before');
const source=name=>fs.readFileSync(path.join(root,before&&['core','visual-layers','workbench'].includes(name)?'test/output/layer-order-fix-20261103/before/js':'js',name+'.js'),'utf8');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
for(const name of ['core','canvas','export','visual-layers'])vm.runInThisContext(source(name),{filename:name});
const skin=[240,190,160,255],hair=[80,40,30,255];
function layer(name,si=0,parent=null,color=hair){
  const l=new PE.Layer(name);Object.assign(l,{sheetIndex:si,parent});
  const image=new ImageData(4,4);image.data.set(color,20);l.frameData.set(`${si}_0_0`,image);return l;
}
function fixture(layers){
  const p=new PE.Project();p.layers=layers;p.currentLayerIndex=layers.length-1;
  const s=new PE.SpriteSheet('original32_idle'),a=new PE.Action('正面','down');a.frames=[new PE.Frame(0,0,0,4,4)];s.actions=[a];p.spriteSheets=[s];
  const buttons=[],host={before(){},append(){},prepend(){}};
  const app={project:p,history:{undoStack:[],redoStack:[],_notifyChange(){}},updateLayerList(){},updateStatusBar(){},persistence:{markDirty(){}}};
  // Execute the real rename and arrow handlers without initializing unrelated editor tools.
  const code=source('workbench'),start=code.indexOf('  const snapshot=');
  vm.runInNewContext(code.slice(start,code.indexOf('  app.deleteLayer=',start)),{PE,app,$:()=>host,document:{createElement:()=>({setAttribute(){}}),querySelector:()=>host},notify(){},button(text,action){buttons.push({text,action});}});
  return {p,app,up:()=>buttons[0].action(),down:()=>buttons[1].action()};
}
function pixel(p){const cm=new PE.CanvasManager(document.createElement('canvas'),p),ex=new PE.ExportManager();ex.project=p;
  const actual=cm.getCompositeImageData(0,0,0),exported=ex._getCompositeImageData(0,0,0);
  assert.deepEqual(actual.data,exported.data,'canvas and PNG composition agree');return [...actual.data.slice(20,24)];}
let failed=0;
function check(name,fn){try{fn();console.log('PASS:',name);}catch(error){failed++;console.error('FAIL:',name,'\n'+error.message);}}
check('card naming an unclassified layer 后发 puts its pixels behind the face; undo/redo restores names and order',()=>{
  const head=layer('head',0,null,skin),rear=layer('绘画图层 2'),{p,app}=fixture([head,rear]);
  const bytes=rear.getFrameData('0_0_0').data.slice();assert.deepEqual(pixel(p),hair);
  assert(PE.VisualLayers.rename(app,1,'正面后发'));assert.equal(PE.VisualLayers.slot(rear),'后发');
  assert.deepEqual(pixel(p),skin);assert.equal(p.getCurrentLayer(),rear);assert.equal(app.history.undoStack.length,1);
  app.history.undoStack[0].undo();assert.deepEqual(pixel(p),hair);assert.equal(rear.name,'绘画图层 2');
  app.history.undoStack[0].redo();assert.deepEqual(pixel(p),skin);assert.deepEqual(rear.getFrameData('0_0_0').data,bytes);
});
check('one down arrow crosses the current face, not a layer belonging to another sheet',()=>{
  const head=layer('head',0,null,skin),foreign=layer('other action',1),rear=layer('头发 / 测试 / 后发'),{p,app,up,down}=fixture([head,foreign,rear]);
  down();assert.deepEqual(pixel(p),skin);assert.equal(p.getCurrentLayer(),rear);
  app.history.undoStack.at(-1).undo();assert.deepEqual(pixel(p),hair);app.history.undoStack.at(-1).redo();assert.deepEqual(pixel(p),skin);
  up();assert.deepEqual(pixel(p),hair);assert.equal(foreign.sheetIndex,1);
});
check('explicitly renaming front hair 正面后发 changes its type and moves it behind the face',()=>{
  const head=layer('head',0,null,skin),rear=layer('头发 / 测试 / 前发'),{p,app}=fixture([head,rear]);
  assert(PE.VisualLayers.rename(app,1,'正面后发'));assert.equal(PE.VisualLayers.slot(rear),'后发');assert.deepEqual(pixel(p),skin);
  app.history.undoStack.at(-1).undo();assert.equal(PE.VisualLayers.slot(rear),'前发');assert.deepEqual(pixel(p),hair);
});
check('arrows skip other-direction groups; crossing a group boundary changes the composite immediately',()=>{
  const head=layer('head',0,null,skin),g=layer('side');g.isGroup=true;const side=layer('side-only',0,1),rear=layer('头发 / 测试 / 后发');
  const {p,down}=fixture([head,g,side,rear]);p.spriteSheets[0].actions.push(new PE.Action('侧面','side'));
  down();assert.deepEqual(pixel(p),skin);assert.equal(side.parent,p.layers.indexOf(g));
  const group=layer('hair');group.isGroup=true;const grouped=layer('后发',0,1),f=fixture([layer('head',0,null,skin),group,grouped]);
  f.down();assert.deepEqual(pixel(f.p),skin);assert.equal(f.p.getCurrentLayer(),grouped);
});
check('naming front hair in sheet 1 does not place it below that sheet\'s head because of sheet 0 accessories',()=>{
  const accessory=layer('发饰 / 其他',0),head=layer('head',1,null,skin),front=layer('前发',1);
  const p={layers:[accessory,head,front],currentSheetIndex:1,currentActionIndex:0,currentLayerIndex:2};
  PE.autoPlaceLayer(p,2);assert(p.layers.indexOf(front)>p.layers.indexOf(head));
});
assert.equal(failed,0,`${failed} layer-control regressions`);
if(!before)(async()=>{
  const head=layer('head',0,null,skin),rear=layer('绘画图层'),{p,app,up}=fixture([head,rear]);
  p.spriteSheets[0].imageData=new ImageData(4,4);
  PE.VisualLayers.rename(app,1,'后发');up();assert.deepEqual(pixel(p),hair);
  const ex=new PE.ExportManager();ex.project=p;
  const blob=ex.exportProject(false),reopened=(await ex.importProject(blob)).project;
  assert.deepEqual(pixel(reopened),hair);assert.equal(reopened.getCurrentLayer().name,rear.name);
  assert.deepEqual(reopened.layers.map(l=>l.name),p.layers.map(l=>l.name));
  assert.deepEqual(reopened.layers.map(l=>[...l.getFrameData('0_0_0').data]),p.layers.map(l=>[...l.getFrameData('0_0_0').data]));
  console.log('PASS: explicit manual order, selected layer and original pixels survive JSON/PNG save and reopen');
})().catch(error=>{console.error(error);process.exitCode=1;});
