const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {fixture,pixels,raster}=require('./eye-sync.cjs');
const {createCanvas}=require('@napi-rs/canvas');
if(process.argv.includes('--original'))for(const file of ['core','wardrobe','hair-animation'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'output/eye-layer-order-20261103/before/js',file+'.js'),'utf8'));
const {p,eyes,app,hair}=fixture();
const overlap=pixels(3,5);overlap.data.set([210,70,90,255],(5*16+3)*4);hair.frameData.set('0_0_0',overlap);
const bytes=new Map(p.layers.map(l=>[l,[...l.frameData]]));
assert(PE.layerPartRank(eyes)>PE.layerPartRank({name:'head'}));assert(PE.layerPartRank(eyes)<PE.layerPartRank(hair),'default eye rank must be below front hair');
for(const dir of ['down','side','up'])assert(PE.Wardrobe.rank(eyes,dir)>PE.Wardrobe.rank({name:'head'},dir)&&PE.Wardrobe.rank(eyes,dir)<PE.Wardrobe.rank(hair,dir),'wardrobe eye rank must be between head and fringe');
// Start in the old wrong order; explicit sync repairs both old and generated layers.
p.layers.splice(p.layers.indexOf(eyes),1);p.layers.push(eyes);p.currentLayerIndex=p.layers.indexOf(eyes);
for(const si of [1,2,3]){const front=new PE.Layer(hair.name);front.sheetIndex=si;front.frameData.set(`${si}_0_0`,pixels(3,5));p.layers.push(front);}
PE.HairAnimation.sync(app,{live:true});assert.equal(p.getCurrentLayer(),eyes,'sync keeps the selected source');
for(const si of [0,1,2,3]){
 const eye=p.layers.find(l=>l.sheetIndex===si&&l.hairAnimationId===eyes.hairAnimation.id),front=p.layers.find(l=>l.sheetIndex===si&&l.name===hair.name);
 assert(p.layers.indexOf(eye)<p.layers.indexOf(front),'source and generated eyes sit below front hair: '+si);
 for(const ai of [0,1]){const order=PE.getRenderLayers(p,si,ai);assert(order.includes(eye)&&order.indexOf(eye)<order.indexOf(front));}
 assert(!PE.getRenderLayers(p,si,2).includes(eye),'rear view excludes eyes even if their layer is visible');
}
assert(eyes.getFrameData('0_2_0'),'legacy rear pixels are not destructively deleted');
for(const [l,data]of bytes)if(l!==eyes&&!l.hairAnimationId)assert.deepEqual([...l.frameData],data,'non-eye pixels and image references are unchanged');
// Direct composite check, without changing saved pixels.
const frameKey='0_0_0',order=PE.getRenderLayers(p,0,0),canvas=createCanvas(16,16),ctx=canvas.getContext('2d');
for(const layer of order)if(layer===eyes||layer===hair){const im=layer.getFrameData(frameKey);if(im)PE.utils.drawImageData(ctx,im);}
assert.deepEqual(ctx.getImageData(3,5,1,1).data,new Uint8ClampedArray([210,70,90,255]));
app.history.undo(p);assert(p.layers.indexOf(eyes)>p.layers.indexOf(hair),'undo restores original ordering');app.history.redo(p);assert(p.layers.indexOf(eyes)<p.layers.indexOf(hair));
const group=new PE.Layer('down');group.isGroup=true;const head=new PE.Layer('head'),front=new PE.Layer('前发'),eye=new PE.Layer('眼睛');const nested={layers:[group,head,front,eye],currentLayerIndex:3};head.parent=front.parent=eye.parent=0;
PE.autoPlaceLayer(nested,3,{rename:false});assert(nested.layers.indexOf(head)<nested.layers.indexOf(eye));assert(nested.layers.indexOf(eye)<nested.layers.indexOf(front));assert.equal(eye.parent,nested.layers.indexOf(group));
console.log('PASS: eye default below fringe and above head; wardrobe ordering; existing and generated synced eyes; all directions; unchanged hair/base pixels; source selection; undo/redo; grouped defaults.');
