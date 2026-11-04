const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
(async()=>{const url='http://127.0.0.1:8765/api/project?id=main',r=await fetch(url);assert(r.ok);const raw=await r.text(),p=JSON.parse(raw),c=structuredClone(p),etag=r.headers.get('etag'),out=path.resolve('备份/20261101-待机头部同步-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/before.json',raw);fs.writeFileSync(out+'/metadata.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
const heads=c.layers.filter(l=>l.sheetIndex===8&&l.name==='head'),front=heads.find(l=>l.frameData['8_1_0']),anchor=dec(front.frameData['8_1_0']);assert.equal(anchor.width,36);const changed=[];
for(const l of heads)for(const [k,f]of Object.entries(l.frameData)){if(k==='8_1_0')continue;const [si,ai,fi]=k.split('_').map(Number);assert.equal(si,8);const d=dec(f),dy=fi>=2?2:0;
// Only the head region changes; mouth marks and other pixels below it stay intact.
for(let y=0;y<28;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4,sy=y-dy;let a=sy>=0&&sy<25?anchor.data.slice((sy*36+x)*4,(sy*36+x)*4+4):[0,0,0,0];if(a[3]&&a[0]>100&&d.data[i+3]&&d.data[i]>100)a=d.data.slice(i,i+4);d.data.set(a,i)}
f.dataURL='data:image/png;base64,'+png.encode(36,36,d.data).toString('base64');changed.push(k)}
assert.equal(changed.length,11);assert.deepEqual(front.frameData['8_1_0'],p.layers.find(l=>l===p.layers[c.layers.indexOf(front)]).frameData['8_1_0']);
for(let i=0;i<c.layers.length;i++){if(!heads.includes(c.layers[i]))assert.deepEqual(c.layers[i],p.layers[i]);else{let a=structuredClone(c.layers[i]),b=structuredClone(p.layers[i]);a.frameData=b.frameData;assert.deepEqual(a,b)}}assert.deepEqual(c.spriteSheets,p.spriteSheets);
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const canvas=createCanvas(1152,864),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
for(let state=0;state<2;state++){const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(state?c:p)]))).project;
// Show bare body and active clothing/face variants without altering saved visibility.
for(let mode=0;mode<2;mode++){if(mode===1)for(const l of model.layers)if(l.sheetIndex===8&&(/头发|发饰|服装/.test(l.name)))l.visible=false;
const cm=new PE.CanvasManager(document.createElement('canvas'),model);for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=cm.getCompositeImageData(8,ai,fi,true,1);assert(im.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);const x=(state*4+fi)*144,y=(mode*3+ai)*144;ctx.fillStyle=mode?'#302c3b':'#e2dce8';ctx.fillRect(x,y,144,144);ctx.drawImage(tile,x,y,144,144)}}}
fs.writeFileSync(out+'/左原右同步-上合成下素体.png',canvas.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(c));fs.writeFileSync(out+'/verification.json',JSON.stringify({changed,anchorUnchanged:true,otherLayersUnchanged:true,otherActionsUnchanged:true,browserChecked:false},null,2));console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});

