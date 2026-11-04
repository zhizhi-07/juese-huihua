const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const dir=fs.readFileSync('latest-zong-hair12-path.txt','utf8'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),write=(n,v)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(v,null,2));
const source=read('source.json'),before=read('before.json'),sm=read('source.meta.json'),tm=read('before.meta.json'),p=structuredClone(before),records=[];
const named=source.layers.filter(l=>['头发 / 1 / 前发','头发 / 2 / 后发'].includes(l.name));assert.equal(named.length,2);
const ids=named.map(l=>l.hairAnimationId);assert(ids.every(Boolean));assert.equal(new Set(ids).size,2);assert(!p.layers.some(l=>ids.includes(l.hairAnimationId)),'already imported');
const siMap=new Map(source.spriteSheets.map((s,i)=>[i,p.spriteSheets.findIndex(t=>t.name===s.name)]));
const added=source.layers.flatMap((l,i)=>{
  if(!ids.includes(l.hairAnimationId))return [];assert(l.parent==null&&!l.isGroup);
  const si=siMap.get(l.sheetIndex);assert(si>=0);const s=source.spriteSheets[l.sheetIndex],t=p.spriteSheets[si];assert.deepEqual(t.canvasLayout,s.canvasLayout);
  const slot=l.hairAnimationId===named.find(l=>l.name==='头发 / 1 / 前发').hairAnimationId?'前发':'后发',name=slot==='前发'?'1':'2',copy=structuredClone(l);
  copy.name=`头发 / ${name} / ${slot}`;copy.sheetIndex=si;copy.visible=false;copy.frameData={};
  for(const [key,cel]of Object.entries(l.frameData||{})){
    const [ssi,sai,fi]=key.split('_').map(Number);assert.equal(ssi,l.sheetIndex);const a=s.actions[sai],ai=t.actions.findIndex(x=>x.name===a.name&&x.direction===a.direction);assert(ai>=0);assert.equal(t.actions[ai].frames.length,a.frames.length);assert.deepEqual([t.actions[ai].frames[fi].width,t.actions[ai].frames[fi].height],[a.frames[fi].width,a.frames[fi].height]);copy.frameData[`${si}_${ai}_${fi}`]=structuredClone(cel);
  }
  records.push({sourceLayer:i,name:copy.name,slot,sheet:t.name,id:copy.hairAnimationId,cels:Object.keys(copy.frameData).length});return [copy];
});assert.equal(added.length,10);for(const id of ids){assert.equal(added.filter(l=>l.hairAnimationId===id).length,5);assert.equal(added.filter(l=>l.hairAnimation?.id===id).length,1);}
const rear=added.filter(l=>l.name.endsWith('后发')),front=added.filter(l=>l.name.endsWith('前发')),shift=rear.length;
p.layers.forEach(l=>{if(l.parent!=null)l.parent+=shift;});p.currentLayerIndex+=shift;p.layers=[...rear,...p.layers,...front];
const restored=structuredClone(p);restored.layers=restored.layers.slice(shift,-front.length);restored.layers.forEach(l=>{if(l.parent!=null)l.parent-=shift;});restored.currentLayerIndex-=shift;assert.deepEqual(restored,before);write('restore-extra-copy.json',restored);assert.deepEqual(read('restore-extra-copy.json'),before);write('candidate.json',p);write('diff.json',{added:records,existingLayersPreserved:true,originalIndexShift:shift,newPartsInitiallyHidden:true});
async function qa(raw,label){
  const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/',{createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
  for(const n of ['core','canvas','hair-animation','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
  PE.HairAnimation.validate(raw);const decode=async v=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(v)]))).project,model=await decode(raw),src=await decode(source),old=await decode(before);PE.HairAnimation.refresh(model);PE.HairAnimation.refresh(src);
  const cm=new PE.CanvasManager(document.createElement('canvas'),model),scm=new PE.CanvasManager(document.createElement('canvas'),src),ocm=new PE.CanvasManager(document.createElement('canvas'),old),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
  const studio=fs.readFileSync('js/studio.js','utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a);assert(a>=0&&b>a);const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(a,b))(app,bounds);
  const tile=146,rows=model.spriteSheets.reduce((n,s)=>n+s.actions.length,0),images={};for(const mode of ['new-pair','front-only','rear-only'])images[mode]=createCanvas(tile*8,tile*rows);let row=0,checked=0;
  for(let si=0;si<model.spriteSheets.length;si++){
    const s=model.spriteSheets[si],ssi=source.spriteSheets.findIndex(x=>x.name===s.name);for(let ai=0;ai<s.actions.length;ai++,row++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
      Object.assign(model,{currentSheetIndex:si,currentActionIndex:ai,currentFrameIndex:fi});const flags=model.layers.map(l=>l.visible),sf=src.layers.map(l=>l.visible);
      assert.deepEqual(cm.getCompositeImageData(si,ai,fi,true,1).data,ocm.getCompositeImageData(si,ai,fi,true,1).data,'default selection unchanged');
      model.layers.forEach(l=>l.visible=ids.includes(l.hairAnimationId));src.layers.forEach(l=>l.visible=ids.includes(l.hairAnimationId));assert.deepEqual(cm.getCompositeImageData(si,ai,fi,true,1).data,scm.getCompositeImageData(ssi,ai,fi,true,1).data,'live hair must match source');src.layers.forEach((l,i)=>l.visible=sf[i]);
      for(const mode of Object.keys(images)){
        model.layers.forEach((l,i)=>{if(ids.includes(l.hairAnimationId))l.visible=mode==='new-pair'||(mode==='front-only'?l.name.endsWith('前发'):l.name.endsWith('后发'));else l.visible=/发/.test(l.name)?false:flags[i];});
        const im=cm.getCompositeImageData(si,ai,fi,true,1);assert(bounds(im));if(mode==='new-pair'){
          cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(si,ai,fi,true,cm.offscreenCanvas.width/s.actions[ai].frames[fi].width).data);
          Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));
          const png=require('./png.cjs').decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual([...png.data],[...im.data]);
        }
        const ctx=images[mode].getContext('2d'),c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle=fi%2?'#252833':'#e5e0ee';ctx.fillRect(fi*tile,row*tile,tile,tile);ctx.drawImage(c,fi*tile+4,row*tile+2,im.width*3,im.height*3);ctx.fillStyle=fi%2?'white':'black';ctx.font='11px sans-serif';ctx.fillText(`${s.name.replace('original32_','')} ${s.actions[ai].direction} ${fi+1}`,fi*tile+4,row*tile+140);
      }
      model.layers.forEach((l,i)=>l.visible=flags[i]);checked++;
    }
  }
  assert.equal(checked,70);for(const [mode,c]of Object.entries(images))fs.writeFileSync(path.join(dir,label+'-'+mode+'.png'),c.toBuffer('image/png'));write(label+'-qa.json',{frames:checked,liveHairMatchesSource:true,existingPixelsMetadataVisibilityUnchanged:true,defaultCompositeUnchanged:true,mainStudioPreviewPngChecked:true,restorationExtraCopyVerified:true,browserChecked:false});console.log('PASS',label,checked,'frames; live hair matches source; old set and default appearance preserved; main/preview/PNG');
}
(async()=>{
  if(process.argv[2]==='publish'){
    const hash=s=>crypto.createHash('sha256').update(s).digest('hex');for(const meta of [sm,tm]){const r=await fetch('http://127.0.0.1:8765/api/project?id='+meta.id);assert(r.ok);assert.equal(hash(await r.text()),meta.sha256,'source or target changed; compare before saving');}
    const url='http://127.0.0.1:8765/api/project?id='+tm.id,r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tm.etag},body:JSON.stringify(p)});console.log('PUT',r.status,await r.text());assert(r.ok);const back=await fetch(url),raw=await back.text();assert(back.ok);assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(path.join(dir,'after.json'),raw);await qa(JSON.parse(raw),'readback');
    const sr=await fetch('http://127.0.0.1:8765/api/project?id='+sm.id);assert.equal(hash(await sr.text()),sm.sha256);write('delivery.json',{id:tm.id,file:path.resolve('data/projects/'+tm.id+'.json'),etag:back.headers.get('etag'),sha256:hash(raw),parts:['前发 1','后发 2'],addedLayers:added.length,sourceUnchanged:true});
    fs.writeFileSync(path.join(dir,'恢复说明.txt'),'从用户指定工程按hairAnimationId复制新增完成的前发1与后发2，五个已有动作各自独立层，保留全部像素与联动设置。原套不覆盖，新增部件默认隐藏，在头发栏选用。现有图层仅因插入底层后发而索引平移5，parent和选层索引同步映射。\n恢复时GET当前总工程与ETag，对照after.json确认新增层未有后续编辑，删除本次新增的两个hairAnimationId对应10层，重新映射现存parent与选层索引，保留所有其他最新数据，If-Match PUT；有后续编辑须先保留再合并，不整稿覆盖。restore-extra-copy.json已验证等于before.json。\n70帧离屏主画布、实际studio预览、PNG导出与实时刷新后的源头发逐帧对比通过；未操作网页，未读取未保存草稿。');console.log(JSON.stringify(read('delivery.json')));
  }else await qa(p,'candidate');
})().catch(e=>{console.error(e);process.exit(1);});
