/* A directional idle master, calibrated frame offsets, and a persistent sway recipe. */
window.PE = window.PE || {};
(() => {
  'use strict';
  const actions = {idle:'待机', walk:'行走', pickup:'拾取', sit:'坐姿', sleep:'睡觉'};
  const directions = {down:'正面', side:'侧面', up:'背面'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const cache = new WeakMap();
  const supported = sheet => Object.hasOwn(actions, sheet?.name?.replace(/^original32_/, '')) && sheet.name.startsWith('original32_');
  const address = (sheet, direction, fi) => `${sheet.name}/${direction}/${fi}`;
  const params = () => ({ampV:0, ampH:2, cycles:1, lag:0.6, masks:{}, protectedMasks:{}});
  const settingKey = (sheet, direction) => `${sheet}/${direction}`;
  const settingsFor = (g, sheet, direction) => g.directionOverrides?.[settingKey(sheet,direction)] || g.overrides[sheet] || g.params;
  function editSettings(g, sheet, direction, scope, sheets) {
    if(scope==='all'){g.overrides={};g.directionOverrides={};return g.params;}
    if(!['current','direction'].includes(scope))throw Error('调节范围无效');
    const key=settingKey(sheet,direction);g.directionOverrides??={};
    if(scope==='current')return g.directionOverrides[key]=clone(settingsFor(g,sheet,direction));
    const value=clone(settingsFor(g,sheet,direction));
    for(const s of sheets)if(supported(s)&&s.actions.some(a=>a.direction===direction))g.directionOverrides[settingKey(s.name,direction)]=value;
    return value;
  }
  function previewLayers(p, si, ai, id) {
    return PE.getRenderLayers(p,si,ai).filter(l=>!l.isGroup&&
      (PE.classifyPart(l.name)?.category==='头发'||l.hairAnimationId
        ? l.hairAnimationId===id : PE.isLayerVisible(p,l,si)));
  }
  function editable(layer) {
    if (!layer || layer.isGroup || layer.locked || layer.inheritedBase || PE.isHandLayer(layer)) throw Error('请选择未锁定的头发图层');
    if (PE.classifyPart(layer.name)?.category !== '头发') throw Error('此功能只处理选中的头发部件');
  }
  function master(p, layer = p.getCurrentLayer()) {
    if (layer?.hairAnimation) return layer;
    return layer?.hairAnimationId ? p.layers.find(l => l.hairAnimation?.id === layer.hairAnimationId) : null;
  }
  function headAnchor(p, si, ai, fi) {
    const key = p.getFrameKey(si, ai, fi), frame = p.spriteSheets[si].actions[ai].frames[fi];
    const heads = p.layers.filter(l => /^(head|头部)$/.test(l.name) && !l.isGroup && PE.isLayerInAction(p,l,si,ai) && l.getFrameData(key));
    if (heads.length !== 1) throw Error(`无法唯一确定头部：${p.spriteSheets[si].name} ${ai+1}/${fi+1}`);
    const canvas = document.createElement('canvas'); canvas.width = frame.width; canvas.height = frame.height;
    const ctx = canvas.getContext('2d'); PE.utils.drawImageData(ctx, heads[0].getFrameData(key));
    const data = ctx.getImageData(0,0,canvas.width,canvas.height).data, w = canvas.width, h = canvas.height, seen = new Uint8Array(w*h);
    let best = null;
    // Match the demo: isolated pixels are not a head anchor.
    for (let i=0; i<seen.length; i++) {
      if (seen[i] || !data[i*4+3]) continue;
      const queue=[i]; seen[i]=1; let left=w,right=0,top=h;
      for(let j=0;j<queue.length;j++) {
        const at=queue[j],x=at%w,y=Math.floor(at/w); left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);
        for(const next of [x>0?at-1:-1,x+1<w?at+1:-1,at-w,at+w]) {
          if(next<0||next>=seen.length||seen[next]||!data[next*4+3])continue;
          seen[next]=1;queue.push(next);
        }
      }
      if(!best||queue.length>best.count)best={x:(left+right)/2,y:top,count:queue.length};
    }
    if(!best)throw Error('头部为空，不能猜测偏移');
    return best;
  }
  function calibrate(p, source) {
    const si=source.sheetIndex, idle=p.spriteSheets[si], result={};
    for(const [ai,a] of idle.actions.entries()) {
      const origin=headAnchor(p,si,ai,0);
      for(const [ti,s] of p.spriteSheets.entries())if(supported(s)) {
        const ta=s.actions.findIndex(b=>b.direction===a.direction);if(ta<0)continue;
        s.actions[ta].frames.forEach((_,fi)=>{
          const at=headAnchor(p,ti,ta,fi);
          result[address(s,a.direction,fi)]={x:Math.round(at.x-origin.x),y:at.y-origin.y};
        });
      }
    }
    return result;
  }
  function setup(p, layer=p.getCurrentLayer()) {
    const known=master(p,layer);if(known)return known;
    editable(layer);
    if(p.spriteSheets[layer.sheetIndex]?.name!=='original32_idle')throw Error('首次关联请在待机中选择头发；各方向第一帧作为基准');
    if(layer.parent!=null)throw Error('请先把此头发作为独立部件层；不自动合并方向分组');
    const matches=p.layers.filter(l=>l!==layer&&!l.isGroup&&l.name===layer.name&&supported(p.spriteSheets[l.sheetIndex]));
    if(matches.some(l=>l.parent!=null||l.hairAnimationId)||new Set(matches.map(l=>l.sheetIndex)).size!==matches.length)throw Error('其他动作存在重复或已关联同名层，请先明确部件名称');
    matches.forEach(editable);
    const offsets=calibrate(p,layer),id=crypto.randomUUID();
    layer.hairAnimation={version:1,id,live:false,enabled:false,params:params(),overrides:{},offsets};
    layer.hairAnimationId=id;
    for(const [si,s]of p.spriteSheets.entries())if(supported(s)&&si!==layer.sheetIndex) {
      let target=matches.find(l=>l.sheetIndex===si);
      if(!target){target=new PE.Layer(layer.name);target.sheetIndex=si;target.visible=layer.visible;target.opacity=layer.opacity;p.layers.push(target);PE.autoPlaceLayer(p,p.layers.indexOf(target),{rename:false});}
      target.hairAnimationId=id;
    }
    return layer;
  }
  function validate(p) {
    const ids=new Set();
    const directionKeys=new Set(p.spriteSheets.filter(supported).flatMap(s=>s.actions.map(a=>settingKey(s.name,a.direction))));
    for(const l of p.layers) {
      if(l.hairAnimationId!==undefined&&(typeof l.hairAnimationId!=='string'||l.hairAnimationId.length>80))throw Error('头发关联编号无效');
      const g=l.hairAnimation;if(!g)continue;
      if(g.version!==1||typeof g.id!=='string'||g.id.length>80||!g.id||ids.has(g.id)||l.hairAnimationId!==g.id||p.spriteSheets[l.sheetIndex]?.name!=='original32_idle'||typeof g.live!=='boolean'||typeof g.enabled!=='boolean')throw Error('头发联动设置无效');
      ids.add(g.id);
      if(l.isGroup||l.inheritedBase||PE.isHandLayer(l)||PE.classifyPart(l.name)?.category!=='头发')throw Error('头发基准层身份无效');
      if(!g.offsets||Array.isArray(g.offsets)||Object.keys(g.offsets).length>4096||!g.overrides||Array.isArray(g.overrides)||Object.keys(g.overrides).length>5)throw Error('头发偏移/动作设置无效');
      for(const offset of Object.values(g.offsets))if(!offset||![offset.x,offset.y].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=4096))throw Error('头发偏移必须是有效整数');
      for(const a of p.spriteSheets[l.sheetIndex].actions){const o=g.offsets[address(p.spriteSheets[l.sheetIndex],a.direction,0)];if(!o||o.x!==0||o.y!==0)throw Error('各方向待机第一帧是基准，偏移必须为 0');}
      const perDirection=g.directionOverrides??{};
      if(!perDirection||typeof perDirection!=='object'||Array.isArray(perDirection)||Object.keys(perDirection).length>20||Object.keys(perDirection).some(k=>!directionKeys.has(k)))throw Error('头发分方向设置无效');
      for(const v of [g.params,...Object.values(g.overrides),...Object.values(perDirection)]) {
        if(!v||![v.ampV,v.ampH,v.cycles,v.lag].every(Number.isFinite)||v.ampV<0||v.ampV>4||v.ampH<0||v.ampH>6||!Number.isInteger(v.cycles)||v.cycles<1||v.cycles>4||v.lag<0||v.lag>1.5||!v.masks||Object.keys(v.masks).length>4)throw Error('头发飘动参数无效');
        for(const maps of [v.masks,v.protectedMasks??{}]) {
          if(!maps||typeof maps!=='object'||Array.isArray(maps)||Object.keys(maps).length>4)throw Error('头发涂抹区域无效');
          for(const m of Object.values(maps))if(m&&(!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||m.width*m.height>262144||!Array.isArray(m.data)||m.data.length!==m.width*m.height||m.data.some(v=>v!==0&&v!==1)))throw Error('头发涂抹区域无效');
        }
      }
    }
    for(const l of p.layers)if(l.hairAnimationId&&!ids.has(l.hairAnimationId))throw Error('头发关联缺少基准层');
  }
  function deform(src, frame, offset, phase, settings, mask, enabled, protectedMask=null) {
    const r=src?.placement||{x:0,y:0,w:src?.width||1,h:src?.height||1};
    if(src&&(r.w!==src.width||r.h!==src.height||!Number.isInteger(r.x)||!Number.isInteger(r.y)))throw Error('请先使用原生像素头发；不会缩放或压缩高清底图');
    if(!src)return {image:new ImageData(frame.width,frame.height),clipped:0};
    if(src.width*src.height>262144)throw Error('头发飘动支持最多 512×512 源像素；原图未修改');
    let top=src.height,bottom=-1;
    const painted=(m,x,y)=>x<m.width&&y<m.height&&m.data[y*m.width+x];
    const movable=(x,y)=>!mask||painted(mask,x,y);
    const selected=(x,y)=>movable(x,y)&&(!protectedMask||!painted(protectedMask,x,y));
    for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(src.data[(y*src.width+x)*4+3]&&movable(x,y)){top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const span=Math.max(1,bottom-top),points=new Map(),fixed=new Set();let clipped=0;
    for(let pass=0;pass<2;pass++)for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++) {
      const i=(y*src.width+x)*4;if(!src.data[i+3])continue;
      const weight=enabled&&selected(x,y)?1:0,depth=Math.max(0,Math.min(1,(y-top)/span));
      if((weight===0?0:1)!==pass)continue;
      // Depth delays the wave, but never silently locks or weakens the top row.
      const dx=Math.round(settings.ampH*weight*(Math.sin(settings.cycles*phase-settings.lag*depth)-Math.sin(-settings.lag*depth)));
      const dy=-Math.round(settings.ampV*(.5-.5*Math.cos(2*phase))*weight);
      const X=x+r.x+offset.x+dx,Y=y+r.y+offset.y+dy,key=X+','+Y;
      if(X<0||X>=frame.width||Y<0||Y>=frame.height)clipped++;
      if(pass&&fixed.has(key))continue;
      points.set(key,{x:X,y:Y,i});if(!pass)fixed.add(key);
    }
    const values=[...points.values()];
    let left=0,topOut=0,right=frame.width-1,bottomOut=frame.height-1;
    for(const v of values){left=Math.min(left,v.x);topOut=Math.min(topOut,v.y);right=Math.max(right,v.x);bottomOut=Math.max(bottomOut,v.y);}
    const w=right-left+1,h=bottomOut-topOut+1;
    if(w>4096||h>4096||w*h>262144)throw Error('生成范围过大，请减小偏移或头发画布');
    const out=new ImageData(w,h);
    for(const v of values)out.data.set(src.data.subarray(v.i,v.i+4),((v.y-topOut)*w+v.x-left)*4);
    // Keep out-of-frame source pixels rather than silently cutting them off.
    if(left||topOut||w!==frame.width||h!==frame.height)out.placement={x:left,y:topOut,w,h};
    return {image:out,clipped};
  }
  function plan(p,source,g=source.hairAnimation) {
    const idle=p.spriteSheets[source.sheetIndex],edits=[];let clipped=0;
    for(const layer of p.layers.filter(l=>l.hairAnimationId===g.id)) {
      editable(layer);const si=layer.sheetIndex,s=p.spriteSheets[si];if(!supported(s))throw Error('关联层动作不存在');
      for(const [ai,a]of s.actions.entries()) {
        const baseAI=idle.actions.findIndex(b=>b.direction===a.direction);if(baseAI<0)continue;
        const src=source.getFrameData(p.getFrameKey(source.sheetIndex,baseAI,0));
        const settings=settingsFor(g,s.name,a.direction),mask=settings.masks[a.direction];
        const durations=a.frames.map(f=>s.useFrameDurations!==false&&Number.isFinite(f.duration)&&f.duration>0?f.duration:1000/(s.fps||8));
        const total=durations.reduce((n,v)=>n+v,0);let elapsed=0;
        for(const [fi,frame]of a.frames.entries()) {
          const phase=2*Math.PI*elapsed/total;elapsed+=durations[fi];
          if(layer===source&&fi===0)continue;
          if(frame.locked||frame.lockedRegions?.length)throw Error(`${actions[s.name.slice(11)]||s.name} 第${fi+1}帧有保护区域，同步未写入`);
          const offset=g.offsets[address(s,a.direction,fi)];if(!offset)throw Error('帧结构已变化，请先重新标定偏移');
          const result=deform(src,frame,offset,phase,settings,mask,g.enabled,settings.protectedMasks?.[a.direction]);clipped+=result.clipped;
          edits.push({layer,key:p.getFrameKey(si,ai,fi),image:result.image});
        }
      }
    }
    return {edits,clipped};
  }
  function applyPlan(result) {for(const e of result.edits)e.layer.frameData.set(e.key,e.image);return result;}
  function fingerprint(p,source) {
    let h=2166136261;const add=v=>{h=Math.imul(h^v,16777619)>>>0;};
    const si=source.sheetIndex;
    for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++) {
      const im=source.getFrameData(p.getFrameKey(si,ai,0));if(!im){add(0);continue;}
      add(im.width);add(im.height);for(const v of im.data)add(v);
      for(const c of JSON.stringify(im.placement||null))add(c.charCodeAt(0));
    }
    return h+':'+JSON.stringify(source.hairAnimation)+':'+p.layers.filter(l=>l.hairAnimationId===source.hairAnimation.id).map(l=>[p.layers.indexOf(l),l.sheetIndex,l.locked]).join(';')+':'+p.spriteSheets.filter(supported).map(s=>s.actions.map(a=>a.frames.map(f=>[f.width,f.height,f.duration,f.locked,JSON.stringify(f.lockedRegions)]))).join(';');
  }
  function refresh(p,force=false) {
    const pending=[];
    for(const source of p.layers.filter(l=>l.hairAnimation)) {
      const g=source.hairAnimation;if(!force&&!g.live)continue;
      const stamp=fingerprint(p,source);if(!force&&cache.get(source)===stamp)continue;
      pending.push({source,stamp,result:plan(p,source)});
    }
    for(const item of pending){applyPlan(item.result);cache.set(item.source,item.stamp);}
    return pending;
  }
  function snapshot(p) {
    return {layers:p.layers.slice(),selected:p.currentLayerIndex,items:p.layers.map(l=>({l,parent:l.parent,id:l.hairAnimationId,config:l.hairAnimation?clone(l.hairAnimation):undefined,frames:new Map(l.frameData)}))};
  }
  function restore(p,state) {
    p.layers=state.layers.slice();p.currentLayerIndex=state.selected;
    for(const v of state.items){v.l.parent=v.parent;v.l.frameData=new Map(v.frames);if(v.id===undefined)delete v.l.hairAnimationId;else v.l.hairAnimationId=v.id;if(v.config===undefined)delete v.l.hairAnimation;else v.l.hairAnimation=clone(v.config);cache.delete(v.l);}
  }
  function transaction(app,label,change) {
    if(app.toolManager.isDrawing)throw Error('请先结束当前绘画');
    const p=app.project,before=snapshot(p);let result;
    try{result=change();validate(p);}catch(e){restore(p,before);throw e;}
    const after=snapshot(p);restore(p,before);
    PE.FrameEditing.record(app,label,()=>restore(p,before),()=>restore(p,after));return result;
  }
  function sync(app,{live}={}) {
    return transaction(app,'同步头发（保留飘动设置）',()=>{
      const source=setup(app.project);if(live!==undefined)source.hairAnimation.live=!!live;
      return applyPlan(plan(app.project,source));
    });
  }
  function install(app,onStatus=()=>{},onView=()=>{}) {
    const oldRender=app.canvasManager.render.bind(app.canvasManager);
    app.canvasManager.render=function(...args){
      try{const changed=refresh(app.project);if(changed.length){app.animationPlayer._previewCache=null;app.persistence?.markDirty();onStatus(changed.reduce((n,v)=>n+v.result.clipped,0)?'头发已更新；有像素超出画布，原像素仍保留，可在偏移标记中调整。':'头发已实时同步，飘动设置保留。');}}
      catch(e){onStatus('头发同步暂停：'+e.message);}
      onView();return oldRender(...args);
    };
    const oldChange=app.history.onChange;
    app.history.onChange=()=>{oldChange?.();app.canvasManager.render();};
    const down=app.toolManager.onMouseDown.bind(app.toolManager);
    app.toolManager.onMouseDown=function(...args){
      const p=app.project,l=p.getCurrentLayer(),source=master(p,l),g=source?.hairAnimation;
      if(g&&(g.live||g.enabled)&&(l!==source||p.currentFrameIndex!==0)&&!['eyedropper','select','wand'].includes(this.currentTool)) {onStatus('这是自动生成帧。请点击「编辑基准」修改本方向待机首帧；关闭实时同步和飘动后可独立绘制。');return;}
      return down(...args);
    };
  }
  PE.HairAnimation={actions,directions,master,setup,validate,calibrate,plan,applyPlan,refresh,transaction,sync,install,deform,params,address,settingsFor,editSettings,previewLayers};
})();

