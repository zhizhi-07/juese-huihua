const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+f+'.js','utf8'));
const backup=path.resolve('备份/20261101-鸭鸭衣服按新参考重画'),out=path.resolve('自检记录/鸭鸭衣服按新参考重画'),assets=path.resolve('服装素材/鸭鸭衣服按新参考重画');
const url='http://127.0.0.1:8765/api/project?id=character-1514538e-509b-4072-bcc8-6f7dfc0d24a4';
const P={O:'#464254',Y:'#ffdc45',L:'#ffe770',S:'#d5b52f',D:'#b29b30',W:'#fff7e1',C:'#e5dfc7',G:'#787b47',H:'#97985b',Q:'#f4aa29',K:'#bd8327'};
function draw(fi){
 const c=createCanvas(72,72),ctx=c.getContext('2d'),d=new ImageData(72,72),t=fi>=2?26:24,cb=[31,29,29,31][fi];
 const rgb=k=>[...P[k].slice(1).match(/../g).map(x=>parseInt(x,16)),255];
 function rect(x,y,w,h,k){for(let yy=Math.round(y*2);yy<Math.round((y+h)*2);yy++)for(let xx=Math.round(x*2);xx<Math.round((x+w)*2);xx++){assert(xx>=0&&yy>=0&&xx<72&&yy<72);d.data.set(rgb(k),(yy*72+xx)*4);}}
 function rows(x,y,lines){lines.forEach((s,j)=>[...s].forEach((k,i)=>{if(k!=='.')rect(x+i/2,y+j/2,.5,.5,k);}));}
 // Short rounded sleeves, not the discarded horizontal box sleeves.
 for(let side=0;side<2;side++){
  const r=(x,y,w,h,k)=>rect(side?36-x-w:x,y,w,h,k);
  const a=Math.min(t+1,cb-3);
  r(10,a,2,cb-a,'O');r(9,a+.5,2.5,cb-a-.5,'Y');
  r(8,a+1,2,cb-a-1,'Y');r(7,cb-1.5,3,1.5,'Y');
  r(6.5,cb-.5,4.5,1,'O');r(7,cb-.5,4,1,'S');
  r(8,a+1,1,Math.max(.5,cb-a-1.5),'L');r(10.5,a+.5,1,Math.max(.5,cb-a-.5),'S');
 }
 // Coat fitted to the existing torso, with a narrow pleated skirt below it.
 rect(10.5,t,15,8.5-(t-24),'O');rect(11,t,14,8-(t-24),'Y');
 rect(11,t+1,1,6.5-(t-24),'L');rect(24,t+1,1,6.5-(t-24),'S');
 rect(11,31,14,1,'S');rect(12,31,12,.5,'Y');
 rect(10.5,32,15,1,'C');rect(11,32,14,.5,'W');
 for(let x=12;x<25;x+=2.5)rect(x,32,.5,1,'C');
 // Rounded ivory collar, stepped in large readable half-pixels.
 rows(11,t,['WWWWWWWWWW....WWWWWWWWWWWWWW','WWWWWWWWWW....WWWWWWWWWWWWWW','..WWWWWWWWW..WWWWWWWWWWWW..','..WWWWWWWWW..WWWWWWWWWWWW..','....WWWWWWW..WWWWWWWWWW....','....CCCCCCC..CCCCCCCCC......']);
 // The front buttons and diagonal pale strap are separate readable pixel clusters.
 const by=t+2.5;rect(17,by,1,1,'Q');if(by+2<31)rect(17,by+2,1,1,'Q');
 const strap=[[17.5,t+1.5],[18,t+2],[18.5,t+2.5],[19,t+2.5],[19.5,t+3],[20,t+3.5],[20.5,t+3.5],[21,t+4],[21.5,t+4.5]];
 for(const [x,y]of strap)if(y<30.5)rect(x,y,1,.5,'W');
 // Duck silhouette: dark rim, amber fill, raised head at the right.
 rows(12.5,29,['...OO..','..OQQO.','..OQQO.','.OQQQO.','OQQQQO.','.OOOO..']);
 // Olive bottle pouch at the opposite hip.
 rows(21,28.5,['.GGG..','GHHHG.','GHHHHG','GHWWHG','GHWWHG','GHHHHG','GHHHHG','.GGGG.']);
 assert(d.data.some((v,i)=>i%4===3&&v));assert(d.data.every((v,i)=>i%4!==3||v===0||v===255));ctx.putImageData(d,0,0);return c;
}
async function main(){
 const raw=fs.readFileSync(backup+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),idx=p.layers.findIndex(l=>l.name==='服装 / 黄色鸭鸭外套＋奶油短裙 / 正面高清');assert(idx>=0);
 const l=p.layers[idx];l.name='服装 / 黄色鸭鸭外套＋奶油短裙 / 正面像素';l.frameData={};
 for(let fi=0;fi<4;fi++){const c=draw(fi);l.frameData['8_1_'+fi]={width:72,height:72,placement:{x:0,y:0,w:36,h:36},dataURL:c.toDataURL()};fs.writeFileSync(assets+'/正面-'+fi+'.png',c.toBuffer('image/png'));}
 p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=idx;
 for(let i=0;i<p.layers.length;i++)if(i!==idx)assert.deepEqual(p.layers[i],before.layers[i]);assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.equal(p.layers.length,before.layers.length);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new Blob([JSON.stringify(p)])),cm=new PE.CanvasManager(Object.assign(createCanvas(432,432),{style:{}}),project);ex.init(project,cm);cm.zoom=12;cm.showGrid=false;
 const contact=createCanvas(864,864),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let fi=0;fi<4;fi++){
  project.currentFrameIndex=fi;cm.render();const scale=cm.offscreenCanvas.width/36,expected=cm.getCompositeImageData(8,1,fi,true,scale);assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36*scale,36*scale).data,expected.data);
  const blob=await ex.exportFrameAsBlob(8,1,fi),image=await loadImage(Buffer.from(await blob.arrayBuffer())),cv=createCanvas(image.width,image.height),ctx=cv.getContext('2d');ctx.drawImage(image,0,0);assert.deepEqual(ctx.getImageData(0,0,cv.width,cv.height).data,cm.getCompositeImageData(8,1,fi,true,cv.width/36).data);
  fs.writeFileSync(out+'/正面-'+fi+'.png',cv.toBuffer('image/png'));cx.fillStyle=fi%2?'#37343f':'#e6e1ed';cx.fillRect((fi%2)*432,Math.floor(fi/2)*432,432,432);cx.drawImage(cv,(fi%2)*432,Math.floor(fi/2)*432,432,432);
 }
 fs.writeFileSync(out+'/四帧预览.png',contact.toBuffer('image/png'));console.log('PREPARED',out);
 if(process.argv.includes('--save')){
  const fresh=await fetch(url);assert(fresh.ok);assert.deepEqual(await fresh.json(),before,'版本已变化，不覆盖');
  const res=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fresh.headers.get('etag')},body:JSON.stringify(p)}),text=await res.text();assert(res.ok,text);console.log('PUT',res.status,text);
  const read=await fetch(url);assert(read.ok);const saved=await read.json();assert.deepEqual(saved,p);fs.writeFileSync(out+'/api-readback.json',JSON.stringify(saved));
  fs.writeFileSync(out+'/验证与恢复.txt','原稿SHA256 '+crypto.createHash('sha256').update(raw).digest('hex')+'\n只重画已有服装层的4个正面待机帧；其余180层、素体、手、头部、五官、其他方向与动作未变。\n未使用生图。主画布、合成、PNG导出逐帧像素一致。PUT '+res.status+'；GET '+read.status+' 深比较一致。\n未操作浏览器或刷新前台。\n恢复：GET当前版本，仅将上述服装层替换为备份 original.json 中对应层，再携带当次ETag PUT同工程。409时停止，不整稿覆盖后续修改。恢复未执行。\n');console.log('GET',read.status,'PASS');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
