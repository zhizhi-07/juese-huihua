/* Three idle masters, native-body fitting, explicit preservation and undoable live sync. */
window.PE=window.PE||{};
(()=>{
  const F=PE.ClothingFit,clone=v=>JSON.parse(JSON.stringify(v)),cache=new WeakMap();
  const supported=s=>/^original16_(idle|walk|pickup|sit)$/.test(s?.name||''),idle=s=>s?.name==='original16_idle';
  const sit=s=>s?.name==='original16_sit',sitFirst=p=>sit(p.spriteSheets[p.currentSheetIndex])&&p.currentFrameIndex===0;
  const isClothes=l=>!l?.isGroup&&PE.classifyPart(l?.name)?.category==='衣服';
  const hasInk=im=>im&&im.data.some((v,i)=>i%4===3&&v);
  function raster(im,frame,scale=1){const cv=document.createElement('canvas');cv.width=frame.width*scale;cv.height=frame.height*scale;const ctx=cv.getContext('2d');if(im)PE.utils.drawImageData(ctx,im,0,0,scale);return ctx.getImageData(0,0,cv.width,cv.height);}
  function base(p,si,ai,fi,name){const key=p.getFrameKey(si,ai,fi),ls=p.layers.filter(l=>l.name===name&&PE.isLayerInAction(p,l,si,ai)&&l.getFrameData(key));if(ls.length!==1)throw Error('无法唯一确定'+name+'底稿：'+key);return raster(ls[0].getFrameData(key),p.spriteSheets[si].actions[ai].frames[fi]);}
  function master(p,layer=p.getCurrentLayer()){return layer?.clothingSync?layer:layer?.clothingSyncId?p.layers.find(l=>l.clothingSync?.id===layer.clothingSyncId):null;}
  function editable(l){if(!isClothes(l)||l.locked||l.inheritedBase)throw Error('请选择未锁定的衣服图层');}
  function targets(p,source){const id=source.clothingSync.id;return p.layers.filter(l=>l.clothingSyncId===id);}
  function target(p,source,si,ai){const key=p.getFrameKey(si,ai,0),prefix=`${si}_${ai}_`,ls=targets(p,source).filter(l=>l.sheetIndex===si&&PE.isLayerInAction(p,l,si,ai)&&l.getFrameData(key));if(ls.length===1)return ls[0];const byAction=targets(p,source).filter(l=>l.sheetIndex===si&&PE.isLayerInAction(p,l,si,ai)&&(!l.frameData.size||[...l.frameData.keys()].some(k=>k.startsWith(prefix))));if(byAction.length===1)return byAction[0];throw Error('衣服目标层不唯一：'+si+'/'+ai);}
  function validate(p){
    const owners=new Map();for(const l of p.layers)if(l.clothingSync){const g=l.clothingSync;
      if(!isClothes(l)||!idle(p.spriteSheets[l.sheetIndex])||g.version!==1||typeof g.id!=='string'||!g.id||g.id.length>80||owners.has(g.id)||l.clothingSyncId!==g.id||typeof g.live!=='boolean'||!Array.isArray(g.preserved))throw Error('衣服同步设置无效');
      const seen=new Set();for(const key of g.preserved){if(typeof key!=='string'||!/^\d+_\d+_\d+$/.test(key)||seen.has(key))throw Error('衣服保留帧无效');seen.add(key);const [si,ai,fi]=key.split('_').map(Number);if(!supported(p.spriteSheets[si])||!p.spriteSheets[si].actions[ai]?.frames[fi]||si===l.sheetIndex&&fi===0)throw Error('衣服保留帧不存在或是源稿');}owners.set(g.id,l);
      if(g.sitMasters!==undefined&&(!Array.isArray(g.sitMasters)||g.sitMasters.length>3||new Set(g.sitMasters).size!==g.sitMasters.length||g.sitMasters.some(key=>{if(typeof key!=='string'||!/^\d+_\d+_0$/.test(key))return true;const [si,ai]=key.split('_').map(Number);return !sit(p.spriteSheets[si])||!p.spriteSheets[si].actions[ai]?.frames[0];})))throw Error('坐姿衣服首帧设置无效');
    }
    for(const l of p.layers)if(l.clothingSyncId&&(!owners.has(l.clothingSyncId)||!isClothes(l)||!supported(p.spriteSheets[l.sheetIndex])))throw Error('衣服同步源稿丢失或关联层无效');
  }
  function same(a,b){return a.width===b.width&&a.height===b.height&&JSON.stringify(a.placement||null)===JSON.stringify(b.placement||null)&&a.data.every((v,i)=>v===b.data[i]);}
  function matches(old,out,frame){
    return !!old&&same(out.placement||old.placement&&(old.width>old.placement.w||old.height>old.placement.h)?old:raster(old,frame),out);
  }
  function pattern(p,si,ai,im){
    const frame=p.spriteSheets[si].actions[ai].frames[0],body=base(p,si,ai,0,'body'),r=im.placement;
    const scale=r?Math.max(1,im.width/r.w,im.height/r.h):1;
    // shortcut: the HD editor uses uniform integer source grids; other scales need subpixel sampling.
    if(scale>1&&(!Number.isInteger(scale)||scale>8||im.width!==r.w*scale||im.height!==r.h*scale))throw Error('衣服同步需要 1–8 倍整数高清网格');
    if(frame.width*frame.height*scale*scale>16*1024*1024)throw Error('高清衣服画布过大');
    const image=raster(im,frame,scale),phases=Array.from({length:scale*scale},(_,k)=>{
      if(scale===1)return image;
      const data=new Uint8ClampedArray(body.data.length);
      for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){
        const at=((y*scale+Math.floor(k/scale))*image.width+x*scale+k%scale)*4;
        data.set(image.data.subarray(at,at+4),(y*body.width+x)*4);
      }return {width:body.width,height:body.height,data};
    });
    return {body,phases,scale};
  }
  function fitPattern(src,body,opts){
    const n=src.scale,w=body.width*n,h=body.height*n;
    if(w*h>16*1024*1024)throw Error('高清衣服画布过大');
    const image=new ImageData(w,h);
    for(const [k,clothes] of src.phases.entries()){
      const out=F.fromIdle({body:src.body,clothes},body,opts);
      if(n===1){image.data.set(out.data);break;}
      for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){
        const at=(y*body.width+x)*4;
        image.data.set(out.data.subarray(at,at+4),((y*n+Math.floor(k/n))*w+x*n+k%n)*4);
      }
    }
    if(n>1)image.placement={x:0,y:0,w:body.width,h:body.height};
    return image;
  }
  function plan(p,source,{includePreserved=false}={}){
    const g=source.clothingSync;if(!g)throw Error('请先选择待机衣服源稿');const sheet=p.spriteSheets[source.sheetIndex],sources=new Map(),edits=[];
    for(let ai=0;ai<sheet.actions.length;ai++){const key=p.getFrameKey(source.sheetIndex,ai,0),im=source.getFrameData(key);if(!hasInk(im))throw Error('请先画好待机正、背、侧各一帧');sources.set(sheet.actions[ai].direction,pattern(p,source.sheetIndex,ai,im));}
    const sitSheet=p.spriteSheets.findIndex(sit),seated=new Map();
    if(sitSheet>=0)for(const [ai,a] of p.spriteSheets[sitSheet].actions.entries()){
      const key=p.getFrameKey(sitSheet,ai,0);if(!g.sitMasters?.includes(key))continue;
      const im=target(p,source,sitSheet,ai).getFrameData(key);
      if(hasInk(im))seated.set(a.direction,im);
    }
    const sitPending=sitSheet>=0&&seated.size!==3;
    for(let si=0;si<p.spriteSheets.length;si++)if(supported(p.spriteSheets[si]))for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
      const a=p.spriteSheets[si].actions[ai],sitting=si===sitSheet;if(sitting&&sitPending)continue;
      const src=sitting?pattern(p,si,ai,seated.get(a.direction)):sources.get(a.direction);if(!src)throw Error('缺少方向源稿：'+a.direction);const l=target(p,source,si,ai);
      for(let fi=0;fi<a.frames.length;fi++){const key=p.getFrameKey(si,ai,fi),frame=a.frames[fi];if((sitting||si===source.sheetIndex)&&fi===0||!includePreserved&&g.preserved.includes(key))continue;
        editable(l);if(frame.locked||frame.lockedRegions?.length)throw Error('目标帧有保护区域，同步未写入：'+key);
        const image=fitPattern(src,base(p,si,ai,fi,'body'),{sit:sitting,shadeLegs:!sitting,targetHead:sitting?base(p,si,ai,fi,'head'):null});
        edits.push({layer:l,key,image});
      }
    }return {edits,preserved:g.preserved.length,sitPending};
  }
  function apply(result){for(const e of result.edits)e.layer.frameData.set(e.key,e.image);return result;}
  function setup(p,selected=p.getCurrentLayer()){
    editable(selected);let source=master(p,selected);if(source){validate(p);return source;}
    if(!idle(p.spriteSheets[selected.sheetIndex]))throw Error('首次同步请在待机选择衣服源稿');source=selected;
    const g={version:1,id:crypto.randomUUID(),live:false,preserved:[]};source.clothingSync=g;source.clothingSyncId=g.id;
    const parents=new Map(p.layers.map(l=>[l,l.parent==null?null:p.layers[l.parent]])),chosen=p.getCurrentLayer();
    for(let si=0;si<p.spriteSheets.length;si++)if(supported(p.spriteSheets[si]))for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
      if(si===source.sheetIndex)continue;const prefix=`${si}_${ai}_`,matches=p.layers.filter(l=>l.name===source.name&&l.sheetIndex===si&&PE.isLayerInAction(p,l,si,ai)&&[...l.frameData.keys()].some(k=>k.startsWith(prefix)));
      if(matches.length>1)throw Error('同方向有多个同名衣服层，请先整理');let l=matches[0];
      if(!l){const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(prefix+'0'));if(!head)throw Error('缺少目标头部');l=new PE.Layer(source.name);l.sheetIndex=si;l.parent=null;l.depth=head.depth;parents.set(l,parents.get(head));p.layers.splice(p.layers.indexOf(head)+1,0,l);}
      editable(l);l.clothingSyncId=g.id;
      if(sit(p.spriteSheets[si]))for(const [key,im] of l.frameData)if(key.startsWith(prefix)&&!key.endsWith('_0')&&hasInk(im))g.preserved.push(key);
    }
    for(const l of p.layers)l.parent=parents.get(l)==null?null:p.layers.indexOf(parents.get(l));p.currentLayerIndex=p.layers.indexOf(chosen);
    // Idle cels follow their first frame; only explicit preservation may opt them out.
    for(const e of plan(p,source).edits){const [si,ai,fi]=e.key.split('_').map(Number);if(si===source.sheetIndex)continue;const old=e.layer.getFrameData(e.key);if(hasInk(old)&&!matches(old,e.image,p.spriteSheets[si].actions[ai].frames[fi]))g.preserved.push(e.key);}
    return source;
  }
  function snapshot(p){return {layers:p.layers.slice(),selected:p.currentLayerIndex,items:p.layers.map(l=>({l,parent:l.parent,visible:l.visible,id:l.clothingSyncId,config:l.clothingSync?clone(l.clothingSync):null,frames:new Map(l.frameData)}))};}
  function restore(p,state){p.layers=state.layers.slice();p.currentLayerIndex=state.selected;for(const v of state.items){v.l.parent=v.parent;v.l.visible=v.visible;v.l.frameData=new Map(v.frames);if(v.id===undefined)delete v.l.clothingSyncId;else v.l.clothingSyncId=v.id;if(v.config)v.l.clothingSync=clone(v.config);else delete v.l.clothingSync;cache.delete(v.l);}}
  function transaction(app,label,change){if(app.toolManager.isDrawing)throw Error('请先结束当前绘画');const p=app.project,before=snapshot(p);let result,after;try{result=change();validate(p);after=snapshot(p);}catch(e){restore(p,before);throw e;}restore(p,before);PE.FrameEditing.record(app,label,()=>restore(p,before),()=>restore(p,after));return result;}
  function sync(app,{live}={}){return transaction(app,'同步衣服（保留手工帧）',()=>{const p=app.project,s=setup(p);if(live!==undefined)s.clothingSync.live=!!live;const result=plan(p,s);for(const l of p.layers)if(isClothes(l)&&supported(p.spriteSheets[l.sheetIndex]))l.visible=l.clothingSyncId===s.clothingSync.id;return apply(result);});}
  function stamp(p,s){let h=2166136261;const add=n=>h=Math.imul(h^n,16777619)>>>0;for(const l of p.layers){
    const linked=l===s||l.clothingSyncId===s.clothingSync.id&&sit(p.spriteSheets[l.sheetIndex]);
    if(!linked&&!(/^(head|body)$/.test(l.name)&&supported(p.spriteSheets[l.sheetIndex])))continue;
    for(const [k,im]of l.frameData){if(linked&&!k.endsWith('_0'))continue;for(const c of k)add(c.charCodeAt(0));for(const v of im.data)add(v);for(const c of JSON.stringify([im.width,im.height,im.placement||null]))add(c.charCodeAt(0));}
  }return h+':'+JSON.stringify(s.clothingSync)+':'+JSON.stringify(p.spriteSheets.filter(supported).map(s=>s.actions.map(a=>a.frames.map(f=>[f.width,f.height,f.locked,f.lockedRegions]))))+':'+targets(p,s).map(l=>[p.layers.indexOf(l),l.locked]).join(';');}
  function refresh(p){const pending=[];for(const s of p.layers.filter(l=>l.clothingSync?.live&&l.visible)){const hash=stamp(p,s);if(cache.get(s)===hash)continue;const result=plan(p,s);result.edits=result.edits.filter(e=>{const [si,ai,fi]=e.key.split('_').map(Number);return !matches(e.layer.getFrameData(e.key),e.image,p.spriteSheets[si].actions[ai].frames[fi]);});pending.push({source:s,hash,result});}for(const item of pending){apply(item.result);cache.set(item.source,item.hash);}return pending.filter(item=>item.result.edits.length);}
  function preserve(app){return transaction(app,'确认坐姿源稿 / 保留衣服当前帧',()=>{
    const p=app.project,s=master(p);if(!s)throw Error('请先从待机源稿同步衣服');const key=p.getFrameKey(),g=s.clothingSync;
    if(sitFirst(p)){
      const l=target(p,s,p.currentSheetIndex,p.currentActionIndex);if(l!==p.getCurrentLayer())throw Error('请选择本方向的坐姿衣服图层');
      const list=g.sitMasters||[],had=list.includes(key);
      if(!had&&!hasInk(l.getFrameData(key)))throw Error('请先手画本方向坐姿第 1 帧的衣服');
      g.sitMasters=had?list.filter(k=>k!==key):[...list,key];return !had;
    }
    if(p.currentSheetIndex===s.sheetIndex&&p.currentFrameIndex===0)throw Error('待机首帧就是源稿，不需要保留');
    const had=g.preserved.includes(key);g.preserved=had?g.preserved.filter(k=>k!==key):[...g.preserved,key];if(had)apply(plan(p,s));return !had;
  });}
  function install(app,say=()=>{},view=()=>{}){
    const render=app.canvasManager.render.bind(app.canvasManager);app.canvasManager.render=function(...args){try{const changed=refresh(app.project);if(changed.length){app.animationPlayer._previewCache=null;app.persistence?.markDirty();say('衣服已实时同步；手工保留帧不变。');}}catch(e){say('衣服同步暂停：'+e.message);}view();return render(...args);};
    const change=app.history.onChange;app.history.onChange=()=>{change?.();app.canvasManager.render();};
    const down=app.toolManager.onMouseDown.bind(app.toolManager);app.toolManager.onMouseDown=function(...args){const p=app.project,l=p.getCurrentLayer(),s=master(p,l);if(s?.clothingSync.live&&!sitFirst(p)&&!s.clothingSync.preserved.includes(p.getFrameKey())&&(l!==s||p.currentFrameIndex!==0)&&!['eyedropper','select','wand'].includes(this.currentTool)){say('这是衣服生成帧；请编辑首帧源稿，或先点「保留当前帧」再微调。');return;}return down(...args);};
  }
  PE.ClothingSync={master,setup,validate,plan,apply,sync,refresh,preserve,install,raster,base,transaction,sitFirst};
})();
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,C=PE.ClothingSync,host=document.getElementById('hair-edit-master');if(!host)return;const hairNote=host.parentElement.nextElementSibling;
  const bar=document.createElement('span');bar.className='hair-animation-tools';bar.id='clothing-sync-tools';bar.innerHTML='<label><input id="clothing-live-sync" type="checkbox">衣服实时同步</label><button id="clothing-sync-all" class="studio-button">同步衣服全部</button><button id="clothing-preserve" class="studio-button">保留当前帧</button><button id="clothing-edit-master" class="studio-button">编辑衣服基准</button>';host.parentElement.after(bar);
  const note=document.createElement('span');note.className='hair-animation-status';note.setAttribute('role','status');note.setAttribute('aria-live','polite');bar.after(note);const say=t=>note.textContent=t,live=bar.querySelector('input'),keep=bar.querySelector('#clothing-preserve');
  const update=()=>{const p=app.project,s=C.master(p);bar.hidden=PE.classifyPart(p.getCurrentLayer()?.name)?.category!=='衣服';bar.style.display=bar.hidden?'none':'';note.style.display=bar.hidden?'none':'';host.parentElement.style.display=bar.hidden?'':'none';if(hairNote?.classList.contains('hair-animation-status'))hairNote.style.display=bar.hidden?'':'none';live.checked=!!s?.clothingSync.live;keep.textContent=C.sitFirst(p)?(s?.clothingSync.sitMasters?.includes(p.getFrameKey())?'取消确认坐姿首帧':'确认坐姿首帧'):(s?.clothingSync.preserved.includes(p.getFrameKey())?'取消保留当前帧':'保留当前帧');if(!note.textContent&&s)note.textContent='坐姿须手画并确认三方向首帧，再同步后续帧。';};
  const run=fn=>{try{fn();}catch(e){say(e.message);}update();};C.install(app,say,update);
  const pending=r=>r.sitPending?' 坐姿已跳过，等正、侧、背第 1 帧全部确认。':'';
  live.onchange=()=>run(()=>{if(live.checked){const r=C.sync(app,{live:true});say('衣服实时同步已开启；保留 '+r.preserved+' 帧手工修改。'+pending(r));}else C.transaction(app,'关闭衣服实时同步',()=>{const s=C.master(app.project);if(s)s.clothingSync.live=false;});});
  bar.querySelector('#clothing-sync-all').onclick=()=>run(()=>{const r=C.sync(app);say('衣服已同步 '+r.edits.length+' 帧，保留 '+r.preserved+' 帧；可一次撤销。'+pending(r));});
  keep.onclick=()=>run(()=>{const p=app.project,first=C.sitFirst(p),on=C.preserve(app);say(first?(on?'坐姿首帧已确认（'+C.master(p).clothingSync.sitMasters.length+'/3）；三方向都确认后才能同步后续帧。':'已取消确认；坐姿后续帧停止同步。'):(on?'当前帧已保留，不会被同步覆盖。':'已取消保留。'));});
  bar.querySelector('#clothing-edit-master').onclick=()=>run(()=>{const p=app.project,s=C.master(p);if(!s)throw Error('首次同步请在待机选择衣服源稿');const sitting=p.spriteSheets[p.currentSheetIndex]?.name==='original16_sit',si=sitting?p.currentSheetIndex:s.sheetIndex,ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===p.getCurrentAction().direction),l=sitting?p.getCurrentLayer():s;if(ai<0)throw Error('没有这个方向的源稿');app.selectFrame(si,ai,0);p.currentLayerIndex=p.layers.indexOf(l);app.updateAll();app.canvasManager.render();say(sitting?'请手画本方向坐姿衣服，然后点「确认坐姿首帧」。':'正在编辑本方向待机首帧。');});update();
});
