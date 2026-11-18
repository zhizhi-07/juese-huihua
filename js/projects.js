/* Each AI works in its own project URL; the main character project stays separate. */
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,p=app.persistence,bar=document.createElement('nav');
  bar.setAttribute('aria-label','人物与场景工程');
  bar.className='project-bar';
  const menu=document.createElement('details');menu.className='project-menu';
  const summary=document.createElement('summary');summary.textContent='工程操作';menu.append(summary);
  const actions=document.createElement('div');actions.className='project-actions';menu.append(actions);bar.append(menu);
  menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  document.getElementById('studio-header').after(bar);
  const label=document.createElement('strong');label.textContent='正在打开工程…';label.title=p.projectId;bar.prepend(label);
  const button=(text,fn)=>{const b=document.createElement('button');b.className='studio-button';b.textContent=text;b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{b.disabled=false;}};actions.append(b);};
  const show=p.show.bind(p);p.show=(...args)=>{label.textContent='工程：'+(app.project.name||'未命名');document.title=(app.project.name||'像素工作台')+' · 像素工作台';show(...args);};
  button('改名字',async()=>{if(!p.ready)return;const name=prompt('工程中文名',app.project.name);if(!name?.trim())return;app.project.name=name.trim().slice(0,40);p.markDirty();await p.saveNow();await refresh();});
  async function create(scene,character=false){
    if(!p.ready)throw new Error('请等待当前工程读取完成');
    const name=prompt(scene?'场景名称':character?'人物分支名称（例如 白裙、短袖）':'独立稿名称',scene?'厨房场景':character?'人物-衣服独立稿':'独立稿');
    if(!name?.trim())return;
    let data,baseRevision;
    if(scene){
      const size=prompt('画布宽×高（像素，16格比例；最大1024×1024）','160x128');
      if(size===null)return;
      const match=/^(\d+)\s*[x×*]\s*(\d+)$/.exec(size.trim());
      if(!match)throw new Error('请输入例如 320x256');
      const w=Number(match[1]),h=Number(match[2]);
      if(w<1||h<1||w>1024||h>1024)throw new Error('宽高需要在1到1024之间');
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const blank=c.toDataURL();
      data={version:'1.0',name:name.trim(),bgColor:'#b8c8c3',palette:app.project.palette,
        currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:1,
        spriteSheets:[{name:'场景画布',frameWidth:w,frameHeight:h,columns:1,rows:1,imageDataURL:blank,actions:[{name:'场景',direction:'none',frames:[{sheetIndex:0,sourceX:0,sourceY:0,width:w,height:h}]}]}],
        layers:['地面','家具与设施','装饰'].map(name=>({name,sheetIndex:0,visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width:w,height:h,dataURL:blank}}}))};
    }else{
      if(character){
        const status=await fetch(p.base+'/api/status',{headers:p.headers,cache:'no-store'});
        if(!status.ok)throw new Error('无法读取当前人物素体，未新建分支');
        const baseId=(await status.json()).characterBaseProjectId||'main';
        if(p.projectId===baseId&&p.dirty&&!await p.saveNow())throw new Error('素体保存未完成，未新建分支；请先处理保存冲突');
        const source=await fetch(p.base+'/api/project?id='+baseId,{headers:p.headers,cache:'no-store'});
        if(!source.ok)throw new Error('人物主工程读取失败：'+source.status);
        if(baseId!=='main')baseRevision=source.headers.get('ETag');
        data=await source.json();
      }else{data=JSON.parse(await app.exportManager.exportProject(false).text());}
      data.name=name.trim();
      if(character||data.layers.some(l=>/^(body|head|身体|头部)$/.test(l.name))){
        PE.characterBase(data);
      }
    }
    const id=(scene?'scene-':character?'character-':'draft-')+crypto.randomUUID();
    const response=await fetch(p.base+'/api/project?id='+id+(baseRevision?'&baseRevision='+encodeURIComponent(baseRevision):''),{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':'none'},body:JSON.stringify(data)});
    if(response.status===409)throw new Error('人物素体或工程版本已变化，未新建分支；请重试');
    if(!response.ok)throw new Error('新建失败：'+response.status+'；需要更新并重新启动编辑器服务');
    try{const chat=localStorage.getItem('pixel-ai-chat-'+p.projectId);if(chat)localStorage.setItem('pixel-ai-chat-'+id,chat);}catch(error){console.warn('分支对话复制失败',error);}
    const url=new URL(location.href);url.searchParams.set('project',id);
    const a=document.createElement('a');a.href=url.href;a.textContent='打开 '+data.name;a.target='_blank';a.rel='noopener';a.className='tool-btn';actions.append(a);a.click();
    await refresh();
  }
  button('新建人物／衣服分支',()=>create(false,true));
  button('分出当前工程独立稿',()=>create(false));
  PE.createProjectBranch=()=>create(false,true);
  button('＋ 场景绘制',()=>create(true));
  const select=document.createElement('select');select.setAttribute('aria-label','打开已有工程');bar.insertBefore(select,menu);
  select.onchange=()=>{if(!select.value)return;const url=new URL(location.href);url.searchParams.set('project',select.value);window.open(url.href,'_blank','noopener');select.value='';};
  async function refresh(){
    const response=await fetch(p.base+'/api/projects',{headers:p.headers});
    if(!response.ok){select.replaceChildren(new Option('工程列表需重启服务',''));return;}
    const list=await response.json();select.replaceChildren(new Option('打开已有工程…',''),...list.filter(item=>!item.id.startsWith('finished-')).map(item=>new Option(item.name,item.id)));
  }
  refresh().catch(console.error);

});
