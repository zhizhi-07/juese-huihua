const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;}};
const root=path.resolve(__dirname,'..');for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));

const SIZE=8,SKIN=[254,237,225,255],HAND=[232,166,182,255],CLOTH=[70,90,150,255],FRINGE=[209,207,226,255];
const dot=(rgba,x,y)=>{const d=new ImageData(SIZE,SIZE);d.data.set(rgba,(y*SIZE+x)*4);return d;};
const keys=['0_0_0','0_1_0'];
function make(name,parent,image,extra){const l=new PE.Layer(name);l.sheetIndex=0;l.parent=parent;l.frameData=new Map(image?keys.map(k=>[k,image]):[]);return Object.assign(l,extra||{});}
function project(){
  const down=make('down',null,null);down.isGroup=true;
  const up=make('up',null,null);up.isGroup=true;
  const protect={referenceOnly:true,locked:true};
  const layers=[down,
    make('hand 2',0,dot(HAND,5,5),protect),make('body',0,dot(SKIN,5,5)),make('服装 / 衣服',0,dot(CLOTH,3,3)),make('head',0,dot(SKIN,0,0)),make('眼睛',0,dot(FRINGE,3,3)),make('hand',0,dot(HAND,3,3),protect),
    up,
    make('hand 2',7,dot(HAND,5,5),protect),make('body',7,dot(SKIN,5,5)),make('服装 / 衣服',7,dot(CLOTH,3,3)),make('head',7,dot(SKIN,0,0)),make('眼睛',7,dot(FRINGE,3,3)),make('hand',7,dot(HAND,3,3),protect),
    make('头发 / 1 / 后发',null,dot(FRINGE,1,1)),make('头发 / 初始 / 前发',null,dot(FRINGE,3,3)),make('发饰 / 帽子',null,dot(CLOTH,3,3))];
  const p={layers,currentLayerIndex:6,currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,
    getFrameKey:(si,ai,fi)=>`${si??0}_${ai??0}_${fi??0}`,
    spriteSheets:[{name:'original16_idle',frameWidth:SIZE,frameHeight:SIZE,fps:8,actions:[{name:'down',direction:'down',frames:[{width:SIZE,height:SIZE}]},{name:'up',direction:'up',frames:[{width:SIZE,height:SIZE}]}]}]};
  p.getCurrentFrame=()=>p.spriteSheets[0].actions[p.currentActionIndex].frames[0];
  p.getCurrentAction=()=>p.spriteSheets[0].actions[p.currentActionIndex];
  return p;
}
const pixel=(data,x,y)=>[...data.data.subarray((y*data.width+x)*4,(y*data.width+x)*4+4)];
function composite(p,ai){
  const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;
  const cm=new PE.CanvasManager(canvas,p),ex=new PE.ExportManager();ex.project=p;
  return {cm,order:PE.getRenderLayers(p,0,ai),image:cm.getCompositeImageData(0,ai,0),exported:ex._getCompositeImageData(0,ai,0)};
}
const p=project(),L=i=>p.layers[i];
const hand=L(6),handBack=L(13),hand2=L(1),clothes=L(3),fringe=L(15),accessory=L(16),eyes=L(5),rearHair=L(14),head=L(4);
assert.equal(PE.isFrontHandLayer(hand),true,'hand is the front hand');assert.equal(PE.isFrontHandLayer(hand2),false,'hand 2 is the rear hand');
for(const [ai,own] of [[0,hand],[1,handBack]]){
  const {cm,order,image,exported}=composite(p,ai);
  assert.deepEqual(order.slice(-1),[own],'front hand must be the topmost rendered layer (direction '+ai+')');
  assert(order.indexOf(own)>order.indexOf(accessory),'front hand stays above accessories');
  assert(order.indexOf(own)>order.indexOf(fringe),'front hand stays above front hair');
  assert(order.indexOf(own)>order.indexOf(clothes),'front hand stays above clothes');
  assert(order.indexOf(own)>order.indexOf(eyes),'front hand stays above eyes');
  assert(order.indexOf(rearHair)>order.indexOf(head),'rear hair still covers the head');
  assert.deepEqual(pixel(image,3,3),HAND,'overlapping clothes, eyes and fringe must not cover the front hand');
  assert.deepEqual(pixel(image,5,5),SKIN,'rear hand stays behind the body');
  assert.deepEqual(Buffer.from(image.data),Buffer.from(exported.data),'PNG export uses the same order');
  assert.notDeepEqual(Buffer.from(cm.getCompositeImageData(0,ai,0,false).data),Buffer.from(image.data),'hand switch hides hands without reordering anything else');
  assert.deepEqual(pixel(cm.getCompositeImageData(0,ai,0,false),5,5),SKIN,'a hidden hand reveals the body underneath');
}
// 新加的衣服层（追加在数组末尾）也压不住前手。
const grown=project();grown.layers.push(make('服装 / 新衣服',null,dot(CLOTH,3,3)));
assert.deepEqual(pixel(composite(grown,0).image,3,3),HAND,'a later clothes layer cannot cover the front hand');
// 只改绘制顺序：图层数据本身、父级和索引都不动。
assert.equal(hand.parent,0);assert.equal(p.layers.length,17);
assert.deepEqual(p.layers.map(l=>l.name),['down','hand 2','body','服装 / 衣服','head','眼睛','hand','up','hand 2','body','服装 / 衣服','head','眼睛','hand','头发 / 1 / 后发','头发 / 初始 / 前发','发饰 / 帽子']);
console.log('PASS: front hand renders above clothes/eyes/fringe/accessories in front and back views; rear hand stays behind the body; canvas, hand switch and PNG export agree; new layers cannot bury it; layer data untouched.');
