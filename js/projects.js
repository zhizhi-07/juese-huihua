/* Each AI works in its own project URL; the main character project stays separate. */
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,p=app.persistence,bar=document.createElement('nav');
  bar.setAttribute('aria-label','人物与场景工程');
  Object.assign(bar.style,{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap',padding:'6px 12px',background:'#252630',color:'#eee',flexShrink:'0'});
  document.getElementById('studio-header').after(bar);
  const label=document.createElement('strong');label.textContent='正在打开工程…';label.title=p.projectId;bar.prepend(label);
  const button=(text,fn)=>{const b=document.createElement('button');b.className='studio-button';b.style.color='#243b33';b.style.background='#eef3ef';b.textContent=text;b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){alert(e.message);}finally{b.disabled=false;}};bar.append(b);};
  const show=p.show.bind(p);p.show=(...args)=>{label.textContent='工程：'+(app.project.name||'未命名');document.title=(app.project.name||'像素工作台')+' · 像素工作台';show(...args);};
  button('改名字',async()=>{if(!p.ready)return;const name=prompt('工程中文名',app.project.name);if(!name?.trim())return;app.project.name=name.trim().slice(0,40);p.markDirty();await p.saveNow();await refresh();});
  async function create(scene,character=false){
    if(!p.ready)throw new Error('请等待当前工程读取完成');
    const name=prompt(scene?'场景名称':character?'人物分支名称（例如 AI1-上衣、AI2-裤子）':'独立稿名称（例如 AI1-头发）',scene?'厨房场景':character?'人物-衣服独立稿':'AI 独立稿');
    if(!name?.trim())return;
    let data;
    if(scene){
      const size=prompt('画布宽×高（像素，32格比例；最大1024×1024）','320x256');
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
      if(character&&p.projectId!=='main'){
        const source=await fetch(p.base+'/api/project?id=main',{headers:p.headers,cache:'no-store'});
        if(!source.ok)throw new Error('人物主工程读取失败：'+source.status);
        data=await source.json();
      }else{data=JSON.parse(await app.exportManager.exportProject(false).text());}
      data.name=name.trim();
      if(character||data.layers.some(l=>/^(body|head|身体|头部)$/.test(l.name))){
        PE.characterBase(data);
      }
    }
    const id=(scene?'scene-':character?'character-':'draft-')+crypto.randomUUID();
    const response=await fetch(p.base+'/api/project?id='+id,{method:'PUT',headers:{...p.headers,'Content-Type':'application/json','If-Match':'none'},body:JSON.stringify(data)});
    if(!response.ok)throw new Error('新建失败：'+response.status+'；需要更新并重新启动编辑器服务');
    try{const chat=localStorage.getItem('pixel-ai-chat-'+p.projectId);if(chat)localStorage.setItem('pixel-ai-chat-'+id,chat);}catch(error){console.warn('分支对话复制失败',error);}
    const url=new URL(location.href);url.searchParams.set('project',id);url.searchParams.set('ai','1');
    const a=document.createElement('a');a.href=url.href;a.textContent='打开 '+data.name;a.target='_blank';a.rel='noopener';a.className='tool-btn';bar.append(a);a.click();
    await refresh();
  }
  button('＋ 人物／衣服分支',()=>create(false,true));
  button('分出当前工程独立稿',()=>create(false));
  PE.createProjectBranch=()=>create(false);
  button('＋ 场景绘制',()=>create(true));
  const select=document.createElement('select');select.setAttribute('aria-label','打开已有工程');bar.append(select);
  select.onchange=()=>{if(!select.value)return;const url=new URL(location.href);url.searchParams.set('project',select.value);window.open(url.href,'_blank','noopener');select.value='';};
  async function refresh(){
    const response=await fetch(p.base+'/api/projects',{headers:p.headers});
    if(!response.ok){select.replaceChildren(new Option('工程列表需重启服务',''));return;}
    const list=await response.json();select.replaceChildren(new Option('打开已有工程…',''),...list.map(item=>new Option(item.name,item.id)));
  }
  refresh().catch(console.error);
  button('建筑画法参考',()=>{
    let panel=document.getElementById('building-reference');if(panel){panel.remove();return;}
    panel=document.createElement('section');panel.id='building-reference';
    Object.assign(panel.style,{position:'fixed',right:'16px',top:'100px',zIndex:9999,background:'#252630',color:'#eee',padding:'16px',width:'min(440px,90vw)',maxHeight:'75vh',overflow:'auto',boxShadow:'0 5px 30px #0008'});
    const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>panel.remove();panel.append(close);
    const text=document.createElement('p');text.textContent='用户建筑参考：直面略俯视，屋顶、墙体、门窗、招牌与材质细节按原素材比例绘制。建筑也保留图层和动画帧；门窗、灯光等单独画，主体坐标固定。尺寸随建筑适配，不压成几个大色块。';panel.append(text);
    ['木屋','市场','商场'].forEach((name,i)=>{const label=document.createElement('p');label.textContent=name;const img=document.createElement('img');img.src='assets/building-reference/'+i+'.png';img.alt=name;img.style.imageRendering='pixelated';img.style.maxWidth='100%';panel.append(label,img);});document.body.append(panel);
  });
  button('场景画法参考',()=>{
    let panel=document.getElementById('scene-reference');
    if(panel){panel.remove();return;}
    panel=document.createElement('section');panel.id='scene-reference';
    Object.assign(panel.style,{position:'fixed',right:'20px',top:'100px',zIndex:9999,background:'#252630',color:'#eee',padding:'16px',maxWidth:'440px',boxShadow:'0 5px 30px #0008'});
    const close=document.createElement('button');close.textContent='关闭';close.style.color='#243b33';close.style.background='#eef3ef';close.onclick=()=>panel.remove();panel.append(close);
    const text=document.createElement('p');text.textContent='按原生32×32地块比例逐像素绘制；正交直线，能看见顶部和正面。沿用参考的灰紫轮廓、低饱和色阶和块面阴影，避免模糊、平滑缩放。先吸取原素材颜色，再在场景独立稿上画。';panel.append(text);
    ['组合参考','厨房384','厨房162','厨房343'].forEach((name,i)=>{const img=document.createElement('img');img.src='assets/scene-reference/'+i+'.png';img.alt=name;img.style.imageRendering='pixelated';img.style.width=i===0?'256px':'96px';img.style.maxHeight='320px';img.style.objectFit='contain';panel.append(img);});document.body.append(panel);
  });
});
