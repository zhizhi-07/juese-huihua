const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{
const base='http://127.0.0.1:8765/api/project?id=',id='character-gold-mix-'+Date.now(),out=path.resolve('自检记录',id);fs.mkdirSync(out,{recursive:true});
let res=await fetch(base+'main'),raw=await res.text();assert(res.ok);fs.writeFileSync(path.join(out,'main-source.json'),raw);fs.writeFileSync(path.join(out,'main-etag.txt'),res.headers.get('etag'));
let p=JSON.parse(raw);require('../js/character-base.js')(p);p.name='人物 · 金发混搭80011＋80009';p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;
async function put(data,etag){let r=await fetch(base+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(data)});assert(r.ok,await r.text());return r.headers.get('etag')}
await put(p,'none');res=await fetch(base+id);p=await res.json();let etag=res.headers.get('etag');fs.writeFileSync(path.join(out,'branch-before-hair.json'),JSON.stringify(p));
const source='C:/Users/Administrator/Desktop/衣服/衣服/10/TV/Female/';const imgs=await Promise.all(['TV_FrontHair1_p80011.png','TV_RearHair1_p80009.png','TV_RearHair2_p80009.png'].map(n=>loadImage(source+n)));
const rear={name:'头发 / 80009 / 后发',sheetIndex:8,visible:true,locked:false,opacity:1,parent:null,frameData:{}},front={...rear,name:'头发 / 80011 / 前发',frameData:{}};
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const dir=p.spriteSheets[8].actions[ai].direction,row=dir==='up'?3:dir==='down'?0:1,dy=fi>=2?2:0;for(const [layer,img]of [[rear,imgs[dir==='up'?1:2]],[front,dir==='up'?null:imgs[0]]]){let c=createCanvas(32,32),g=c.getContext('2d');g.imageSmoothingEnabled=false;if(img)g.drawImage(img,48,row*48,48,48,-8,-7+dy,48,48);if(layer===front&&dir==='up')assert(!g.getImageData(0,0,32,32).data.some(v=>v));layer.frameData[`8_${ai}_${fi}`]={width:32,height:32,dataURL:c.toDataURL()};}}
// Rear layer precedes base; getRenderLayers moves it over the head in back view.
for(const l of p.layers)if(l.parent!=null)l.parent++;p.layers.unshift(rear);p.layers.push(front);p.currentLayerIndex=p.layers.length-1;
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));await put(p,etag);res=await fetch(base+id);let saved=await res.json();fs.writeFileSync(path.join(out,'api-readback.json'),JSON.stringify(saved));assert.deepEqual(saved.layers.at(-1).frameData,front.frameData);
let preview=createCanvas(512,384),g=preview.getContext('2d');g.imageSmoothingEnabled=false;
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){g.fillStyle=fi%2?'#33404a':'#d4d8cf';g.fillRect(fi*128,ai*128,128,128);let c=createCanvas(32,32),ctx=c.getContext('2d');for(let l of PE.getRenderLayers(saved,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(saved.layers[par].visible===false)visible=false;par=saved.layers[par].parent}if(!visible)continue;let f=l.frameData?.[`8_${ai}_${fi}`];if(f)ctx.drawImage(await loadImage(f.dataURL),0,0)}assert(ctx.getImageData(0,0,32,32).data.some(v=>v));g.drawImage(c,fi*128,ai*128,128,128)}
fs.writeFileSync(path.join(out,'待机全部帧.png'),preview.toBuffer('image/png'));fs.writeFileSync(path.join(out,'验证.txt'),'API PUT/GET 200; 12 idle frames; back front-hair transparent; main unchanged; native nearest pixels; browser not tested.');console.log(JSON.stringify({id,out,url:'http://localhost:8765/index.html?project='+id}));
})().catch(e=>{console.error(e);process.exitCode=1});
