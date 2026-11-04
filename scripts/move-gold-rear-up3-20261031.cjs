const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-后发上移3像素-1793426692483'),out=path.join(root,'自检记录/20261031-灰色混搭所有动作后发上移3像素');
const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),raw=JSON.parse(bytes),candidate=structuredClone(raw);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
fs.mkdirSync(out,{recursive:true});
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
const toCanvas=d=>{const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;};
async function prepare(){
  const changes=[],cropped=[];
  for(const [li,l]of candidate.layers.entries()){
    if(l.isGroup||!/^头发 \/ 80009 \/ .*后发$/.test(l.name))continue;
    for(const [key,frame]of Object.entries(l.frameData||{})){
      const [si,ai]=key.split('_').map(Number),s=raw.spriteSheets[si];
      assert(s.name.startsWith('original32_'),'Original action backups are protected');
      if(s.actions[ai].direction==='up')continue;
      assert(!frame.placement,'Unexpected high-resolution rear hair');
      const d=png.decode(Buffer.from(frame.dataURL.split(',')[1],'base64'));
      assert.equal(d.width,frame.width);assert.equal(d.height,frame.height);
      if(!d.data.some((v,i)=>i%4===3&&v))continue;
      const next=new Uint8Array(d.data.length),stride=d.width*4;
      next.set(d.data.subarray(3*stride),0);
      let loss=0;for(let i=3;i<3*stride;i+=4)if(d.data[i])loss++;
      if(loss){assert.equal(si,7);assert.equal(ai,0);assert.equal(loss,9);cropped.push({li,key,pixels:loss});}
      assert.deepEqual(next.subarray(0,(d.height-3)*stride),d.data.subarray(3*stride));
      assert(next.subarray((d.height-3)*stride).every(v=>v===0));
      l.frameData[key]={...frame,dataURL:'data:image/png;base64,'+png.encode(d.width,d.height,next).toString('base64')};
      changes.push({li,key,sheet:si,direction:s.actions[ai].direction});
    }
  }
  assert.equal(changes.length,48);assert.equal(cropped.length,4);
  const reverted=structuredClone(candidate);for(const {li,key}of changes)reverted.layers[li].frameData[key]=raw.layers[li].frameData[key];
  assert.deepEqual(reverted,raw,'Only approved rear-hair pixels may change');
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  const before=await decode(raw),after=await decode(candidate),oldCM=new PE.CanvasManager(document.createElement('canvas'),before),cm=new PE.CanvasManager(document.createElement('canvas'),after);
  cm.canvas.width=480;cm.canvas.height=480;cm.zoom=6;cm.showGrid=false;
  const exporter=new PE.ExportManager();exporter.init(after,null);
  const player=new PE.AnimationPlayer();player.project=after;player.canvasManager=cm;player.canvas=document.createElement('canvas');player.ctx=player.canvas.getContext('2d');player.previewScale=1;
  let checked=0;
  for(const si of [7,8,9,10,11]){
    const s=after.spriteSheets[si],cell=168,cols=Math.max(...s.actions.map(a=>a.frames.length));
    const sheet=createCanvas(cols*cell,s.actions.length*cell*2),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
    for(const [ai,a]of s.actions.entries())for(let fi=0;fi<a.frames.length;fi++){
      const old=oldCM.getCompositeImageData(si,ai,fi,true,3),now=cm.getCompositeImageData(si,ai,fi,true,3);
      assert(now.data.some((v,i)=>i%4===3&&v),'Composite must contain character');
      if(a.direction==='up')assert.deepEqual(now.data,old.data,'Back view unchanged');
      after.selectFrame(si,ai,fi);cm.render();
      const scale=cm.offscreenCanvas.width/s.frameWidth;
      assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(si,ai,fi,true,scale).data,'Main canvas');
      assert.deepEqual(exporter._getCompositeImageData(si,ai,fi,3).data,now.data,'PNG export composition');
      player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();
      const preview=cm.getCompositeImageData(si,ai,fi);
      assert.deepEqual(player.ctx.getImageData(0,0,preview.width,preview.height).data,preview.data,'Animation preview');
      for(const [row,d,label]of [[0,old,'BEFORE'],[1,now,'AFTER -3']]){
        const x=fi*cell,y=(ai*2+row)*cell;ctx.fillStyle=row?'#303342':'#e9e2dc';ctx.fillRect(x,y,cell,cell);
        ctx.drawImage(toCanvas(d),x+12,y+22,144,144);ctx.fillStyle=row?'white':'#222';ctx.font='12px sans-serif';ctx.fillText(`${a.direction} ${fi+1} ${label}`,x+4,y+14);
      }
      checked++;
    }
    fs.writeFileSync(path.join(out,s.name+'-before-after.png'),sheet.toBuffer('image/png'));
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({changedCels:changes,clippedWithUserApproval:cropped,clippedPixelsTotal:36,checkedCompositeFrames:checked,unrelatedDataExact:true,backViewsExact:true,translationExact:true,mainCanvasAndAnimationAndExport:true,browserTested:false,backup},null,2));
  console.log(JSON.stringify({prepared:true,changed:changes.length,cropped,checked,out}));
}
async function commit(){
  const prepared=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),current=await fetch(meta.url);assert(current.ok);
  assert.equal(current.headers.get('etag'),meta.etag,'Concurrent edit: stop, do not overwrite');assert.deepEqual(await current.json(),raw);
  const r=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(prepared)}),reply=await r.text();
  fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,body:reply,etag:r.headers.get('etag')},null,2));assert.equal(r.status,200,reply);
  const read=await fetch(meta.url);assert(read.ok);const text=await read.text();assert.deepEqual(JSON.parse(text),prepared);fs.writeFileSync(path.join(out,'api-readback.json'),text);
  const result=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));result.saved=true;result.etag=read.headers.get('etag');fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(out,'恢复说明.txt'),`原稿：${path.join(backup,'original.json')}\n只撤销本次时，应从原稿恢复 verification.json 所列 changedCels，保留其他当前数据，再用最新读取的ETag提交；出现版本冲突停止，不得整稿强制覆盖。\n`);
  console.log('SAVED HTTP 200; complete API readback exact; '+out);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
