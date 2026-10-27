const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/粉发丸子修整-'+Date.now()),url='http://127.0.0.1:8765/api/project?id=character-pink-bob-trial-20261027';
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),raw=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
const ex=new PE.ExportManager(),{project:p}=await ex.importProject(new File([text],'current.json')),front=p.layers.find(l=>l.name==='头发 / 06 中分长刘海 / 前发'),rear=p.layers.find(l=>l.name==='头发 / 06 粉色外翻短发 / 后发');assert(front&&rear);
const O=[118,88,93,255],B=[243,169,192,255],S=[220,135,159,255],key='8_1_0',f=front.frameData.get(key),beforeFront=new Uint8ClampedArray(f.data);
const bun=new ImageData(32,32),put=(im,x,y,c)=>{im.data.set(c,(y*32+x)*4);im.data.set(c,(y*32+33-x)*4);};
// A closed rounded bun keeps its hidden inner pixels intact behind the head.
const shape=['..OOO...','.OBBBO..','OBBBBBO.','OBBBBBO.','OBBBBBO.','.OBBBO..','..OOO...'];
for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++){const c=shape[y][x];if(c!=='.')put(bun,x+2,y+13,c==='O'?O:B);}
for(const [x,y]of [[6,15],[6,16],[5,17],[6,17],[4,18],[5,18]])if(bun.data[(y*32+x)*4+3])put(bun,x,y,S);
rear.frameData.set(key,bun);
for(const [x,y]of [[2,14],[1,15],[1,16],[1,17],[2,18]])put(bun,x,y,O);
for(const [x,y]of [[2,15],[2,16],[2,17],[3,14],[3,18]])put(bun,x,y,B);
const drawView=require('./pink-bob-views.cjs');for(const ai of [0,2]){front.frameData.set(`8_${ai}_0`,drawView(ImageData,ai,'front'));rear.frameData.set(`8_${ai}_0`,drawView(ImageData,ai,'rear'));}
// Remove the extracted face-detail remnants and close the side lock as one tapered strand.
for(let y=15;y<=19;y++)for(let x=7;x<=11;x++)put(f,x,y,[0,0,0,0]);
for(const [y,left,right]of [[15,7,10],[16,7,10],[17,8,10],[18,9,10]])for(let x=left;x<=right;x++)put(f,x,y,x===left||x===right?O:B);
put(f,9,16,S);put(f,9,17,S);
for(let y=0;y<15;y++)for(let x=0;x<32;x++)for(let c=0;c<4;c++)assert.equal(f.data[(y*32+x)*4+c],beforeFront[(y*32+x)*4+c],'upper hair changed');
for(const im of [f,bun])for(let y=0;y<32;y++)for(let x=2;x<=16;x++)for(let c=0;c<4;c++)assert.equal(im.data[(y*32+x)*4+c],im.data[(y*32+33-x)*4+c]);
const cm=new PE.CanvasManager(document.createElement('canvas'),p);ex.project=p;ex.canvasManager=cm;const preview=createCanvas(768,256),ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=false;
for(let v=0;v<3;v++){const im=cm.getCompositeImageData(8,[1,0,2][v],0);assert(im.data.some((a,i)=>i%4===3&&a));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=v===1?'#40383d':'#f4f1f3';ctx.fillRect(v*256,0,256,256);ctx.drawImage(tile,v*256,0,256,256);}
fs.writeFileSync(path.join(out,'preview.png'),preview.toBuffer('image/png'));
const candidate=JSON.parse(await ex.exportProject(false).text());
// Preserve the exact original JSON outside the two authorized frame payloads.
const result=JSON.parse(text);for(const name of [front.name,rear.name])for(const ai of [0,1,2])result.layers.find(l=>l.name===name).frameData[`8_${ai}_0`]=candidate.layers.find(l=>l.name===name).frameData[`8_${ai}_0`];
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(result));
const check=await fetch(url);assert.equal(check.headers.get('etag'),etag,'project changed during work');
const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(result)});assert(saved.ok,'save '+saved.status);const read=await fetch(url);assert.deepEqual(await read.json(),result);console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
