const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');const {decode}=require('../../scripts/png.cjs');
const dir=__dirname,id='character-pixel-mix-1793412618671',url='http://127.0.0.1:8765/api/project?id='+id,sha=s=>crypto.createHash('sha256').update(s).digest('hex'),write=(n,s)=>fs.writeFileSync(path.join(dir,n),typeof s==='string'?s:JSON.stringify(s,null,2)),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n)));
global.window=global;global.ImageData=ImageData;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
const surf=(w=36,h=36)=>{let c=createCanvas(w,h);c.style={};c.getContext('2d').imageSmoothingEnabled=false;return c};
function unpack(f){let im=decode(Buffer.from(f.dataURL.split(',')[1],'base64')),d=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);if(f.placement)d.placement={...f.placement};return d}
function pack(im){let c=surf(im.width,im.height);c.getContext('2d').putImageData(im,0,0);return {width:im.width,height:im.height,dataURL:c.toDataURL()}}
function bbox(im){let b=[im.width,im.height,-1,-1];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];return b}
function runtime(p){let q=structuredClone(p);for(let l of q.layers){l.frameData=new Map(Object.entries(l.frameData).map(([k,f])=>[k,unpack(f)]));l.getFrameData=k=>l.frameData.get(k)}return q}
function compose(p,ai,fi){let c=surf(),g=c.getContext('2d'),key=`8_${ai}_${fi}`;for(let l of PE.getRenderLayers(p,8,ai))if(!l.isGroup&&PE.isLayerVisible(p,l,8)){let d=l.getFrameData(key);if(d){g.globalAlpha=l.opacity??1;PE.utils.drawImageData(g,d)}}return c}
(async()=>{
if(process.argv.includes('--save')){let p=read('candidate.json'),m=read('meta.json');assert.equal(sha(fs.readFileSync(path.join(dir,'candidate.json'))),read('验证.json').candidateSHA256,'候选未验证');let r=await fetch(url);assert(r.ok);assert.equal(r.headers.get('etag'),m.etag,'版本变化，拒绝覆盖');r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':m.etag},body:JSON.stringify(p)});let output=await r.text();write('PUT-result.json',{status:r.status,ifMatch:m.etag,output});assert(r.ok,output);r=await fetch(url);let raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw),p);write('after.json',raw);write('saved-meta.json',{...m,targetId:id,beforeSHA256:m.sha256,finalETag:r.headers.get('etag'),finalSHA256:sha(raw)});console.log('SAVED exact API readback');return}
let before;if(fs.existsSync(path.join(dir,'before.json')))before=read('before.json');else{let r=await fetch(url);assert(r.ok);let raw=await r.text();write('before.json',raw);write('meta.json',{id,etag:r.headers.get('etag'),sha256:sha(raw)});before=JSON.parse(raw)}let p=structuredClone(before);
let srcdir=path.resolve('自检记录/像素转像素-80008-80010-20261031'),src=Object.fromEntries(['TV_FrontHair1_p80008.png','TV_RearHair1_p80010.png','TV_RearHair2_p80010.png','icon_FrontHair_p80008.png','icon_RearHair_p80010.png'].map(n=>[n,decode(fs.readFileSync(path.join(srcdir,n)))]));
for(let [n,im]of Object.entries(src))if(n.startsWith('icon'))for(let i=0;i<im.data.length;i+=4){let [r,g,b,a]=im.data.subarray(i,i+4);if(!a||Math.max(r,g,b)<140&&Math.max(r,g,b)-Math.min(r,g,b)<20)im.data.fill(0,i,i+4)}
function sample(name,settings){let im=src[name],{row=0,sx,sy,root,top,flip=false,gold=false}=settings,d=new ImageData(36,36);
for(let y=0;y<36;y++)for(let x=0;x<36;x++){let xx=Math.round(root+(x-17.5)/sx*(flip?-1:1)),yy=Math.round(top+(y-4)/sy);if(!name.startsWith('icon')){xx+=48;yy+=row*48;if(xx<48||xx>=96||yy<row*48||yy>=(row+1)*48)continue}if(xx<0||xx>=im.width||yy<0||yy>=im.height)continue;let j=(yy*im.width+xx)*4,[r,g,b,a]=im.data.subarray(j,j+4);if(!a)continue;let ink=name.includes('Front')?150:105,shade=name.includes('Front')?215:195;let v=r<150||g<ink?119:g<shade?178:209;d.data.set(gold?[r,g,b,255]:[v,v,v,255],(y*36+x)*4)}return d}
let metrics=[],baseImages=[];
for(let ai=0;ai<3;ai++){
let front=ai===2?new ImageData(36,36):ai===0?sample('icon_FrontHair_p80008.png',{sx:.78,sy:.70,root:31.5,top:6,flip:true}):sample('TV_FrontHair1_p80008.png',{sx:.94,sy:.82,root:23,top:4});
let rear=ai===0?sample('icon_RearHair_p80010.png',{sx:.72,sy:.67,root:31.5,top:4,flip:true}):sample(ai===2?'TV_RearHair1_p80010.png':'TV_RearHair2_p80010.png',{row:ai===2?3:0,sx:.86,sy:.75,root:23,top:3});
// Fit only the exposed crown pixels to this head; retain source fringe and curl masks.
let hk=`8_${ai}_0`,hd=unpack(before.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData?.[hk]).frameData[hk]);
for(let y=4;y<=8;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;if(hd.data[i+3]&&!front.data[i+3]&&!rear.data[i+3]){let cap=ai===1?front:rear;cap.data.set([209,209,209,255],i)}}
for(let im of [front,rear]){let original=im.data.slice(),has=(x,y)=>x>=0&&x<36&&y>=0&&y<36&&original[(y*36+x)*4+3];for(let y=0;y<36;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;if(!original[i+3])continue;if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([xx,yy])=>!has(xx,yy)))im.data.set([119,119,119,255],i)}}
// Remove only upper-cap overlap ink, not the fringe, cheek line, or outer contour.
if(ai===0)for(let y=4;y<12;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;if(front.data[i+3]&&rear.data[i+3]){let full=([xx,yy])=>xx>=0&&xx<36&&yy>=0&&yy<36&&(front.data[(yy*36+xx)*4+3]||rear.data[(yy*36+xx)*4+3]);if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(full)&&front.data[i]===119)front.data.set([209,209,209,255],i)}}
baseImages.push({front,rear});
for(let fi=0;fi<4;fi++){
let key=`8_${ai}_${fi}`,head=before.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData?.[key]);let hb=bbox(unpack(head.frameData[key])),dy=hb[1]-4;
for(let [part,name]of [['front','头发 / 80008 / 前发'],['rear','头发 / 80010 / 底层后发']]){
let im=new ImageData(36,36),s=baseImages[ai][part];for(let y=0;y<36;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;if(!s.data[i+3]||dy&&part==='rear'&&y===25)continue;let ny=y+dy-(dy&&part==='rear'&&y>25?1:0),nx=x;if(part==='rear'&&ai===0&&[1,2].includes(fi)&&y>=26&&x<15)nx++;assert(nx>=0&&nx<36&&ny<36,'hair cropped');im.data.set(s.data.subarray(i,i+4),(ny*36+nx)*4)}
let l=p.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(l);l.frameData[key]=pack(im);metrics.push({key,part,bounds:bbox(im),headTop:hb[1]});if(part==='rear'){let side=p.layers.find(l=>l.sheetIndex===8&&l.name==='头发 / 80010 / 侧面后发');let overlay=new ImageData(36,36);if(ai===0)for(let yy=0;yy<36;yy++)for(let xx=0;xx<36;xx++)if(xx<=10||yy<10+dy){let ii=(yy*36+xx)*4;overlay.data.set(im.data.subarray(ii,ii+4),ii)}side.frameData[key]=pack(overlay)}
}
}
}
let isHair=l=>l.sheetIndex===8&&!l.isGroup&&['头发 / 80008 / 前发','头发 / 80010 / 底层后发','头发 / 80010 / 侧面后发'].includes(l.name);
assert.deepEqual(p.layers.filter(l=>!isHair(l)),before.layers.filter(l=>!isHair(l)));assert.deepEqual(p.spriteSheets,before.spriteSheets);for(let i=0;i<p.layers.length;i++)assert.deepEqual({...p.layers[i],frameData:null},{...before.layers[i],frameData:null});
write('candidate.json',p);write('metrics.json',metrics);
let np=runtime(p),op=runtime(before),sheet=surf(864,648),sg=sheet.getContext('2d'),comparison=surf(648,432),cg=comparison.getContext('2d');
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let c=compose(np,ai,fi),d=c.getContext('2d').getImageData(0,0,36,36);assert(d.data.some((v,i)=>i%4===3&&v));sg.fillStyle=fi%2?'#35434b':'#d7dbd7';sg.fillRect(fi*216,ai*216,216,216);sg.drawImage(c,fi*216,ai*216,216,216);fs.writeFileSync(path.join(dir,`帧-${ai}-${fi}.png`),c.toBuffer('image/png'));if(fi===0){for(let [ri,img]of [[0,compose(op,ai,fi)],[1,c]]){cg.fillStyle='#d7dbd7';cg.fillRect(ai*216,ri*216,216,216);cg.drawImage(img,ai*216,ri*216,216,216)}}}
fs.writeFileSync(path.join(dir,'全部待机.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(dir,'上旧下重转.png'),comparison.toBuffer('image/png'));console.log('BUILT: only hair frames changed; source silhouette and tone blocks retained');
})().catch(e=>{console.error(e);process.exitCode=1});





