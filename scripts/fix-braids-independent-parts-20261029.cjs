const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { createCanvas, ImageData, Image } = require('@napi-rs/canvas');
const root = path.resolve(__dirname,'..'), asset = path.join(root,'发型素材/06-蓬松双麻花辫');
const out = path.join(asset,'贴头刘海与低位双辫-20261029');
const id = 'character-strawberry-braids-idle-20261029', baseURL = 'http://127.0.0.1:8765/api/project?id=';
global.window = global; global.ImageData = ImageData; global.Image = Image;
global.document = {createElement(){ const c=createCanvas(1,1); c.style={}; return c; }};
global.File = class extends Blob {constructor(parts,name){super(parts);this.name=name;}};
global.FileReader = class {async readAsText(f){this.result=await f.text();this.onload();}};
for (const n of ['core','history','canvas','tools','spritesheet','export','animation']) vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const palette = {O:[119,119,119,255],S:[178,178,178,255],B:[209,209,209,255]};
const at = (x,y)=>(y*32+x)*4;
const opaque = (d,x,y)=>x>=0&&x<32&&y>=0&&y<32&&!!d.data[at(x,y)+3];
const edge = (d,x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!opaque(d,x+dx,y+dy));
function pixel(d,x,y,c){d.data.set(palette[c],at(x,y));}
function bounds(d,y){const xs=Array.from({length:32},(_,x)=>x).filter(x=>opaque(d,x,y));return xs.length?[xs[0],xs.at(-1)]:null;}
function copy(d){return new ImageData(new Uint8ClampedArray(d.data),32,32);}
function spans(rows){
  const d=new ImageData(32,32);
  for(const [y,a,b]of rows)for(let x=a;x<=b;x++)pixel(d,x,y,'B');
  return d;
}
function outline(d){
  const shape=copy(d);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(opaque(shape,x,y)&&edge(shape,x,y))pixel(d,x,y,'O');
  return d;
}
function mirrorSpan(d,y,a,b){for(let x=a;x<=b;x++){pixel(d,x,y,'B');pixel(d,31-x,y,'B');}}
function makeFront(original, ai){
  if(ai===2)return new ImageData(32,32);
  const crown=[[1,10,21],[2,9,22],[3,8,23],[4,7,24],[5,6,25],[6,5,26],[7,4,27],[8,4,27]];
  const d=spans(crown);
  if(ai===1){
    const fringe=[13,12,10,9,11,12,12,11,11,12,12,11,9,10,12,13];
    for(let x=8;x<=23;x++)for(let y=9;y<=fringe[x-8];y++)pixel(d,x,y,'B');
    for(const [y,a,b]of [[9,4,8],[10,4,8],[11,4,8],[12,4,8],[13,4,7],[14,4,7],[15,5,7],[16,5,7],[17,6,8],[18,7,7]])mirrorSpan(d,y,a,b);
    for(const [x,y]of [[10,5],[10,6],[9,7],[9,8],[13,9],[14,10],[6,12],[6,13],[6,14]])for(const xx of [x,31-x])if(opaque(d,xx,y))pixel(d,xx,y,'S');
  }else{
    // Retain the selected side reference's forehead rhythm and cheek-hugging curl.
    for(let y=9;y<=12;y++)for(let x=4;x<=27;x++)if(opaque(original,x,y)){
      d.data.set(original.data.subarray(at(x,y),at(x,y)+4),at(x,y));
    }
    for(const [y,a,b]of [[9,4,8],[10,4,8],[11,4,8],[12,4,8],[13,5,12],[14,5,11],[15,6,11],[16,6,11],[17,7,13],[18,8,13],[19,10,12]])for(let x=a;x<=b;x++)pixel(d,x,y,'B');
    for(const [x,y]of [[11,4],[10,5],[9,6],[9,7],[10,12],[10,13],[10,14],[10,15],[11,16],[11,17],[12,18],[18,9],[22,9]])if(opaque(d,x,y))pixel(d,x,y,'S');
  }
  return outline(d);
}
function makeRear(head,ai){
  const d=new ImageData(32,32);
  if(ai!==2){
    // Like the supplied RearHair2 sprites: a thin posterior arch, with the face left open.
    for(let y=2;y<14;y++){
      const hb=bounds(head,y);if(!hb)continue;
      const [a,b]=hb;
      for(let x=a;x<=b;x++)if(y<=4||x<a+3||x>b-3)pixel(d,x,y,'B');
    }
  }
  const braid=[[14,5,6],[15,4,6],[16,3,5],[17,2,5],[18,2,5],[19,3,6],[20,3,6],[21,2,5],[22,2,5],[23,3,6],[24,3,5],[25,3,5],[26,4,4]];
  if(ai===0){
    for(const [y,a,b]of braid)for(let x=a+1;x<=b+1;x++)pixel(d,x,y,'B');
    for(const [y,a,b]of [[14,25,26],[15,24,26]])for(let x=a;x<=b;x++)pixel(d,x,y,'B');
    for(const [y,a,b]of [[16,24,26],[17,25,27],[18,26,28],[19,26,28],[20,25,27],[21,25,27],[22,26,28],[23,26,28],[24,26,27],[25,27,27]])for(let x=a;x<=b;x++)pixel(d,x,y,'B');
  }else for(const [y,a,b]of braid)mirrorSpan(d,y,a,b);
  if(ai===2){
    // Only the rear view needs a close-fitting scalp base; no raised second crown.
    for(let y=2;y<22;y++)for(let x=5;x<=26;x++)if(opaque(head,x,y))pixel(d,x,y,'B');
    for(const [x,y]of [[14,5],[14,6],[13,7],[13,8],[12,9],[12,10],[12,11],[13,12],[13,13]])for(const xx of [x,31-x])if(opaque(d,xx,y))pixel(d,xx,y,'S');
  }
  for(const [x,y]of [[3,17],[4,18],[4,19],[5,20],[3,21],[4,22],[4,23],[4,24]]){
    if(ai===0){if(opaque(d,x+1,y))pixel(d,x+1,y,'S');}
    else for(const xx of [x,31-x])if(opaque(d,xx,y))pixel(d,xx,y,'S');
  }
  return outline(d);
}
function animate(d,dy,fi,kind,ai){
  const result=new ImageData(32,32);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(opaque(d,x,y)){
    const compression=kind==='rear'?(ai===2?22:20):18;
    const yy=y+dy-(dy&&y>=compression?1:0), bend=kind==='rear'&&(fi===1||fi===2)&&y>=24?1:0;
    const xx=x+(bend?(x<16?-1:1):0);
    assert(xx>=0&&xx<32&&yy>=0&&yy<32);
    result.data.set(d.data.subarray(at(x,y),at(x,y)+4),at(xx,yy));
  }
  return result;
}
function png(data,file){const c=createCanvas(32,32);c.getContext('2d').putImageData(data,0,0);fs.writeFileSync(file,c.toBuffer('image/png'));}
function tile(ctx,data,x,y,scale=5){const c=createCanvas(32,32);c.getContext('2d').putImageData(data,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(c,x,y,32*scale,32*scale);}
async function main(){
  const r=await fetch(baseURL+id);assert(r.ok);const text=await r.text(),raw=JSON.parse(text),etag=r.headers.get('etag');
  const inspected=JSON.parse(fs.readFileSync(path.join(out,'before.json'),'utf8'));
  const isHair=l=>/^(头发|发饰) \//.test(l.name)&&l.sheetIndex===8;
  assert.deepEqual(raw.layers.filter(isHair),inspected.layers.filter(isHair),'Hair changed since inspection; preserve user edits');
  fs.writeFileSync(path.join(out,'work-before.json'),text);fs.writeFileSync(path.join(out,'work-etag.txt'),etag);
  const exporter=new PE.ExportManager();const {project}=await exporter.importProject(new File([text],'before.json'));
  exporter.project=project;const cm=new PE.CanvasManager(document.createElement('canvas'),project);exporter.canvasManager=cm;
  const front=project.layers.find(l=>l.name==='头发 / 06 分束齐刘海 / 前发');
  const rear=project.layers.find(l=>l.name==='头发 / 06 蓬松双麻花辫 / 后发');
  const acc=project.layers.find(l=>l.name==='发饰 / 06 草莓蝴蝶结');
  for(let ai=0;ai<3;ai++){
    const h0=project.layers.find(l=>l.name==='head'&&l.frameData.has(`8_${ai}_0`)).frameData.get(`8_${ai}_0`);
    const f=makeFront(front.frameData.get(`8_${ai}_0`),ai),b=makeRear(h0,ai);
    for(let fi=0;fi<4;fi++){
      const key=`8_${ai}_${fi}`,head=project.layers.find(l=>l.name==='head'&&l.frameData.has(key)).frameData.get(key);
      let top=32;for(let y=0;y<24;y++)if(bounds(head,y)){top=y;break;}
      const dy=top-2;assert([0,2].includes(dy));
      const fd=animate(f,dy,fi,'front',ai),bd=animate(b,dy,fi,'rear',ai);
      if(ai===2){for(let y=2+dy;y<22+dy;y++)for(let x=5;x<=26;x++)if(opaque(head,x,y)&&!opaque(bd,x,y))pixel(bd,x,y,'B');outline(bd);}
      for(const d of [fd,bd])for(let y=0;y<32;y++)for(let x=0;x<32;x++){
        const rgba=Array.from(d.data.subarray(at(x,y),at(x,y)+4));
        assert([0,255].includes(rgba[3]));
        if(rgba[3])assert(Object.values(palette).some(c=>c.every((n,i)=>n===rgba[i])));
        if(ai!==0)assert.deepEqual(rgba,Array.from(d.data.subarray(at(31-x,y),at(31-x,y)+4)),'Front/rear symmetry');
      }
      if(ai===2)assert(!fd.data.some(v=>v));
      else{
        for(let y=2+dy;y<7+dy;y++)for(let x=0;x<32;x++)if(opaque(head,x,y))assert(opaque(fd,x,y),'Front crown requires rear/accessory');
        for(let y=21+dy;y<32;y++)for(let x=0;x<32;x++)assert(!opaque(fd,x,y),'Braid pixels leaked into front slot');
      }
      if(ai===2){for(let y=2+dy;y<21+dy;y++)for(let x=5;x<=26;x++)if(opaque(head,x,y))assert(opaque(bd,x,y),'Rear scalp coverage');}else{
        for(let y=0;y<14+dy;y++)for(let x=0;x<32;x++)if(opaque(bd,x,y))assert(opaque(head,x,y),'Posterior arch rises outside the skull');
        for(let y=8+dy;y<14+dy;y++)for(let x=9;x<=22;x++)assert(!opaque(bd,x,y),'Rear layer fills the front of the face');
        assert(!bounds(fd,dy),'Front crown was raised above its fitted contour');
        for(let y=2+dy;y<=13+dy;y++){const hb=bounds(head,y),fb=bounds(fd,y);if(hb&&fb)assert(fb[0]>=hb[0]-1&&fb[1]<=hb[1]+1,'Front silhouette expands beyond the skull');}
      }
      front.frameData.set(key,fd);rear.frameData.set(key,bd);
      png(fd,path.join(out,`front-${ai}-${fi}.png`));png(bd,path.join(out,`rear-${ai}-${fi}.png`));
      const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
      project.currentActionIndex=ai;project.currentFrameIndex=fi;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
      const decoded=require('./png.cjs').decode(Buffer.from(await(await exporter.exportFrameAsBlob(8,ai,fi)).arrayBuffer()));assert.deepEqual(Array.from(decoded.data),Array.from(im.data));
      const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project,canvasManager:cm,sheetIndex:8,actionIndex:ai,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,im.data);
      png(im,path.join(out,`idle-${ai}-${fi}.png`));
    }
  }
  const exported=JSON.parse(await exporter.exportProject(false).text()),candidate=structuredClone(raw);
  for(let i=0;i<candidate.layers.length;i++)if(candidate.layers[i].name===front.name||candidate.layers[i].name===rear.name)candidate.layers[i].frameData=exported.layers[i].frameData;
  for(let i=0;i<raw.layers.length;i++)if(![front.name,rear.name].includes(raw.layers[i].name))assert.deepEqual(candidate.layers[i],raw.layers[i]);
  assert.deepEqual(candidate.spriteSheets,raw.spriteSheets);
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  const mainR=await fetch(baseURL+'main');assert(mainR.ok);const mainRaw=await mainR.json();
  const oldF=mainRaw.layers.filter(l=>l.sheetIndex===8&&l.name.startsWith('头发 /')&&l.name.endsWith('前发'));
  const oldB=mainRaw.layers.filter(l=>l.sheetIndex===8&&l.name.startsWith('头发 /')&&l.name.endsWith('后发')&&Object.keys(l.frameData).length===12);
  assert(oldF.length>=2&&oldB.length>=2);
  const fiIndex=candidate.layers.findIndex(l=>l.name===front.name),bi=candidate.layers.findIndex(l=>l.name===rear.name),ac=candidate.layers.findIndex(l=>l.name===acc.name);
  const variants=[['front only',null,false,false],['new F + old R1',null,oldB[0],false],['new F + old R2',null,oldB[1],false],['old F1 + new R',oldF[0],null,false],['old F2 + new R',oldF[1],null,false],['rear only',false,null,false],['own pair',null,null,false],['bow on old pair',oldF[1],oldB[0],true],['own + bow',null,null,true]];
  for(let fi=0;fi<4;fi++){
    const c=createCanvas(variants.length*160,3*160),cx=c.getContext('2d');
    for(let v=0;v<variants.length;v++){
      const [label,vf,vb,va]=variants[v],data=structuredClone(candidate);
      for(const [index,part]of [[fiIndex,vf],[bi,vb]])if(part===false)data.layers[index].visible=false;else if(part)data.layers[index]={...structuredClone(part),visible:true,parent:null};
      data.layers[ac].visible=va;
      const {project:mix}=await exporter.importProject(new File([JSON.stringify(data)],'mix.json'));
      const canvas=new PE.CanvasManager(document.createElement('canvas'),mix);
      for(let ai=0;ai<3;ai++){
        const d=canvas.getCompositeImageData(8,ai,fi);assert(d.data.some((n,i)=>i%4===3&&n));
        cx.fillStyle=v%2?'#37343f':'#eee6ed';cx.fillRect(v*160,ai*160,160,160);tile(cx,d,v*160,ai*160);
      }
    }
    fs.writeFileSync(path.join(out,`双向混搭-帧${fi+1}.png`),c.toBuffer('image/png'));
  }
  fs.writeFileSync(path.join(out,'检查说明.json'),JSON.stringify({columns:variants.map(v=>v[0]),directions:['side','front','back'],frames:4,reference:'C:/Users/cl/Documents/测试/一些素材/角色衣服/衣服/05/TV/Female/TV_{FrontHair1,RearHair1,RearHair2}_p80024.png',checks:['new front with two existing rear styles','two existing front styles with new rear','bow with a different complete hairstyle','front follows skull within one native pixel','front/side rear has a thin hidden posterior arch and low braids, without a filled face; back base follows actual skull','all non-hair layers and bow pixels unchanged','all 12 canvas, animation and PNG paths match']},null,2));
  if(process.argv.includes('--publish')){
    const saved=await fetch(baseURL+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(candidate)});assert(saved.ok,'Save rejected: '+saved.status);
    const back=await fetch(baseURL+id);assert(back.ok);assert.deepEqual(await back.json(),candidate);console.log('Saved and API verified:',id);
  }
  console.log('Verified 12 frames and 108 two-way mixing composites:',out);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
