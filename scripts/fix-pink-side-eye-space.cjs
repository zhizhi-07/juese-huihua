const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..');for(const n of ['core','history','canvas','tools','spritesheet','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{const url='http://127.0.0.1:8765/api/project?id=character-pink-bob-trial-20261027',r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),raw=JSON.parse(text),out=path.join(root,'自检记录/侧面眼位修正-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
const ex=new PE.ExportManager(),{project:p}=await ex.importProject(new File([text],'current.json')),l=p.layers.find(l=>l.name==='头发 / 06 中分长刘海 / 前发'),im=l.frameData.get('8_0_0'),P={O:[118,88,93,255],B:[243,169,192,255],S:[220,135,159,255]},set=(x,y,c)=>im.data.set(c?P[c]:[0,0,0,0],(y*32+x)*4);
for(let y=8;y<=18;y++)for(let x=10;x<=28;x++)set(x,y,null);
// Three-quarter turn: shift the reference's central lock toward the far temple and leave both eye bays open.
for(const [y,a,b]of [[8,10,27],[9,10,27],[10,11,27]])for(let x=a;x<=b;x++)set(x,y,x===27?'O':'B');
for(const [y,a,b]of [[10,10,16],[11,10,15],[12,10,14],[13,10,13],[14,10,12],[15,10,11],[16,10,11],[17,11,11]])for(let x=a;x<=b;x++)set(x,y,x===b?'O':'B');
for(const [x,y]of [[17,8],[17,9]])set(x,y,'O');
for(const [y,a,b]of [[11,18,23],[12,18,23],[13,19,23]])for(let x=a;x<=b;x++)set(x,y,x===a||x===b||y===13?'O':'B');
for(const [x,y]of [[18,10],[19,11],[20,12],[21,12],[22,12]])set(x,y,'S');
for(const [y,a,b]of [[11,25,27],[12,26,27],[13,27,27]])for(let x=a;x<=b;x++)set(x,y,x===b?'O':'B');
for(const [x,y]of [[11,12],[11,13],[11,14],[10,15]])set(x,y,'S');
for(const x of [17,24])for(let y=14;y<=16;y++)assert.equal(im.data[(y*32+x)*4+3],0,'eye opening blocked');
const mainResponse=await fetch('http://127.0.0.1:8765/api/project?id=main');assert(mainResponse.ok);const {project:main}=await new PE.ExportManager().importProject(new File([await mainResponse.text()],'main.json'));const eyes=main.layers.find(e=>e.sheetIndex===8&&e.name==='眼睛 / 02 青蓝·粉下缘').frameData.get('8_0_0');assert(eyes);
ex.project=p;const cm=new PE.CanvasManager(document.createElement('canvas'),p);ex.canvasManager=cm;const canvas=createCanvas(512,256),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
for(let v=0;v<2;v++){const tile=createCanvas(32,32);tile.getContext('2d').putImageData(cm.getCompositeImageData(8,0,0),0,0);if(v===1){const eyeTile=createCanvas(32,32);eyeTile.getContext('2d').putImageData(eyes,0,0);tile.getContext('2d').drawImage(eyeTile,0,0);const hairTile=createCanvas(32,32);hairTile.getContext('2d').putImageData(im,0,0);tile.getContext('2d').drawImage(hairTile,0,0);}ctx.fillStyle=v?'#ddd5ed':'#40383d';ctx.fillRect(v*256,0,256,256);ctx.drawImage(tile,v*256,0,256,256);}
fs.writeFileSync(path.join(out,'preview.png'),canvas.toBuffer('image/png'));const cand=JSON.parse(await ex.exportProject(false).text());raw.layers.find(x=>x.name===l.name).frameData['8_0_0']=cand.layers.find(x=>x.name===l.name).frameData['8_0_0'];fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(raw));const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(raw)});assert(saved.ok,'save '+saved.status);assert.deepEqual(await(await fetch(url)).json(),raw);console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
