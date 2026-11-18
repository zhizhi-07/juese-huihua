const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const png=require('./png.cjs'),{createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'),JSZip=require('../js/vendor/jszip.min.js');
global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561',r=await fetch(url);assert(r.ok);
const raw=Buffer.from(await r.arrayBuffer()),j=JSON.parse(raw),sha=crypto.createHash('sha256').update(raw).digest('hex');
const root=path.resolve('导出/素体四层黑描边-'+Date.now()),backup=path.resolve('备份/素体导出-'+Date.now());fs.mkdirSync(root,{recursive:true});fs.mkdirSync(backup,{recursive:true});
fs.writeFileSync(path.join(backup,'原始工程.json'),raw);fs.writeFileSync(path.join(backup,'读取记录.json'),JSON.stringify({url,etag:r.headers.get('etag'),sha256:sha},null,2));
const zip=new JSZip(),meta=[],names={original16_walk:'行走',original16_idle:'待机',original16_pickup:'拾取',original16_sit:'坐姿'},cache=new Map();
for(let si=0;si<j.spriteSheets.length;si++){
const s=j.spriteSheets[si],folder=names[s.name]||s.name;
const actions=s.actions.map((a,ai)=>({a,ai})).filter(({a})=>s.name!=='original16_sit'||a.direction==='side');
const frames=actions.flatMap(({a})=>a.frames),w=Math.max(...frames.map(f=>f.width)),h=Math.max(...frames.map(f=>f.height)),cols=Math.max(...actions.map(({a})=>a.frames.length));
fs.mkdirSync(path.join(root,folder));
for(const [label,parts] of [['前手',['hand']],['后手',['hand 2']],['身体',['body','head']],['眼睛',['五官 / 眼睛']]]){
const cv=createCanvas(w*cols,h*actions.length),ctx=cv.getContext('2d');let count=0;
for(let row=0;row<actions.length;row++){
const {a,ai}=actions[row];
for(let fi=0;fi<a.frames.length;fi++)for(const l of PE.getRenderLayers(j,si,ai)){
if(l.isGroup||!parts.includes(l.name))continue;
const f=l.frameData?.[si+'_'+ai+'_'+fi];if(!f?.dataURL)continue;
if(!cache.has(f.dataURL))cache.set(f.dataURL,png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')));
const d=cache.get(f.dataURL);assert(d.width<=w&&d.height<=h);
const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.data),d.width,d.height),0,0);
ctx.globalAlpha=l.opacity??1;ctx.drawImage(c,fi*w,row*h);count++;
}}
assert(count>0,folder+'/'+label+'缺少帧');
const file=folder+'/'+label+'.png',b=cv.toBuffer('image/png');fs.writeFileSync(path.join(root,file),b);zip.file(file,b);
meta.push({file,sourceSheet:s.name,frameWidth:w,frameHeight:h,columns:cols,rows:actions.map(({a,ai})=>({sourceActionIndex:ai,direction:a.direction,frameCount:a.frames.length,durationsMs:a.frames.map(f=>s.useFrameDurations!==false&&f.duration?f.duration:1000/(s.fps||8))}))});
}}
const note='每个动作文件夹包含前手、后手、身体、眼睛四张透明PNG图集。身体包含头部及身体，不含五官、头发、服装、工具或特效。全部素体描边为纯黑，四个钓鱼动作眼睛上移一像素。保留画布及坐标，不缩放不裁切。横向为帧，纵向为方向，具体见图集说明.json。坐姿仅导出侧面。按独立部件导出，即使手层在编辑器中隐藏也保留其像素。来源为API已保存工程，不包含前台未保存草稿。';
for(const [file,data] of [['使用说明.txt',note],['图集说明.json',JSON.stringify(meta,null,2)]]){fs.writeFileSync(path.join(root,file),data);zip.file(file,data);}
const out=root+'.zip';fs.writeFileSync(out,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
const read=await JSZip.loadAsync(fs.readFileSync(out));assert.equal(meta.length,j.spriteSheets.length*4);
for(const m of meta){const b=await read.file(m.file).async('nodebuffer');assert(b.equals(fs.readFileSync(path.join(root,m.file))));const d=png.decode(b);assert.equal(d.width,m.frameWidth*m.columns);assert.equal(d.height,m.frameHeight*m.rows.length);}
const after=await fetch(url);assert(Buffer.from(await after.arrayBuffer()).equals(raw),'工程在导出期间变化');
fs.writeFileSync(path.join(backup,'验证记录.json'),JSON.stringify({result:'PASS',pngCount:meta.length,actionFolders:j.spriteSheets.length,sourceUnchanged:true,zip:out,sha256:sha},null,2));
console.log(JSON.stringify({root,zip:out,backup,pngCount:meta.length,folders:j.spriteSheets.length,result:'PASS'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});

