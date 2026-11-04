const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const png=require('./png.cjs'),characterBase=require('../js/character-base.js'),sync=require('../js/character-sync.js');
const {createCanvas,ImageData,GlobalFonts}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','YaHei');
global.window=global;vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/core.js'),'utf8'));
const dir=path.resolve(__dirname,'../output/overalls-algorithm-20261104'),api='http://127.0.0.1:8765/api/project?id=';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const decode=c=>png.decode(Buffer.from(c.dataURL.split(',')[1],'base64'));
const blank=(w,h)=>({width:w,height:h,data:new Uint8Array(w*h*4)});
const encode=im=>({width:im.width,height:im.height,dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')});
const outline=(im,i)=>im.data[i]===70&&im.data[i+1]===70&&im.data[i+2]===94;
function canvasOf(im){const cv=createCanvas(im.width,im.height);cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);return cv;}
function raster(c,w,h){const cv=createCanvas(w,h),ctx=cv.getContext('2d'),im=decode(c),r=c.placement||{x:0,y:0,w:im.width,h:im.height};ctx.imageSmoothingEnabled=false;ctx.drawImage(canvasOf(im),r.x,r.y,r.w,r.h);return {width:w,height:h,data:ctx.getImageData(0,0,w,h).data};}
function rows(im){const result=[];for(let y=0;y<im.height;y++){const xs=[];for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3]&&!outline(im,i))xs.push(x);}if(xs.length)result.push({y,xs});}assert(result.length>=3);return result;}
function warp(sourceBody,sourceClothes,targetBody){
  const a=rows(sourceBody),b=rows(targetBody),out=blank(targetBody.width,targetBody.height);
  // shortcut: tight sleeveless clothes only; loose hems/sleeves need separate part masks.
  for(let row=0;row<b.length;row++){
    const sr=row<2?row:Math.round(2+(row-2)*(a.length-3)/Math.max(1,b.length-3)),from=a[sr],to=b[row];
    const min=from.xs[0],max=from.xs.at(-1),left=to.xs[0],right=to.xs.at(-1);
    for(const x of to.xs){
      let sx=Math.round(min+(x-left)*(max-min)/Math.max(1,right-left)),i=(from.y*sourceBody.width+sx)*4;
      if(sr>=2&&!sourceClothes.data[i+3]){const painted=from.xs.filter(px=>sourceClothes.data[(from.y*sourceBody.width+px)*4+3]);assert(painted.length);sx=painted.reduce((best,px)=>Math.abs(px-sx)<Math.abs(best-sx)?px:best);i=(from.y*sourceBody.width+sx)*4;}
      if(sourceClothes.data[i+3])out.data.set(sourceClothes.data.subarray(i,i+4),(to.y*out.width+x)*4);
    }
  }
  return out;
}
function body(p,si,ai,fi){const key=`${si}_${ai}_${fi}`,f=p.spriteSheets[si].actions[ai].frames[fi],l=p.layers.find(l=>l.name==='body'&&l.sheetIndex===si&&l.frameData[key]);assert(l,'missing body '+key);return raster(l.frameData[key],f.width,f.height);}
function compose(p,si,ai,fi){const f=p.spriteSheets[si].actions[ai].frames[fi],cv=createCanvas(f.width,f.height),ctx=cv.getContext('2d');for(const l of PE.getRenderLayers(p,si,ai)){if(l.isGroup||!PE.isLayerVisible(p,l,si))continue;const c=l.frameData?.[`${si}_${ai}_${fi}`];if(!c)continue;ctx.globalAlpha=l.opacity??1;ctx.drawImage(canvasOf(raster(c,f.width,f.height)),0,0);}return cv;}
function previews(p){
  const all=createCanvas(1280,880),ctx=all.getContext('2d');ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,all.width,all.height);ctx.imageSmoothingEnabled=false;const titles=['行走 · 算法','待机 · 源稿','拾取 · 算法','坐姿 · 算法'];
  for(let si=0;si<4;si++){
    const s=p.spriteSheets[si];ctx.fillStyle='#292b40';ctx.font='20px YaHei';ctx.fillText(titles[si],15,si*220+25);
    for(let ai=0;ai<3;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){const tile=compose(p,si,ai,fi),x=100+fi*140,y=si*220+32+ai*60;ctx.drawImage(tile,x,y,tile.width*3,tile.height*3);}
  }
  fs.writeFileSync(dir+'/all-frames.png',all.toBuffer('image/png'));
  const first=createCanvas(800,460),c=first.getContext('2d');c.fillStyle='#ddd5ed';c.fillRect(0,0,800,460);c.imageSmoothingEnabled=false;
  for(let si=0;si<4;si++){c.fillStyle='#292b40';c.font='18px YaHei';c.fillText(titles[si],si*200+12,25);for(let ai=0;ai<3;ai++){const tile=compose(p,si,ai,0);c.drawImage(tile,si*200+20,40+ai*135,tile.width*6,tile.height*6);}}
  fs.writeFileSync(dir+'/preview.png',first.toBuffer('image/png'));
  const animation=p.spriteSheets.map((s,si)=>({name:titles[si],actions:s.actions.map((a,ai)=>({direction:a.direction,frames:a.frames.map((f,fi)=>({url:compose(p,si,ai,fi).toDataURL(),ms:s.useFrameDurations!==false&&f.duration?f.duration:1000/(s.fps||8)}))}))}));
  fs.writeFileSync(dir+'/animation.html',`<!doctype html><meta charset="utf-8"><title>待机背带裤算法试验</title><style>body{background:#ddd5ed;color:#292b40;font:16px sans-serif}main{display:flex;gap:20px}section{width:23%}img{display:block;width:190px;height:170px;object-fit:contain;image-rendering:pixelated}</style><h2>待机三视图为源稿，其余全部算法生成</h2><p>本页只是已保存分支的动画预览，不写入工程。</p><main></main><script>const data=${JSON.stringify(animation)};for(const s of data){const section=document.createElement('section');section.innerHTML='<h3>'+s.name+'</h3>';document.querySelector('main').append(section);for(const a of s.actions){const img=document.createElement('img');section.append(img);let i=0;function next(){const f=a.frames[i];img.src=f.url;i=(i+1)%a.frames.length;setTimeout(next,f.ms)}next()}}</script>`);
}
async function main(){
  const original=fs.readFileSync(dir+'/main-original.json','utf8'),source=JSON.parse(original),meta=JSON.parse(fs.readFileSync(dir+'/source.json','utf8'));
  assert.equal(hash(original),meta.sha256);assert.equal(source.spriteSheets.length,4);
  const base=sync(characterBase(structuredClone(source)),source);base.name='背带裤 · 待机算法试验';
  const p=structuredClone(base),parents=new Map(p.layers.map(l=>[l,l.parent==null?null:p.layers[l.parent]])),sources={};
  for(let ai=0;ai<3;ai++){const direction=p.spriteSheets[1].actions[ai].direction,im=png.decode(fs.readFileSync(dir+'/source/sprites/'+direction+'.png')),b=body(p,1,ai,0);sources[direction]={clothes:im,body:b};for(let i=0;i<im.data.length;i+=4)if(im.data[i+3])assert(b.data[i+3]&&!outline(b,i),'source paint outside body');}
  const checks=[];
  for(const l of [...p.layers])if(l.name==='body'){
    const si=l.sheetIndex,entries=Object.keys(l.frameData),layer={name:'服装 / 算法背带裤',sheetIndex:si,parent:null,depth:l.depth,visible:true,locked:false,opacity:1,frameData:{}};parents.set(layer,parents.get(l));
    for(const key of entries){const [,ai,fi]=key.split('_').map(Number),direction=p.spriteSheets[si].actions[ai].direction,target=body(p,si,ai,fi),src=sources[direction],im=warp(src.body,src.clothes,target);let count=0;
      for(let i=0;i<im.data.length;i+=4)if(im.data[i+3]){assert(target.data[i+3]&&!outline(target,i),'clothing escaped body '+key);count++;}assert(count>0);
      if(si===1&&fi===0)assert.deepEqual(Buffer.from(im.data),Buffer.from(src.clothes.data),'idle source changed');
      layer.frameData[key]=encode(im);checks.push({key,direction,pixels:count,origin:si===1&&fi===0?'drawn idle first frame':'algorithm'});
    }
    p.layers.splice(p.layers.indexOf(l)+1,0,layer);
  }
  for(const l of p.layers)l.parent=parents.get(l)==null?null:p.layers.indexOf(parents.get(l));
  p.currentSheetIndex=1;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.name==='服装 / 算法背带裤'&&l.frameData['1_1_0']);
  assert.deepEqual(p.spriteSheets,source.spriteSheets);for(const l of p.layers.filter(l=>l.inheritedBase)){assert(l.locked);const old=base.layers.find(b=>b.sheetIndex===l.sheetIndex&&b.name===l.name&&JSON.stringify(b.frameData)===JSON.stringify(l.frameData));assert(old,'base changed');}
  assert.equal(checks.length,66);assert.equal(checks.filter(c=>c.origin==='drawn idle first frame').length,3);
  fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));previews(p);
  fs.writeFileSync(dir+'/checks.json',JSON.stringify({source:meta,frames:checks,totalFrames:66,drawnSourceFrames:3,generatedFrames:63,baseUnchanged:true,geometryAndTimingUnchanged:true,clippedToBodyAndPreservedOutline:true},null,2));
  if(process.argv.includes('--save')){
    assert(!fs.existsSync(dir+'/saved.json'),'already saved; do not duplicate');
    await(await fetch('http://127.0.0.1:8765/api/projects')).json();
    const current=await fetch(api+'main');assert.equal(current.headers.get('etag'),meta.etag,'main changed; regenerate from current main, do not publish stale copy');assert.equal(await current.text(),original);
    const id='character-'+crypto.randomUUID(),put=async(data,etag)=>{const r=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(data)});assert(r.ok,`PUT ${r.status}: ${await r.text()}`);};
    await put(base,'none');let r=await fetch(api+id),raw=await r.text();fs.writeFileSync(dir+'/branch-before.json',raw);const beforeTag=r.headers.get('etag');
    fs.writeFileSync(dir+'/branch-before-meta.json',JSON.stringify({id,etag:beforeTag,sha256:hash(raw)},null,2));
    assert.deepEqual(JSON.parse(raw),base);await put(p,beforeTag);r=await fetch(api+id);raw=await r.text();const read=JSON.parse(raw);assert.deepEqual(read,p,'saved readback differs');
    fs.writeFileSync(dir+'/branch-saved.json',raw);assert.equal(await(await fetch(api+'main')).text(),original,'main changed during test');
    const saved={id,name:p.name,url:'http://127.0.0.1:8765/?project='+id,etag:r.headers.get('etag'),sha256:hash(raw),mainUnchanged:true};fs.writeFileSync(dir+'/saved.json',JSON.stringify(saved,null,2));console.log(JSON.stringify(saved,null,2));
  }else console.log('PASS: candidate only; 3 drawn source cels, 63 algorithm cels, all 66 body-mask checks, unchanged protected base / geometry / timing');
}
module.exports={warp,body,raster,encode,compose};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