document.addEventListener('DOMContentLoaded',()=>{
  const H=PE.HairAnimation,app=PE.app,host=document.getElementById('copy-next-cel-btn');if(!host)return;
  const bar=document.createElement('span');bar.className='hair-animation-tools';
  bar.innerHTML='<label><input id="hair-live-sync" type="checkbox">实时同步</label><button id="hair-sync-all" type="button" class="studio-button">同步全部</button><button id="hair-offsets" type="button" class="studio-button">偏移标记…</button><button id="hair-sway" type="button" class="studio-button">飘动…</button><button id="hair-edit-master" type="button" class="studio-button">编辑基准</button>';
  host.after(bar);
  const status=document.createElement('span');status.className='hair-animation-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');bar.after(status);
  const say=text=>status.textContent=text,live=bar.querySelector('input');
  function run(fn){try{return fn();}catch(e){say(e.message);}}
  const current=()=>H.master(app.project);
  H.install(app,say,()=>{const g=current()?.hairAnimation;live.checked=!!g?.live;bar.querySelector('#hair-sway').classList.toggle('hair-effect-active',!!g?.enabled);});
  live.onchange=()=>run(()=>{if(live.checked)H.sync(app,{live:true});else H.transaction(app,'关闭实时同步',()=>{const s=current();if(s)s.hairAnimation.live=false;});say(live.checked?'实时同步已开启；在各方向待机首帧绘制。':'实时同步已关闭，现有飘动仍保留；画好后点击同步全部。');});
  bar.querySelector('#hair-sync-all').onclick=()=>run(()=>{const r=H.sync(app);say(`已同步 ${r.edits.length} 帧，可一次撤销。${r.clipped?'有像素超出画布，未删除原像素。':''}`);});
  bar.querySelector('#hair-edit-master').onclick=()=>run(()=>{const p=app.project,s=current();if(!s)throw Error('请先在待机选择头发并同步');const dir=p.getCurrentAction().direction,ai=p.spriteSheets[s.sheetIndex].actions.findIndex(a=>a.direction===dir);if(ai<0)throw Error('没有这个方向的基准');app.selectFrame(s.sheetIndex,ai,0);p.currentLayerIndex=p.layers.indexOf(s);app.updateAll();app.canvasManager.render();say('正在编辑本方向待机第一帧；其他帧按标记位置生成。');});
  bar.querySelector('#hair-offsets').onclick=()=>run(()=>{
    const p=app.project,s=current();if(!s)throw Error('请先开启实时同步或点击同步全部');
    const dialog=document.createElement('dialog');dialog.className='advanced-dialog hair-offset-dialog';dialog.setAttribute('aria-label','头发偏移标记');
    dialog.innerHTML='<h2>相对各方向待机首帧的偏移</h2><p>向右、向下为正数。重新标定只读取现有头部，不修改人物。</p><div class="hair-offset-table"></div><p data-note role="status"></p><div class="hair-dialog-actions"><button data-calibrate class="studio-button">按头部重新标定</button><button data-cancel class="studio-button">取消</button><button data-apply class="studio-button save-primary">确定</button></div>';
    let offsets=cloneOffsets();function cloneOffsets(){return JSON.parse(JSON.stringify(s.hairAnimation.offsets));}
    const list=dialog.querySelector('.hair-offset-table');
    function draw(){list.replaceChildren();for(const [key,v]of Object.entries(offsets)){const [sheet,dir,fi]=key.split('/'),row=document.createElement('label');row.textContent=`${H.actions[sheet.slice(11)]||sheet} · ${H.directions[dir]||dir} · 第${Number(fi)+1}帧 `;for(const axis of ['x','y']){const input=document.createElement('input');input.type='number';input.step='1';input.min='-4096';input.max='4096';input.value=v[axis];input.disabled=sheet===p.spriteSheets[s.sheetIndex].name&&fi==='0';input.setAttribute('aria-label',`${H.actions[sheet.slice(11)]||sheet} ${H.directions[dir]||dir} 第${Number(fi)+1}帧 ${axis.toUpperCase()}`);input.oninput=()=>v[axis]=Number(input.value);row.append(axis.toUpperCase(),input);}list.append(row);}}
    draw();dialog.querySelector('[data-calibrate]').onclick=()=>run(()=>{offsets=H.calibrate(p,s);draw();});
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-apply]').onclick=()=>{try{if(app.project!==p||!p.layers.includes(s))throw Error('工程已变化，请重新打开');H.transaction(app,'调整头发偏移标记',()=>{s.hairAnimation.offsets=offsets;H.validate(p);H.applyPlan(H.plan(p,s));});dialog.close();}catch(e){dialog.querySelector('[data-note]').textContent=e.message;}};
    dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
  });
  bar.querySelector('#hair-sway').onclick=()=>run(()=>openSway());
  function openSway(){
    const p=app.project,idleSI=p.spriteSheets.findIndex(s=>s.name==='original32_idle');
    const candidates=p.layers.filter(l=>l.sheetIndex===idleSI&&!l.isGroup&&!l.locked&&!l.inheritedBase&&PE.classifyPart(l.name)?.category==='头发'&&(l.parent==null||l.hairAnimation));
    if(!candidates.length)throw Error('待机中没有可调节的独立头发部件，请先新建前发或后发');
    const entries=new Map();let entry,result=null,frame=0,playing=true,start=null,paintMode='move',erasing=false,painting=false,previous=null,request;
    const dialog=document.createElement('dialog');dialog.className='advanced-dialog hair-sway-dialog';dialog.setAttribute('aria-label','头发持续飘动');
    dialog.innerHTML=`<h2>头发飘动 · 分部件 / 分动作 / 分方向</h2><p>默认只调整当前动作、当前方向。切换头发时保留本次调节，确定后一并应用；取消不修改工程。</p>
      <div class="hair-sway-fields"><label>头发部件 <select data-hair aria-label="飘动头发部件"></select></label><label><input data-enabled type="checkbox">开启本部件飘动（总开关）</label></div>
      <div class="hair-sway-fields"><label>应用范围 <select data-scope aria-label="飘动调节范围"><option value="current">当前动作＋当前方向</option><option value="direction">全部动作＋当前方向</option><option value="all">全部动作＋全部方向（统一覆盖）</option></select></label><label>动作 <select data-action aria-label="飘动动作"></select></label><label>方向 <select data-direction aria-label="飘动方向"></select></label></div>
      <div class="hair-sway-grid"><section><h3>所选头发：可动 / 保护区域</h3><canvas data-paint aria-label="涂抹头发可动区域"></canvas><div><label>画笔半径 <input data-radius type="number" min="1" max="8" value="3" aria-label="飘动画笔半径"></label><button data-move class="studio-button" aria-pressed="true">可动画笔</button><button data-protect class="studio-button" aria-pressed="false">保护画笔</button><button data-erase class="studio-button" aria-pressed="false">橡皮擦</button><button data-clear class="studio-button">全部可动</button><button data-clear-protection class="studio-button">清空保护</button></div><p class="hair-mask-legend">蓝色：可动；红色：保护（优先）。不自动锁头顶。</p></section><section><h3>预览：只显示所选头发＋人物</h3><canvas data-preview aria-label="所选头发隔离动画预览"></canvas><div><button data-play class="studio-button">暂停</button><span data-frame></span></div></section></div>
      <div class="hair-sway-fields" data-params></div><p data-note role="status"></p><div class="hair-dialog-actions"><button data-cancel class="studio-button">取消全部</button><button data-apply class="studio-button save-primary">确定</button></div>`;
    const $=sel=>dialog.querySelector(sel),hair=$('[data-hair]'),scope=$('[data-scope]'),action=$('[data-action]'),direction=$('[data-direction]'),enabled=$('[data-enabled]'),paint=$('[data-paint]'),preview=$('[data-preview]'),note=$('[data-note]');
    for(const l of candidates)hair.append(new Option(l.name,String(p.layers.indexOf(l))));
    const sheets=p.spriteSheets.map((s,i)=>({s,i})).filter(v=>v.s.name.startsWith('original32_')&&Object.hasOwn(H.actions,v.s.name.slice(11)));
    for(const {s,i}of sheets)action.append(new Option(H.actions[s.name.slice(11)],String(i)));
    action.value=String(p.currentSheetIndex);if(!action.value)action.value=String(idleSI);
    const fields={};for(const [key,label,min,max,step]of [['ampV','上下起伏（强度）',0,4,.1],['ampH','左右轻摆',0,6,.1],['cycles','每循环摆动次数',1,4,1],['lag','发梢延迟',0,1.5,.1]]){
      const labelNode=document.createElement('label');labelNode.textContent=label+' ';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=String(step);input.setAttribute('aria-label',label);fields[key]=input;labelNode.append(input);$('[data-params]').append(labelNode);
      input.oninput=()=>{settings(true)[key]=input.value===''?NaN:Number(input.value);rebuild();};
    }
    function settings(write=false){
      const g=entry.source.hairAnimation,s=entry.work.spriteSheets[Number(action.value)];
      if(write){entry.dirty=true;return H.editSettings(g,s.name,direction.value,scope.value,entry.work.spriteSheets);}
      return scope.value==='all'?g.params:H.settingsFor(g,s.name,direction.value);
    }
    function sourceImage(){const idle=entry.work.spriteSheets[entry.source.sheetIndex],ai=idle.actions.findIndex(a=>a.direction===direction.value);return entry.source.getFrameData(entry.work.getFrameKey(entry.source.sheetIndex,ai,0));}
    function populateDirections(keep){
      const idle=entry.work.spriteSheets[entry.source.sheetIndex],target=entry.work.spriteSheets[Number(action.value)];direction.replaceChildren();
      for(const a of target.actions)if(idle.actions.some(b=>b.direction===a.direction))direction.append(new Option(H.directions[a.direction]||a.name,a.direction));
      direction.value=keep;if(!direction.value)direction.selectedIndex=0;
    }
    function chooseHair(){
      const original=p.layers[Number(hair.value)];entry=entries.get(original);
      if(!entry){
        const work=Object.assign(Object.create(p),{layers:p.layers.map(l=>{const copy=Object.assign(Object.create(l),l,{frameData:new Map(l.frameData)});if(l.hairAnimation)copy.hairAnimation=JSON.parse(JSON.stringify(l.hairAnimation));return copy;})});
        const source=H.setup(work,work.layers[p.layers.indexOf(original)]);
        entry={original,work,source,stamp:JSON.stringify(original.hairAnimation||null),dirty:false};entries.set(original,entry);
      }
      enabled.checked=entry.source.hairAnimation.enabled;populateDirections(direction.value||p.getCurrentAction()?.direction);loadFields();
    }
    function paintView(){
      const im=sourceImage(),idle=entry.work.spriteSheets[entry.source.sheetIndex],w=im?.width||idle.frameWidth,h=im?.height||idle.frameHeight;paint.width=w;paint.height=h;const ctx=paint.getContext('2d');if(im)ctx.putImageData(im,0,0);
      for(const [maps,color]of [[settings().masks,'rgba(50,180,240,.6)'],[settings().protectedMasks||{},'rgba(240,70,80,.7)']]){const mask=maps[direction.value];if(!mask)continue;ctx.fillStyle=color;for(let y=0;y<Math.min(h,mask.height);y++)for(let x=0;x<Math.min(w,mask.width);x++)if(mask.data[y*mask.width+x])ctx.fillRect(x,y,1,1);}
    }
    function rebuild(){
      try{
        H.validate(entry.work);result=H.plan(entry.work,entry.source);$('[data-apply]').disabled=false;paintView();
        note.textContent=`${entry.original.name} · ${action.selectedOptions[0]?.textContent} · ${direction.selectedOptions[0]?.textContent}；已调整 ${[...entries.values()].filter(e=>e.dirty).length} 个部件。`+(result.clipped?'有像素超出画布，原像素仍保留。':'')+'支持 0.1、0.2 等强度；原生像素仍取整，小强度可能生成相同画面。';
        start=null;frame=0;
      }catch(e){result=null;note.textContent=e.message;$('[data-apply]').disabled=true;}
    }
    function loadFields(){painting=false;previous=null;for(const [key,input]of Object.entries(fields))input.value=settings()[key];rebuild();}
    hair.onchange=()=>{try{chooseHair();}catch(e){note.textContent=e.message;$('[data-apply]').disabled=true;}};
    scope.onchange=loadFields;direction.onchange=loadFields;action.onchange=()=>{populateDirections(direction.value);loadFields();};
    enabled.onchange=()=>{entry.dirty=true;entry.source.hairAnimation.enabled=enabled.checked;rebuild();};
    function stampMask(e){
      const im=sourceImage();if(!im)return;const box=paint.getBoundingClientRect(),point={x:Math.floor((e.clientX-box.left)/box.width*paint.width),y:Math.floor((e.clientY-box.top)/box.height*paint.height)},v=settings(true),maps=paintMode==='protect'?(v.protectedMasks??={}):v.masks;
      let mask=maps[direction.value];if(!mask||mask.width!==im.width||mask.height!==im.height){const next={width:im.width,height:im.height,data:Array(im.width*im.height).fill(!mask&&paintMode==='move'&&erasing?1:0)};if(mask)for(let y=0;y<Math.min(mask.height,next.height);y++)for(let x=0;x<Math.min(mask.width,next.width);x++)next.data[y*next.width+x]=mask.data[y*mask.width+x];mask=maps[direction.value]=next;}
      const from=previous||point,steps=Math.max(1,Math.abs(point.x-from.x),Math.abs(point.y-from.y)),radius=Math.max(1,Math.min(8,Number($('[data-radius]').value)||1));
      for(let step=0;step<=steps;step++){const cx=Math.round(from.x+(point.x-from.x)*step/steps),cy=Math.round(from.y+(point.y-from.y)*step/steps);for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){const X=cx+x,Y=cy+y;if(x*x+y*y<=radius*radius&&X>=0&&Y>=0&&X<mask.width&&Y<mask.height)mask.data[Y*mask.width+X]=erasing?0:1;}}
      previous=point;rebuild();
    }
    paint.onpointerdown=e=>{if(e.button!==0)return;painting=true;previous=null;paint.setPointerCapture(e.pointerId);stampMask(e);};paint.onpointermove=e=>{if(painting)stampMask(e);};paint.onpointerup=paint.onpointercancel=()=>{painting=false;previous=null;};
    function chooseBrush(mode){paintMode=mode;erasing=false;$('[data-move]').setAttribute('aria-pressed',String(mode==='move'));$('[data-protect]').setAttribute('aria-pressed',String(mode==='protect'));$('[data-erase]').setAttribute('aria-pressed','false');paint.setAttribute('aria-label',mode==='protect'?'涂抹头发保护区域':'涂抹头发可动区域');}
    $('[data-move]').onclick=()=>chooseBrush('move');$('[data-protect]').onclick=()=>chooseBrush('protect');$('[data-erase]').onclick=()=>{erasing=!erasing;$('[data-erase]').setAttribute('aria-pressed',String(erasing));};
    $('[data-clear]').onclick=()=>{const v=settings(true);delete v.masks[direction.value];if(v.protectedMasks)delete v.protectedMasks[direction.value];rebuild();};$('[data-clear-protection]').onclick=()=>{const v=settings(true);if(v.protectedMasks)delete v.protectedMasks[direction.value];rebuild();};
    $('[data-play]').onclick=()=>{playing=!playing;start=null;$('[data-play]').textContent=playing?'暂停':'播放';};
    function tick(now){
      if(!dialog.open)return;
      if(result){const work=entry.work,si=Number(action.value),sheet=work.spriteSheets[si],ai=sheet.actions.findIndex(a=>a.direction===direction.value),a=sheet.actions[ai];if(a){
        const durations=a.frames.map(f=>sheet.useFrameDurations!==false&&f.duration>0?f.duration:1000/(sheet.fps||8)),total=durations.reduce((n,v)=>n+v,0);if(start===null)start=now-durations.slice(0,frame).reduce((n,v)=>n+v,0);
        if(playing){let t=(now-start)%total;frame=0;while(frame<durations.length-1&&t>=durations[frame])t-=durations[frame++];}
        const f=a.frames[frame],key=work.getFrameKey(si,ai,frame);preview.width=f.width;preview.height=f.height;const ctx=preview.getContext('2d');
        for(const l of H.previewLayers(work,si,ai,entry.source.hairAnimation.id)){const replacement=result.edits.find(e=>e.layer===l&&e.key===key),im=replacement?.image||l.getFrameData(key);if(im){ctx.globalAlpha=l.opacity??1;PE.utils.drawImageData(ctx,im);}}
        $('[data-frame]').textContent=`第 ${frame+1}/${a.frames.length} 帧`;
      }}request=requestAnimationFrame(tick);
    }
    $('[data-cancel]').onclick=()=>dialog.close();
    $('[data-apply]').onclick=()=>{try{
      if(app.project!==p)throw Error('工程已变化，请重新打开，未覆盖');
      const changed=[...entries.values()].filter(e=>e.dirty);
      for(const e of changed)if(!p.layers.includes(e.original)||JSON.stringify(e.original.hairAnimation||null)!==e.stamp)throw Error('头发设置已变化，请重新打开，未覆盖');
      if(changed.length)H.transaction(app,'设置头发分方向飘动',()=>{
        const sources=changed.map(e=>{const source=H.setup(p,e.original),next=JSON.parse(JSON.stringify(e.source.hairAnimation));next.id=source.hairAnimation.id;source.hairAnimation=next;return source;});
        H.validate(p);for(const source of sources)H.applyPlan(H.plan(p,source));
      });
      say(`已应用 ${changed.length} 个头发部件的独立方向设置；Ctrl+S 保存。`);dialog.close();
    }catch(e){note.textContent=e.message;}};
    dialog.onclose=()=>{cancelAnimationFrame(request);dialog.remove();};document.body.append(dialog);
    const selected=current();hair.value=String(p.layers.indexOf(candidates.includes(selected)?selected:candidates.find(l=>l.visible)||candidates[0]));
    chooseHair();dialog.showModal();request=requestAnimationFrame(tick);
  }
});
