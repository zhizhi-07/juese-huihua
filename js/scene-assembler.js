/* Standalone object placement; the drawing project's pixels stay untouched. */
(async()=>{
  'use strict';
  const $=id=>document.getElementById(id),clone=v=>structuredClone(v),canvas=$('scene'),ctx=canvas.getContext('2d');
  let raw,project,renderer,scene,selected=null,placing=null,cache=new Map(),past=[],future=[],gesture=null;
  let zoom=4,offset={x:24,y:24},playing=true,time=0,last=performance.now(),pan=false,busy=false;
  const app={suspendBackup:false,exportManager:{exportProject:()=>new Blob([JSON.stringify({...raw,sceneAssembly:scene})],{type:'application/json'})}};
  const persistence=new PE.ProjectPersistence(app,$('status'));
  const editorKey=persistence.localKey;persistence.localKey='assembly-'+persistence.projectId;
  // The drawing conflict dialog creates projects. This tool only retains and downloads its own draft.
  persistence.show=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('save-error',error);};
  persistence.openConflictDialog=()=>persistence.show('保存冲突：草稿已保留，请下载可编辑备份；重新打开比较后再保存。',true);
  const report=e=>persistence.show(e.message||String(e),true);
  const run=fn=>async()=>{try{await fn();}catch(e){report(e);}};
  const snapshot=()=>JSON.stringify(scene);
  function checkpoint(before){if(before===snapshot())return;past.push(before);if(past.length>100)past.shift();future=[];dirty();}
  function dirty(){persistence.markDirty();persistence.show('未保存 · 点击保存才会保留，刷新会丢弃本次修改');controls();}
  function change(fn){if(busy||!scene)return;const before=snapshot();fn();checkpoint(before);controls();}
  const object=()=>scene?.objects.find(o=>o.id===selected);
  function asset(o){const si=project.spriteSheets.findIndex(s=>s.name===o.material),sheet=project.spriteSheets[si];const ai=sheet?.actions.findIndex(a=>a.name===o.variant)??-1;return ai<0?null:{si,ai,sheet,action:sheet.actions[ai]};}
  function frameAt(a,t){let n=t%PE.frameTiming.totalDuration(a.sheet,a.action);for(let i=0;i<a.action.frames.length;i++){n-=PE.frameTiming.effectiveDelay(a.sheet,a.action.frames[i]);if(n<0)return i;}return 0;}
  function image(o,t=time){const a=asset(o);if(!a)return null;const fi=frameAt(a,t),key=`${a.si}_${a.ai}_${fi}`;if(!cache.has(key)){const pixels=renderer.getCompositeImageData(a.si,a.ai,fi),c=document.createElement('canvas');c.width=pixels.width;c.height=pixels.height;c.getContext('2d').putImageData(pixels,0,0);cache.set(key,c);}return cache.get(key);}
  function drawObjects(context,t){context.imageSmoothingEnabled=false;for(const o of scene.objects){const im=image(o,t);if(!im)continue;context.save();context.translate(o.x+(o.flip?im.width:0),o.y);if(o.flip)context.scale(-1,1);context.drawImage(im,0,0);context.restore();}}
  function draw(){
    if(!scene)return;const box=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const scale=Math.max(1,Math.round(zoom*dpr));if(zoom!==scale/dpr){zoom=scale/dpr;controls();}ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(Math.round(offset.x*dpr),Math.round(offset.y*dpr));ctx.scale(scale,scale);
    ctx.fillStyle='#fafaf7';ctx.fillRect(0,0,scene.width,scene.height);ctx.fillStyle='#e4e5df';for(let y=0;y<scene.height;y+=8)for(let x=0;x<scene.width;x+=8)if((x+y)%16===0)ctx.fillRect(x,y,Math.min(8,scene.width-x),Math.min(8,scene.height-y));
    ctx.save();ctx.beginPath();ctx.rect(0,0,scene.width,scene.height);ctx.clip();drawObjects(ctx,time);ctx.restore();
    if($('snap').checked){const step=grid();ctx.strokeStyle='#71847855';ctx.lineWidth=1/scale;ctx.beginPath();for(let x=0;x<=scene.width;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,scene.height);}for(let y=0;y<=scene.height;y+=step){ctx.moveTo(0,y);ctx.lineTo(scene.width,y);}ctx.stroke();}
    ctx.lineWidth=1/scale;ctx.strokeStyle='#707b71';ctx.strokeRect(0,0,scene.width,scene.height);
    const o=object();if(o){const im=image(o);ctx.strokeStyle='#1d8050';ctx.lineWidth=2/scale;ctx.strokeRect(o.x,o.y,im?.width||16,im?.height||16);}ctx.restore();
  }
  function controls(){
    const o=object();for(const id of ['copy','delete','flip','back','front','variant'])$(id).disabled=!o||busy;
    $('undo').disabled=!past.length||busy;$('redo').disabled=!future.length||busy;
    $('width').value=scene.width;$('height').value=scene.height;$('zoom').textContent=Math.round(zoom*100)+'%';
    const select=$('variant');select.replaceChildren();if(o){const a=asset(o),sheet=project.spriteSheets.find(s=>s.name===o.material);for(const action of sheet?.actions||[]){const opt=new Option(action.name,action.name);select.add(opt);}select.value=o.variant;$('selection').textContent=`${o.material} · ${o.x}, ${o.y} px · ${scene.objects.indexOf(o)+1}/${scene.objects.length}${a?'':' · 源素材或版本缺失'}`;}else $('selection').textContent=placing?'待放置：'+placing+' · 点击场景放入':'未选中物件 · '+scene.objects.length+' 个物件';
    for(const b of $('materials').children)b.classList.toggle('active',b.dataset.material===placing);
  }
  function grid(){return Math.max(1,Math.min(128,Math.round(Number($('grid').value)||8)));}
  const round=n=>{const step=$('snap').checked?grid():1;return Math.max(-65536,Math.min(65536,Math.round(n/step)*step));};
  function add(material,x,y){const sheet=project.spriteSheets.find(s=>s.name===material);if(!sheet?.actions[0]?.frames.length)return;if(scene.objects.length>=2048)throw Error('最多放置2048个物件');const o={id:crypto.randomUUID(),material,variant:sheet.actions[0].name,x:round(x),y:round(y),flip:false};scene.objects.push(o);selected=o.id;placing=null;}
  function point(e){const b=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;return{x:(e.clientX-b.left-Math.round(offset.x*dpr)/dpr)/zoom,y:(e.clientY-b.top-Math.round(offset.y*dpr)/dpr)/zoom};}
  function hit(p){return [...scene.objects].reverse().find(o=>{const im=image(o);if(!im)return false;let x=Math.floor(p.x-o.x),y=Math.floor(p.y-o.y);if(x<0||y<0||x>=im.width||y>=im.height)return false;if(o.flip)x=im.width-1-x;return im.getContext('2d').getImageData(x,y,1,1).data[3]>0;});}
  function begin(e){if(busy||!scene||gesture)return;e.preventDefault();canvas.focus();const p=point(e);if(placing&&!pan&&e.button!==1){change(()=>add(placing,p.x,p.y));return;}const o=pan||e.button===1?null:hit(p);selected=o?.id||null;gesture={id:e.pointerId,start:p,x:e.clientX,y:e.clientY,offset:{...offset},before:snapshot(),object:o?{id:o.id,x:o.x,y:o.y}:null};canvas.setPointerCapture(e.pointerId);controls();}
  canvas.addEventListener('pointerdown',begin);
  canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;if(g.object){const o=object(),p=point(e);o.x=round(g.object.x+p.x-g.start.x);o.y=round(g.object.y+p.y-g.start.y);}else offset={x:g.offset.x+e.clientX-g.x,y:g.offset.y+e.clientY-g.y};controls();});
  function end(e){if(!gesture||gesture.id!==e.pointerId)return;checkpoint(gesture.before);gesture=null;}
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){scene=JSON.parse(gesture.before);gesture=null;controls();}});
  function zoomTo(z,x=canvas.clientWidth/2,y=canvas.clientHeight/2){const dpr=devicePixelRatio||1;z=Math.max(1,Math.min(Math.round(24*dpr),Math.round(z*dpr)))/dpr;offset={x:x-(x-offset.x)*z/zoom,y:y-(y-offset.y)*z/zoom};zoom=z;controls();}
  canvas.addEventListener('wheel',e=>{e.preventDefault();const b=canvas.getBoundingClientRect();zoomTo(zoom+(e.deltaY<0?1:-1)/(devicePixelRatio||1),e.clientX-b.left,e.clientY-b.top);},{passive:false});
  function fit(){const dpr=devicePixelRatio||1;zoom=Math.max(1,Math.floor(Math.min(8,canvas.clientWidth/scene.width*.85,canvas.clientHeight/scene.height*.85)*dpr))/dpr;offset={x:(canvas.clientWidth-scene.width*zoom)/2,y:(canvas.clientHeight-scene.height*zoom)/2};controls();}
  function undo(redo=false){if(busy||gesture)return;const from=redo?future:past,to=redo?past:future;if(!from.length)return;to.push(snapshot());scene=JSON.parse(from.pop());if(!object())selected=null;dirty();}
  function copy(){const o=object();if(!o)return;change(()=>{if(scene.objects.length>=2048)throw Error('最多放置2048个物件');const c={...o,id:crypto.randomUUID(),x:round(o.x+8),y:round(o.y+8)};scene.objects.push(c);selected=c.id;});}
  function remove(){if(object())change(()=>{scene.objects=scene.objects.filter(o=>o.id!==selected);selected=null;});}
  function reorder(delta){if(!object())return;change(()=>{const i=scene.objects.findIndex(o=>o.id===selected),j=i+delta;if(j<0||j>=scene.objects.length)return;[scene.objects[i],scene.objects[j]]=[scene.objects[j],scene.objects[i]];});}
  async function decode(data){const manager=new PE.ExportManager();const result=await manager.importProject(new Blob([JSON.stringify(data)]));return result.project;}
  async function materials(){project=await decode(raw);renderer=new PE.CanvasManager(document.createElement('canvas'),project);cache.clear();$('materials').replaceChildren();for(const sheet of project.spriteSheets){if(sheet.name==='场景画布'||PE.isCharacterSheet(sheet)||!sheet.actions[0]?.frames.length)continue;const b=document.createElement('button');b.className='material';b.dataset.material=sheet.name;b.setAttribute('aria-label','放置'+sheet.name);const im=image({material:sheet.name,variant:sheet.actions[0].name},0),thumb=document.createElement('canvas');const side=Math.round(64*(devicePixelRatio||1));thumb.width=side;thumb.height=side;const c=thumb.getContext('2d');c.imageSmoothingEnabled=false;if(im){const desired=Math.min((side-4)/im.width,(side-4)/im.height),scale=desired>=1?Math.floor(desired):1/Math.ceil(1/desired);c.drawImage(im,Math.round((side-im.width*scale)/2),Math.round((side-im.height*scale)/2),Math.round(im.width*scale),Math.round(im.height*scale));}const label=document.createElement('span');label.textContent=sheet.name;b.append(thumb,label);
      b.onclick=e=>{if(e.detail||busy)return;placing=sheet.name;selected=null;controls();};
      let touch=null;
      b.addEventListener('pointerdown',e=>{if(busy||gesture)return;if(e.pointerType==='touch'){touch={id:e.pointerId,x:e.clientX,y:e.clientY};return;}e.preventDefault();b.setPointerCapture(e.pointerId);gesture={material:sheet.name,id:e.pointerId,x:e.clientX,y:e.clientY};placing=sheet.name;selected=null;controls();});
      b.addEventListener('pointermove',e=>{if(touch?.id===e.pointerId&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch=null;});
      b.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){if(touch?.id===e.pointerId&&!busy){placing=sheet.name;selected=null;controls();}touch=null;return;}if(gesture?.material!==sheet.name||gesture.id!==e.pointerId)return;const rect=canvas.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<rect.right&&e.clientY>=rect.top&&e.clientY<rect.bottom){const p=point(e);change(()=>add(sheet.name,p.x,p.y));}gesture=null;controls();});b.addEventListener('pointercancel',()=>{touch=null;gesture=null;});$('materials').append(b);
    }controls();}
  async function editorDraft(){const own=persistence.localKey;persistence.localKey=editorKey;try{return await persistence.localRead();}finally{persistence.localKey=own;}}
  async function save(){if(busy||gesture)return;busy=true;controls();try{const d=await editorDraft();if(d.blob&&(!d.meta||d.meta.pending))throw Error('绘画编辑器有未保存草稿，请先在那里保存；拼装修改仍留在本页。');const sent=clone(scene);if(!await persistence.saveNow())return;const r=await persistence.request();if(!r.ok)throw Error('保存后回读失败');const saved=await r.json();if(JSON.stringify(saved.sceneAssembly)!==JSON.stringify(sent))throw Error('保存后场景已变化，草稿已保留');raw=saved;persistence.show('已保存并回读核对 · '+scene.objects.length+' 个独立物件');}finally{busy=false;controls();}}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function composite(t){const c=document.createElement('canvas');c.width=scene.width;c.height=scene.height;drawObjects(c.getContext('2d'),t);return c;}
  async function exportImage(gif){if(busy)return;busy=true;controls();try{
    if(scene.objects.some(o=>!asset(o)))throw Error('有缺失的素材或版本，请先修复再导出');
    if(!gif){const blob=await new Promise(resolve=>composite(time).toBlob(resolve));if(!blob)throw Error('PNG生成失败');download(blob,raw.name+'-场景.png');return;}
    const animated=scene.objects.map(asset).filter(a=>a.action.frames.length>1);if(!animated.length)throw Error('当前场景没有动画物件，请导出 PNG');
    const gcd=(a,b)=>b?gcd(b,a%b):a;let duration=1;for(const a of animated){const d=PE.frameTiming.totalDuration(a.sheet,a.action);duration=duration/gcd(duration,d)*d;if(duration>30000)throw Error('动画共同循环超过30秒，请减少不同节奏的动画后导出');}
    const times=new Set([0,duration]);for(const a of animated){const total=PE.frameTiming.totalDuration(a.sheet,a.action);for(let start=0;start<duration;start+=total){let t=start;for(const f of a.action.frames){times.add(t);t+=PE.frameTiming.effectiveDelay(a.sheet,f);}}}
    const sorted=[...times].sort((a,b)=>a-b);if(sorted.length>601||scene.width*scene.height*(sorted.length-1)>32*1024*1024)throw Error('GIF超过600帧或3200万总像素，请减小画布或动画组合');
    const frames=[];for(let i=0;i<sorted.length-1;i++){const c=composite(sorted[i]);frames.push({pixels:c.getContext('2d').getImageData(0,0,c.width,c.height),delay:sorted[i+1]-sorted[i]});}
    persistence.show('正在导出 GIF…');download(await SceneAssemblyGIF(frames,scene.width,scene.height),raw.name+'-场景.gif');persistence.show('GIF 已导出 · 完整循环 '+duration/1000+' 秒（GIF 透明度为开/关）');
  }finally{busy=false;controls();}}
  $('save').onclick=run(save);$('backup').onclick=()=>download(app.exportManager.exportProject(),raw.name+'-拼装备份.json');$('png').onclick=run(()=>exportImage(false));$('gif').onclick=run(()=>exportImage(true));
  $('undo').onclick=()=>undo();$('redo').onclick=()=>undo(true);$('copy').onclick=run(copy);$('delete').onclick=remove;$('flip').onclick=()=>change(()=>{const o=object();if(o)o.flip=!o.flip;});$('back').onclick=()=>reorder(-1);$('front').onclick=()=>reorder(1);
  $('variant').onchange=e=>{const value=e.target.value;change(()=>{object().variant=value;});};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'暂停动画':'播放动画';};$('pan').onclick=()=>{pan=!pan;placing=null;$('pan').setAttribute('aria-pressed',String(pan));controls();};$('in').onclick=()=>zoomTo(zoom+1/(devicePixelRatio||1));$('out').onclick=()=>zoomTo(zoom-1/(devicePixelRatio||1));$('fit').onclick=fit;
  $('resize').onclick=run(()=>change(()=>{const w=Number($('width').value),h=Number($('height').value);SceneAssemblyModel.validate({...scene,width:w,height:h});scene.width=w;scene.height=h;}));
  $('refresh').onclick=run(async()=>{if(busy||gesture)return;if(persistence.conflict)throw Error('草稿与共享版本冲突，请先下载备份并比较，不能跳过冲突检查');busy=true;try{const r=await persistence.request();if(!r.ok)throw Error('源素材读取失败');const next=await r.json();if(JSON.stringify(next.sceneAssembly)!==JSON.stringify(raw.sceneAssembly))throw Error('共享拼装场景也有变化；本页草稿保留，请下载备份后比较');raw=next;persistence.revision=r.headers.get('ETag');await materials();persistence.show('源素材已更新，所有物件位置保留'+(persistence.dirty?' · 待保存':''));}finally{busy=false;controls();}});
  window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==='s'){e.preventDefault();run(save)();}else if(mod&&key==='z'){e.preventDefault();undo(e.shiftKey);}else if(mod&&key==='y'){e.preventDefault();undo(true);}else if(mod&&key==='d'){e.preventDefault();run(copy)();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}else if(e.key==='Escape'){placing=null;selected=null;controls();}else if(object()&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();change(()=>{const o=object(),step=$('snap').checked?grid():1;o.x=round(o.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0));o.y=round(o.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));});}});
  window.addEventListener('beforeunload',e=>{if(persistence.dirty){e.preventDefault();e.returnValue='';}});
  try{
    const listResponse=await fetch(persistence.base+'/api/projects',{headers:persistence.headers,cache:'no-store'});if(!listResponse.ok)throw Error('工程列表读取失败');const list=await listResponse.json();
    if(!new URLSearchParams(location.search).has('project')){const noodle=list.find(p=>p.name==='面馆');if(noodle){persistence.projectId=noodle.id;persistence.localKey='assembly-'+noodle.id;const url=new URL(location.href);url.searchParams.set('project',noodle.id);location.replace(url);return;}throw Error('请从场景工程的独立入口打开');}
    if(!persistence.projectId.startsWith('scene-'))throw Error('拼装器只打开场景工程，不修改人物工程');
    for(const p of list.filter(p=>p.id.startsWith('scene-')))$('projects').add(new Option(p.name,p.id));$('projects').value=persistence.projectId;
    $('projects').onchange=()=>{if(persistence.dirty&&!confirm('未保存的拼装修改将丢弃，切换工程？')){$('projects').value=persistence.projectId;return;}const url=new URL(location.href);url.searchParams.set('project',$('projects').value);location.href=url;};
    $('editor').href='index.html?project='+encodeURIComponent(persistence.projectId);
    const r=await persistence.request();if(!r.ok)throw Error('工程读取失败：'+r.status);raw=await r.json();persistence.revision=r.headers.get('ETag');
    scene=clone(SceneAssemblyModel.validate(raw.sceneAssembly||{version:1,width:160,height:128,objects:[]}));
    await materials();persistence.ready=true;persistence.show('已读取 '+raw.name+' · 仅手动保存，刷新会丢弃未保存修改');fit();
    window.sceneAssembler={get scene(){return clone(scene);},get view(){return {zoom,offset:{...offset}};},get time(){return time;},get dirty(){return persistence.dirty;},get project(){return project;},get ready(){return persistence.ready;}};
    function tick(now){if(playing&&!busy)time+=now-last;last=now;draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);
  }catch(e){report(e);$('save').disabled=true;}
})();
