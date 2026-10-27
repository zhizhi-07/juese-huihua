const fs=require('fs'),assert=require('assert'),vm=require('vm');
const root=process.cwd(),dir=root+'/备份/20261026-头发阴影同步',png=require(root+'/scripts/png.cjs');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const before=JSON.parse(fs.readFileSync(dir+'/shared-project.json')),j=structuredClone(before),ids=[266,270,271,272,274];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const color=(im,x,y)=>{let i=(y*im.width+x)*4;return im.data[i+3]?Buffer.from(im.data.slice(i,i+4)).toString('hex'):'';};
function bounds(im){let xs=[],ys=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(color(im,x,y)){xs.push(x);ys.push(y);}return xs.length?{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs)+1}:null;}
const ref=decode(j.layers[266].frameData['8_0_0']),rb=bounds(ref),changed=[];
for(const li of ids)for(const [key,f]of Object.entries(j.layers[li].frameData)){
 if(key==='8_0_0')continue;
 const im=decode(f),bb=bounds(im);if(!bb)continue;
 const old=Buffer.from(im.data);
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
  let c=color(im,x,y);if(!['d1d1d1ff','b2b2b2ff','eeeeeeff','ffffffff','dededeff'].includes(c))continue;
  if(c==='eeeeeeff'||c==='ffffffff'||c==='dededeff')c='d1d1d1ff';
  const ry=y-bb.y+rb.y,rx=Math.round(rb.x+(x-bb.x)*(rb.w-1)/(bb.w-1));
  if(ry<=rb.y+8){let rc=color(ref,rx,ry);if(rc==='dededeff')c=rc;else if(rc==='d1d1d1ff'&&ry<=rb.y+7)c=rc;}
  im.data.set(Buffer.from(c,'hex'),(y*im.width+x)*4);
 }
 for(let i=0;i<im.data.length;i+=4){assert.equal(im.data[i+3],old[i+3]);if(old[i]===119&&old[i+1]===119&&old[i+2]===119)assert.deepEqual(Buffer.from(im.data.slice(i,i+4)),old.subarray(i,i+4));}
 if(!old.equals(Buffer.from(im.data))){f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');changed.push([li,key]);}
}
assert.deepEqual(j.layers[266].frameData['8_0_0'],before.layers[266].frameData['8_0_0']);
for(let li=0;li<j.layers.length;li++)if(!ids.includes(li))assert.deepEqual(j.layers[li],before.layers[li]);
assert.deepEqual(j.spriteSheets,before.spriteSheets);
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));fs.writeFileSync(dir+'/changes.json',JSON.stringify(changed,null,2));
global.window=global;global.ImageData=ImageData;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c;}};
for(const name of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync(root+'/js/'+name+'.js','utf8'));
function model(src){const p=structuredClone(src);p.getFrameKey=(si=p.currentSheetIndex,ai=p.currentActionIndex,fi=p.currentFrameIndex)=>`${si}_${ai}_${fi}`;p.getCurrentSheet=()=>p.spriteSheets[p.currentSheetIndex];p.getCurrentAction=()=>p.getCurrentSheet().actions[p.currentActionIndex];p.getCurrentFrame=()=>({...p.getCurrentAction().frames[p.currentFrameIndex],width:p.getCurrentSheet().frameWidth,height:p.getCurrentSheet().frameHeight});for(const l of p.layers){let map={};for(const [k,f]of Object.entries(l.frameData)){let im=decode(f);map[k]=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);}l.getFrameData=k=>map[k]||null;}return p;}
const cv=createCanvas(1728,Math.ceil(changed.length/12)*160),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,cv.width,cv.height);
let count=0,checks=0;
for(const [li,key]of changed){let [si,ai,fi]=key.split('_').map(Number);let images=[];
 for(const src of [before,j]){let p=model(src);p.currentSheetIndex=si;p.currentActionIndex=ai;p.currentFrameIndex=fi;for(const [i,l]of p.layers.entries()){if(l.isGroup)l.visible=true;if(l.sheetIndex===si&&l.name.startsWith('头发 /')&&l.name.endsWith('前发'))l.visible=i===li;}
 const cm=new PE.CanvasManager(document.createElement('canvas'),p),ex=new PE.ExportManager();ex.project=p;cm.hideHands=false;cm.showGrid=false;cm.zoom=1;
 for(const variant of ['current','naked','clothed','mix']){for(const l of p.layers)if(l.sheetIndex===si&&l.name.startsWith('服装 /'))l.visible=variant==='clothed';if(variant==='mix'){for(const l of p.layers)if(l.sheetIndex===si&&l.name.endsWith('后发'))l.visible=l.name.includes('披发');}
 const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(Buffer.from(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data),Buffer.from(im.data));assert.deepEqual(Buffer.from(ex._getCompositeImageData(si,ai,fi).data),Buffer.from(im.data));checks++;
 if(variant==='current'){let c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);images.push(c);}}
 }
 let x=count%12*144,y=Math.floor(count/12)*160;ctx.fillStyle='#222';ctx.fillText(key,x+4,y+12);ctx.drawImage(images[0],x+4,y+18,64,64);ctx.fillStyle='#333';ctx.fillRect(x+72,y+18,68,68);ctx.drawImage(images[1],x+74,y+18,64,64);ctx.drawImage(images[1],x+25,y+90,64,64);count++;
}
fs.writeFileSync(dir+'/comparison.png',cv.toBuffer('image/png'));console.log({changed:changed.length,checks});

