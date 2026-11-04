const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-study-current-path.txt'),'utf8'));
const source=JSON.parse(fs.readFileSync(out+'/source.json')),raw=fs.readFileSync(out+'/'+(source.baseFile||'original.json'),'utf8'),before=JSON.parse(raw);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const si=8,rear=10,front=191,map=[0,1,2,2,3,3,0,0],delays=[40,100,40,60,40,60,30,30],tips=[0,0,0,1,1,1,1,0];
const url=id=>'http://127.0.0.1:8765/api/project?id='+id;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener:()=>{}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation','frame-timing'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const model=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
const encode=data=>({width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')});
function world(m,li,ai,fi){const c=createCanvas(36,36),f=m.layers[li].getFrameData(`${si}_${ai}_${fi}`);if(f)PE.utils.drawImageData(c.getContext('2d'),f);return c.getContext('2d').getImageData(0,0,36,36).data;}
function bounds(data){const pts=[];for(let i=0;i<1296;i++)if(data[i*4+3])pts.push([i%36,Math.floor(i/36)]);return pts.length?[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]:null;}
function components(data){const seen=new Set(),sizes=[];for(let i=0;i<1296;i++){if(!data[i*4+3]||seen.has(i))continue;const q=[i];seen.add(i);for(let j=0;j<q.length;j++){const x=q[j]%36,y=Math.floor(q[j]/36);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*36+xx;if(xx<0||xx>=36||yy<0||yy>=36||seen.has(n)||!data[n*4+3])continue;seen.add(n);q.push(n);}}sizes.push(q.length);}return sizes.sort((a,b)=>a-b);}
function deform(anchor,ai,q,dy){
  const data=new Uint8Array(36*36*4),compression=dy-tips[q],cuts=(ai===2?[20,21]:[21,23]).slice(0,Math.max(0,compression));
  for(const y of cuts)assert.deepEqual(anchor.subarray(y*144,(y+1)*144),anchor.subarray((y-1)*144,y*144),'只压缩已有重复直发段');
  function put(x,y,yy){
    const i=(y*36+x)*4;if(!anchor[i+3])return;
    let dx=0;
    const left=x<=(ai===0?10:9),right=x>=(ai===0?27:26);
    // The full distal lock, including its shadow, bends; the crown never moves sideways.
    if(ai===0){
      if(left&&y>=29&&(q===2||q===3))dx=-1;
      if(right&&y>=29&&(q===3||q===4))dx=1;
      if(left&&y>=30&&q===6)dx=1;
      if(right&&y>=30&&q===7)dx=-1;
    }else{
      if(y>=29&&(q===2||q===3))dx=left?-1:right?1:0;
      if(y>=30&&q===6)dx=left?1:right?-1:0;
    }
    const xx=x+dx;assert(xx>=0&&xx<36&&yy>=0&&yy<36,'不得裁掉头发');
    const dest=(yy*36+xx)*4;assert(!data[dest+3],'发束不能相撞覆盖');data.set(anchor.subarray(i,i+4),dest);
  }
  for(let y=0;y<36;y++){
    if(cuts.includes(y))continue;
    const yy=y+dy-cuts.filter(c=>y>c).length+(compression<0&&y>21?1:0);
    for(let x=0;x<36;x++)put(x,y,yy);
    if(compression<0&&y===21)for(let x=0;x<36;x++)put(x,y,yy+1);
  }
  for(let y=0;y<20;y++)assert.deepEqual(Buffer.from(data.subarray((y+dy)*144,(y+dy+1)*144)),Buffer.from(anchor.subarray(y*144,(y+1)*144)),'发根和上半发帽严格跟头');
  assert.equal(components(data).length,components(anchor).length,'不能增加断发');
  assert.deepEqual(components(data).filter(n=>n<=2),components(anchor).filter(n=>n<=2),'不能增加孤点');
  assert.equal(bounds(data)[3],33+tips[q]);
  return data;
}
async function verify(p,label){
  const m=await model(p),cm=new PE.CanvasManager(document.createElement('canvas'),m),ex=new PE.ExportManager();ex.project=m;ex.canvasManager=cm;
  const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),m,cm);player.previewScale=1;
  const c=createCanvas(8*180,3*210),cx=c.getContext('2d');cx.imageSmoothingEnabled=false;
  const rendered=[];
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
    m.currentSheetIndex=si;m.currentActionIndex=ai;m.currentFrameIndex=fi;
    const im=cm.getCompositeImageData(si,ai,fi);assert(bounds(im.data),'合成图非空');
    cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data,'主画布路径');
    player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data,'预览路径');
    const blob=await ex.exportFrameAsBlob(si,ai,fi),buffer=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(buffer).data),Array.from(im.data),'透明PNG路径');
    fs.writeFileSync(out+`/${label}-${ai}-${fi}.png`,buffer);
    const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
    const x=fi*180,y=ai*210;
    for(let bg=0;bg<2;bg++){cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(x,y+bg*96,180,96);cx.drawImage(tile,x,y+bg*96,96,96);cx.drawImage(tile,x+120,y+bg*96+30);}
    cx.fillStyle='#555';cx.font='12px sans-serif';cx.fillText(`${fi+1} / ${p.spriteSheets[si].actions[ai].frames[fi].duration}ms`,x+10,y+205);
    if(label==='new'){
      for(const li of [rear,front]){const data=world(m,li,ai,fi);for(let i=3;i<data.length;i+=4)assert(data[i]===0||data[i]===255,'禁止半透明像素');}
      if(ai===2){assert.equal(bounds(world(m,front,ai,fi)),null,'背面前发全透明');const enabled=cm.getCompositeImageData(si,ai,fi);m.layers[front].visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,enabled.data);m.layers[front].visible=true;}
      assert.equal(PE.frameTiming.effectiveDelay(m.spriteSheets[si],m.spriteSheets[si].actions[ai].frames[fi]),delays[fi]);
    }
    rendered.push({ai,fi,bounds:bounds(im.data)});
  }
  fs.writeFileSync(out+`/${label}-contact.png`,c.toBuffer('image/png'));
  return {m,rendered};
}
(async()=>{
  const mode=process.argv[2]||'build';
  if(mode==='verify-saved'){
    const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),meta=JSON.parse(fs.readFileSync(out+'/experiment.json'));
    const r=await fetch(url(meta.id));assert(r.ok);assert.deepEqual(await r.json(),p,'已保存副本与候选文件一致');
    await verify(before,'old');await verify(p,'new');
    assert.deepEqual(JSON.parse(fs.readFileSync(out+'/api-readback.json')),p);
    console.log('PASS verify-saved: live API equals candidate/readback; original12 + new24 main/preview/PNG paths match.');return;
  }
  if(mode==='publish'){
    const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),meta=JSON.parse(fs.readFileSync(out+'/experiment.json'));
    const sourceNow=await fetch(url(source.id));assert(sourceNow.ok);const sourceRaw=await sourceNow.text();
    assert.equal(sha(sourceRaw),source.sha256,'源工程已变化，需重新核对副本来源');
    const exists=await fetch(url(meta.id));assert.equal(exists.status,404,'实验编号已存在，禁止覆盖');
    const saved=await fetch(url(meta.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(p)});
    const response=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+response);assert(saved.ok,response);
    const r=await fetch(url(meta.id));assert(r.ok);const readback=await r.text();assert.deepEqual(JSON.parse(readback),p);fs.writeFileSync(out+'/api-readback.json',readback);
    const sourceAfter=await fetch(url(source.id));assert(sourceAfter.ok);assert.equal(sha(await sourceAfter.text()),source.sha256,'原工程应未改变');
    fs.writeFileSync(out+'/publish-verification.json',JSON.stringify({id:meta.id,etag:r.headers.get('etag'),apiReadback:true,sourceUnchanged:true,candidateSHA256:sha(JSON.stringify(p)),time:new Date().toISOString()},null,2));
    console.log('PASS publish: new project created with If-Match:none; API readback exact; original SHA256 unchanged.');console.log(meta.url);return;
  }
  assert.equal(mode,'build');assert.equal(before.layers[rear].name,'头发 / 用户 / 后发');assert.equal(before.layers[front].name,'前发');
  assert.deepEqual(before.spriteSheets[si].actions.map(a=>a.direction),['side','down','up']);
  const base=await verify(before,'old'),p=structuredClone(before);
  const meta={id:'draft-hair-study-'+crypto.randomUUID(),name:'用户头发·三向待机动效学习实验',sourceId:source.id};meta.url='http://localhost:8765/index.html?project='+meta.id;
  p.name=meta.name;p.currentSheetIndex=si;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=rear;
  const sheet=p.spriteSheets[si],oldSheet=before.spriteSheets[si],atlas=createCanvas(36*8,36*3),actx=atlas.getContext('2d'),atlasSource=new Image();atlasSource.src=oldSheet.imageDataURL;
  const metrics=[];
  for(let ai=0;ai<3;ai++){
    sheet.actions[ai].frames=map.map((from,q)=>({...structuredClone(oldSheet.actions[ai].frames[from]),sourceX:q*36,sourceY:ai*36,duration:delays[q]}));
    for(let q=0;q<8;q++){const f=oldSheet.actions[ai].frames[map[q]];actx.drawImage(atlasSource,f.sourceX,f.sourceY,36,36,q*36,ai*36,36,36);}
    for(let li=0;li<p.layers.length;li++){
      const l=p.layers[li],original=before.layers[li].frameData||{};
      for(let q=0;q<8;q++){const key=`${si}_${ai}_${q}`,from=original[`${si}_${ai}_${map[q]}`];if(from)l.frameData[key]=structuredClone(from);else delete l.frameData[key];}
    }
    const anchor=world(base.m,rear,ai,0),head=[139,134,129][ai],headY=bounds(world(base.m,head,ai,0))[1];
    for(let q=1;q<8;q++){
      const dy=bounds(world(base.m,head,ai,map[q]))[1]-headY;assert.equal(dy,map[q]>=2?2:0);
      const data=deform(anchor,ai,q,dy);p.layers[rear].frameData[`${si}_${ai}_${q}`]=encode(data);
      metrics.push({direction:sheet.actions[ai].direction,frame:q,bodySourceFrame:map[q],rootOffset:dy,tailOffset:tips[q],components:components(data).length});
    }
    for(let q=0;q<8;q++)if(ai===2)p.layers[front].frameData[`${si}_${ai}_${q}`]=structuredClone(before.layers[front].frameData['8_2_0']);
    assert.deepEqual(p.layers[rear].frameData[`8_${ai}_0`],before.layers[rear].frameData[`8_${ai}_0`],'每个方向原第一帧保留');
  }
  sheet.columns=8;sheet.imageDataURL=atlas.toDataURL();sheet.useFrameDurations=true;
  // shortcut: only these existing three idle views; other actions require separate drawing authorization.
  const recovery=structuredClone(p);
  recovery.name=before.name;for(const k of ['currentSheetIndex','currentActionIndex','currentFrameIndex','currentLayerIndex'])recovery[k]=before[k];recovery.spriteSheets[si]=structuredClone(before.spriteSheets[si]);
  for(let li=0;li<p.layers.length;li++){
    const l=recovery.layers[li];for(const key of Object.keys(l.frameData||{}))if(key.startsWith('8_'))delete l.frameData[key];
    for(const [key,f]of Object.entries(before.layers[li].frameData||{}))if(key.startsWith('8_'))l.frameData[key]=structuredClone(f);
    if(li!==rear&&li!==front)for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++)assert.deepEqual(p.layers[li].frameData[`8_${ai}_${q}`],before.layers[li].frameData?.[`8_${ai}_${map[q]}`],'非头发仅重复原身体帧');
  }
  assert.deepEqual(recovery,before,'其他动作、图层元数据、显隐、关系、备份必须原样');
  fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
  const result=await verify(p,'new');
  const m=result.m,visibility=m.layers.map(l=>l.visible),checks=createCanvas(8*108,3*6*108),ctx=checks.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let mode=0;mode<6;mode++)for(let q=0;q<8;q++){
    m.layers.forEach((l,i)=>{l.visible=visibility[i];if(mode===0&&[rear,front].includes(i))l.visible=false;if(mode===1&&i===front)l.visible=false;if(mode===2&&i===rear)l.visible=false;if(mode===3&&/眼睛/.test(l.name))l.visible=false;if(mode===4)l.visible=i===rear;if(mode===5)l.visible=i===front;});
    const im=new PE.CanvasManager(document.createElement('canvas'),m).getCompositeImageData(si,ai,q),tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
    if(!(mode===5&&ai===2))assert(bounds(im.data),'分层测试不能空白');else assert.equal(bounds(im.data),null);
    const x=q*108,y=(ai*6+mode)*108;ctx.fillStyle=mode%2?'#302d39':'#e3dfe8';ctx.fillRect(x,y,108,108);ctx.drawImage(tile,x,y,108,108);
  }
  fs.writeFileSync(out+'/layer-checks.png',checks.toBuffer('image/png'));
  const delta=[];for(let ai=0;ai<3;ai++)for(let q=1;q<8;q++){const a=world(base.m,rear,ai,map[q]),b=world(result.m,rear,ai,q);for(let y=0;y<36;y++)for(let x=0;x<36;x++){const i=(y*36+x)*4;if(!Buffer.from(a.subarray(i,i+4)).equals(Buffer.from(b.subarray(i,i+4))))delta.push({direction:ai,frame:q,x,y,before:Array.from(a.subarray(i,i+4)),after:Array.from(b.subarray(i,i+4))});}}
  fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(delta));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/experiment.json',JSON.stringify(meta,null,2));
  fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:sha(raw),map,delays,totalMs:delays.reduce((a,b)=>a+b),metrics,originalFirstFramesUnchanged:true,nonHairPixelsOnlyRepeated:true,nonIdleDataUnchanged:true,original12AndNew24MainPreviewPNGMatch:true,backFrontHairTransparent:true,noNewDisconnectedComponents:true,restoreExtraCopyVerified:true,layerTests:144,browserChecked:false,clothingOrOtherProjectMixesTested:false},null,2));
  console.log('PASS build: 3 directions × 8 frames; original 3 anchor frames retained; no new body/face pixels; 36 frame render/preview/PNG paths match; 144 layer checks; extra-copy recovery verified.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
