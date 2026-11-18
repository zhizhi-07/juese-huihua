const fs=require('fs'),assert=require('assert'),png=require('./png.cjs'),path=require('path');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
const dir='output/base-black-eyes-20261111',before=JSON.parse(fs.readFileSync(dir+'/before.json')),j=structuredClone(before),read=JSON.parse(fs.readFileSync(dir+'/read.json')),changes=[];let black=0,eyes=0;
for(let li=0;li<j.layers.length;li++){
const l=j.layers[li],base=['body','head','hand','hand 2'].includes(l.name),eye=l.name==='五官 / 眼睛'&&['钓鱼-甩竿','钓鱼-持竿','钓鱼-收线','钓鱼-上鱼'].includes(j.spriteSheets[l.sheetIndex]?.name);
if(!base&&!eye)continue;
for(const [key,f]of Object.entries(l.frameData||{})){
if(!f.dataURL)continue;const d=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),a=Buffer.from(d.data);let n=0;
if(base)for(let i=0;i<a.length;i+=4)if(a[i+3]&&a[i]===70&&a[i+1]===70&&a[i+2]===94){a[i]=a[i+1]=a[i+2]=0;n++;black++;}
if(eye){assert(!a.subarray(0,d.width*4).some((v,i)=>i%4===3&&v),'上移会裁掉眼睛');a.fill(0);Buffer.from(d.data).copy(a,0,d.width*4);eyes++;n++;}
if(!n)continue;
f.dataURL='data:image/png;base64,'+png.encode(d.width,d.height,a).toString('base64');
const check=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));assert(Buffer.from(check.data).equals(a));changes.push({layer:li,name:l.name,key,pixels:base?n:undefined,eye});
}}
assert(black>0&&eyes>0);fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));fs.writeFileSync(dir+'/diff.json',JSON.stringify({blackPixels:black,eyeFrames:eyes,changes},null,2));
// Verify that replacing only the changed frame images reconstructs the original exactly.
const undo=structuredClone(j);for(const c of changes)undo.layers[c.layer].frameData[c.key]=before.layers[c.layer].frameData[c.key];assert.deepStrictEqual(undo,before);
const cv=createCanvas(900,330),ctx=cv.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,900,330);ctx.imageSmoothingEnabled=false;
for(let k=0;k<4;k++){let si=9+k;for(let v=0;v<2;v++){const p=v?j:before;const c=createCanvas(55,55),cx=c.getContext('2d');for(const l of p.layers.filter(l=>l.sheetIndex===si&&!l.isGroup&&['hand 2','body','head','五官 / 眼睛','hand'].includes(l.name))){const f=l.frameData?.[si+'_0_0'];if(!f)continue;let d=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));const t=createCanvas(d.width,d.height);t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.data),d.width,d.height),0,0);cx.drawImage(t,0,0);}ctx.drawImage(c,k*220,v*165,165,165);}}
fs.writeFileSync(dir+'/对比.png',cv.toBuffer('image/png'));
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':read.etag},body:JSON.stringify(j)}),result=await put.text();fs.writeFileSync(dir+'/save-response.txt',put.status+'\n'+result);assert(put.ok,'保存失败 '+put.status+' '+result);
const rr=await fetch(url),saved=await rr.text();fs.writeFileSync(dir+'/after.json',saved);assert.deepStrictEqual(JSON.parse(saved),j);
fs.writeFileSync(dir+'/验证.json',JSON.stringify({result:'PASS',blackPixels:black,eyeFrames:eyes,changedImages:changes.length,otherDataUnchanged:true,etag:rr.headers.get('etag')},null,2));console.log({black,eyes,changes:changes.length,result:'PASS'});
})().catch(e=>{console.error(e);process.exit(1)});
