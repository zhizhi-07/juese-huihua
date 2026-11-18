/* Finished pieces use the existing revision-checked project store, never a branch copy. */
window.PE=window.PE||{};
PE.Wardrobe={
  baseProjectId:'draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba',
  actions:{idle:'待机',walk:'走路',sit:'坐下',pickup:'拾取'},
  hasPixels(image){return !!image?.data.some((v,i)=>i%4===3&&v);},
  family(layer){return PE.VisualLayers.partName(layer)||layer.name;},
  isBase(layer){return /^(body|head|身体|头部)(?: 描边)?$/.test(layer.name)||PE.isHandLayer(layer);},
  choices(project){
    const groups=new Map();
    for(const layer of project.layers){
      if(layer.isGroup||this.isBase(layer))continue;
      const sheets=[...new Set([...layer.frameData].filter(([k,d])=>this.hasPixels(d)&&project.spriteSheets[Number(k.split('_')[0])]?.name.match(/^original(?:16|32)_/)).map(([k])=>Number(k.split('_')[0])))];
      if(!sheets.length)continue;
      const key=this.family(layer);
      if(!groups.has(key))groups.set(key,{key,category:PE.VisualLayers.category(layer),visible:false});
      if(sheets.some(si=>PE.isLayerVisible(project,layer,si)))groups.get(key).visible=true;
    }
    return [...groups.values()];
  },
  // 收藏：图层卡片上的五角星。一次点选就收录整件（同一发型系列 / 同一套衣服），不用再在衣柜里手工勾选。
  favoriteOf(layer){
    if(!layer||layer.isGroup||PE.isHandLayer(layer))return null;
    const raw=String(layer.name||'').replace(/ 描边$/, ''),info=PE.classifyPart(raw);
    if(!info||!['头发','衣服','五官'].includes(info.category))return null;
    const pieces=raw.split(' / ').map(part=>part.trim()).filter(Boolean);
    const clean=value=>{const text=String(value||'').trim(),stripped=text.replace(/^\d+\s*/, '').trim();return stripped||text;};
    if(info.category==='五官'){
      // 五官按部件本身收藏：换眼睛不牵连头发衣服，同一套眼睛的所有方向动作一起收录。
      const name=clean(pieces.at(-1))||clean(info.clean);
      return {category:'五官',group:'五官:'+(PE.VisualLayers.partName(layer)||raw),name};
    }
    if(info.category==='头发'){
      if(info.slot==='饰品'){const name=clean(pieces[1])||clean(info.clean);return {category:'头发',group:'饰品:'+name,name};}
      const series=info.series||clean(pieces[1])||String(info.slot||'头像');
      return {category:'头发',group:'发型:'+series,name:/^\d+$/.test(series)?'发型 '+series:series};
    }
    const outfit=clean(pieces[1])||clean(info.clean);
    return {category:'衣服',group:'衣服:'+outfit,name:outfit};
  },
  favoriteParts(project, layer){
    const desc=this.favoriteOf(layer);
    if(!desc||!project?.layers)return [];
    const available=new Set(this.choices(project).map(choice=>choice.key));
    const members=project.layers.filter(item=>{const other=this.favoriteOf(item);return other&&other.group===desc.group;});
    return [...new Set(members.map(item=>this.family(item)))].filter(key=>key&&available.has(key));
  },
  favoriteState(group){
    const projectId=PE.app?.persistence?.projectId;
    if(!projectId||!this._favoritesLoaded)return 'unknown';
    return this._favoriteEntries.some(entry=>entry.favorite===group&&entry.sourceProjectId===projectId)?'yes':'no';
  },
  favoriteStamp(entries){return JSON.stringify(entries.map(entry=>[entry.id,entry.revision,entry.favorite,entry.sourceProjectId,entry.name]));},
  syncFavoriteIndex(entries){
    const before=this.favoriteStamp(this._favoriteEntries||[]);
    this._favoriteEntries=entries;this._favoritesLoaded=true;
    return before!==this.favoriteStamp(entries);
  },
  async loadFavoriteEntries(refresh=false){
    if(this._favoritesLoaded&&!refresh)return this._favoriteEntries;
    if(this._favoritesLoading)return this._favoritesLoading;
    const persistence=PE.app?.persistence;
    if(!persistence)return this._favoriteEntries||[];
    this._favoritesLoading=(async()=>{
      const response=await fetch(persistence.base+'/api/projects',{headers:persistence.headers,cache:'no-store'});
      if(!response.ok)throw new Error('成品衣柜读取失败：'+response.status);
      const list=(await response.json()).filter(item=>String(item.id).startsWith('finished-'));
      const built=[];
      for(const {id}of list){
        try{
          const read=await fetch(persistence.base+'/api/project?id='+id,{headers:persistence.headers,cache:'no-store'});
          if(!read.ok)continue;
          const data=await read.json(),meta=data.wardrobe;
          if(!meta||meta.archived||!['头发','衣服','五官'].includes(meta.category))continue;
          built.push({id,revision:read.headers.get('ETag'),name:data.name||'',category:meta.category,favorite:meta.favorite||'',sourceProjectId:meta.sourceProjectId||'',sourceParts:meta.sourceParts||[]});
        }catch(error){console.debug('成品读取失败',id,error.message);}
      }
      this.syncFavoriteIndex(built);this._favoritesFailedAt=0;
      return built;
    })().finally(()=>{this._favoritesLoading=null;});
    return this._favoritesLoading;
  },
  prefetchFavorites(){
    if(this._favoritesLoaded||this._favoritesLoading)return;
    if(Date.now()-(this._favoritesFailedAt||0)<15000)return;
    this.loadFavoriteEntries().then(()=>PE.app?.updateLayerList?.()).catch(()=>{this._favoritesFailedAt=Date.now();});
  },
  toast(text,error=false){
    if(!text)return null;
    const box=document.createElement('div');
    box.className='wardrobe-toast'+(error?' error':'');box.setAttribute('role','status');box.textContent=text;
    document.body.append(box);
    setTimeout(()=>box.classList.add('fade'),2800);
    setTimeout(()=>box.remove(),3400);
    return box;
  },
  async toggleFavorite(app, layer){
    const persistence=app?.persistence;
    if(!persistence?.ready||app.suspendBackup)throw new Error('请等当前工程读取完成后再收藏');
    const desc=this.favoriteOf(layer);
    if(!desc)throw new Error('只有头发、衣服、五官类部件可以收藏');
    const parts=this.favoriteParts(app.project, layer);
    if(!parts.length)throw new Error('「'+desc.name+'」还没有可收录的动作像素，先把动作画好再收藏');
    const entries=await this.loadFavoriteEntries(true);
    const hit=entries.find(entry=>entry.favorite===desc.group&&entry.sourceProjectId===persistence.projectId);
    if(hit){
      if(!confirm('「'+hit.name+'」已经在成品衣柜里，要把这一件移出衣柜吗？原草稿和像素不变。'))return 'kept';
      const read=await fetch(persistence.base+'/api/project?id='+hit.id,{headers:persistence.headers,cache:'no-store'});
      if(!read.ok)throw new Error('成品读取失败：'+read.status);
      const data=await read.json();data.wardrobe={...(data.wardrobe||{}),archived:true};
      const response=await fetch(persistence.base+'/api/project?id='+hit.id,{method:'PUT',headers:{...persistence.headers,'Content-Type':'application/json','If-Match':read.headers.get('ETag')},body:JSON.stringify(data)});
      if(!response.ok)throw new Error(response.status===409?'成品版本已变化，请稍后再试':'移出衣柜失败：'+response.status);
      await this.loadFavoriteEntries(true);
      return 'removed';
    }
    const raw=JSON.parse(await app.exportManager.exportProject(false).text()),data=this.snapshot(raw,parts,desc.name,desc.category,persistence.projectId);
    const source=await fetch(persistence.base+'/api/project?id='+persistence.projectId,{headers:persistence.headers,cache:'no-store'});
    data.wardrobe={...data.wardrobe,favorite:desc.group,sourceParts:parts,sourceRevision:source.ok?source.headers.get('ETag'):'none'};
    const id='finished-'+crypto.randomUUID();
    const response=await fetch(persistence.base+'/api/project?id='+id,{method:'PUT',headers:{...persistence.headers,'Content-Type':'application/json','If-Match':'none'},body:JSON.stringify(data)});
    if(!response.ok)throw new Error('收藏保存失败：'+response.status);
    await this.loadFavoriteEntries(true);
    return 'added';
  },
  snapshot(raw,selected,name,category,sourceProjectId){
    if(!name.trim()||!['头发','衣服','五官'].includes(category))throw new Error('请填写成品名称和类别');
    const wanted=new Set(selected),layers=raw.layers.filter(l=>!l.isGroup&&!this.isBase(l)&&wanted.has(this.family(l))).flatMap(l=>{
      const sheets=new Set(Object.keys(l.frameData||{}).map(k=>Number(k.split('_')[0])));
      return [...sheets].filter(si=>l.sheetIndex===undefined||l.sheetIndex===si).map(si=>({...l,sheetIndex:si}));
    });
    const indices=[...new Set(layers.map(l=>l.sheetIndex))].filter(si=>raw.spriteSheets[si]?.name.match(/^original(?:16|32)_/));
    const mapping=new Map(indices.map((si,i)=>[si,i]));
    const result={version:'1.0',name:name.trim().slice(0,60),currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,palette:raw.palette||[],
      wardrobe:{version:1,category,sourceProjectId,sourceName:raw.name,completedAt:new Date().toISOString()},spriteSheets:[],layers:[]};
    for(const si of indices){
      const s=raw.spriteSheets[si],newSI=mapping.get(si);
      const frames=s.actions.flatMap(a=>a.frames),columns=Math.max(1,...s.actions.map(a=>a.frames.length)),rows=s.actions.length;
      const width=columns*Math.max(1,...frames.map(f=>f.width)),height=rows*Math.max(1,...frames.map(f=>f.height));
      if(width>32767||height>32767||width*height>16*1024*1024)throw new Error('成品动作画布过大');
      const blank=document.createElement('canvas');blank.width=width;blank.height=height;
      result.spriteSheets.push({name:s.name,frameWidth:s.frameWidth,frameHeight:s.frameHeight,fps:s.fps,useFrameDurations:s.useFrameDurations,
        columns,rows,imageDataURL:blank.toDataURL('image/png'),
        actions:s.actions.map((a,ai)=>({name:a.name,direction:a.direction,frames:a.frames.map((f,fi)=>({sheetIndex:newSI,sourceX:fi*f.width,sourceY:ai*f.height,width:f.width,height:f.height,duration:f.duration}))}))});
    }
    for(const l of layers){
      if(!mapping.has(l.sheetIndex))continue;
      const frameData={};
      for(const [key,d]of Object.entries(l.frameData||{})){
        const [si,ai,fi]=key.split('_').map(Number);
        if(si!==l.sheetIndex||!raw.spriteSheets[si].actions[ai]?.frames[fi]||!d?.dataURL)continue;
        frameData[`${mapping.get(si)}_${ai}_${fi}`]=structuredClone(d);
      }
      if(Object.keys(frameData).length)result.layers.push({name:l.name,sheetIndex:mapping.get(l.sheetIndex),visible:true,locked:false,opacity:l.opacity??1,parent:null,frameData});
    }
    if(!result.layers.length)throw new Error('请至少勾选一个有像素的部件');
    return result;
  },
  locate(project,action,direction){
    const si=project.spriteSheets.findIndex(s=>['original16_'+action,'original32_'+action].includes(s.name)),s=project.spriteSheets[si];
    if(!s)return null;
    let ai=s.actions.findIndex(a=>a.direction===direction),flip=false;
    if(ai<0&&['left','right'].includes(direction)){ai=s.actions.findIndex(a=>a.direction==='side');flip=direction==='left';}
    return ai<0?null:{si,ai,sheet:s,action:s.actions[ai],flip};
  },
  frameAt(sheet,action,elapsed,loop=true){
    const times=action.frames.map(f=>sheet.useFrameDurations!==false&&f.duration>0?f.duration:1000/(sheet.fps||8)),total=times.reduce((a,b)=>a+b,0);
    let t=loop?elapsed%total:Math.min(elapsed,Math.max(0,total-1));
    for(let i=0;i<times.length;i++){if(t<times[i])return i;t-=times[i];}return Math.max(0,times.length-1);
  },
  rank(layer,direction,project,key){
    // shortcut: 人物部位使用固定穿插顺序，需要任意遮挡层级时再增加显式插槽。
    const n=layer.name.replace(/ 描边$/, '');
    if(n.startsWith('发饰 /'))return 40;
    if(n.startsWith('头发 /')&&n.endsWith('侧面后发'))return direction==='up'?36:25;
    if(PE.classifyPart(n)?.slot==='后发')return direction==='up'?35:24;
    if(/^(body|身体)$/.test(n))return 0;
    if(n.startsWith('服装 /'))return 10;
    if(/^(head|头部)$/.test(n))return 20;
    if(PE.classifyPart(n)?.slot==='眼睛')return 26;
    if(PE.isHandLayer(layer)){
      if(project&&key){
        const index=project.layers.indexOf(layer),body=project.layers.findIndex(l=>/^(body|身体)$/.test(l.name)&&l.getFrameData?.(key)),head=project.layers.findIndex(l=>/^(head|头部)$/.test(l.name)&&l.getFrameData?.(key));
        if(body>=0&&index<body)return -10;
        // 近身那只手（前手）永远在衣服、眼睛、头发之上。
        if(head>=0&&index>head)return 99;
        if(body>=0&&index>body)return 99;
      }
      return n==='hand 2'?-10:99;
    }
    return 30;
  },
  async decode(data){const ex=new PE.ExportManager();return (await ex.importProject(new Blob([JSON.stringify(data)]))).project;},
  drawFrame(ctx,project,location,fi,x,y,filter=()=>true){
    const frame=location.action.frames[fi];if(!frame)return false;
    const key=project.getFrameKey(location.si,location.ai,fi);let nonempty=false;
    for(const layer of PE.getRenderLayers(project,location.si,location.ai)){
      if(!filter(layer)||!PE.isLayerVisible(project,layer,location.si)||layer.opacity<=0)continue;
      const image=layer.getFrameData(key);if(!image)continue;
      ctx.save();ctx.globalAlpha=layer.opacity??1;ctx.translate(x,y);if(location.flip)ctx.scale(-1,1);PE.utils.drawImageData(ctx,image,-Math.floor(frame.width/2),-Math.floor(frame.height/2));ctx.restore();
      if(this.hasPixels(image))nonempty=true;
    }
    return nonempty;
  },
  async exportItem(entry){
    if(typeof JSZip==='undefined')throw new Error('ZIP 库未加载');
    const p=entry.project,zip=new JSZip(),manifest=[],arrays=[];
    for(let si=0;si<p.spriteSheets.length;si++){
      const sheet=p.spriteSheets[si],cols=Math.max(0,...sheet.actions.map(a=>a.frames.length)),frames=sheet.actions.flatMap(a=>a.frames);
      if(!cols||!frames.length)continue;
      const fw=Math.max(...frames.map(f=>f.width)),fh=Math.max(...frames.map(f=>f.height)),scale=PE.utils.imageScale(p,si),w=fw*cols*scale,h=fh*sheet.actions.length*scale;
      if(w>32767||h>32767||w*h>16*1024*1024)throw new Error('成品阵列过大');
      const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.scale(scale,scale);
      const rows=sheet.actions.map((a,ai)=>{a.frames.forEach((f,fi)=>this.drawFrame(ctx,p,{si,ai,action:a,flip:false},fi,fi*fw+Math.floor(fw/2),ai*fh+Math.floor(fh/2)));return {direction:a.direction,frames:a.frames.length,durationsMs:a.frames.map(f=>sheet.useFrameDurations!==false&&f.duration>0?f.duration:1000/(sheet.fps||8))};});
      const file=sheet.name+'.png';zip.file(file,c.toDataURL('image/png').split(',')[1],{base64:true});manifest.push({file,frameWidth:fw*scale,frameHeight:fh*scale,...(scale>1?{pixelScale:scale,logicalFrameWidth:fw,logicalFrameHeight:fh}:{}),columns:cols,rows});arrays.push(c);
    }
    const width=Math.max(1,...arrays.map(c=>c.width)),height=arrays.reduce((h,c)=>h+c.height,0);
    if(!height||height>32767||width*height>16*1024*1024)throw new Error('全部动作阵列过大或为空');
    const atlas=document.createElement('canvas');atlas.width=width;atlas.height=height;
    let y=0;for(const [i,c]of arrays.entries()){atlas.getContext('2d').drawImage(c,0,y);manifest[i].atlasRect={x:0,y,width:c.width,height:c.height};y+=c.height;}
    zip.file('全部动作.png',atlas.toDataURL('image/png').split(',')[1],{base64:true});
    zip.file('成品.json',JSON.stringify(entry.data,null,2));zip.file('阵列说明.json',JSON.stringify({version:1,transparent:true,atlas:'全部动作.png',files:manifest},null,2));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),ex=new PE.ExportManager();ex._downloadBlob(blob,ex._sanitizeFilename(entry.data.name)+'-成品.zip');return blob;
  }
};

