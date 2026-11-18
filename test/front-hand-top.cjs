const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.document={addEventListener(){},createElement(){const c=createCanvas(1,1);c.style={};return c;}};
const root=path.resolve(__dirname,'..');for(const n of ['core','canvas','export','wardrobe'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));

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
for(const ai of [0,1]){
  const {cm,order,image,exported}=composite(p,ai);
  if(ai===0){
    assert.deepEqual(order.slice(-1),[hand],'front-view front hand is topmost');
    assert(order.indexOf(rearHair)>order.indexOf(head),'rear hair still covers the head');
    assert.deepEqual(pixel(image,3,3),HAND,'overlapping clothes, eyes and fringe must not cover the front hand');
    assert.notDeepEqual(Buffer.from(cm.getCompositeImageData(0,ai,0,false).data),Buffer.from(image.data),'hand switch hides hands');
  }else{
    assert.deepEqual(order.slice(0,2),[L(8),handBack],'both back-view hands are lowest');
    assert.deepEqual(pixel(image,3,3),CLOTH,'back-view front hand is covered');
  }
  assert.deepEqual(pixel(image,5,5),SKIN,'rear hand stays behind the body');
  assert.deepEqual(Buffer.from(image.data),Buffer.from(exported.data),'PNG export uses the same order');
  assert.deepEqual(pixel(cm.getCompositeImageData(0,ai,0,false),5,5),SKIN,'a hidden hand reveals the body underneath');
}
const back=project(),body=back.layers[9];
const handLayers=[back.layers[8],back.layers[13],...['hand 描边','hand 2 描边'].map(n=>make(n,7,dot(HAND,5,5)))];
back.layers.push(...handLayers.slice(2),...handLayers.slice(0,2));
back.layers.splice(13,1);back.layers.splice(8,1);
handLayers[1].getFrameData(keys[1]).data.set(HAND,(2*SIZE+2)*4);
const {order:backOrder,image:backImage,exported:backExport}=composite(back,1);
assert.deepEqual(new Set(backOrder.slice(0,4)),new Set(handLayers));
assert.deepEqual(pixel(backImage,5,5),SKIN,'body covers both hands and outlines even if stored above it');
assert.deepEqual(pixel(backImage,2,2),HAND,'uncovered hand pixels still show');
assert.deepEqual(backImage.data,backExport.data);
for(const layer of handLayers)assert(PE.Wardrobe.rank(layer,'up',back,keys[1])<PE.Wardrobe.rank(body,'up',back,keys[1]));
// 新加的衣服层（追加在数组末尾）也压不住前手。
const grown=project();grown.layers.push(make('服装 / 新衣服',null,dot(CLOTH,3,3)));
assert.deepEqual(pixel(composite(grown,0).image,3,3),HAND,'a later clothes layer cannot cover the front hand');
// 只改绘制顺序：图层数据本身、父级和索引都不动。
assert.equal(hand.parent,0);assert.equal(p.layers.length,17);
assert.deepEqual(p.layers.map(l=>l.name),['down','hand 2','body','服装 / 衣服','head','眼睛','hand','up','hand 2','body','服装 / 衣服','head','眼睛','hand','头发 / 1 / 后发','头发 / 初始 / 前发','发饰 / 帽子']);
console.log('PASS: front-view front hand stays on top; both back-view hands and outlines are below the body in canvas, PNG and wardrobe; exposed hand pixels remain visible; layer data untouched.');
