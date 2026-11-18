const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {decode}=require('../../scripts/png.cjs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname,url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
const reference=decode(fs.readFileSync('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-6b5f8388-52ff-4b54-8941-529c67674ec6.png'));
const pal=['#313c3d','#859d50','#698140','#4f6e2d','#43632a','#b3d698'];
const rgb=pal.map(h=>h.slice(1).match(/../g).map(x=>parseInt(x,16)));
function sample(base,x,y){let i=(Math.floor(25+y*7.1)*reference.width+Math.floor(base+3+x*7.1))*4;return Array.from(reference.data.slice(i,i+3));}
function green([r,g,b]){return g>r*1.1&&r>b*1.12&&g<220;}
function dark([r,g,b]){return r<75&&g<80&&b<80;}
function nearest(c){let scores=rgb.map(v=>v.reduce((s,n,i)=>s+(n-c[i])**2,0));return scores.indexOf(Math.min(...scores));}
async function render(j,file){let c=createCanvas(612,204),cx=c.getContext('2d');cx.fillStyle=j.bgColor;cx.fillRect(0,0,612,204);cx.imageSmoothingEnabled=false;for(let a=0;a<3;a++){let c2=createCanvas(17,17),c2x=c2.getContext('2d');for(let l of j.layers){let v=l.frameData?.['1_'+a+'_0'];if(l.visible&&!l.isGroup&&l.sheetIndex===1&&v){c2x.globalAlpha=l.opacity??1;c2x.drawImage(await loadImage(v.dataURL),0,0)}}cx.drawImage(c2,a*204,0,204,204)}fs.writeFileSync(dir+'/'+file,c.toBuffer('image/png'));}
(async()=>{await fetch('http://127.0.0.1:8765/api/projects');let r=await fetch(url),t=await r.text(),etag=r.headers.get('etag'),j=JSON.parse(t),before=structuredClone(j);fs.writeFileSync(dir+'/revision-original.json',t);fs.writeFileSync(dir+'/revision-source.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(t).digest('hex')}));
let idx=j.layers.findIndex(l=>l.name==='头发 / 苔绿色蓬松短发 / 三向首帧');assert(idx>=0);
let l=j.layers[idx];assert.deepEqual(Object.keys(l.frameData).sort(),['1_0_0','1_1_0','1_2_0']);
for(let a=0;a<3;a++){let base=[11,139,267][a],c=createCanvas(17,17),cx=c.getContext('2d');for(let y=0;y<11;y++)for(let x=0;x<15;x++){let v=sample(base,x,y),g=green(v),outline=dark(v)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx>=0&&x+dx<15&&y+dy>=0&&y+dy<10&&green(sample(base,x+dx,y+dy)));if(g||outline){cx.fillStyle=pal[(outline||y===0)?0:nearest(v)];cx.fillRect(x+1,y,1,1)}}l.frameData['1_'+a+'_0']={width:17,height:17,dataURL:c.toDataURL()};}
let check=structuredClone(j);check.layers[idx]=before.layers[idx];assert.deepEqual(check,before);
await render(before,'revision-before.png');await render(j,'revision-preview.png');fs.writeFileSync(dir+'/revision-candidate.json',JSON.stringify(j));
if(process.argv.includes('--save')){let saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(j)});assert(saved.ok,'save failed '+saved.status);let back=await(await fetch(url)).json();assert.deepEqual(back,j);fs.writeFileSync(dir+'/revision-verification.txt','PASS exact API readback; only existing hair layer three first-frame cels changed. Reference grid sampled at 7.1 px, palette quantized, hair mask excludes skin/clothing. All other project fields unchanged.');console.log('SAVED verified');}})().catch(e=>{console.error(e);process.exitCode=1});