document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,W=PE.Wardrobe,F=PE.WardrobeFurniture,p=app.persistence;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const dialog=node('dialog','wardrobe-dialog');dialog.setAttribute('aria-labelledby','wardrobe-title');document.body.append(dialog);
  const status=node('p','wardrobe-status');status.setAttribute('role','status');
  let busy=0,loading=false;
  function report(text,error=false){status.textContent=text;status.classList.toggle('save-error',error);}
  function button(text,fn,parent){const b=node('button','studio-button',text);b.type='button';b.onclick=async()=>{b.disabled=true;busy++;try{await fn();}catch(e){report(e.message,true);}finally{b.disabled=false;busy--;}};parent?.append(b);return b;}
  const title=node('div','dialog-title'),heading=node('h2','','成品衣柜 / 换装测试');heading.id='wardrobe-title';title.append(heading);button('关闭衣柜',()=>dialog.close(),title);dialog.append(title);
  dialog.append(node('p','wardrobe-note','图层卡片上的五角星=收藏：头发、衣服、五官都能整件收藏，点一下直接进衣柜，不用再来这里勾选。手动勾选收录后，成品自动同步原工程已保存的修改，无需再选中更新；未保存草稿不参与同步。试穿不修改当前工程，缺动作不自动补画。'));
  const grid=node('div','wardrobe-grid'),library=node('section','wardrobe-library'),stage=node('section','wardrobe-stage');grid.append(library,stage);dialog.append(grid,status);
  const register=node('details','wardrobe-register'),summary=node('summary','','＋ 标记当前工程的成品');register.append(summary);library.append(register);
  const form=node('div','wardrobe-form'),nameLabel=node('label','','成品名称 '),nameInput=node('input');nameInput.maxLength=60;nameInput.placeholder='例如：灰色长发 / 深蓝JK套装';nameLabel.append(nameInput);
  const categoryLabel=node('label','','成品类别 '),category=node('select');category.append(new Option('头发','头发'),new Option('衣服','衣服'),new Option('五官','五官'));categoryLabel.append(category);form.append(nameLabel,categoryLabel);
  const choices=node('div','wardrobe-choices');form.append(node('p','wardrobe-note','勾选属于这一件成品的部件；会收录这些部件的全部已有动作，不带身体和其他草稿。自定义命名的图层也可勾选。'),choices);register.append(form);
  const saveRow=node('div','wardrobe-buttons');form.append(saveRow);
  const filter=node('select');filter.setAttribute('aria-label','衣柜类别筛选');filter.append(new Option('全部成品',''),new Option('头发','头发'),new Option('衣服','衣服'),new Option('五官','五官'));library.append(filter);
  const list=node('div','wardrobe-items');library.append(list);button('刷新成品列表',async()=>{report('正在刷新成品列表…');await load();if(!status.classList.contains('save-error'))report('已刷新成品列表');},library);
  const scene=node('canvas','wardrobe-scene');scene.width=320;scene.height=224;scene.tabIndex=0;scene.setAttribute('aria-label','换装测试场景：方向键或WASD移动，C坐下或站起，E拾取');
  stage.append(node('h3','','换装试验场'),scene);
  const helpIntro='可多件叠穿，点“脱下”单独移除。方向键 / WASD 移动，C 就近坐下 / 站起，F 使用附近家具 / 起身，E 拾取。房间与家具来自场景绘制工程，按你画的原生像素摆好；也可选家具后点“就位测试”，沿用当前朝向。缺动作会提示，不会用待机冒充。';
  const help=node('p','wardrobe-note',helpIntro);stage.append(help);
  const controls=node('div','wardrobe-buttons');stage.append(controls);
  const direction=node('select');direction.setAttribute('aria-label','测试朝向');for(const [value,label]of [['down','正面'],['left','左侧'],['right','右侧'],['up','背面']])direction.append(new Option(label,value));controls.append(direction);
  const actionSelect=node('select');actionSelect.setAttribute('aria-label','测试动作');for(const [key,label]of Object.entries(W.actions))actionSelect.append(new Option(label,key));controls.append(actionSelect);
  const equipment=node('p','wardrobe-equipment'),warnings=node('p','wardrobe-warnings');warnings.setAttribute('role','status');stage.append(equipment,warnings);
  let entries=[],selected=null,base=null,equipped={},raf=0,last=0,elapsed=0,action='idle',moving=false,keys=new Set(),player={x:160,y:144},item={x:206,y:151,picked:false},pickupUntil=0,attached=null,returnPoint=null,sceneSource='';
  const images=new WeakMap();
  function updateChoices(){
    choices.replaceChildren();
    if(!p.ready){choices.append(node('p','','请等待工程读取完成'));return;}
    for(const choice of W.choices(app.project)){
      const label=node('label'),input=node('input');input.type='checkbox';input.value=choice.key;input.checked=choice.visible&&choice.category===category.value;
      label.append(input,document.createTextNode(choice.key+' · '+choice.category));choices.append(label);
    }
    if(!choices.childElementCount)choices.append(node('p','','当前工程没有可收录的部件，请先完成绘画。'));
  }
  category.onchange=updateChoices;register.addEventListener('toggle',()=>{if(register.open)updateChoices();});
  async function save(existing){
    if(!p.ready)throw new Error('当前工程尚未读取完成');
    if(existing&&(!selected||selected.data.wardrobe.category!==category.value))throw new Error('请先选择同类别成品，再更新');
    if(existing&&!confirm('用当前勾选的部件更新「'+selected.data.name+'」？旧成品保留一份服务端备份。'))return;
    const id=existing?selected.id:'finished-'+crypto.randomUUID(),revision=existing?selected.revision:'none';
    const source=await fetch(p.base+'/api/project?id='+p.projectId,{headers:p.headers,cache:'no-store'});
    if(!source.ok&&source.status!==404)throw new Error('原工程版本读取失败：'+source.status);
    const parts=[...choices.querySelectorAll('input:checked')].map(e=>e.value),raw=JSON.parse(await app.exportManager.exportProject(false).text()),data=W.snapshot(raw,parts,nameInput.value,category.value,p.projectId);
    data.wardrobe.sourceParts=parts;data.wardrobe.sourceRevision=source.ok?source.headers.get('ETag'):'none';
    // 保留五角星收藏标记，手动更新成品后图层面板的星标状态不变。
    if(existing&&selected.data.wardrobe.favorite)data.wardrobe.favorite=selected.data.wardrobe.favorite;
    const response=await fetch(p.base+'/api/project?id='+id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(data)});
    if(response.status===409)throw new Error('成品已被其他窗口修改，未覆盖。请刷新成品列表后比较，再决定是否更新。');
    if(!response.ok)throw new Error('成品保存失败：'+response.status);
    await load(id);report('已独立保存：'+data.name+'。原工程及未保存草稿保持不变。');register.open=false;
  }
  button('收录为新成品',()=>save(false),saveRow);button('更新选中成品',()=>save(true),saveRow);
  function coverage(entry){
    return Object.entries(W.actions).map(([key,label])=>{
      const s=entry.project.spriteSheets.find(s=>['original16_'+key,'original32_'+key].includes(s.name));if(!s)return label+'：缺少';
      const si=entry.project.spriteSheets.indexOf(s);
      const rows=s.actions.map((a,ai)=>{const filled=a.frames.filter((_,fi)=>entry.project.layers.some(l=>W.hasPixels(l.getFrameData(`${si}_${ai}_${fi}`)))).length;return ({down:'正',up:'背',side:'侧',left:'左',right:'右'}[a.direction]||a.direction)+filled+'/'+a.frames.length;});
      return label+'：'+rows.join(' ');
    }).join('；');
  }
  function equipText(){
    const worn=Object.values(equipped);
    equipment.textContent='试穿：'+['头发','衣服','五官'].map(c=>c+' · '+(worn.filter(e=>e.data.wardrobe.category===c).map(e=>e.data.name).join('、')||'未穿戴')).join('　/　');
  }
  function renderList(){
    list.replaceChildren();
    for(const entry of entries.filter(e=>!filter.value||e.data.wardrobe.category===filter.value)){
      const card=node('article','wardrobe-item');card.classList.toggle('selected',selected?.id===entry.id);
      const thumb=node('canvas','wardrobe-thumb');thumb.width=64;thumb.height=64;
      const loc=W.locate(entry.project,'idle','down')||entry.project.spriteSheets.flatMap((s,si)=>s.actions.map((a,ai)=>({si,ai,action:a,flip:false}))).find(l=>l.action.frames.length);
      if(loc){
        // 缩略图也按素材的源像素倍率画，2× 高清的眼睛、头发不会被缩成格子色块。
        const ctx=thumb.getContext('2d'),frame=loc.action.frames[0]||{width:16,height:16},edge=Math.max(frame.width,frame.height,1);
        let scale=Math.max(2,Math.min(4,PE.utils.imageScale?PE.utils.imageScale(entry.project,loc.si):1));
        if(scale*edge>60)scale=Math.max(1,Math.floor(60/edge));
        ctx.scale(scale,scale);
        W.drawFrame(ctx,entry.project,loc,0,Math.round(32/scale),Math.round(32/scale));
      }
      const content=node('div');content.append(node('strong','',entry.data.name),node('small','',entry.data.wardrobe.category+' · '+entry.data.wardrobe.sourceName));
      const details=node('details'),s=node('summary','','动作覆盖（有像素帧 / 总帧）');details.append(s,node('p','wardrobe-note',coverage(entry)));content.append(details);
      const row=node('div','wardrobe-buttons');
      button('选中',()=>{selected=entry;nameInput.value=entry.data.name;category.value=entry.data.wardrobe.category;updateChoices();renderList();report('已选中 '+entry.data.name+'；可试穿、导出或更新。');},row);
      const wear=button(equipped[entry.id]?'脱下':'试穿',()=>{
        if(equipped[entry.id])delete equipped[entry.id];else equipped[entry.id]=entry;
        equipText();renderList();
      },row);wear.setAttribute('aria-pressed',String(!!equipped[entry.id]));
      button('一键导出',()=>W.exportItem(entry),row);
      button('移出衣柜',async()=>{
        if(!confirm('将「'+entry.data.name+'」移出成品衣柜？原草稿不变，独立文件保留。'))return;
        const data=structuredClone(entry.data);data.wardrobe.archived=true;
        const r=await fetch(p.base+'/api/project?id='+entry.id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':entry.revision},body:JSON.stringify(data)});
        if(!r.ok)throw new Error(r.status===409?'成品版本已变化，请刷新列表后重试':'移出失败：'+r.status);
        delete equipped[entry.id];await load();report('已移出衣柜；独立文件仍保留。');
      },row);content.append(row);card.append(thumb,content);list.append(card);
    }
    if(!list.childElementCount)list.append(node('p','wardrobe-empty','这里还没有成品。回到图层面板点「头发 / 衣服 / 五官」卡片上的五角星就能直接收藏整件；也可以展开上方“标记当前工程的成品”手动勾选收录。不会自动把旧半成品放进来。'));
  }
  filter.onchange=renderList;
  const sources=new Map();
  async function syncSource(entry){
    const meta=entry.data.wardrobe,id=meta.sourceProjectId;
    if(!/^[a-z0-9-]{1,80}$/.test(id)||id.startsWith('finished-'))return entry;
    let source=sources.get(id);
    if(!source?.checked){
      const r=await fetch(p.base+'/api/project?id='+id,{headers:{...p.headers,...(source?{'If-None-Match':source.revision}:{})},cache:'no-store'});
      if(r.status===404)return entry;
      if(r.status!==304){if(!r.ok)throw new Error('原工程读取失败：'+r.status);source={revision:r.headers.get('ETag'),data:await r.json()};}
      source.checked=true;sources.set(id,source);
    }
    if(meta.sourceRevision===source.revision)return entry;
    const parts=meta.sourceParts||[...new Set(entry.data.layers.map(l=>W.family(l)))];
    const available=new Set(source.data.layers.filter(l=>!l.isGroup&&!W.isBase(l)).map(l=>W.family(l)));
    if(!parts.length||parts.some(part=>!available.has(part)))throw new Error('「'+entry.data.name+'」的原部件被删除或改名，已保留上次成品，请重新勾选更新。');
    const data=W.snapshot(source.data,parts,entry.data.name,meta.category,id);
    data.wardrobe={...meta,sourceName:source.data.name,sourceParts:parts,sourceRevision:source.revision};
    const r=await fetch(p.base+'/api/project?id='+entry.id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':entry.revision},body:JSON.stringify(data)});
    if(!r.ok)throw new Error(r.status===409?'成品同步遇到版本变化，已保留现有文件，稍后自动重试。':'成品同步失败：'+r.status);
    return {id:entry.id,data,revision:r.headers.get('ETag'),project:await W.decode(data)};
  }
  async function load(selectId){
    if(loading)return;
    loading=true;
    try{
    for(const source of sources.values())source.checked=false;
    const response=await fetch(p.base+'/api/projects',{headers:p.headers,cache:'no-store'});if(!response.ok)throw new Error('衣柜读取失败：'+response.status);
    const projects=await response.json(),next=[];let syncError='';
    for(const {id}of projects.filter(e=>e.id.startsWith('finished-'))){
      const cached=entries.find(e=>e.id===id),r=await fetch(p.base+'/api/project?id='+id,{headers:{...p.headers,...(cached?{'If-None-Match':cached.revision}:{})},cache:'no-store'});
      if(r.status!==304&&!r.ok)throw new Error('成品读取失败：'+id+' · '+r.status);
      let entry=cached;
      if(r.status!==304){const data=await r.json();if(data.wardrobe?.archived||!['头发','衣服','五官'].includes(data.wardrobe?.category))continue;entry={id,data,revision:r.headers.get('ETag'),project:await W.decode(data)};}
      try{entry=await syncSource(entry);}catch(e){syncError=e.message;}
      next.push(entry);
    }
    if(syncError)report(syncError,true);
    else if(status.classList.contains('save-error'))report('成品自动同步已恢复');
    if(!selectId&&list.childElementCount&&next.length===entries.length&&next.every((e,i)=>e.id===entries[i].id&&e.revision===entries[i].revision))return;
    entries=next;selected=entries.find(e=>e.id===(selectId||selected?.id))||null;
    for(const id of Object.keys(equipped)){const updated=entries.find(e=>e.id===id);if(updated)equipped[id]=updated;else delete equipped[id];}
    equipText();renderList();
    // 衣柜里刚移出/新收录的成品要同步回图层面的五角星状态。
    const changed=W.syncFavoriteIndex(next.map(entry=>({id:entry.id,revision:entry.revision,name:entry.data.name,category:entry.data.wardrobe.category,favorite:entry.data.wardrobe.favorite||'',sourceProjectId:entry.data.wardrobe.sourceProjectId||'',sourceParts:entry.data.wardrobe.sourceParts||[]})));
    if(changed)PE.app?.updateLayerList?.();
    }finally{loading=false;}
  }
  setInterval(()=>{if(dialog.open&&!register.open&&!busy&&!loading)load().catch(e=>report(e.message,true));},2000);
  function setAction(value){if(action!==value){action=value;elapsed=0;}actionSelect.value=value;}
  function leaveFurniture(){if(attached){player={...returnPoint};attached=null;returnPoint=null;}pickupUntil=0;}
  // 房间按“画布格”计尺寸；高清人物要按源像素上屏，所以画布会按倍率放大，逻辑坐标保持不变。
  let roomSize={width:320,height:224};
  const sheetScales=new WeakMap();
  function sheetScale(project,si){
    let bySheet=sheetScales.get(project);
    if(!bySheet)sheetScales.set(project,bySheet=new Map());
    if(!bySheet.has(si))bySheet.set(si,Math.max(1,Math.min(4,PE.utils.imageScale?PE.utils.imageScale(project,si):1)));
    return bySheet.get(si);
  }
  function applyResolution(){
    const dir=direction.value;
    let scale=base&&W.locate(base,action,dir)?sheetScale(base,W.locate(base,action,dir).si):1;
    for(const e of Object.values(equipped)){const loc=W.locate(e.project,action,dir);if(loc)scale=Math.max(scale,sheetScale(e.project,loc.si));}
    const budget=Math.floor(Math.sqrt(16*1024*1024/(roomSize.width*roomSize.height)))||1;
    scale=Math.max(1,Math.min(scale,4,budget));
    const width=roomSize.width*scale,height=roomSize.height*scale;
    if(scene.width!==width)scene.width=width;
    if(scene.height!==height)scene.height=height;
    return scale;
  }
  function worldSize(){return {width:roomSize.width,height:roomSize.height};}
  function limits(){const size=worldSize();return {left:8,right:size.width-8,top:F.room?Math.round(size.height*0.3):75,bottom:F.room?size.height-8:208};}
  function resetScene(){
    leaveFurniture();keys.clear();moving=false;
    const size=worldSize(),bounded=limits();
    player={x:Math.round(size.width/2),y:Math.min(bounded.bottom,Math.max(bounded.top,Math.round(size.height*0.64)))};
    item={x:Math.round(size.width*0.64),y:Math.min(bounded.bottom-4,Math.round(size.height*0.67)),picked:false};
    setAction('idle');direction.value='down';
  }
  function useScene(){
    roomSize=F.room?{width:F.room.width,height:F.room.height}:{width:320,height:224};
    resetScene();
    furnitureSelect.replaceChildren();
    for(const f of F.layout)furnitureSelect.append(new Option(f.name,f.id));
    if(!F.layout.length)furnitureSelect.append(new Option('场景里还没有家具',''));
    help.textContent=helpIntro+(F.hint?' ｜ '+F.hint:'');
  }
  function useFurniture(f){
    if(!f){report('场景里还没有家具：先在场景绘制的“家具与设施”层画好家具，再点刷新场景。');return;}
    leaveFurniture();keys.clear();moving=false;
    const bounded=limits();
    returnPoint=F.blocked(player.x,player.y)?{x:f.x,y:Math.min(bounded.bottom,f.y+3)}:{...player};
    attached=f;player={x:f.x,y:f.y};setAction('sit');
    report('正在测试：'+f.name+'；按 F 起身，或直接移动离开。');scene.focus();
  }
  function interact(){if(attached){leaveFurniture();setAction('idle');}else{const f=F.nearest(player);if(f)useFurniture(f);else report('请靠近家具，或选择家具后点“就位测试”。');}scene.focus();}
  function sit(){if(attached||action==='sit'){leaveFurniture();setAction('idle');}else{const f=F.nearest(player);if(f)useFurniture(f);else setAction('sit');}scene.focus();}
  actionSelect.onchange=()=>{leaveFurniture();setAction(actionSelect.value);scene.focus();};direction.onchange=()=>{if(attached){leaveFurniture();setAction('idle');}scene.focus();};
  const sceneSelect=node('select');sceneSelect.setAttribute('aria-label','场景来源');
  const refreshScene=button('刷新场景',async()=>{
    if(!p.ready)throw new Error('请等待工程读取完成');
    await loadScene(sceneSelect.value);
    report(F.source?'已读取场景「'+F.source.name+'」：家具 '+F.layout.length+' 件':'已清空场景家具');
    scene.focus();
  },controls);
  controls.insertBefore(sceneSelect,controls.firstElementChild);
  sceneSelect.onchange=()=>{loadScene(sceneSelect.value).then(()=>{
    report(F.source?'已读取场景「'+F.source.name+'」：家具 '+F.layout.length+' 件':'已清空场景家具');
    scene.focus();
  }).catch(e=>report(e.message,true));};
  const furnitureSelect=node('select');furnitureSelect.setAttribute('aria-label','测试家具');furnitureSelect.append(new Option('场景里还没有家具',''));controls.append(furnitureSelect);
  button('就位测试',()=>useFurniture(F.layout.find(f=>f.id===furnitureSelect.value)),controls);
  button('使用 / 起身 (F)',interact,controls);
  button('坐下 / 站起 (C)',sit,controls);
  function pickup(){leaveFurniture();setAction('pickup');pickupUntil=performance.now()+900;if(Math.hypot(player.x-item.x,player.y-item.y)<25){item.picked=true;report('已拾取测试物件；可重置场景继续测试。');}else report('正在测试拾取动作。走到黄色物件旁可实际拾取。');scene.focus();}
  button('拾取 (E)',pickup,controls);
  button('脱下全部',()=>{equipped={};equipText();renderList();},controls);
  button('重置场景',()=>{resetScene();report('测试场景已重置');scene.focus();},controls);
  scene.addEventListener('keydown',e=>{
    e.stopPropagation();
    const key=e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','c','e','f'].includes(key))return;
    e.preventDefault();e.stopPropagation();if(e.repeat&&['c','e','f'].includes(key))return;
    if(key==='c')sit();else if(key==='e')pickup();else if(key==='f')interact();else keys.add(key);
  });
  scene.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());e.stopPropagation();});scene.addEventListener('blur',()=>keys.clear());window.addEventListener('blur',()=>keys.clear());
  // Editor shortcuts must not consume drawing keys while a modal is active.
  window.addEventListener('keydown',e=>{if(dialog.open&&e.key!=='Escape'&&e.target!==scene)e.stopPropagation();},true);
  const ctx=scene.getContext('2d');
  function drawRoom(){
    const size=worldSize();
    if(F.room){ctx.drawImage(F.room.canvas,0,0);return;}
    // 没有场景绘制工程时的空房间：只有地面和墙，不画任何家具。
    ctx.fillStyle='#be9b7b';ctx.fillRect(0,0,size.width,size.height);ctx.fillStyle='#ddd0aa';ctx.fillRect(0,0,size.width,57);ctx.fillStyle='#79645b';ctx.fillRect(0,55,size.width,5);
    ctx.fillStyle='#b59273';for(let x=0;x<size.width;x+=16){ctx.fillRect(x,60,1,size.height-60);for(let y=68+(x%32?16:0);y<size.height;y+=32)ctx.fillRect(x,y,16,1);}
  }
  function render(now){
    if(!dialog.open)return;
    const dt=Math.min((now-last)/1000||0,0.05);last=now;
    const bounded=limits();
    let dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),dy=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
    if(dx||dy){leaveFurniture();const length=Math.hypot(dx,dy),x=Math.max(bounded.left,Math.min(bounded.right,player.x+dx/length*65*dt)),y=Math.max(bounded.top,Math.min(bounded.bottom,player.y+dy/length*65*dt));if(!F.blocked(x,player.y))player.x=x;if(!F.blocked(player.x,y))player.y=y;direction.value=dx?(dx<0?'left':'right'):(dy<0?'up':'down');setAction('walk');moving=true;}
    else if(moving){if(action==='walk')setAction('idle');moving=false;}
    if(action==='pickup'&&pickupUntil&&now>pickupUntil){pickupUntil=0;setAction('idle');}
    elapsed+=dt*1000;
    // 按高清倍率放大画布：房间按格子画，人物的高清图层就按源像素落屏，不再被压成格子。
    const roomScale=applyResolution();
    ctx.setTransform(roomScale,0,0,roomScale,0,0);
    ctx.imageSmoothingEnabled=false;drawRoom();
    if(!item.picked){ctx.fillStyle='#9c7836';ctx.fillRect(item.x-4,item.y-2,8,5);ctx.fillStyle='#e4bc5a';ctx.fillRect(item.x-3,item.y-5,6,5);}
    const behind=F.layout.filter(f=>f===attached||f.y<=player.y),ahead=F.layout.filter(f=>!behind.includes(f));
    for(const f of behind)F.draw(ctx,f);
    if(!attached){ctx.fillStyle='#79645b3b';ctx.fillRect(Math.round(player.x)-6,Math.round(player.y)-1,12,3);}
    const missing=[],commands=[],dir=direction.value,location=base&&W.locate(base,action,dir);
    const fi=location?W.frameAt(location.sheet,location.action,elapsed,action!=='pickup'):0;
    if(!location)missing.push('底稿缺少'+W.actions[action]+' / '+dir);
    function collect(project,loc,frameIndex,label,isBase,quiet){
      if(!loc?.action.frames[frameIndex]){missing.push(label+'缺少'+W.actions[action]+' / '+dir+' 第'+(frameIndex+1)+'帧');return;}
      const key=project.getFrameKey(loc.si,loc.ai,frameIndex);let found=false;
      for(const l of PE.getRenderLayers(project,loc.si,loc.ai)){
        if(isBase&&/ 描边$/.test(l.name))continue;
        if(!PE.isLayerVisible(project,l,loc.si)||l.opacity<=0||(isBase&&!W.isBase(l)&&PE.VisualLayers.category(l)!=='五官'))continue;
        // 已经穿戴同部位五官成品时，素体自带的眼/嘴不再叠在下面。
        if(isBase&&wornFace.size&&PE.VisualLayers.category(l)==='五官'&&wornFace.has(PE.classifyPart(String(l.name||'').replace(/ 描边$/, ''))?.slot))continue;
        const image=l.getFrameData(key);if(!image)continue;
        if(W.hasPixels(image))found=true;
        let canvas=images.get(image);if(!canvas){canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').putImageData(image,0,0);images.set(image,canvas);}
        commands.push({l,canvas,placement:image.placement,frame:loc.action.frames[frameIndex],flip:loc.flip,rank:W.rank(l,loc.action.direction,project,key)});
      }
      if(!found&&!quiet)missing.push(label+'在'+W.actions[action]+' / '+dir+' 第'+(frameIndex+1)+'帧无像素（可能未制作或刻意留空）');
    }
    // 穿戴五官成品时，衣柜素体自带的同部位五官要让位，避免两套眼睛叠在一起。
    const wornFace=new Set();
    for(const e of Object.values(equipped))if(e.data.wardrobe.category==='五官')for(const l of e.project.layers)if(!l.isGroup){const slot=PE.classifyPart(String(l.name||'').replace(/ 描边$/, ''))?.slot;if(slot)wornFace.add(slot);}
    if(location)collect(base,location,fi,'底稿',true);
    // 五官（眼睛、嘴巴）按部件收藏，背面本来就没有像素，不当作缺动作报错。
    for(const e of Object.values(equipped))collect(e.project,W.locate(e.project,action,dir),fi,e.data.name,false,e.data.wardrobe.category==='五官');
    commands.sort((a,b)=>a.rank-b.rank);
    // 人物按当前帧的真实高度落地，16 规格与旧 32 规格都站在同一条脚线上。
    for(const c of commands){ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y));if(c.flip)ctx.scale(-1,1);ctx.globalAlpha=c.l.opacity??1;const r=c.placement||{x:0,y:0,w:c.canvas.width,h:c.canvas.height};ctx.drawImage(c.canvas,-Math.floor(c.frame.width/2)+r.x,-c.frame.height+r.y,r.w,r.h);ctx.restore();}
    for(const f of ahead)F.draw(ctx,f);
    const text=W.actions[action]+' · '+({down:'正面',up:'背面',left:'左侧',right:'右侧'}[dir])+' · '+(fi+1)+'帧'+(missing.length?' ｜ '+missing.join('；'):' ｜ 当前帧已匹配');if(warnings.textContent!==text)warnings.textContent=text;
    scene.dataset.action=action;scene.dataset.direction=dir;scene.dataset.x=player.x;scene.dataset.y=player.y;scene.dataset.picked=String(item.picked);scene.dataset.furniture=attached?.id||'';
    raf=requestAnimationFrame(render);
  }
  dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);keys.clear();});
  async function loadScene(id){
    if(!p.ready)throw new Error('请等待工程读取完成');
    sceneSource=id||'';
    try{localStorage.setItem('pixel-wardrobe-scene',sceneSource);}catch(error){/* 本地存储不可用时只影响记忆，不影响试穿 */}
    await F.load({base:p.base,headers:p.headers},sceneSource);
    useScene();last=performance.now();
  }
  async function loadSceneSources(){
    const projects=await F.projects({base:p.base,headers:p.headers}),saved=(()=>{try{return localStorage.getItem('pixel-wardrobe-scene')||'';}catch(error){return '';}})();
    const chosen=projects.some(project=>project.id===saved)?saved:(projects[0]?.id||'');
    sceneSelect.replaceChildren(new Option('不使用场景（空房间）',''),...projects.map(project=>new Option(project.name,project.id)));
    sceneSelect.value=chosen;
    await loadScene(chosen);
    report(F.source?'已读取场景「'+F.source.name+'」：家具 '+F.layout.length+' 件':F.hint||'衣柜场景内没有任何家具；在场景绘制里画好家具后点“刷新场景”。');
  }
  async function open(){
    if(!p.ready)throw new Error('请等待当前工程读取完成');
    app.animationPlayer.pause();
    const response=await fetch(p.base+'/api/project?id='+W.baseProjectId,{headers:p.headers,cache:'no-store'});
    if(!response.ok)throw new Error('衣柜素体读取失败：'+response.status);
    base=await W.decode(await response.json());
    dialog.showModal();report('正在读取成品衣柜…');updateChoices();equipText();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(render);scene.focus();
    try{await loadSceneSources();}catch(e){report(e.message,true);}
    try{report('已启用自动同步；试穿不会写入绘画工程。');await load();}catch(e){report(e.message,true);}
  }
  const entry=button('成品衣柜 / 换装测试',open);entry.id='wardrobe-open';document.querySelector('.project-bar').append(entry);
});
