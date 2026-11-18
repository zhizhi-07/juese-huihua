const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {decode,encode}=require('../../scripts/png.cjs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname,url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{await fetch('http://127.0.0.1:8765/api/projects');const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),original=JSON.parse(text),j=structuredClone(original);
fs.writeFileSync(dir+'/original.json',text);fs.writeFileSync(dir+'/source.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(text).digest('hex')}));
const index=j.layers.findIndex(l=>l.name==='头发 / 苔绿色蓬松短发 / 三向首帧');assert(index>=0);const layer=j.layers[index],colors={};
assert.deepEqual(Object.keys(layer.frameData).sort(),['1_0_0','1_1_0','1_2_0']);
for(const [key,cel]of Object.entries(layer.frameData)){const im=decode(Buffer.from(cel.dataURL.split(',')[1],'base64')),old=Uint8Array.from(im.data);for(let i=0;i<im.data.length;i+=4){if(!im.data[i+3])continue;const color=Buffer.from(im.data.slice(i,i+3)).toString('hex'),g=Math.round(.2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2]);im.data[i]=im.data[i+1]=im.data[i+2]=g;colors[color]=g;}
for(let i=0;i<im.data.length;i+=4){assert.equal(im.data[i+3],old[i+3]);if(im.data[i+3])assert(im.data[i]===im.data[i+1]&&im.data[i+1]===im.data[i+2]);}
cel.dataURL='data:image/png;base64,'+encode(im.width,im.height,im.data).toString('base64');}
layer.name='头发 / 中性灰蓬松短发 / 三向首帧';
const check=structuredClone(j);check.layers[index]=original.layers[index];assert.deepEqual(check,original);
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));
const c=createCanvas(612,204),cx=c.getContext('2d');cx.fillStyle=j.bgColor;cx.fillRect(0,0,c.width,c.height);cx.imageSmoothingEnabled=false;
for(let a=0;a<3;a++){const sub=createCanvas(17,17),sc=sub.getContext('2d');for(const l of j.layers){const cel=l.frameData?.['1_'+a+'_0'];if(l.visible&&!l.isGroup&&l.sheetIndex===1&&cel){sc.globalAlpha=l.opacity??1;sc.drawImage(await loadImage(cel.dataURL),0,0)}}cx.drawImage(sub,a*204,0,204,204);}
fs.writeFileSync(dir+'/preview.png',c.toBuffer('image/png'));
const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(j)});assert(saved.ok,'Save failed '+saved.status);const read=await fetch(url);assert(read.ok);assert.deepEqual(await read.json(),j);
fs.writeFileSync(dir+'/verification.json',JSON.stringify({passed:true,onlyChangedLayer:index,frames:Object.keys(layer.frameData),neutralRGB:true,alphaUnchanged:true,otherFieldsUnchanged:true,colors},null,2));console.log(fs.readFileSync(dir+'/verification.json','utf8'));
})().catch(e=>{console.error(e);process.exitCode=1;});
