const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{
const id='character-gold-mix-1793320553623',url='http://127.0.0.1:8765/api/project?id='+id,out=path.resolve('自检记录','金发原始动态修正-'+Date.now());fs.mkdirSync(out,{recursive:true});let r=await fetch(url);assert(r.ok);let raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw);fs.writeFileSync(path.join(out,'before.json'),raw);fs.writeFileSync(path.join(out,'etag.txt'),etag);
const names=['TV_FrontHair1_p80011.png','TV_RearHair1_p80009.png','TV_RearHair2_p80009.png'],src='C:/Users/Administrator/Desktop/衣服/衣服/10/TV/Female/';let ims=[];for(const n of names){let b=fs.readFileSync(src+n);ims.push(await loadImage(b));fs.appendFileSync(path.join(out,'source-sha256.txt'),n+' '+crypto.createHash('sha256').update(b).digest('hex')+'\n')}
const targets=p.layers.filter(l=>l.sheetIndex===8&&/^头发 \/ (80009|80011) \//.test(l.name));assert.equal(targets.length,2);const otherBefore=JSON.stringify(p.layers.filter(l=>!targets.includes(l)));let report=[];
// Preserve the native head-sized center; fit only outer curls and lower tips to the 32px canvas.
function sourceX(x){return x<4?4+x*7/4:x<=28?11+(x-4):35+(x-28)*7/3}
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let dir=p.spriteSheets[8].actions[ai].direction,row=dir==='up'?3:dir==='down'?0:1,col=[1,2,1,0][fi],dy=fi>=2?2:0;
 for(const l of targets){let front=l.name.endsWith('前发'),im=front?(dir==='up'?null:ims[0]):ims[dir==='up'?1:2],c=createCanvas(32,32),g=c.getContext('2d'),pixels=g.createImageData(32,32);
 if(im){let tile=createCanvas(48,48),tg=tile.getContext('2d');tg.drawImage(im,col*48,row*48,48,48,0,0,48,48);let d=tg.getImageData(0,0,48,48).data;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
 let sy=y<20+dy?y+4-dy:24+(y-20-dy)*16/(10-dy);sy=Math.round(sy+(col===1?0:1));let sx=Math.round(sourceX(x)+(col-1));if(sy<0||sy>=48||sx<0||sx>=48)continue;
 pixels.data.set(d.subarray((sy*48+sx)*4,(sy*48+sx)*4+4),(y*32+x)*4);
 }
 }g.putImageData(pixels,0,0);let key=`8_${ai}_${fi}`;l.frameData[key]={width:32,height:32,dataURL:c.toDataURL()};if(front&&dir==='up')assert(!pixels.data.some(v=>v));report.push({key,layer:l.name,sourceRow:row,sourceColumn:col,bodyOffset:dy});
 }
}
assert.equal(JSON.stringify(p.layers.filter(l=>!targets.includes(l))),otherBefore);
let check=await fetch(url);assert.equal(check.headers.get('etag'),etag,'Project changed, retained candidate only');fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(r.ok,await r.text());r=await fetch(url);let saved=await r.json();fs.writeFileSync(path.join(out,'api-readback.json'),JSON.stringify(saved));for(let l of targets)assert.deepEqual(saved.layers.find(s=>s.name===l.name).frameData,l.frameData);
let preview=createCanvas(512,384),pg=preview.getContext('2d');pg.imageSmoothingEnabled=false;
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let c=createCanvas(32,32),g=c.getContext('2d');for(let l of PE.getRenderLayers(saved,8,ai)){if(l.isGroup||l.sheetIndex!==8||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(!saved.layers[par].visible)visible=false;par=saved.layers[par].parent}if(!visible)continue;let f=l.frameData?.[`8_${ai}_${fi}`];if(f)g.drawImage(await loadImage(f.dataURL),0,0)}assert(g.getImageData(0,0,32,32).data.some(v=>v));fs.writeFileSync(path.join(out,`合成-${ai}-${fi}.png`),c.toBuffer('image/png'));pg.fillStyle=fi%2?'#33404a':'#d4d8cf';pg.fillRect(fi*128,ai*128,128,128);pg.drawImage(c,fi*128,ai*128,128,128)}
fs.writeFileSync(path.join(out,'全部待机帧.png'),preview.toBuffer('image/png'));fs.writeFileSync(path.join(out,'映射与验证.json'),JSON.stringify({report,checks:['Only two hair layers modified','Source columns 1,2,1,0','Back front hair transparent','ETag conditional PUT and API readback verified'],limitations:['Original 90-degree side source on existing body; no redraw','Outer curls and tips compressed to fit 32x32; not native 48x48','Browser renderer not tested']},null,2));console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
