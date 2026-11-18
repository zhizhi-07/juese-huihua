/* Directional masters follow head offsets; advanced sway remains opt-in. */
window.PE = window.PE || {};
(() => {
  'use strict';
  const actions = {idle:'待机', walk:'行走', pickup:'拾取', sit:'坐姿', sleep:'睡觉'};
  const extraActions = ['浇水','镐','斧头','锄头','镰刀','种植','钓鱼-甩竿','钓鱼-持竿','钓鱼-收线','钓鱼-上鱼'];
  const directions = {down:'正面', side:'侧面', up:'背面'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const cache = new WeakMap();
  const headAnchors = new WeakMap();
  function samePixels(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
  const supported = (sheet, part) => (Object.hasOwn(actions, sheet?.name?.replace(/^original(?:16|32)_/, '')) || part!=='eyes'&&extraActions.includes(sheet?.name)) && PE.isCharacterSheet(sheet);
  const isIdle = sheet => /^original(?:16|32)_idle$/.test(sheet?.name || '');
  const active = (sheet, part) => supported(sheet,part) && PE.isEditorSheet(sheet);
  const isEyes = layer => PE.classifyPart(layer?.name)?.slot === '眼睛';
  const isSideSit = (sheet, direction) => /^original(?:16|32)_sit$/.test(sheet) && direction==='side';
  const usesSitEyeY = (part, sheet, direction) => part==='eyes' && isSideSit(sheet,direction);
  const partName = layer => isEyes(layer) ? '眼睛' : '头发';
  const address = (sheet, direction, fi) => `${sheet.name}/${direction}/${fi}`;
  const params = sheet => ({ampV:0, ampH:sheet?.name?.startsWith('original16_')?1:2, cycles:1, lag:0.6, verticalMode:'wave', masks:{}, protectedMasks:{}, trajAmp:0.1, trajectories:{}, stitch:{}});
  const isPoint = p => Array.isArray(p) && p.length===2 && p.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=4096);
  // Build an arc-length sampler for a drawn trajectory: returns the offset from
  // the first point at parameter s in [0,1].
  function trajectorySampler(points) {
    const pts = points.filter(isPoint).map(([x,y])=>({x,y}));
    if (pts.length < 2) return null;
    const segs = []; let total = 0;
    for (let i=1;i<pts.length;i++){const d=Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y); segs.push(d); total+=d;}
    if (total < 0.0001) return null;
    return s => {
      const target = Math.max(0,Math.min(1,s))*total; let acc=0;
      for (let i=0;i<segs.length;i++){
        if (acc+segs[i]>=target || i===segs.length-1){
          const u = segs[i] ? (target-acc)/segs[i] : 0;
          const a=pts[i], b=pts[i+1];
          return {x:(a.x+(b.x-a.x)*u)-pts[0].x, y:(a.y+(b.y-a.y)*u)-pts[0].y};
        }
        acc+=segs[i];
      }
      const last=pts[pts.length-1];
      return {x:last.x-pts[0].x, y:last.y-pts[0].y};
    };
  }
  const settingKey = (sheet, direction) => `${sheet}/${direction}`;
  const settingsFor = (g, sheet, direction) => g.directionOverrides?.[settingKey(sheet,direction)] || g.overrides[sheet] || g.params;
  function editSettings(g, sheet, direction, scope, sheets) {
    if(scope==='all'){g.overrides={};g.directionOverrides={};return g.params;}
    if(!['current','direction'].includes(scope))throw Error('调节范围无效');
    const key=settingKey(sheet,direction);g.directionOverrides??={};
    if(scope==='current')return g.directionOverrides[key]=clone(settingsFor(g,sheet,direction));
    const value=clone(settingsFor(g,sheet,direction));
    for(const s of sheets)if(active(s)&&s.actions.some(a=>a.direction===direction))g.directionOverrides[settingKey(s.name,direction)]=value;
    return value;
  }
  function previewLayers(p, si, ai, id) {
    return PE.getRenderLayers(p,si,ai).filter(l=>!l.isGroup&&
      (PE.classifyPart(l.name)?.category==='头发'||l.hairAnimationId
        ? l.hairAnimationId===id : PE.isLayerVisible(p,l,si)));
  }
  function editable(layer) {
    if (!layer || layer.isGroup || layer.locked || layer.inheritedBase || PE.isHandLayer(layer)) throw Error('请选择未锁定的头发或眼睛图层');
    if (PE.classifyPart(layer.name)?.category !== '头发' && !isEyes(layer)) throw Error('此功能只处理选中的头发或眼睛部件');
  }
  function master(p, layer = p.getCurrentLayer()) {
    if (layer?.hairAnimation) return layer;
    return layer?.hairAnimationId ? p.layers.find(l => l.hairAnimation?.id === layer.hairAnimationId) : null;
  }
  function headAnchor(p, si, ai, fi, candidates=p.layers) {
    const key = p.getFrameKey(si, ai, fi), frame = p.spriteSheets[si].actions[ai].frames[fi];
    const heads = candidates.filter(l => (l.sheetIndex===undefined||l.sheetIndex===si) && /^(head|头部)$/.test(l.name) && !l.isGroup && PE.isLayerInAction(p,l,si,ai) && l.getFrameData(key));
    if (heads.length !== 1) throw Error(`无法唯一确定头部：${p.spriteSheets[si].name} ${ai+1}/${fi+1}`);
    const image=heads[0].getFrameData(key),stamp=JSON.stringify([frame.width,frame.height,image.width,image.height,image.placement||null]),cached=headAnchors.get(image);
    // Drawing edits ImageData in place, so reference equality alone would miss head changes.
    if(cached?.stamp===stamp&&samePixels(image.data,cached.pixels))return {...cached.anchor};
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
    headAnchors.set(image,{stamp,pixels:new Uint8ClampedArray(image.data),anchor:{...best}});
    return best;
  }
  function calibrate(p, source) {
    const si=source.sheetIndex, idle=p.spriteSheets[si], result={};
    const heads=p.layers.filter(l=>/^(head|头部)$/.test(l.name)&&!l.isGroup);
    for(const [ai,a] of idle.actions.entries()) {
      const origin=headAnchor(p,si,ai,0,heads);
      for(const [ti,s] of p.spriteSheets.entries())if(active(s,isEyes(source)?'eyes':undefined)) {
        const ta=s.actions.findIndex(b=>b.direction===a.direction);if(ta<0)continue;
        s.actions[ta].frames.forEach((_,fi)=>{
          const at=headAnchor(p,ti,ta,fi,heads);
          result[address(s,a.direction,fi)]={x:Math.round(at.x-origin.x),y:at.y-origin.y};
        });
      }
    }
    return result;
  }
  function offsetsFor(p, source, g=source.hairAnimation, current=null) {
    current??=calibrate(p,source);const result={};
    for(const [key,at] of Object.entries(current)) {
      // Legacy recipes have no separate calibration: replace stale automatic offsets.
      const base=g.headOffsets?.[key],saved=g.offsets[key];
      result[key]={x:at.x+(base&&saved?saved.x-base.x:0),y:at.y+(base&&saved?saved.y-base.y:0)};
    }
    return result;
  }
  function setup(p, layer=p.getCurrentLayer()) {
    const known=master(p,layer);if(known)return known;
    editable(layer);
    if(!isIdle(p.spriteSheets[layer.sheetIndex]))throw Error('首次关联请在待机中选择头发或眼睛；各方向第一帧作为基准');
    if(layer.parent!=null)throw Error('请先把此部件作为独立部件层；不自动合并方向分组');
    const part=isEyes(layer)?'eyes':undefined;
    const matches=p.layers.filter(l=>l!==layer&&!l.isGroup&&l.name===layer.name&&active(p.spriteSheets[l.sheetIndex],part));
    if(matches.some(l=>l.parent!=null||l.hairAnimationId)||new Set(matches.map(l=>l.sheetIndex)).size!==matches.length)throw Error('其他动作存在重复或已关联同名层，请先明确部件名称');
    matches.forEach(editable);
    const offsets=calibrate(p,layer),id=crypto.randomUUID();
    layer.hairAnimation={version:1,id,live:false,enabled:false,params:params(p.spriteSheets[layer.sheetIndex]),overrides:{},offsets};
    // Keep the existing serialized recipe key so both parts use the same save/undo path.
    if(isEyes(layer)){layer.hairAnimation.part='eyes';layer.hairAnimation.preserved=preservedEyes(p,layer,matches,offsets);}
    layer.hairAnimation.headOffsets=clone(offsets);
    layer.hairAnimationId=id;
    for(const [si,s]of p.spriteSheets.entries())if(active(s,part)&&si!==layer.sheetIndex) {
      let target=matches.find(l=>l.sheetIndex===si);
      if(!target){target=new PE.Layer(layer.name);target.sheetIndex=si;target.visible=layer.visible;target.opacity=layer.opacity;p.layers.push(target);PE.autoPlaceLayer(p,p.layers.indexOf(target),{rename:false});}
      target.hairAnimationId=id;
    }
    return layer;
  }
  function preservedEyes(p,source,matches,offsets) {
    const signature=(im,offset)=>{
      if(!im)return null;
      const r=im.placement||{x:0,y:0,w:im.width,h:im.height};
      // 高清层只整块平移、不重采样，所以按“源像素指纹 + 相对偏移后的放置位置”比对：
      // 由同步生成的帧指纹和基准一致，会被继续更新；自己画过的原画指纹不同，保留。
      if(r.w!==im.width||r.h!==im.height||!Number.isInteger(r.x)||!Number.isInteger(r.y)) {
        let hash=2166136261;for(let i=0;i<im.data.length;i++)hash=Math.imul(hash^im.data[i],16777619)>>>0;
        return `hd:${hash}:${im.width}x${im.height}:${r.w}x${r.h}@${r.x-offset.x},${r.y-offset.y}`;
      }
      const pixels=[];
      for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3])pixels.push([x+r.x-offset.x,y+r.y-offset.y,...im.data.slice(i,i+4)].join(','));}
      return pixels.join(';');
    };
    const idle=p.spriteSheets[source.sheetIndex],preserved=[];
    for(const layer of [source,...matches]){
      const s=p.spriteSheets[layer.sheetIndex];
      for(const [ai,a]of s.actions.entries()){
        const baseAI=idle.actions.findIndex(b=>b.direction===a.direction);if(baseAI<0)continue;
        const base=signature(source.getFrameData(p.getFrameKey(source.sheetIndex,baseAI,0)),{x:0,y:0});
        for(let fi=0;fi<a.frames.length;fi++){
          if(layer===source&&fi===0)continue;
          const key=address(s,a.direction,fi),im=layer.getFrameData(p.getFrameKey(layer.sheetIndex,ai,fi));
          // Preserve existing expressions conservatively; users can opt each cel back in.
          if(im&&signature(im,offsets[key])!==base)preserved.push(key);
        }
      }
    }
    return preserved;
  }
  function validate(p) {
    const ids=new Set();
    const directionKeys=new Set(p.spriteSheets.filter(supported).flatMap(s=>s.actions.map(a=>settingKey(s.name,a.direction))));
    for(const l of p.layers) {
      if(l.hairAnimationId!==undefined&&(typeof l.hairAnimationId!=='string'||l.hairAnimationId.length>80))throw Error('头发关联编号无效');
      const g=l.hairAnimation;if(!g)continue;
      if(g.version!==1||typeof g.id!=='string'||g.id.length>80||!g.id||ids.has(g.id)||l.hairAnimationId!==g.id||!isIdle(p.spriteSheets[l.sheetIndex])||typeof g.live!=='boolean'||typeof g.enabled!=='boolean')throw Error('头发联动设置无效');
      ids.add(g.id);
      if(l.isGroup||l.inheritedBase||PE.isHandLayer(l)||(g.part==='eyes'?!isEyes(l):PE.classifyPart(l.name)?.category!=='头发'))throw Error('同步基准层身份无效');
      if(g.part!==undefined&&g.part!=='eyes')throw Error('同步部件类型无效');
      if(g.part==='eyes'&&(g.enabled||!Array.isArray(g.preserved)||g.preserved.length>4096||g.preserved.some(k=>typeof k!=='string'||!Object.hasOwn(g.offsets||{},k)||/original(?:16|32)_idle\/[^/]+\/0$/.test(k))))throw Error('眼睛保留帧设置无效');
      if(!g.offsets||Array.isArray(g.offsets)||Object.keys(g.offsets).length>4096||!g.overrides||Array.isArray(g.overrides)||Object.keys(g.overrides).length>p.spriteSheets.length)throw Error('头发偏移/动作设置无效');
      if(g.headOffsets!==undefined&&(!g.headOffsets||typeof g.headOffsets!=='object'||Array.isArray(g.headOffsets)||Object.keys(g.headOffsets).length>4096))throw Error('头发头部标定无效');
      for(const map of [g.offsets,g.headOffsets||{}])for(const offset of Object.values(map))if(!offset||![offset.x,offset.y].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=4096))throw Error('头发偏移必须是有效整数');
      for(const a of p.spriteSheets[l.sheetIndex].actions){const o=g.offsets[address(p.spriteSheets[l.sheetIndex],a.direction,0)];if(!o||o.x!==0||o.y!==0)throw Error('各方向待机第一帧是基准，偏移必须为 0');}
      const perDirection=g.directionOverrides??{};
      if(!perDirection||typeof perDirection!=='object'||Array.isArray(perDirection)||Object.keys(perDirection).length>directionKeys.size||Object.keys(perDirection).some(k=>!directionKeys.has(k)))throw Error('头发分方向设置无效');
      for(const v of [g.params,...Object.values(g.overrides),...Object.values(perDirection)]) {
        if(!v||![v.ampV,v.ampH,v.cycles,v.lag].every(Number.isFinite)||v.ampV<0||v.ampV>4||v.ampH<0||v.ampH>6||!Number.isInteger(v.cycles)||v.cycles<1||v.cycles>4||v.lag<0||v.lag>1.5||!v.masks||Object.keys(v.masks).length>4)throw Error('头发飘动参数无效');
        if(v.verticalMode!==undefined&&v.verticalMode!=='wave')throw Error('头发上下算法无效');
        if(v.followHead!==undefined&&typeof v.followHead!=='boolean')throw Error('头发跟随设置无效');
        if(v.nativeTips!==undefined&&typeof v.nativeTips!=='boolean')throw Error('头发发梢设置无效');
        for(const maps of [v.masks,v.protectedMasks??{}]) {
          if(!maps||typeof maps!=='object'||Array.isArray(maps)||Object.keys(maps).length>4)throw Error('头发涂抹区域无效');
          for(const m of Object.values(maps))if(m&&(!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||m.width*m.height>262144||!Array.isArray(m.data)||m.data.length!==m.width*m.height||m.data.some(v=>v!==0&&v!==1)))throw Error('头发涂抹区域无效');
        }
        if(v.trajAmp!==undefined&&!(Number.isFinite(v.trajAmp)&&v.trajAmp>=0&&v.trajAmp<=2))throw Error('头发轨迹幅度无效');
        if(v.stitch!==undefined) {
          const st=v.stitch;
          if(!st||typeof st!=='object'||Array.isArray(st)||Object.keys(st).length>6)throw Error('头发补全区无效');
          for(const m of Object.values(st))if(m&&(!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||m.width*m.height>262144||!Array.isArray(m.data)||m.data.length!==m.width*m.height||m.data.some(v=>v!==0&&v!==1)))throw Error('头发补全区无效');
        }
        if(v.trajectories!==undefined) {
          const t=v.trajectories;
          if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).length>6)throw Error('头发轨迹无效');
          for(const [dir,pts] of Object.entries(t)) {
            if(typeof dir!=='string'||dir.length>16||!Array.isArray(pts)||pts.length>3000||!pts.every(isPoint))throw Error('头发轨迹无效');
          }
        }
      }
    }
    for(const l of p.layers)if(l.hairAnimationId&&!ids.has(l.hairAnimationId))throw Error('头发关联缺少基准层');
    for(const l of p.layers)if(l.hairAnimationId){const source=master(p,l);if(isEyes(l)!==(source.hairAnimation.part==='eyes'))throw Error('同步关联部件类型不一致');}
  }
  // Manual stitch: the user paints a "补全区" over the spot where scalp shows through.
  // Those transparent pixels are pre-filled with the nearest hair colour taken from the
  // source pixels, so the area stays covered and then sways together with the hair.
  function stitchSource(src, mask) {
    if(!mask||!src)return src;
    const w=src.width,h=src.height,d=new Uint8ClampedArray(src.data);
    const opaque=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&d[(y*w+x)*4+3]>0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      if(!mask.data[y*mask.width+x])continue;
      if(opaque(x,y))continue;
      let sx=-1,sy=-1;
      // Prefer pulling the colour from above (the hair above the gap) so the patch
      // reads as a continuation of the strand instead of a random neighbour.
      for(let k=1;k<=8&&sy<0;k++)if(opaque(x,y-k)){sx=x;sy=y-k;}
      for(let k=1;k<=8&&sx<0;k++)if(opaque(x-k,y)){sx=x-k;sy=y;}
      for(let k=1;k<=8&&sx<0;k++)if(opaque(x+k,y)){sx=x+k;sy=y;}
      for(let k=1;k<=8&&sx<0;k++)if(opaque(x,y+k)){sx=x;sy=y+k;}
      if(sx<0)continue;
      const si=(sy*w+sx)*4,di=(y*w+x)*4;
      d[di]=d[si];d[di+1]=d[si+1];d[di+2]=d[si+2];d[di+3]=d[si+3];
    }
    return {width:w,height:h,data:d,placement:src.placement};
  }
  function translatePlaced(src, frame, offset) {
    const r=src.placement,out=PE.utils.cloneImageData(src);
    out.placement.x+=offset.x;out.placement.y+=offset.y;
    const {x,y}=out.placement;
    const inside=Math.max(0,Math.min(frame.width,x+r.w)-Math.max(0,x))*Math.max(0,Math.min(frame.height,y+r.h)-Math.max(0,y));
    return {image:out,clipped:Math.round(Math.max(0,r.w*r.h-inside))};
  }
  function deform(src, frame, offset, phase, settings, mask, enabled, protectedMask=null, trajectory=null, stitchMask=null, followOffset=null) {
    const base=src;
    const stitched=stitchMask?stitchSource(src,stitchMask):null;
    const useSrc=stitched||src;
    const r=useSrc?.placement||{x:0,y:0,w:useSrc?.width||1,h:useSrc?.height||1};
    if(!useSrc)return {image:new ImageData(frame.width,frame.height),clipped:0};
    // 高清（放置范围 ≠ 源尺寸）永不重采样：只把整块放置范围按偏移平移。
    if(r.w!==useSrc.width||r.h!==useSrc.height) {
      if(enabled||trajectory||stitchMask||followOffset!==null)throw Error('高清底图只能整块跟随头部，不支持飘动、轨迹或补全；需要飘动请改用原生像素图层');
      return translatePlaced(useSrc,frame,offset);
    }
    if(!Number.isInteger(r.x)||!Number.isInteger(r.y))throw Error('请先把图层吸附到整数像素格；自由小数坐标的图层不能同步');
    if(useSrc.width*useSrc.height>262144)throw Error('头发飘动支持最多 512×512 源像素；原图未修改');
    let top=useSrc.height,bottom=-1;
    const painted=(m,x,y)=>x<m.width&&y<m.height&&m.data[y*m.width+x];
    const movable=(x,y)=>!mask||painted(mask,x,y);
    const selected=(x,y)=>movable(x,y)&&(!protectedMask||!painted(protectedMask,x,y));
    for(let y=0;y<useSrc.height;y++)for(let x=0;x<useSrc.width;x++)if(useSrc.data[(y*useSrc.width+x)*4+3]&&movable(x,y)){top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const span=Math.max(1,bottom-top),points=new Map(),fixed=new Set(),previous=[];let clipped=0;
    const path=trajectory?trajectorySampler(trajectory):null;
    const trajAmp=Number.isFinite(settings.trajAmp)?settings.trajAmp:0.1;
    function put(X,Y,i,moving) {
      const key=X+','+Y;
      if(X<0||X>=frame.width||Y<0||Y>=frame.height)clipped++;
      if(moving&&fixed.has(key))return;
      points.set(key,{x:X,y:Y,i});if(!moving)fixed.add(key);
    }
    for(let pass=0;pass<2;pass++)for(let y=0;y<useSrc.height;y++)for(let x=0;x<useSrc.width;x++) {
      const i=(y*useSrc.width+x)*4;if(!useSrc.data[i+3])continue;
      const weight=enabled&&selected(x,y)?1:0,depth=Math.max(0,Math.min(1,(y-top)/span));
      if((weight===0?0:1)!==pass)continue;
      let dx,dy;
      if(!path&&followOffset!==null) {
        dx=0;dy=-Math.round(followOffset*weight*depth*depth);
      } else if(path) {
        // Trajectory brush: hair travels out along the drawn path and back each cycle.
        // Baseline-normalised so the cycle starts exactly at the path origin (no first-frame jump);
        // roots stay anchored (×depth) and tips lag (lag×depth).
        const shift=settings.lag*depth;
        const s=Math.max(0,Math.min(1,(Math.cos(shift)-Math.cos(settings.cycles*phase-shift))/2*trajAmp));
        const off=path(s);
        dx=Math.round(off.x*weight*depth);
        dy=Math.round(off.y*weight*depth);
      } else {
        // Match the approved demo: horizontal sway grows from roots to tips.
        const wave=Math.sin(settings.cycles*phase-settings.lag*depth)-Math.sin(-settings.lag*depth);
        dx=Math.round(settings.ampH*weight*depth*wave);
        // Missing mode retains old saved motion; explicit vertical edits use the delayed local wave.
        dy=-Math.round(settings.ampV*weight*(settings.verticalMode==='wave'?wave:(.5-.5*Math.cos(2*phase))));
      }
      const X=x+r.x+offset.x+dx,Y=y+r.y+offset.y+dy;
      if(pass&&(path||settings.verticalMode==='wave'||followOffset!==null)) {
        const prev=previous[x];
        // Stretch adjacent pixels with nearest colours, never bridge transparent or protected gaps.
        if(prev&&prev.y===y-1&&Y>prev.Y+1)for(let yy=prev.Y+1;yy<Y;yy++) {
          const t=(yy-prev.Y)/(Y-prev.Y);put(Math.round(prev.X+(X-prev.X)*t),yy,t<.5?prev.i:i,true);
        }
        previous[x]={y,X,Y,i};
      }
      put(X,Y,i,pass);
    }
    const values=[...points.values()];
    let left=0,topOut=0,right=frame.width-1,bottomOut=frame.height-1;
    for(const v of values){left=Math.min(left,v.x);topOut=Math.min(topOut,v.y);right=Math.max(right,v.x);bottomOut=Math.max(bottomOut,v.y);}
    const w=right-left+1,h=bottomOut-topOut+1;
    if(w>4096||h>4096||w*h>262144)throw Error('生成范围过大，请减小偏移或头发画布');
    const out=new ImageData(w,h);
    for(const v of values)out.data.set(useSrc.data.subarray(v.i,v.i+4),((v.y-topOut)*w+v.x-left)*4);
    // Keep out-of-frame source pixels rather than silently cutting them off.
    if(left||topOut||w!==frame.width||h!==frame.height)out.placement={x:left,y:topOut,w,h};
    return {image:out,clipped};
  }
  function plan(p,source,g=source.hairAnimation,only=null,heads=null) {
    const idle=p.spriteSheets[source.sheetIndex],edits=[],missing=new Set(),offsets=offsetsFor(p,source,g,heads);let clipped=0;
    for(const layer of p.layers.filter(l=>l.hairAnimationId===g.id)) {
      const si=layer.sheetIndex,s=p.spriteSheets[si];if(!supported(s,g.part))throw Error('关联层动作不存在');
      if(!active(s,g.part))continue;
      editable(layer);
      for(const [ai,a]of s.actions.entries()) {
        if(g.part==='eyes'&&!PE.isLayerInAction(p,layer,si,ai))continue;
        const baseAI=idle.actions.findIndex(b=>b.direction===a.direction);if(baseAI<0)continue;
        const src=source.getFrameData(p.getFrameKey(source.sheetIndex,baseAI,0));
        // 每个方向都以本方向待机首帧为基准；没有基准就不动这个方向（不会擦掉已有眼睛）。
        if(!src){missing.add(`${actions[s.name.slice(11)]||s.name}·${directions[a.direction]||a.direction}`);continue;}
        const settings=settingsFor(g,s.name,a.direction);
        const rigid=g.part!=='eyes'&&(!g.enabled||settings.nativeTips===true);
        const mask=settings.masks[a.direction];
        const durations=a.frames.map(f=>s.useFrameDurations!==false&&Number.isFinite(f.duration)&&f.duration>0?f.duration:1000/(s.fps||8));
        const total=durations.reduce((n,v)=>n+v,0);let elapsed=0, idleHeadY;
        for(const [fi,frame]of a.frames.entries()) {
          const phase=2*Math.PI*elapsed/total;elapsed+=durations[fi];
          if(only&&!only.has(p.getFrameKey(si,ai,fi)))continue;
          if(layer===source&&fi===0)continue;
          if(g.part==='eyes'&&g.preserved.includes(address(s,a.direction,fi)))continue;
          if(frame.locked||frame.lockedRegions?.length)throw Error(`${actions[s.name.slice(11)]||s.name} 第${fi+1}帧有保护区域，同步未写入`);
          let offset=offsets[address(s,a.direction,fi)];if(!offset)throw Error('帧结构已变化，请先重新标定偏移');
          if(usesSitEyeY(g.part,s.name,a.direction)){
            idleHeadY??=headAnchor(p,source.sheetIndex,baseAI,0).y;
            offset={x:offset.x,y:headAnchor(p,si,ai,fi).y-idleHeadY};
          }
          let followOffset=null;
          if(!rigid&&g.enabled&&g.part!=='eyes'&&settings.followHead){
            // shortcut: one-frame lag ignores uneven frame timing; use time-based dynamics if required.
            const prev=fi?offsets[address(s,a.direction,fi-1)]:offset;
            const earlier=fi>1?offsets[address(s,a.direction,fi-2)]:prev;
            if(!prev||!earlier)throw Error('帧结构已变化，请先重新标定偏移');
            followOffset=Math.max(-2,Math.min(2,offset.y-prev.y+(prev.y-earlier.y)*.5));
          }
          const result=g.part==='eyes'&&src?.placement
            ?translatePlaced(src,frame,offset)
            :deform(src,frame,offset,phase,settings,mask,g.part==='eyes'||rigid?false:g.enabled,settings.protectedMasks?.[a.direction],g.part==='eyes'||rigid?null:settings.trajectories?.[a.direction],g.part==='eyes'||rigid?null:settings.stitch?.[a.direction],followOffset);
          clipped+=result.clipped;
          edits.push({layer,key:p.getFrameKey(si,ai,fi),image:result.image});
        }
      }
    }
    return {edits,clipped,missing:[...missing]};
  }
  function applyPlan(result) {for(const e of result.edits)e.layer.frameData.set(e.key,e.image);return result;}
  function fingerprint(p,source,heads) {
    let h=2166136261;const add=v=>{h=Math.imul(h^v,16777619)>>>0;};
    const si=source.sheetIndex;
    for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++) {
      const im=source.getFrameData(p.getFrameKey(si,ai,0));if(!im){add(0);continue;}
      add(im.width);add(im.height);for(const v of im.data)add(v);
      for(const c of JSON.stringify(im.placement||null))add(c.charCodeAt(0));
    }
    if(heads)for(const c of JSON.stringify(heads))add(c.charCodeAt(0));
    return h+':'+JSON.stringify(source.hairAnimation)+':'+p.layers.filter(l=>l.hairAnimationId===source.hairAnimation.id).map(l=>[p.layers.indexOf(l),l.sheetIndex,l.locked]).join(';')+':'+p.spriteSheets.filter(supported).map(s=>s.actions.map(a=>a.frames.map(f=>[f.width,f.height,f.duration,f.locked,JSON.stringify(f.lockedRegions)]))).join(';');
  }
  function refresh(p,force=false) {
    const pending=[],headsBySheet=new Map();
    for(const source of p.layers.filter(l=>l.hairAnimation)) {
      const g=source.hairAnimation;if(!force&&(!g.live||source.visible===false))continue;
      let heads=null;
      const headKey=source.sheetIndex+':'+(g.part||'hair');
      if(!headsBySheet.has(headKey))headsBySheet.set(headKey,calibrate(p,source));
      heads=headsBySheet.get(headKey);
      const stamp=fingerprint(p,source,heads);if(!force&&cache.get(source)===stamp)continue;
      pending.push({source,stamp,result:plan(p,source,g,null,heads)});
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
    return transaction(app,'同步'+partName(app.project.getCurrentLayer())+'（保留部件设置）',()=>{
      const p=app.project,selected=p.getCurrentLayer(),source=setup(p);if(live!==undefined)source.hairAnimation.live=!!live;
      if(source.hairAnimation.part==='eyes'){
        for(const layer of p.layers.filter(l=>l.hairAnimationId===source.hairAnimation.id))PE.autoPlaceLayer(p,p.layers.indexOf(layer),{rename:false});
        p.currentLayerIndex=p.layers.indexOf(selected);
      }
      return applyPlan(plan(app.project,source));
    });
  }
  function install(app,onStatus=()=>{},onView=()=>{}) {
    const oldRender=app.canvasManager.render.bind(app.canvasManager);
    app.canvasManager.render=function(...args){
      try{const changed=refresh(app.project);if(changed.length){app.animationPlayer._previewCache=null;app.persistence?.markDirty();const miss=[...new Set(changed.flatMap(v=>v.result.missing||[]))];onStatus((changed.reduce((n,v)=>n+v.result.clipped,0)?'部件已更新；有像素超出画布，原像素仍保留，可在偏移标记中调整。':'部件已实时同步；首帧与眼睛保留帧不变。')+(miss.length?`${miss.join('、')} 还没有待机首帧基准，先在这些方向画一次。`:''));}}
      catch(e){onStatus('部件同步暂停：'+e.message);}
      onView();return oldRender(...args);
    };
    const oldChange=app.history.onChange;
    app.history.onChange=()=>{oldChange?.();app.canvasManager.render();};
    const down=app.toolManager.onMouseDown.bind(app.toolManager);
    app.toolManager.onMouseDown=function(...args){
      const p=app.project,l=p.getCurrentLayer(),source=master(p,l),g=source?.hairAnimation;
      const preserved=g?.part==='eyes'&&g.preserved.includes(address(p.getCurrentSheet(),p.getCurrentAction().direction,p.currentFrameIndex));
      if(g&&(g.live||g.enabled)&&!preserved&&(l!==source||p.currentFrameIndex!==0)&&!['eyedropper','select','wand'].includes(this.currentTool)) {onStatus('这是自动生成帧。请点击「编辑基准」修改本方向待机首帧；眼睛保留帧可独立绘制，其他帧需先关闭实时同步和飘动。');return;}
      return down(...args);
    };
  }
  PE.HairAnimation={actions,directions,isIdle,master,setup,validate,calibrate,offsetsFor,plan,usesSitEyeY,applyPlan,refresh,transaction,sync,install,deform,params,address,settingsFor,editSettings,previewLayers};
})();

