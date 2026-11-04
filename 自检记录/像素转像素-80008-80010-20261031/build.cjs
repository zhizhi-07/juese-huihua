const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(out,n))),write=(n,s)=>fs.writeFileSync(path.join(out,n),typeof s==='string'?s:JSON.stringify(s,null,2));
global.window=global;global.ImageData=ImageData;global.document={addEventListener(){},createElement(){return createCanvas(1,1)}};
for(let n of ['core','pixel-import'])vm.runInThisContext(fs.readFileSync(path.resolve('js/'+n+'.js'),'utf8'));
const surface=(w=36,h=36)=>{let c=createCanvas(w,h);c.getContext('2d').imageSmoothingEnabled=false;return c},pix=c=>c.getContext('2d').getImageData(0,0,c.width,c.height);
function bounds(im){let xs=[],ys=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){xs.push(x);ys.push(y)}return xs.length?{x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}:null}
function frame(im){let c=surface(im.width,im.height);c.getContext('2d').putImageData(im,0,0);return {width:im.width,height:im.height,dataURL:c.toDataURL()}}
(async()=>{
let p=read('branch-before-hair.json'),before=structuredClone(p),reference=read('source-project.json');p.name='像素转像素 · 前发80008＋后发80010';p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;
const names=['TV_FrontHair1_p80008.png','TV_RearHair1_p80010.png','TV_RearHair2_p80010.png','icon_FrontHair_p80008.png','icon_RearHair_p80010.png'];let imgs=await Promise.all(names.map(n=>loadImage(path.join(out,n)))),cut=[];
for(let i=3;i<5;i++){let c=surface(64,64),g=c.getContext('2d');g.drawImage(imgs[i],0,0);let d=pix(c),removed=0;for(let j=0;j<d.data.length;j+=4){let [r,g,b,a]=d.data.subarray(j,j+4);if(a&&Math.max(r,g,b)<140&&Math.max(r,g,b)-Math.min(r,g,b)<20){d.data.fill(0,j,j+4);removed++}}assert(removed>100);g.putImageData(d,0,0);cut[i]=c;write(`去黑-${names[i]}.json`,{removed});fs.writeFileSync(path.join(out,'去黑-'+names[i]),c.toBuffer('image/png'))}
function tile(i,row,col=1){let c=surface(48,48);c.getContext('2d').drawImage(imgs[i],col*48,row*48,48,48,0,0,48,48);return c}
// Nearest-neighbor retains the source silhouette; only the inner color blocks are consolidated below.
function scaled(src,sx,sy,root,top,flip=false){let c=surface(),g=c.getContext('2d');if(flip){g.translate(35,0);g.scale(-1,1)}g.drawImage(src,17.5-root*sx,4-top*sy,src.width*sx,src.height*sy);return PE.hairGrayImage(pix(c))}
let bases=[];
for(let ai=0;ai<3;ai++){
let front=ai===2?new ImageData(36,36):ai===0?scaled(cut[3],.78,.56,31.5,6,true):scaled(tile(0,0),.94,.61,23,4);
let rear=ai===0?scaled(cut[4],.72,.62,31.5,4,true):scaled(tile(ai===2?1:2,ai===2?3:0),.86,.72,23,3);
for(let [part,im]of [['front',front],['rear',rear]]){
let src=im.data.slice(),has=(x,y)=>x>=0&&y>=0&&x<36&&y<36&&src[(y*36+x)*4+3];
for(let y=0;y<36;y++)for(let x=0;x<36;x++){
let i=(y*36+x)*4;if(!src[i+3])continue;let edge=!has(x-1,y)||!has(x+1,y)||!has(x,y-1)||!has(x,y+1),v=209;
if(part==='front'){
// The short, connected underside shadows follow the original pointed fringe, not individual golden highlights.
if(y>=10)v=src[i];
if(edge)v=119;
if(ai===0&&x<=12&&y<11&&rear.data[i+3])v=209;
}else{
if(ai===2){if(y>=18)v=178;if(y>=16&&y<18&&x>=11&&x<=24)v=178}
else if(ai===1){if(y>=16)v=178}
else {if(y>=17||x<9&&y>=12)v=178;}
if(edge)v=119;
}
im.data.set([v,v,v,255],i);
}
}
// Join the source's tiny crown gap at the actual head top, without lifting either component.
for(let x=12;x<=23;x++){if(ai!==2)front.data.set([119,119,119,255],(4*36+x)*4);rear.data.set([119,119,119,255],(4*36+x)*4)}
if(ai===1||ai===2)for(let im of [front,rear])for(let y=0;y<36;y++)for(let x=0;x<18;x++){let i=(y*36+x)*4,j=(y*36+35-x)*4;im.data.set(im.data.subarray(i,i+4),j)}
if(ai===0){
for(let im of [front,rear])for(let y=5;y<10;y++)for(let x=10;x<29;x++){let i=(y*36+x)*4;if(!im.data[i+3])continue;let covered=(xx,yy)=>front.data[(yy*36+xx)*4+3]||rear.data[(yy*36+xx)*4+3];if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(([xx,yy])=>covered(xx,yy)))im.data.set([209,209,209,255],i)}
}
bases.push({front,rear});
}
const rg={name:'头发 / 80010 / 后发',sheetIndex:8,isGroup:true,visible:true,locked:false,opacity:1,parent:null,frameData:{}},rear={name:'头发 / 80010 / 底层后发',sheetIndex:8,visible:true,locked:false,opacity:1,parent:0,frameData:{}},side={...rear,name:'头发 / 80010 / 侧面后发',frameData:{}},front={...rear,name:'头发 / 80008 / 前发',parent:null,frameData:{}};
for(let l of p.layers)if(l.parent!=null)l.parent+=2;p.layers.unshift(rg,rear);p.layers.push(side,front);p.currentLayerIndex=p.layers.length-1;
let metrics=[];
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
let key=`8_${ai}_${fi}`,hd=p.layers.find(l=>l.name==='head'&&l.sheetIndex===8&&l.frameData?.[key]);assert(hd);let hc=surface();hc.getContext('2d').drawImage(await loadImage(hd.frameData[key].dataURL),0,0);let hb=bounds(pix(hc)),dy=hb.y0-4;assert.equal(dy,fi>=2?2:0);
for(let [part,layer]of [['rear',rear],['front',front]]){
let im=new ImageData(36,36),src=bases[ai][part],cutrow=part==='rear'?21:99;
for(let y=0;y<36;y++)for(let x=0;x<36;x++){
let i=(y*36+x)*4;if(!src.data[i+3]||dy&&y===cutrow)continue;
let ny=y+dy-(dy&&y>cutrow?1:0),nx=x;
// This short bob follows the breath; only its inward-curled tip is delayed by one pixel.
if(part==='rear'&&[1,2].includes(fi)&&y>=24&&ai===0&&x<13)nx++;
assert(nx>=0&&nx<36&&ny>=0&&ny<36,'cropped hair');im.data.set(src.data.subarray(i,i+4),(ny*36+nx)*4);
}
if(ai===2&&part==='front')assert(!im.data.some(v=>v));let b=bounds(im);if(b)assert.equal(b.y0,hb.y0);layer.frameData[key]=frame(im);metrics.push({key,part,headTop:hb.y0,bounds:b});
if(part==='rear'){
let overlay=new ImageData(36,36);if(ai===0)for(let y=0;y<36;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;overlay.data.set(im.data.subarray(i,i+4),i)}side.frameData[key]=frame(overlay);
}
}
}
assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.deepEqual(p.layers.slice(2,-2).map(l=>({...l,...(l.parent!=null?{parent:l.parent-2}:{})})),before.layers);
for(let l of [rear,side,front])for(let f of Object.values(l.frameData)){let c=surface();c.getContext('2d').drawImage(await loadImage(f.dataURL),0,0);let d=pix(c);for(let i=0;i<d.data.length;i+=4){assert([0,255].includes(d.data[i+3]));if(d.data[i+3])assert([119,178,209].includes(d.data[i])&&d.data[i]===d.data[i+1]&&d.data[i]===d.data[i+2])}}
write('candidate.json',p);write('对齐测量.json',metrics);
async function compose(proj,ai,fi,filter=()=>true){let c=surface(),g=c.getContext('2d'),key=`8_${ai}_${fi}`;for(let l of PE.getRenderLayers(proj,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false||!filter(l))continue;let v=true;for(let par=l.parent;par!=null;par=proj.layers[par].parent)if(proj.layers[par].visible===false)v=false;if(v&&l.frameData?.[key])g.drawImage(await loadImage(l.frameData[key].dataURL),0,0)}return c}
for(let mode of ['合成','前发','后发','素体','穿衣五官测试']){
let proj=p;if(mode==='穿衣五官测试'){
proj=structuredClone(p);for(let l of reference.layers.filter(l=>l.sheetIndex===8&&!l.isGroup&&/^(服装|眼睛|嘴巴) \//.test(l.name)&&l.visible!==false))proj.layers.splice(proj.layers.length-2,0,{...l,parent:null});}
let sheet=surface(864,648),g=sheet.getContext('2d');for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
let t=await compose(proj,ai,fi,l=>mode==='前发'?l.name===front.name:mode==='后发'?/头发 \/ 80010/.test(l.name):mode==='素体'?!l.name.startsWith('头发 /'):true),d=pix(t);if(mode==='合成')assert(d.data.some((v,i)=>i%4===3&&v));if(mode==='合成')fs.writeFileSync(path.join(out,`帧-${ai}-${fi}.png`),t.toBuffer('image/png'));
g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*216,ai*216,216,216);g.drawImage(t,fi*216,ai*216,216,216)}fs.writeFileSync(path.join(out,mode+'.png'),sheet.toBuffer('image/png'));
}
let native=surface(144,108),ng=native.getContext('2d');for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)ng.drawImage(await compose(p,ai,fi),fi*36,ai*36);fs.writeFileSync(path.join(out,'待机透明图集.png'),native.toBuffer('image/png'));console.log('BUILD OK',out);
})().catch(e=>{console.error(e);process.exitCode=1});



