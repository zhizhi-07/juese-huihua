// One-off repair for the two explicitly selected projects; never replace user artwork wholesale.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const deps='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {PNG}=require(path.join(deps,'pngjs'));
const {createCanvas,ImageData}=require(path.join(deps,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765';
const ids=['main','draft-conflict-1793762650078-819fdffe'];
const sourcePath=path.join(root,'备份/20261104-冲突工程合并眼睛-1793762999856/conflict-before.json');
const knownHash='ecd1dfb896e717ac9abdf921208105c4815c5541f482ebbeb54f8993cbb5469a';
const pointer=path.join(root,'output/latest-eye-repair-backup.txt');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const decode=v=>PNG.sync.read(Buffer.from(v.dataURL.split(',')[1],'base64'));
const encode=im=>'data:image/png;base64,'+PNG.sync.write(im).toString('base64');
const rgba=(im,x,y)=>[...im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4)];
const dark=c=>c[0]===70&&c[1]===70&&c[2]===94&&c[3]===255;
const shade=c=>c.join(',')==='224,197,180,255';
const skin=[254,237,225,255];
function eyeMask(im,direction){
 const w=im.width,h=im.height,seen=new Set(),inner=[];
 for(let i=0;i<w*h;i++)if(dark(rgba(im,i%w,Math.floor(i/w)))&&!seen.has(i)){
  const queue=[i],pixels=[];let boundary=false;seen.add(i);
  while(queue.length){const n=queue.pop(),x=n%w,y=Math.floor(n/w);pixels.push([x,y]);
   for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=w||yy>=h){boundary=true;continue;}
    if(!rgba(im,xx,yy)[3])boundary=true;
    const next=yy*w+xx;if(dark(rgba(im,xx,yy))&&!seen.has(next)){seen.add(next);queue.push(next);}
   }
  }
  if(!boundary)inner.push(pixels);
 }
 assert(['side','down'].includes(direction));assert(inner.length>=1&&inner.length<=2,'ambiguous eye components');
 inner.sort((a,b)=>a[0][0]-b[0][0]);const first=inner[0],x=first[0][0];
 assert(first.every(c=>c[0]===x)&&[1,2].includes(first.length));
 let top=Math.min(...first.map(c=>c[1]));
 if(first.length===1){assert(shade(rgba(im,x,top-1)),'blinking lid must be present');top--;}
 // In four turning walk frames the second eye touches the outline: its position is relative to the actual first eye, not a fixed canvas coordinate.
 const second=x+(direction==='side'?3:4),mask=[[x,top],[x,top+1],[second,top],[second,top+1]];
 for(const [xx,yy]of mask){const c=rgba(im,xx,yy);assert(dark(c)||shade(c),'eye shape/colour changed; review this frame');assert(yy+1<h);}
 return mask;
}
const get=async id=>{const r=await fetch(base+'/api/project?id='+id,{headers:{'X-Pixel-Editor':'1'},cache:'no-store'});assert(r.ok,'GET '+id+' '+r.status);return{raw:await r.text(),etag:r.headers.get('etag')};};
function repair(current,source){
 const p=structuredClone(current),frames=[];
 for(const oldHead of source.layers.filter(l=>l.name==='head'))for(const [key,value]of Object.entries(oldHead.frameData||{})){
  const [si,ai]=key.split('_').map(Number),direction=source.spriteSheets[si].actions[ai].direction;if(direction==='up')continue;
  const sourceImage=decode(value),mask=eyeMask(sourceImage,direction),allowed=new Set(mask.map(([x,y])=>y*sourceImage.width+x));
  const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.frameData?.[key]);
  const eye=p.layers.find(l=>l.name==='眼睛'&&l.sheetIndex===si&&l.frameData?.[key]);assert(head&&eye);
  const image=decode(head.frameData[key]),eyes=new PNG({width:image.width,height:image.height});assert.equal(image.width,sourceImage.width);assert.equal(image.height,sourceImage.height);
  // Verify that the previous bad extraction is the only difference from the ear-edited original.
  for(let i=0;i<image.width*image.height;i++)if(!allowed.has(i))assert.deepEqual([...image.data.subarray(i*4,i*4+4)],[...sourceImage.data.subarray(i*4,i*4+4)],'other head edit present: '+key+'/'+i);
  for(const [x,y]of mask){image.data.set(skin,(y*image.width+x)*4);eyes.data.set(rgba(sourceImage,x,y),((y+1)*image.width+x)*4);}
  head.frameData[key].dataURL=encode(image);eye.frameData[key].dataURL=encode(eyes);
  for(let i=0;i<image.width*image.height;i++)assert.equal(image.data[i*4+3],sourceImage.data[i*4+3],'head alpha hole: '+key);
  let eyeCount=0;for(let i=0;i<eyes.width*eyes.height;i++)if(eyes.data[i*4+3])eyeCount++;assert.equal(eyeCount,4);
  for(const [x,y]of mask){assert.deepEqual(rgba(image,x,y),skin);assert.deepEqual(rgba(eyes,x,y+1),rgba(sourceImage,x,y));}
  frames.push({key,direction,sourceEyes:mask,destinationEyes:mask.map(([x,y])=>[x,y+1])});
 }
 assert.equal(frames.length,44);assert.equal(frames.reduce((n,f)=>n+f.sourceEyes.length,0),176);
 for(let i=0;i<p.layers.length;i++)if(!['head','眼睛'].includes(p.layers[i].name))assert.deepEqual(p.layers[i],current.layers[i],'unrelated layer changed');
 for(const k of Object.keys(current))if(k!=='layers')assert.deepEqual(p[k],current[k],'project metadata changed');
 return{project:p,frames};
}
function proof(source,p,file){
 const samples=['0_0_3','1_1_0','2_1_2','3_0_2'],labels=['turning walk / frame 4','front idle / frame 1','pickup blink / frame 3','side sit / frame 3'];
 const canvas=createCanvas(880,970),ctx=canvas.getContext('2d');ctx.fillStyle='#e9e9e9';ctx.fillRect(0,0,880,970);ctx.imageSmoothingEnabled=false;ctx.font='15px sans-serif';
 const names=['Original ear-edited head','Repaired skin / eyes hidden','Separate eyes only','Eyes shifted DOWN 1 pixel'];
 for(let col=0;col<4;col++){const k=samples[col],old=source.layers.find(l=>l.name==='head'&&l.frameData?.[k]).frameData[k],head=p.layers.find(l=>l.name==='head'&&l.frameData?.[k]).frameData[k],eye=p.layers.find(l=>l.name==='眼睛'&&l.frameData?.[k]).frameData[k];ctx.fillStyle='#202020';ctx.fillText(labels[col],col*220+8,20);
  for(let row=0;row<4;row++){const y=35+row*230;ctx.fillStyle='#333';ctx.fillText(names[row],col*220+8,y+17);const draw=v=>{const im=decode(v),temp=createCanvas(im.width,im.height);temp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);const scale=8;ctx.drawImage(temp,col*220+20+(20-im.width)*scale/2,y+40,im.width*scale,im.height*scale);};if(row===0)draw(old);if(row===1)draw(head);if(row===2)draw(eye);if(row===3){draw(head);draw(eye);}}
 }
 fs.writeFileSync(file,canvas.toBuffer('image/png'));
}
(async()=>{
 if(process.argv[2]==='commit'){
  const dir=fs.readFileSync(pointer,'utf8').trim(),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  for(const item of manifest.projects){const latest=await get(item.id);assert.equal(latest.etag,item.etag,'Project changed: do not overwrite');const body=fs.readFileSync(path.join(dir,item.candidate),'utf8');
   const r=await fetch(base+'/api/project?id='+item.id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':item.etag},body}),response=await r.text();fs.writeFileSync(path.join(dir,item.id+'-save.json'),JSON.stringify({status:r.status,response,etagBefore:item.etag,etagAfter:r.headers.get('etag')},null,2));assert(r.ok,'PUT failed '+r.status);
   const check=await get(item.id);fs.writeFileSync(path.join(dir,item.id+'-after.json'),check.raw);assert.deepEqual(JSON.parse(check.raw),JSON.parse(body),'readback mismatch');item.afterSha256=hash(check.raw);item.afterETag=check.etag;
  }
  manifest.saved=true;fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({status:'PASS',saved:true,dir,projects:manifest.projects},null,2));return;
 }
 const listing=await fetch(base+'/api/projects');assert(listing.ok);const projects=await listing.json();assert(ids.every(id=>projects.some(p=>p.id===id)));
 const dir=path.join(root,'备份','20261104-眼睛补底与逐帧纠正-'+Date.now());fs.mkdirSync(dir,{recursive:true});
 const sourceRaw=fs.readFileSync(sourcePath,'utf8'),source=JSON.parse(sourceRaw);fs.writeFileSync(path.join(dir,'ear-edited-original.json'),sourceRaw);
 const manifest={saved:false,sourcePath,sourceSha256:hash(sourceRaw),projects:[],checks:{eyeFrames:44,eyePixels:176,headAlphaMatchesOriginal:true,eyeOffset:[0,1],otherHeadPixelsAndLayersPreserved:true}};
 for(const id of ids){const current=await get(id);fs.writeFileSync(path.join(dir,id+'-before.json'),current.raw);assert.equal(hash(current.raw),knownHash,'User project has changed; inspect rather than restore older pixels');const result=repair(JSON.parse(current.raw),source),candidate=id+'-candidate.json';fs.writeFileSync(path.join(dir,candidate),JSON.stringify(result.project));fs.writeFileSync(path.join(dir,id+'-frame-coordinates.json'),JSON.stringify(result.frames,null,2));manifest.projects.push({id,etag:current.etag,beforeSha256:hash(current.raw),candidate});if(id==='main')proof(source,result.project,path.join(dir,'repair-proof.png'));}
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(dir,'恢复说明.md'),'# 恢复说明\n\n本次只修复两个工程的头部眼位与眼睛图层，没有修改编辑器代码。*-before.json 是本次修改前的完整备份（其中含上一轮错误眼睛拆分），ear-edited-original.json 是耳朵修改后的原始成图，用于逐帧核对，不要整稿覆盖新修改。\n\n需撤销本次修正时，先从 API GET 对应工程并备份最新原文、SHA256 和 ETag，再比较最新版本与本目录 after 文件。只在没有新绘画改动时，用对应 before 文件通过同一 id 的 PUT + X-Pixel-Editor:1 + If-Match:最新核对的ETag 保存；409立即停止。原始文件与候选稿均保留，不自动回滚。\n');fs.writeFileSync(pointer,dir);console.log(JSON.stringify({status:'PASS',prepared:true,dir,checks:manifest.checks},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