document.addEventListener('DOMContentLoaded',()=>{
  const H=PE.HairAnimation,app=PE.app,host=document.getElementById('copy-next-cel-btn');if(!host)return;
  const bar=document.createElement('span');bar.className='hair-animation-tools';
  bar.innerHTML='<label><input id="hair-live-sync" type="checkbox"><span data-sync-part>部件实时同步</span></label><button id="hair-sync-all" type="button" class="studio-button">同步全部</button><button id="hair-offsets" type="button" class="studio-button">偏移 / 保留帧…</button><button id="hair-sway" type="button" class="studio-button">飘动…</button><button id="hair-edit-master" type="button" class="studio-button">编辑基准</button>';
  host.after(bar);
  const status=document.createElement('span');status.className='hair-animation-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');bar.after(status);
  const say=text=>status.textContent=text,live=bar.querySelector('input');
  function run(fn){try{return fn();}catch(e){live.checked=!!current()?.hairAnimation.live;say(e.message);}}
  const current=()=>H.master(app.project);
  H.install(app,say,()=>{const g=current()?.hairAnimation,eyes=PE.classifyPart(app.project.getCurrentLayer()?.name)?.slot==='眼睛';live.checked=!!g?.live;bar.querySelector('[data-sync-part]').textContent=(eyes?'眼睛':'头发')+'实时同步';bar.querySelector('#hair-sway').hidden=eyes;const sheet=app.project.getCurrentSheet(),direction=app.project.getCurrentAction()?.direction;bar.querySelector('#hair-sway').classList.toggle('hair-effect-active',!!g?.enabled&&!H.settingsFor(g,sheet?.name,direction).nativeTips);});
  live.onchange=()=>run(()=>{if(live.checked)H.sync(app,{live:true});else H.transaction(app,'关闭实时同步',()=>{const s=current();if(s)s.hairAnimation.live=false;});say(live.checked?'实时同步已开启；在各方向待机首帧绘制。眼睛异于首帧的原画会保留，可在「偏移 / 保留帧」中调整。':'实时同步已关闭，现有部件设置保留；画好后点击同步全部。');});
  bar.querySelector('#hair-sync-all').onclick=()=>run(()=>{const r=H.sync(app),g=current()?.hairAnimation;say(`已同步 ${r.edits.length} 帧，可一次撤销。${g?.part==='eyes'?`保留 ${g.preserved.length} 帧原画（含眨眼等），可在「偏移 / 保留帧」调整。`:''}${r.missing?.length?`${r.missing.join('、')} 还没有待机首帧基准，先在这些方向画一次再同步。`:''}${r.clipped?'有像素超出画布，未删除原像素。':''}`);});
  bar.querySelector('#hair-edit-master').onclick=()=>run(()=>{const p=app.project,s=current();if(!s)throw Error('请先在待机选择头发或眼睛并同步');const dir=p.getCurrentAction().direction,ai=p.spriteSheets[s.sheetIndex].actions.findIndex(a=>a.direction===dir);if(ai<0)throw Error('没有这个方向的基准');app.selectFrame(s.sheetIndex,ai,0);p.currentLayerIndex=p.layers.indexOf(s);app.updateAll();app.canvasManager.render();say('正在编辑本方向待机第一帧；其他帧按标记位置生成。');});
  bar.querySelector('#hair-offsets').onclick=()=>run(()=>{
    const p=app.project,s=current();if(!s)throw Error('请先开启实时同步或点击同步全部');
    const dialog=document.createElement('dialog');dialog.className='advanced-dialog hair-offset-dialog';dialog.setAttribute('aria-label','部件偏移与保留帧');
    dialog.innerHTML='<h2>相对各方向待机首帧的偏移</h2><p>向右、向下为正数。重新标定只读取现有头部，不修改人物。眼睛勾选「保留原画」的帧不参与同步，可独立绘制；取消勾选会用本方向基准替换。侧面坐姿眼睛的 Y 跟随头部位移，不额外上移（俯视角度）；头发与眼睛均按当前头部自动跟随；表中手调量会保留，不额外抬高。旧版标定会按当前头部重算。</p><div class="hair-offset-table"></div><p data-note role="status"></p><div class="hair-dialog-actions"><button data-calibrate class="studio-button">按头部重新标定</button><button data-cancel class="studio-button">取消</button><button data-apply class="studio-button save-primary">确定</button></div>';
    const heads=H.calibrate(p,s);let offsets=cloneOffsets();const preserved=new Set(s.hairAnimation.preserved||[]),stamp=JSON.stringify(s.hairAnimation);function cloneOffsets(){return JSON.parse(JSON.stringify(H.offsetsFor(p,s)));}
    const list=dialog.querySelector('.hair-offset-table');
    function draw(){list.replaceChildren();for(const [key,v]of Object.entries(offsets)){const [sheet,dir,fi]=key.split('/');if(!PE.isEditorSheet({name:sheet}))continue;const row=document.createElement('div'),base=sheet===p.spriteSheets[s.sheetIndex].name&&fi==='0';row.textContent=`${H.actions[sheet.slice(11)]||sheet} · ${H.directions[dir]||dir} · 第${Number(fi)+1}帧 `;for(const axis of ['x','y']){if(axis==='y'&&H.usesSitEyeY(s.hairAnimation.part,sheet,dir)){row.append('Y：头部位移');continue;}const input=document.createElement('input');input.type='number';input.step='1';input.min='-4096';input.max='4096';input.value=v[axis];input.disabled=base;input.setAttribute('aria-label',`${H.actions[sheet.slice(11)]||sheet} ${H.directions[dir]||dir} 第${Number(fi)+1}帧 ${axis.toUpperCase()}`);input.oninput=()=>v[axis]=Number(input.value);row.append(axis.toUpperCase(),input);}if(s.hairAnimation.part==='eyes'&&!base){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=preserved.has(key);input.onchange=()=>input.checked?preserved.add(key):preserved.delete(key);label.append(input,'保留原画');row.append(label);}list.append(row);}}
    draw();dialog.querySelector('[data-calibrate]').onclick=()=>run(()=>{offsets=H.calibrate(p,s);draw();});
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-apply]').onclick=()=>{try{if(app.project!==p||!p.layers.includes(s)||JSON.stringify(s.hairAnimation)!==stamp||JSON.stringify(H.calibrate(p,s))!==JSON.stringify(heads))throw Error('工程、头部或部件设置已变化，请重新打开');H.transaction(app,'调整部件偏移与保留帧',()=>{s.hairAnimation.offsets=offsets;s.hairAnimation.headOffsets=heads;if(s.hairAnimation.part==='eyes')s.hairAnimation.preserved=[...preserved];H.validate(p);H.applyPlan(H.plan(p,s));});dialog.close();}catch(e){dialog.querySelector('[data-note]').textContent=e.message;}};
    dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
  });
  bar.querySelector('#hair-sway').onclick=()=>run(()=>openSway());
  function openSway(){
    const p=app.project,idleSI=p.spriteSheets.findIndex(H.isIdle);
    const candidates=p.layers.filter(l=>l.sheetIndex===idleSI&&!l.isGroup&&!l.locked&&!l.inheritedBase&&PE.classifyPart(l.name)?.category==='头发'&&(l.parent==null||l.hairAnimation));
    if(!candidates.length)throw Error('待机中没有可调节的独立头发部件，请先新建前发或后发');
    const entries=new Map();let entry,result=null,frame=0,playing=true,start=null,paintMode='move',erasing=false,painting=false,previous=null,request;
    const dialog=document.createElement('dialog');dialog.className='advanced-dialog hair-sway-dialog';dialog.setAttribute('aria-label','头发持续飘动');
    dialog.innerHTML=`<h2>头发飘动 · 分部件 / 分动作 / 分方向</h2><p>「应用范围」决定这套参数写进哪些动作：选「全部动作＋当前方向」时，正面会把待机、行走、拾取、坐姿一起设成同一套飘动（睡觉已不在编辑器动作里，不会写入）。只要动过下拉框或参数，确定时就会真正写入；切换头发时保留本次调节，取消不修改工程。</p>
      <div class="hair-sway-fields"><label>头发部件 <select data-hair aria-label="飘动头发部件"></select></label><label><input data-enabled type="checkbox">开启本部件飘动（总开关）</label></div>
      <div class="hair-sway-fields"><label>应用范围 <select data-scope aria-label="飘动调节范围"><option value="current">当前动作＋当前方向</option><option value="direction">全部动作＋当前方向</option><option value="all">全部动作＋全部方向（统一覆盖）</option></select></label><label>动作 <select data-action aria-label="飘动动作"></select></label><label>方向 <select data-direction aria-label="飘动方向"></select></label></div>
      <div class="hair-sway-grid"><section><h3>所选头发：可动 / 保护区域</h3><canvas data-paint aria-label="涂抹头发可动区域"></canvas><div><label>画笔半径 <input data-radius type="number" min="1" max="8" value="${p.spriteSheets[idleSI].name.startsWith('original16_')?1:3}" aria-label="飘动画笔半径"></label><button data-move class="studio-button" aria-pressed="true">可动画笔</button><button data-protect class="studio-button" aria-pressed="false">保护画笔</button><button data-traj class="studio-button" aria-pressed="false">轨迹画笔</button><button data-stitch class="studio-button" aria-pressed="false">补全画笔</button><button data-erase class="studio-button" aria-pressed="false">橡皮擦</button><button data-clear class="studio-button">全部可动</button><button data-clear-protection class="studio-button">清空保护</button><button data-clear-traj class="studio-button">清除轨迹</button><button data-clear-stitch class="studio-button">清除补全</button></div><p class="hair-mask-legend">蓝色：可动；红色：保护（优先）；橙色：轨迹；绿色：补全区。补全画笔涂在会露头皮的位置，那里会先补上头发颜色再一起飘动。不自动锁头顶。</p></section><section><h3>预览：只显示所选头发＋人物</h3><canvas data-preview aria-label="所选头发隔离动画预览"></canvas><div><button data-play class="studio-button">暂停</button><span data-frame></span></div></section></div>
      <div class="hair-sway-fields"><label><input data-follow type="checkbox">参考式轻微跟随头部</label><span>头部上下移动时发尾稍后跟上；头部不动时不额外飘。此模式不使用上下和左右波动参数，已绘制轨迹优先。</span></div><div class="hair-sway-fields" data-params></div><p data-note role="status"></p><div class="hair-dialog-actions"><button data-cancel class="studio-button">取消全部</button><button data-apply class="studio-button save-primary">确定</button></div>`;
    const $=sel=>dialog.querySelector(sel),hair=$('[data-hair]'),scope=$('[data-scope]'),action=$('[data-action]'),direction=$('[data-direction]'),enabled=$('[data-enabled]'),paint=$('[data-paint]'),preview=$('[data-preview]'),note=$('[data-note]');
    for(const l of candidates)hair.append(new Option(l.name,String(p.layers.indexOf(l))));
    const sheets=p.spriteSheets.map((s,i)=>({s,i})).filter(v=>PE.isEditorSheet(v.s)&&PE.isCharacterSheet(v.s)&&Object.hasOwn(H.actions,v.s.name.slice(11)));
    for(const {s,i}of sheets)action.append(new Option(H.actions[s.name.slice(11)]||s.name,String(i)));
    action.value=String(p.currentSheetIndex);if(!action.value)action.value=String(idleSI);
    const fields={};for(const [key,label,min,max,step]of [['ampV','上下起伏（强度）',0,4,.1],['ampH','左右轻摆',0,6,.1],['cycles','每循环摆动次数',1,4,1],['lag','发梢延迟',0,1.5,.1],['trajAmp','轨迹幅度',0,2,.05]]){
      const labelNode=document.createElement('label');labelNode.textContent=label+' ';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=String(step);input.setAttribute('aria-label',label);fields[key]=input;labelNode.append(input);$('[data-params]').append(labelNode);
      input.oninput=()=>{const v=settings(true);v[key]=input.value===''?NaN:Number(input.value);if(key==='ampV')v.verticalMode='wave';rebuild();};
    }
    function settings(write=false){
      const g=entry.source.hairAnimation,s=entry.work.spriteSheets[Number(action.value)];
      if(write){entry.dirty=true;entry.followOnly=null;entry.enabledOnly=false;const value=H.editSettings(g,s.name,direction.value,scope.value,entry.work.spriteSheets);delete value.nativeTips;return value;}
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
      const cur=settings();
      for(const [maps,color]of [[cur.masks,'rgba(50,180,240,.6)'],[cur.protectedMasks||{},'rgba(240,70,80,.7)']]){const mask=maps[direction.value];if(!mask)continue;ctx.fillStyle=color;for(let y=0;y<Math.min(h,mask.height);y++)for(let x=0;x<Math.min(w,mask.width);x++)if(mask.data[y*mask.width+x])ctx.fillRect(x,y,1,1);}
      const traj=cur.trajectories?.[direction.value];
      if(traj&&traj.length){ctx.lineWidth=.4;ctx.strokeStyle='rgba(242,160,40,.95)';ctx.beginPath();traj.forEach((p,i)=>{const X=p[0]+.5,Y=p[1]+.5;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();ctx.fillStyle='rgba(242,160,40,1)';ctx.fillRect(traj[0][0]-1,traj[0][1]-1,2,2);const e=traj[traj.length-1];ctx.fillRect(e[0]-1,e[1]-1,2,2);}
      const st=cur.stitch?.[direction.value];
      if(st){ctx.fillStyle='rgba(90,200,120,.65)';for(let y=0;y<Math.min(h,st.height);y++)for(let x=0;x<Math.min(w,st.width);x++)if(st.data[y*st.width+x])ctx.fillRect(x,y,1,1);}
    }
    function rebuild(){
      try{
        const si=Number(action.value),sheet=entry.work.spriteSheets[si],ai=sheet.actions.findIndex(a=>a.direction===direction.value);
        const keys=new Set(sheet.actions[ai].frames.map((_,fi)=>entry.work.getFrameKey(si,ai,fi)));
        H.validate(entry.work);result=H.plan(entry.work,entry.source,entry.source.hairAnimation,keys);$('[data-apply]').disabled=false;paintView();
        note.textContent=(entry.source.hairAnimation.enabled?'':'⚠ 总开关「开启本部件飘动」没勾选：确定后只会按动作对齐位置，不会真的飘动。')+(entry.last&&entry.last.scope!=='current'?`应用范围：${scope.selectedOptions[0]?.textContent}——确定后${H.directions[direction.value]||direction.value}的待机、行走、拾取、坐姿都会写成这套参数（睡觉不在编辑器动作内）。`:'')+`${entry.original.name} · ${action.selectedOptions[0]?.textContent} · ${direction.selectedOptions[0]?.textContent}；已调整 ${[...entries.values()].filter(e=>e.dirty).length} 个部件。`+(result.clipped?'有像素超出画布，原像素仍保留。':'')+(settings().followHead&&!settings().trajectories?.[direction.value]?.length?'参考式：发根跟头部，发尾稍后跟随。':settings().verticalMode==='wave'?'上下：局部迟滞、压缩与回落（受发梢延迟控制）。':'上下：旧版整块平移；调整上下数值后改用局部起伏。')+(settings().trajectories?.[direction.value]?.length?'轨迹模式：头发沿你画的线来回飘动（轨迹幅度=距离，每循环次数=速度，发梢延迟=拖尾）。':'')+(settings().stitch?.[direction.value]?.some(v=>v)?'补全区：涂到的地方会先补上头发颜色，再跟着一起飘动。':'补全区为空：会露头皮的位置请用补全画笔涂一下。')+'原生像素取整；0.4 可出现局部变化，但不足半格的位置仍可能不动。';
        start=null;frame=0;
      }catch(e){result=null;note.textContent=e.message;$('[data-apply]').disabled=true;}
    }
    function loadFields(){painting=false;previous=null;const cur=settings();$('[data-follow]').checked=!!cur.followHead;const def={trajAmp:0.1};for(const [key,input]of Object.entries(fields)){const val=cur[key];input.value=val!==undefined?val:(def[key]!==undefined?def[key]:'');}remember();rebuild();}
    function remember(){const s=entry?.work.spriteSheets[Number(action.value)];if(entry&&s)entry.last={sheet:s.name,direction:direction.value,scope:scope.value};}
    hair.onchange=()=>{try{chooseHair();}catch(e){note.textContent=e.message;$('[data-apply]').disabled=true;}};
    scope.onchange=()=>{if(entry&&scope.value!=='current'){entry.dirty=true;entry.followOnly=null;}loadFields();};direction.onchange=loadFields;action.onchange=()=>{populateDirections(direction.value);loadFields();};
    enabled.onchange=()=>{entry.enabledOnly=!entry.dirty||!!entry.enabledOnly||!!entry.followOnly;entry.dirty=true;entry.source.hairAnimation.enabled=enabled.checked;if(enabled.checked&&settings().nativeTips)settings(true);rebuild();};
    $('[data-follow]').onchange=()=>{
      const hadOtherChanges=entry.dirty&&!entry.followOnly&&!entry.enabledOnly, prior=entry.followOnly, mode=scope.value, si=Number(action.value),dir=direction.value;
      settings(true).followHead=$('[data-follow]').checked;
      if(!hadOtherChanges){
        const keys=prior||new Set();
        for(const [i,s] of entry.work.spriteSheets.entries())for(const [ai,a] of s.actions.entries())
          if((mode==='all'||(a.direction===dir&&(mode==='direction'||i===si)))&&PE.isEditorSheet(s))
            a.frames.forEach((_,fi)=>keys.add(entry.work.getFrameKey(i,ai,fi)));
        entry.followOnly=keys;
      }
      rebuild();
    };
    function stampMask(e){
      const im=sourceImage();if(!im)return;const box=paint.getBoundingClientRect(),point={x:Math.floor((e.clientX-box.left)/box.width*paint.width),y:Math.floor((e.clientY-box.top)/box.height*paint.height)};
      if(point.x<0||point.y<0||point.x>=im.width||point.y>=im.height){previous=point;return;}
      if(paintMode==='trajectory'){
        const v=settings(true);(v.trajectories??={});const arr=(v.trajectories[direction.value]??=[]);
        const from=previous||point,steps=Math.max(1,Math.abs(point.x-from.x),Math.abs(point.y-from.y));
        for(let s=0;s<=steps;s++){const X=Math.round(from.x+(point.x-from.x)*s/steps),Y=Math.round(from.y+(point.y-from.y)*s/steps);const last=arr[arr.length-1];if(!last||last[0]!==X||last[1]!==Y)arr.push([X,Y]);}
        if(arr.length>3000)arr.splice(0,arr.length-3000);
        previous=point;rebuild();return;
      }
      const v=settings(true),maps=paintMode==='protect'?(v.protectedMasks??={}):paintMode==='stitch'?(v.stitch??={}):v.masks;
      let mask=maps[direction.value];if(!mask||mask.width!==im.width||mask.height!==im.height){const next={width:im.width,height:im.height,data:Array(im.width*im.height).fill(!mask&&paintMode==='move'&&erasing?1:0)};if(mask)for(let y=0;y<Math.min(mask.height,next.height);y++)for(let x=0;x<Math.min(mask.width,next.width);x++)next.data[y*next.width+x]=mask.data[y*mask.width+x];mask=maps[direction.value]=next;}
      const from=previous||point,steps=Math.max(1,Math.abs(point.x-from.x),Math.abs(point.y-from.y)),radius=Math.max(1,Math.min(8,Number($('[data-radius]').value)||1));
      for(let step=0;step<=steps;step++){const cx=Math.round(from.x+(point.x-from.x)*step/steps),cy=Math.round(from.y+(point.y-from.y)*step/steps);for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){const X=cx+x,Y=cy+y;if(x*x+y*y<=radius*radius&&X>=0&&Y>=0&&X<mask.width&&Y<mask.height)mask.data[Y*mask.width+X]=erasing?0:1;}}
      previous=point;rebuild();
    }
    paint.onpointerdown=e=>{if(e.button!==0)return;painting=true;previous=null;paint.setPointerCapture(e.pointerId);stampMask(e);};paint.onpointermove=e=>{if(painting)stampMask(e);};paint.onpointerup=paint.onpointercancel=()=>{painting=false;previous=null;};
    function chooseBrush(mode){paintMode=mode;erasing=false;$('[data-move]').setAttribute('aria-pressed',String(mode==='move'));$('[data-protect]').setAttribute('aria-pressed',String(mode==='protect'));$('[data-traj]').setAttribute('aria-pressed',String(mode==='trajectory'));$('[data-stitch]').setAttribute('aria-pressed',String(mode==='stitch'));$('[data-erase]').setAttribute('aria-pressed','false');paint.setAttribute('aria-label',mode==='protect'?'涂抹头发保护区域':mode==='trajectory'?'画头发飘动轨迹':mode==='stitch'?'涂抹头发补全区':'涂抹头发可动区域');}
    $('[data-move]').onclick=()=>chooseBrush('move');$('[data-protect]').onclick=()=>chooseBrush('protect');$('[data-traj]').onclick=()=>chooseBrush('trajectory');$('[data-stitch]').onclick=()=>chooseBrush('stitch');$('[data-erase]').onclick=()=>{erasing=!erasing;$('[data-erase]').setAttribute('aria-pressed',String(erasing));};
    $('[data-clear]').onclick=()=>{const v=settings(true);delete v.masks[direction.value];if(v.protectedMasks)delete v.protectedMasks[direction.value];rebuild();};$('[data-clear-protection]').onclick=()=>{const v=settings(true);if(v.protectedMasks)delete v.protectedMasks[direction.value];rebuild();};$('[data-clear-traj]').onclick=()=>{const v=settings(true);if(v.trajectories)delete v.trajectories[direction.value];rebuild();};$('[data-clear-stitch]').onclick=()=>{const v=settings(true);if(v.stitch)delete v.stitch[direction.value];rebuild();};
    $('[data-play]').onclick=()=>{playing=!playing;start=null;$('[data-play]').textContent=playing?'暂停':'播放';};
    function tick(now){
      if(!dialog.open)return;
      if(result){const work=entry.work,si=Number(action.value),sheet=work.spriteSheets[si],ai=sheet.actions.findIndex(a=>a.direction===direction.value),a=sheet.actions[ai];if(a){
        const durations=a.frames.map(f=>sheet.useFrameDurations!==false&&f.duration>0?f.duration:1000/(sheet.fps||8)),total=durations.reduce((n,v)=>n+v,0);if(start===null)start=now-durations.slice(0,frame).reduce((n,v)=>n+v,0);
        if(playing){let t=(now-start)%total;frame=0;while(frame<durations.length-1&&t>=durations[frame])t-=durations[frame++];}
        const f=a.frames[frame],key=work.getFrameKey(si,ai,frame);
        const layers=H.previewLayers(work,si,ai,entry.source.hairAnimation.id).map(l=>({
          opacity:l.opacity??1,image:result.edits.find(e=>e.layer===l&&e.key===key)?.image||l.getFrameData(key)
        })).filter(l=>l.image&&l.opacity>0);
        const density=Math.max(1,...layers.map(({image:im})=>im.placement?Math.ceil(Math.max(im.width/im.placement.w,im.height/im.placement.h)):1));
        const scale=Math.min(density,Math.max(1,Math.floor(Math.sqrt(16*1024*1024/(f.width*f.height)))));
        preview.width=f.width*scale;preview.height=f.height*scale;const ctx=preview.getContext('2d');
        for(const {opacity,image} of layers){ctx.globalAlpha=opacity;PE.utils.drawImageData(ctx,image,0,0,scale);}
        $('[data-frame]').textContent=`第 ${frame+1}/${a.frames.length} 帧`;
      }}request=requestAnimationFrame(tick);
    }
    $('[data-cancel]').onclick=()=>dialog.close();
    $('[data-apply]').onclick=()=>{try{
      if(app.project!==p)throw Error('工程已变化，请重新打开，未覆盖');
      const changed=[...entries.values()].filter(e=>e.dirty);
      for(const e of changed)if(!p.layers.includes(e.original)||JSON.stringify(e.original.hairAnimation||null)!==e.stamp)throw Error('头发设置已变化，请重新打开，未覆盖');
      const spread=changed.filter(e=>e.last&&e.last.scope!=='current');
      if(changed.length)H.transaction(app,'设置头发分方向飘动',()=>{
        const sources=changed.map(e=>{const source=H.setup(p,e.original),next=JSON.parse(JSON.stringify(e.source.hairAnimation));next.id=source.hairAnimation.id;source.hairAnimation=next;
          // 应用范围是最后一步选择：即使只动了下拉框，也按它把参数真正写进对应动作，而不是只留在当前动作里。
          if(e.last)H.editSettings(source.hairAnimation,e.last.sheet,e.last.direction,e.last.scope,p.spriteSheets);
          return source;});
        H.validate(p);for(const [i,source] of sources.entries()){
          const only=changed[i].followOnly,result=H.plan(p,source,source.hairAnimation,only);
          H.applyPlan(result);
        }
      });
      say(`已应用 ${changed.length} 个头发部件的独立方向设置${spread.length?`；${spread.map(e=>`${e.original.name}已写入${H.directions[e.last.direction]||e.last.direction}的全部可编辑动作（待机/行走/拾取/坐姿，睡觉不在编辑器动作内）`).join('；')}`:''}；Ctrl+S 保存。`);dialog.close();
    }catch(e){note.textContent=e.message;}};
    dialog.onclose=()=>{cancelAnimationFrame(request);dialog.remove();};document.body.append(dialog);
    const selected=current();hair.value=String(p.layers.indexOf(candidates.includes(selected)?selected:candidates.find(l=>l.visible)||candidates[0]));
    chooseHair();dialog.showModal();request=requestAnimationFrame(tick);
  }
});
