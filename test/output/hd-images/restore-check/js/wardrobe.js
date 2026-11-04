/* Finished pieces use the existing revision-checked project store, never a branch copy. */
window.PE=window.PE||{};
PE.Wardrobe={
  actions:{idle:'待机',walk:'走路',sit:'坐下',pickup:'拾取'},
  hasPixels(image){return !!image?.data.some((v,i)=>i%4===3&&v);},
  family(layer){return PE.VisualLayers.partName(layer)||layer.name;},
  isBase(layer){return /^(body|head|身体|头部)$/.test(layer.name)||PE.isHandLayer(layer);},
  choices(project){
    const groups=new Map();
    for(const layer of project.layers){
      if(layer.isGroup||this.isBase(layer))continue;
      const sheets=[...new Set([...layer.frameData].filter(([k,d])=>this.hasPixels(d)&&project.spriteSheets[Number(k.split('_')[0])]?.name.startsWith('original32_')).map(([k])=>Number(k.split('_')[0])))];
      if(!sheets.length)continue;
      const key=this.family(layer);
      if(!groups.has(key))groups.set(key,{key,category:PE.VisualLayers.category(layer),visible:false});
      if(sheets.some(si=>PE.isLayerVisible(project,layer,si)))groups.get(key).visible=true;
    }
    return [...groups.values()];
  },
  snapshot(raw,selected,name,category,sourceProjectId){
    if(!name.trim()||!['头发','衣服'].includes(category))throw new Error('请填写成品名称和类别');
    const wanted=new Set(selected),layers=raw.layers.filter(l=>!l.isGroup&&!this.isBase(l)&&wanted.has(this.family(l))).flatMap(l=>{
      const sheets=new Set(Object.keys(l.frameData||{}).map(k=>Number(k.split('_')[0])));
      return [...sheets].filter(si=>l.sheetIndex===undefined||l.sheetIndex===si).map(si=>({...l,sheetIndex:si}));
    });
    const indices=[...new Set(layers.map(l=>l.sheetIndex))].filter(si=>raw.spriteSheets[si]?.name.startsWith('original32_'));
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
    const si=project.spriteSheets.findIndex(s=>s.name==='original32_'+action),s=project.spriteSheets[si];
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
  rank(layer,direction){
    // shortcut: 人物部位使用固定穿插顺序，需要任意遮挡层级时再增加显式插槽。
    const n=layer.name;
    if(n.startsWith('发饰 /'))return 40;
    if(n.startsWith('头发 /')&&n.endsWith('后发'))return direction==='up'?35:-20;
    if(n==='hand 2')return -10;
    if(/^(body|身体)$/.test(n))return 0;
    if(n.startsWith('服装 /'))return 10;
    if(/^(head|头部)$/.test(n))return 20;
    if(PE.isHandLayer(layer))return 15;
    return 30;
  },
  async decode(data){const ex=new PE.ExportManager();return (await ex.importProject(new Blob([JSON.stringify(data)]))).project;},
  drawFrame(ctx,project,location,fi,x,y,filter=()=>true){
    const frame=location.action.frames[fi];if(!frame)return false;
    const key=project.getFrameKey(location.si,location.ai,fi);let nonempty=false;
    for(const layer of PE.getRenderLayers(project,location.si,location.ai)){
      if(!filter(layer)||!PE.isLayerVisible(project,layer,location.si)||layer.opacity<=0)continue;
      const image=layer.getFrameData(key);if(!image)continue;
      const temp=document.createElement('canvas');temp.width=image.width;temp.height=image.height;temp.getContext('2d').putImageData(image,0,0);
      ctx.save();ctx.globalAlpha=layer.opacity??1;ctx.translate(x,y);if(location.flip)ctx.scale(-1,1);ctx.drawImage(temp,-Math.floor(frame.width/2),-Math.floor(frame.height/2));ctx.restore();
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
      const fw=Math.max(...frames.map(f=>f.width)),fh=Math.max(...frames.map(f=>f.height)),w=fw*cols,h=fh*sheet.actions.length;
      if(w>32767||h>32767||w*h>16*1024*1024)throw new Error('成品阵列过大');
      const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
      const rows=sheet.actions.map((a,ai)=>{a.frames.forEach((f,fi)=>this.drawFrame(ctx,p,{si,ai,action:a,flip:false},fi,fi*fw+Math.floor(fw/2),ai*fh+Math.floor(fh/2)));return {direction:a.direction,frames:a.frames.length,durationsMs:a.frames.map(f=>sheet.useFrameDurations!==false&&f.duration>0?f.duration:1000/(sheet.fps||8))};});
      const file=sheet.name+'.png';zip.file(file,c.toDataURL('image/png').split(',')[1],{base64:true});manifest.push({file,frameWidth:fw,frameHeight:fh,columns:cols,rows});arrays.push(c);
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
  const app=PE.app,W=PE.Wardrobe,p=app.persistence;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const dialog=node('dialog','wardrobe-dialog');dialog.setAttribute('aria-labelledby','wardrobe-title');document.body.append(dialog);
  const status=node('p','wardrobe-status');status.setAttribute('role','status');
  function report(text,error=false){status.textContent=text;status.classList.toggle('save-error',error);}
  function button(text,fn,parent){const b=node('button','studio-button',text);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){report(e.message,true);}finally{b.disabled=false;}};parent?.append(b);return b;}
  const title=node('div','dialog-title'),heading=node('h2','','成品衣柜 / 换装测试');heading.id='wardrobe-title';title.append(heading);button('关闭衣柜',()=>dialog.close(),title);dialog.append(title);
  dialog.append(node('p','wardrobe-note','分支是草稿，衣柜只存你确认完成的部件。试穿不会修改当前工程；缺动作会提示，不自动补画。导出包包含单件的“全部动作.png”和独立成品JSON。'));
  const grid=node('div','wardrobe-grid'),library=node('section','wardrobe-library'),stage=node('section','wardrobe-stage');grid.append(library,stage);dialog.append(grid,status);
  const register=node('details','wardrobe-register'),summary=node('summary','','＋ 标记当前工程的成品');register.append(summary);library.append(register);
  const form=node('div','wardrobe-form'),nameLabel=node('label','','成品名称 '),nameInput=node('input');nameInput.maxLength=60;nameInput.placeholder='例如：灰色长发 / 深蓝JK套装';nameLabel.append(nameInput);
  const categoryLabel=node('label','','成品类别 '),category=node('select');category.append(new Option('头发','头发'),new Option('衣服','衣服'));categoryLabel.append(category);form.append(nameLabel,categoryLabel);
  const choices=node('div','wardrobe-choices');form.append(node('p','wardrobe-note','勾选属于这一件成品的部件；会收录这些部件的全部已有动作，不带身体和其他草稿。自定义命名的图层也可勾选。'),choices);register.append(form);
  const saveRow=node('div','wardrobe-buttons');form.append(saveRow);
  const filter=node('select');filter.setAttribute('aria-label','衣柜类别筛选');filter.append(new Option('全部成品',''),new Option('头发','头发'),new Option('衣服','衣服'));library.append(filter);
  const list=node('div','wardrobe-items');library.append(list);button('刷新成品列表',async()=>{await load();report('已刷新成品列表');},library);
  const scene=node('canvas','wardrobe-scene');scene.width=320;scene.height=224;scene.tabIndex=0;scene.setAttribute('aria-label','换装测试场景：方向键或WASD移动，C坐下或站起，E拾取');
  stage.append(node('h3','','换装试验场'),scene);
  const help=node('p','wardrobe-note','点击场景后：方向键 / WASD 移动，C 坐下 / 站起，E 拾取。走到黄色物件旁可拾取；也可直接测试动作。');stage.append(help);
  const controls=node('div','wardrobe-buttons');stage.append(controls);
  const direction=node('select');direction.setAttribute('aria-label','测试朝向');for(const [value,label]of [['down','正面'],['left','左侧'],['right','右侧'],['up','背面']])direction.append(new Option(label,value));controls.append(direction);
  const actionSelect=node('select');actionSelect.setAttribute('aria-label','测试动作');for(const [key,label]of Object.entries(W.actions))actionSelect.append(new Option(label,key));controls.append(actionSelect);
  const equipment=node('p','wardrobe-equipment'),warnings=node('p','wardrobe-warnings');warnings.setAttribute('role','status');stage.append(equipment,warnings);
  let entries=[],selected=null,base=null,equipped={},raf=0,last=0,elapsed=0,action='idle',moving=false,keys=new Set(),player={x:160,y:144},item={x:206,y:151,picked:false},pickupUntil=0;
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
    const raw=JSON.parse(await app.exportManager.exportProject(false).text()),data=W.snapshot(raw,[...choices.querySelectorAll('input:checked')].map(e=>e.value),nameInput.value,category.value,p.projectId);
    const id=existing?selected.id:'finished-'+crypto.randomUUID(),revision=existing?selected.revision:'none';
    const response=await fetch(p.base+'/api/project?id='+id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(data)});
    if(response.status===409)throw new Error('成品已被其他窗口修改，未覆盖。请刷新成品列表后比较，再决定是否更新。');
    if(!response.ok)throw new Error('成品保存失败：'+response.status);
    await load(id);report('已独立保存：'+data.name+'。原工程及未保存草稿保持不变。');register.open=false;
  }
  button('收录为新成品',()=>save(false),saveRow);button('更新选中成品',()=>save(true),saveRow);
  function coverage(entry){
    return Object.entries(W.actions).map(([key,label])=>{
      const s=entry.project.spriteSheets.find(s=>s.name==='original32_'+key);if(!s)return label+'：缺少';
      const si=entry.project.spriteSheets.indexOf(s);
      const rows=s.actions.map((a,ai)=>{const filled=a.frames.filter((_,fi)=>entry.project.layers.some(l=>W.hasPixels(l.getFrameData(`${si}_${ai}_${fi}`)))).length;return ({down:'正',up:'背',side:'侧',left:'左',right:'右'}[a.direction]||a.direction)+filled+'/'+a.frames.length;});
      return label+'：'+rows.join(' ');
    }).join('；');
  }
  function equipText(){equipment.textContent='试穿：头发 · '+(equipped['头发']?.data.name||'未穿戴')+'　/　衣服 · '+(equipped['衣服']?.data.name||'未穿戴');}
  function renderList(){
    list.replaceChildren();
    for(const entry of entries.filter(e=>!filter.value||e.data.wardrobe.category===filter.value)){
      const card=node('article','wardrobe-item');card.classList.toggle('selected',selected?.id===entry.id);
      const thumb=node('canvas','wardrobe-thumb');thumb.width=64;thumb.height=64;
      const loc=W.locate(entry.project,'idle','down')||entry.project.spriteSheets.flatMap((s,si)=>s.actions.map((a,ai)=>({si,ai,action:a,flip:false}))).find(l=>l.action.frames.length);
      if(loc){const ctx=thumb.getContext('2d');ctx.scale(2,2);W.drawFrame(ctx,entry.project,loc,0,16,16);}
      const content=node('div');content.append(node('strong','',entry.data.name),node('small','',entry.data.wardrobe.category+' · '+entry.data.wardrobe.sourceName));
      const details=node('details'),s=node('summary','','动作覆盖（有像素帧 / 总帧）');details.append(s,node('p','wardrobe-note',coverage(entry)));content.append(details);
      const row=node('div','wardrobe-buttons');
      button('选中',()=>{selected=entry;nameInput.value=entry.data.name;category.value=entry.data.wardrobe.category;updateChoices();renderList();report('已选中 '+entry.data.name+'；可试穿、导出或更新。');},row);
      const wear=button(equipped[entry.data.wardrobe.category]?.id===entry.id?'已穿戴':'试穿',()=>{equipped[entry.data.wardrobe.category]=entry;equipText();renderList();},row);wear.setAttribute('aria-pressed',String(equipped[entry.data.wardrobe.category]?.id===entry.id));
      button('一键导出',()=>W.exportItem(entry),row);
      button('移出衣柜',async()=>{
        if(!confirm('将「'+entry.data.name+'」移出成品衣柜？原草稿不变，独立文件保留。'))return;
        const data=structuredClone(entry.data);data.wardrobe.archived=true;
        const r=await fetch(p.base+'/api/project?id='+entry.id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':entry.revision},body:JSON.stringify(data)});
        if(!r.ok)throw new Error(r.status===409?'成品版本已变化，请刷新列表后重试':'移出失败：'+r.status);
        for(const c of Object.keys(equipped))if(equipped[c]?.id===entry.id)delete equipped[c];await load();report('已移出衣柜；独立文件仍保留。');
      },row);content.append(row);card.append(thumb,content);list.append(card);
    }
    if(!list.childElementCount)list.append(node('p','wardrobe-empty','这里还没有成品。展开上方“标记当前工程的成品”，手动勾选收录；不会自动把旧半成品放进来。'));
  }
  filter.onchange=renderList;
  async function load(selectId){
    const response=await fetch(p.base+'/api/projects',{headers:p.headers,cache:'no-store'});if(!response.ok)throw new Error('衣柜读取失败：'+response.status);
    const projects=await response.json(),next=[];
    for(const {id}of projects.filter(e=>e.id.startsWith('finished-'))){
      const r=await fetch(p.base+'/api/project?id='+id,{headers:p.headers,cache:'no-store'});if(!r.ok)throw new Error('成品读取失败：'+id+' · '+r.status);
      const data=await r.json();if(data.wardrobe?.archived||!['头发','衣服'].includes(data.wardrobe?.category))continue;
      next.push({id,data,revision:r.headers.get('ETag'),project:await W.decode(data)});
    }
    entries=next;selected=entries.find(e=>e.id===(selectId||selected?.id))||null;
    for(const category of Object.keys(equipped)){const updated=entries.find(e=>e.id===equipped[category].id);if(updated)equipped[category]=updated;else delete equipped[category];}
    equipText();renderList();
  }
  function setAction(value){if(action!==value){action=value;elapsed=0;}actionSelect.value=value;}
  actionSelect.onchange=()=>{setAction(actionSelect.value);scene.focus();};direction.onchange=()=>scene.focus();
  button('坐下 / 站起 (C)',()=>{setAction(action==='sit'?'idle':'sit');scene.focus();},controls);
  function pickup(){setAction('pickup');pickupUntil=performance.now()+900;if(Math.hypot(player.x-item.x,player.y-item.y)<25){item.picked=true;report('已拾取测试物件；可重置场景继续测试。');}else report('正在测试拾取动作。走到黄色物件旁可实际拾取。');scene.focus();}
  button('拾取 (E)',pickup,controls);
  button('脱下全部',()=>{equipped={};equipText();renderList();},controls);
  button('重置场景',()=>{player={x:160,y:144};item.picked=false;keys.clear();setAction('idle');direction.value='down';report('测试场景已重置');scene.focus();},controls);
  scene.addEventListener('keydown',e=>{
    e.stopPropagation();
    const key=e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','c','e'].includes(key))return;
    e.preventDefault();e.stopPropagation();if(e.repeat&&(key==='c'||key==='e'))return;
    if(key==='c')setAction(action==='sit'?'idle':'sit');else if(key==='e')pickup();else keys.add(key);
  });
  scene.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());e.stopPropagation();});scene.addEventListener('blur',()=>keys.clear());window.addEventListener('blur',()=>keys.clear());
  // Editor shortcuts must not consume drawing keys while a modal is active.
  window.addEventListener('keydown',e=>{if(dialog.open&&e.key!=='Escape'&&e.target!==scene)e.stopPropagation();},true);
  const ctx=scene.getContext('2d');
  function render(now){
    if(!dialog.open)return;
    const dt=Math.min((now-last)/1000||0,0.05);last=now;
    let dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),dy=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
    if(dx||dy){const length=Math.hypot(dx,dy);player.x=Math.max(20,Math.min(300,player.x+dx/length*65*dt));player.y=Math.max(75,Math.min(208,player.y+dy/length*65*dt));direction.value=dx?(dx<0?'left':'right'):(dy<0?'up':'down');setAction('walk');moving=true;}
    else if(moving){if(action==='walk')setAction('idle');moving=false;}
    if(action==='pickup'&&pickupUntil&&now>pickupUntil){pickupUntil=0;setAction('idle');}
    elapsed+=dt*1000;
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#dfe6d9';ctx.fillRect(0,0,320,224);ctx.fillStyle='#bccbbd';ctx.fillRect(0,0,320,57);ctx.fillStyle='#8da791';ctx.fillRect(0,55,320,5);
    ctx.strokeStyle='#cbd6c4';ctx.lineWidth=1;for(let x=0;x<320;x+=32){ctx.beginPath();ctx.moveTo(x,60);ctx.lineTo(x,224);ctx.stroke();}for(let y=64;y<224;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(320,y);ctx.stroke();}
    ctx.fillStyle='#9e806b';ctx.fillRect(41,52,40,7);ctx.fillRect(45,59,5,10);ctx.fillRect(72,59,5,10);ctx.fillStyle='#6e8c71';ctx.fillRect(265,26,18,22);ctx.fillStyle='#a28f75';ctx.fillRect(268,48,12,12);
    if(!item.picked){ctx.fillStyle='#9c7836';ctx.fillRect(item.x-4,item.y-2,8,5);ctx.fillStyle='#e4bc5a';ctx.fillRect(item.x-3,item.y-5,6,5);}
    ctx.fillStyle='#758d773b';ctx.beginPath();ctx.ellipse(player.x,player.y,11,3,0,0,Math.PI*2);ctx.fill();
    const missing=[],commands=[],dir=direction.value,location=base&&W.locate(base,action,dir);
    const fi=location?W.frameAt(location.sheet,location.action,elapsed,action!=='pickup'):0;
    if(!location)missing.push('底稿缺少'+W.actions[action]+' / '+dir);
    function collect(project,loc,frameIndex,label,isBase){
      if(!loc?.action.frames[frameIndex]){missing.push(label+'缺少'+W.actions[action]+' / '+dir+' 第'+(frameIndex+1)+'帧');return;}
      const key=project.getFrameKey(loc.si,loc.ai,frameIndex);let found=false;
      for(const l of PE.getRenderLayers(project,loc.si,loc.ai)){
        if(!PE.isLayerVisible(project,l,loc.si)||l.opacity<=0||(isBase&&!W.isBase(l)&&PE.VisualLayers.category(l)!=='五官'))continue;
        const image=l.getFrameData(key);if(!image)continue;
        if(W.hasPixels(image))found=true;
        let canvas=images.get(image);if(!canvas){canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').putImageData(image,0,0);images.set(image,canvas);}
        commands.push({l,canvas,frame:loc.action.frames[frameIndex],flip:loc.flip,rank:W.rank(l,loc.action.direction)});
      }
      if(!found)missing.push(label+'在'+W.actions[action]+' / '+dir+' 第'+(frameIndex+1)+'帧无像素（可能未制作或刻意留空）');
    }
    if(location)collect(base,location,fi,'底稿',true);
    for(const e of Object.values(equipped))collect(e.project,W.locate(e.project,action,dir),fi,e.data.name,false);
    commands.sort((a,b)=>a.rank-b.rank);
    for(const c of commands){ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y)-16);if(c.flip)ctx.scale(-1,1);ctx.globalAlpha=c.l.opacity??1;ctx.drawImage(c.canvas,-Math.floor(c.frame.width/2),-Math.floor(c.frame.height/2));ctx.restore();}
    const text=W.actions[action]+' · '+({down:'正面',up:'背面',left:'左侧',right:'右侧'}[dir])+' · '+(fi+1)+'帧'+(missing.length?' ｜ '+missing.join('；'):' ｜ 当前帧已匹配');if(warnings.textContent!==text)warnings.textContent=text;
    scene.dataset.action=action;scene.dataset.direction=dir;scene.dataset.x=player.x;scene.dataset.y=player.y;scene.dataset.picked=String(item.picked);
    raf=requestAnimationFrame(render);
  }
  dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);keys.clear();});
  async function open(){
    if(!p.ready)throw new Error('请等待当前工程读取完成');
    app.animationPlayer.pause();base=await W.decode(JSON.parse(await app.exportManager.exportProject(false).text()));
    dialog.showModal();report('正在读取成品衣柜…');updateChoices();equipText();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(render);scene.focus();
    try{await load();report('衣柜只显示手动收录的成品；试穿不会写入绘画工程。');}catch(e){report(e.message,true);}
  }
  const entry=button('成品衣柜 / 换装测试',open);entry.id='wardrobe-open';document.querySelector('.project-bar').append(entry);
});
