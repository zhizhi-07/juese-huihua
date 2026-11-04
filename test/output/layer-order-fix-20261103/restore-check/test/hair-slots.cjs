const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;}};
const root=path.resolve(__dirname,'..');for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const data=c=>{const d=new ImageData(4,4);d.data.set(c,(1*4+1)*4);return d;};
const skin=data([254,237,225,255]),hair=data([209,207,226,255]),accessory=data([232,166,182,255]);
const rear={name:'头发 / 01 披发 / 后发',sheetIndex:0,visible:true,opacity:1,getFrameData:()=>hair};
const head={name:'head',sheetIndex:0,visible:true,opacity:1,getFrameData:()=>skin};
const acc={name:'发饰 / 01 饰品',sheetIndex:0,visible:false,opacity:1,getFrameData:()=>accessory};
const front={name:'头发 / 01 斜刘海 / 前发',sheetIndex:0,visible:true,opacity:1,getFrameData:()=>new ImageData(4,4)};
const p={layers:[rear,head,front,acc],currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,getFrameKey:(si,ai,fi)=>`${si}_${ai}_${fi}`,spriteSheets:[{frameWidth:4,frameHeight:4,actions:[{direction:'down',frames:[{width:4,height:4}]},{direction:'up',frames:[{width:4,height:4}]}]}]};
const canvas=document.createElement('canvas'),cm=new PE.CanvasManager(canvas,p),exp=new PE.ExportManager();exp.project=p;
const pixel=(ai)=>Array.from(cm.getCompositeImageData(0,ai,0).data.slice(20,24));
assert.deepEqual(pixel(0),[254,237,225,255]);assert.deepEqual(pixel(1),[209,207,226,255]);
rear.visible=false;assert.deepEqual(pixel(1),[254,237,225,255]);rear.visible=true;acc.visible=true;assert.deepEqual(pixel(1),[232,166,182,255]);
for(const ai of [0,1])assert.deepEqual(Buffer.from(cm.getCompositeImageData(0,ai,0).data),Buffer.from(exp._getCompositeImageData(0,ai,0).data));
assert.strictEqual(PE.getRenderLayers(p,0,0),p.layers);assert.strictEqual(p.layers[0],rear);
console.log('PASS: rear hair behind face from front, covers head from back, hidden rear reveals scalp, accessories on top, canvas and PNG fallback agree, project indexes unchanged.');

// Exercise the live drawing surface, not only preview/export helpers.
p.getCurrentFrame=()=>p.spriteSheets[p.currentSheetIndex].actions[p.currentActionIndex].frames[p.currentFrameIndex];
p.getCurrentAction=()=>p.spriteSheets[p.currentSheetIndex].actions[p.currentActionIndex];
canvas.width=4;canvas.height=4;cm.zoom=1;cm.showGrid=false;
for(const ai of [0,1])for(const rearVisible of [false,true])for(const accessoryVisible of [false,true]){
 p.currentActionIndex=ai;rear.visible=rearVisible;acc.visible=accessoryVisible;
 cm.render();
 assert.deepEqual(Buffer.from(cm.offscreenCtx.getImageData(0,0,4,4).data),Buffer.from(cm.getCompositeImageData(0,ai,0).data));
 assert.deepEqual(Buffer.from(cm.offscreenCtx.getImageData(0,0,4,4).data),Buffer.from(exp._getCompositeImageData(0,ai,0).data));
}
console.log('PASS: main editable canvas, preview composite and PNG fallback have identical layer ordering in front/back views with rear hair and accessories toggled.');
