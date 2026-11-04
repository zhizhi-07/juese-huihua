document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,p=app.persistence,key='pixel-ai-chat-'+p.projectId;
  const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}};
  const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{status.textContent='浏览器存储已满，对话暂不能保留；请先保存工程。';}};
  const prefs=read('pixel-ai-settings',{});let history=read(key,[]),pending=null,undo=null,busy=false,references=[],loadingImages=false;
  if(!Array.isArray(history))history=[];
  history=history.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-30).map(m=>m.role==='assistant'&&!m.content.startsWith('【')?{...m,content:'【历史文字回复，不能据此确认已绘画】\n'+m.content}:m);
  const previousUser=history.at(-1);let lastAttempt=previousUser?.role==='user'&&!previousUser.content.startsWith('已应用')?{text:previousUser.content,review:previousUser.content.startsWith('看图检查'),frames:[]}:null;
  const panel=document.createElement('aside');panel.id='ai-chat';panel.setAttribute('aria-label','AI 绘画对话');
  panel.innerHTML=`<header><strong>AI 绘画助手</strong><button type="button" data-id="close" aria-label="收起 AI 对话">收起</button></header>
    <label>模型服务地址<input data-id="base" type="url" spellcheck="false" placeholder="http://127.0.0.1:9182"></label>
    <button data-id="connect">连接并拉取模型</button>
    <label>选择模型<select data-id="model"><option value="">请先连接</option></select></label>
    <label>画什么<select data-id="category"><option value="hair">头发／发饰</option><option value="eyes">眼睛</option><option value="clothes">衣服／裙子／鞋子</option><option value="character">人物／其他五官／动作</option><option value="building">建筑／房屋</option><option value="item">物品／家具／室内设施</option></select></label>
    <p data-id="docs" class="ai-note"></p>
    <label class="ai-motion"><input data-id="other-actions" type="checkbox">待机已全部确认，本次明确允许画其他动作</label>
    <p class="ai-note">人物部件默认只画待机。勾选仅授权本次发送；请同时在要求里说明具体动作。</p>
    <div class="ai-row"><button data-id="branch">＋ 从当前工程开分支</button><button data-id="layer">＋ AI 绘画图层</button></div>
    <p class="ai-note">AI 修改当前选中图层。先开分支，再选中要修改的图层。应用后查看画面，满意再保存。</p>
    <div data-id="messages" class="ai-messages" role="log" aria-live="polite"></div>
    <p data-id="status" class="ai-status" role="status"></p>
    <div class="ai-row"><button data-id="retry" disabled>重试上次请求</button></div>
    <details data-id="output"><summary>查看模型原始输出</summary><p data-id="output-meta" class="ai-note">此前未保留的原文无法补回；新请求的原文会显示在这里。</p><pre data-id="raw-output"></pre><button data-id="copy-output" disabled>复制原始输出</button></details>
    <details data-id="changes" class="ai-changes" hidden><summary data-id="change-title"></summary><div data-id="change-frames"></div></details>
    <div class="ai-row"><button data-id="attach">＋ 参考图片</button><button data-id="review">检查当前画面</button><input data-id="files" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden></div>
    <div data-id="attachments" class="ai-attachments" aria-label="参考图片预览"></div>
    <p class="ai-note">可上传或在输入框粘贴图片，最多三张。每次会带上工程画面；应用修改后自动看图检查。参考图仅留在本页。</p>
    <textarea data-id="input" rows="3" maxlength="12000" aria-label="告诉 AI 要画什么" placeholder="例如：沿用当前颜色，把选中前发图层的刘海改得更自然，先改当前帧。"></textarea>
    <div class="ai-row"><button data-id="send">发送</button><button data-id="cancel" disabled>停止</button><button data-id="clear">清空对话</button></div>
    <div class="ai-row"><button data-id="apply" disabled>应用 AI 修改</button><button data-id="undo" disabled>撤销本次修改</button></div>`;
  document.body.append(panel);
  const $=id=>panel.querySelector('[data-id="'+id+'"]'),status=$('status'),base=$('base'),model=$('model'),category=$('category'),input=$('input'),log=$('messages');
  $('retry').disabled=!lastAttempt;
  function showOutput(result,failed=false){
    const raw=typeof result.rawOutput==='string'?result.rawOutput:'';$('raw-output').textContent=raw||'没有可显示的原文；可能未收到内容，或请求在解析前中断。';
    $('output-meta').textContent=(failed?'请求失败':'已收到回复')+' · 停止原因：'+(result.finishReason||'未知')+' · 原文 '+(result.outputLength??raw.length)+' 字符'+(result.outputClipped?'（面板仅展示前 512000 字符）':'')+(result.error?' · '+result.error:'');
    $('copy-output').disabled=!raw;if(failed)$('output').open=true;
  }
  $('copy-output').onclick=async()=>{try{await navigator.clipboard.writeText($('raw-output').textContent);status.textContent='已复制模型原始输出';}catch{status.textContent='复制不可用，请在原文框中选中文字复制。';}};
  function showReferences(){
    $('attachments').replaceChildren();
    references.forEach((ref,index)=>{const card=document.createElement('div'),img=document.createElement('img'),remove=document.createElement('button');img.src=ref.dataURL;img.alt=ref.name;img.title=ref.name;remove.textContent='移除';remove.setAttribute('aria-label','移除 '+ref.name);remove.onclick=()=>{if(busy||loadingImages)return;references.splice(index,1);showReferences();};card.append(img,remove);$('attachments').append(card);});
  }
  async function attach(files){
    if(busy||loadingImages)return;loadingImages=true;
    try{
      for(const file of files){
        if(references.length>=3)throw new Error('最多三张参考图，请先移除已有图片');
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('请选择小于 20 MB 的 PNG、JPEG 或 WebP 图片');
        const url=URL.createObjectURL(file);
        try{
          const img=new Image();img.src=url;await img.decode();
          const scale=Math.min(1,1024/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
          const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,canvas.width,canvas.height);
          const ref={name:(file.name||'粘贴图片.png').slice(0,160),dataURL:canvas.toDataURL('image/png')};
          if(references.reduce((n,r)=>n+r.dataURL.length,ref.dataURL.length)>4*1024*1024)throw new Error('参考图总大小超过限制，请缩小图片后重试');
          references.push(ref);showReferences();
        }finally{URL.revokeObjectURL(url);}
      }
      status.textContent='已添加 '+references.length+' 张参考图，下次发送时一起交给 AI。';
    }catch(e){status.textContent=e.message;}finally{loadingImages=false;$('files').value='';}
  }
  $('attach').onclick=()=>{if(!busy)$('files').click();};$('files').onchange=()=>attach([...$('files').files]);
  input.addEventListener('paste',e=>{const files=[...e.clipboardData.items].filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();attach(files);}});
  base.value=prefs.baseURL||'http://127.0.0.1:9182';if(['hair','eyes','clothes','character','building','item'].includes(prefs.category))category.value=prefs.category;
  const toggle=document.createElement('button');toggle.className='studio-button';toggle.textContent='AI 对话';toggle.onclick=()=>panel.hidden=!panel.hidden;(document.getElementById('studio-header')||document.getElementById('top-toolbar')).append(toggle);
  $('close').onclick=()=>{panel.hidden=true;};
  // Editor shortcuts must not treat typing in the chat as drawing commands.
  panel.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='s')e.stopPropagation();});
  function render(){log.replaceChildren();for(const m of history){const item=document.createElement('div');item.className='ai-message '+m.role;const name=document.createElement('strong'),text=document.createElement('div');name.textContent=m.role==='user'?'你':'AI';text.textContent=m.content;item.append(name,text);log.append(item);}log.scrollTop=log.scrollHeight;}
  function remember(){store('pixel-ai-settings',{baseURL:base.value.trim(),model:model.value,category:category.value});}
  function docs(){const names={hair:'人物绘制AI要求与自检.md ＋ 像素发型教程与自检.md',eyes:'人物绘制AI要求与自检.md ＋ 眼睛绘制AI要求与自检.md',clothes:'人物绘制AI要求与自检.md ＋ 衣服绘制AI要求与自检.md',character:'人物绘制AI要求与自检.md',building:'建筑绘制AI要求与自检.md',item:'物品绘制AI要求与自检.md'};$('docs').textContent='自动读取：后台工程读写约定.md ＋ '+names[category.value];}
  category.onchange=()=>{pending=null;$('apply').disabled=true;$('changes').hidden=true;$('other-actions').checked=false;docs();remember();};model.onchange=remember;
  $('other-actions').onchange=()=>{pending=null;$('apply').disabled=true;};
  let controller;
  async function request(route,body,signal){
    const r=await fetch(p.base+'/api/ai/'+route,{method:'POST',headers:{...p.headers,'Content-Type':'application/json'},body:JSON.stringify({baseURL:base.value.trim(),...body}),signal});
    let result;try{result=await r.json();}catch{throw new Error('编辑器服务尚未更新，请重新运行“启动编辑器.cmd”');}
    if(!r.ok){const error=new Error(result.error||'请求失败：'+r.status);error.details=result;throw error;}return result;
  }
  async function connect(){
    $('connect').disabled=true;status.textContent='正在拉取模型…';
    try{
      const data=await request('models',{},AbortSignal.timeout(35000));
      const available=data.models.filter(m=>/^claude-opus-5-5(?:-|$)/.test(m.id)||/^gpt-6(?:[.-]|$)/.test(m.id));
      const order=id=>id==='claude-opus-5-5-medium'?0:id==='gpt-6-sol'?1:/^gpt-6\.1(?:-|$)/.test(id)?2:3;
      available.sort((a,b)=>order(a.id)-order(b.id));
      model.replaceChildren(...available.map(m=>new Option(m.name,m.id)));
      if(available.some(m=>m.id===prefs.model))model.value=prefs.model;
      if(!available.some(m=>/^gpt-6\.1(?:-|$)/.test(m.id))){const missing=new Option('GPT-6.1（服务暂未提供）','');missing.disabled=true;model.append(missing);}
      if(!available.length)throw new Error('服务未返回所需模型，请检查模型服务配置');
      remember();status.textContent='已连接 · '+available.length+' 个可选模型';
    }catch(e){status.textContent=e.message;}finally{$('connect').disabled=false;}
  }
  $('connect').onclick=connect;
  $('branch').onclick=async()=>{if(busy)return;try{await PE.createProjectBranch();}catch(e){status.textContent=e.message;}};
  $('layer').onclick=()=>{
    if(busy||!p.ready)return;
    if(p.projectId==='main'){status.textContent='请先开一个分支，再创建 AI 绘画图层。';return;}
    const name=prompt('新图层名称',category.value==='hair'?'头发 / AI新发型 / 前发':'AI 绘画');if(!name?.trim())return;
    const r=pixelAPI.addLayer(name.trim());if(!r.success){status.textContent=r.error;return;}p.markDirty();app.updateAll();status.textContent='已选中新图层：'+name;
  };
  $('clear').onclick=()=>{if(busy||loadingImages)return;history=[];references=[];showReferences();pending=null;undo=null;lastAttempt=null;$('retry').disabled=true;$('raw-output').textContent='';$('copy-output').disabled=true;store(key,history);render();$('apply').disabled=true;$('undo').disabled=true;$('changes').hidden=true;status.textContent='对话已清空';};
  function context(review=false,allowOther=$('other-actions').checked){
    const q=app.project,si=q.currentSheetIndex,li=q.currentLayerIndex,layer=q.layers[li];
    if(!review){PE.AIEdits.validate(q,li,[]);PE.AIEdits.motion(q,category.value,[{sheetIndex:si,actionIndex:q.currentActionIndex}],allowOther);if(!PE.isLayerVisible(q,layer,si)||layer.opacity===0)throw new Error('目标图层或父组已隐藏／透明，请先显示目标图层，否则画了也看不见。');}
    let total=0;
    const actions=q.spriteSheets[si].actions.map((action,ai)=>({name:action.name,direction:action.direction,actionIndex:ai,isIdle:PE.AIEdits.isIdle(q,si,ai),frames:action.frames.map((f,fi)=>{
      const pixels=PE.AIEdits.pixels(layer.getFrameData(q.getFrameKey(si,ai,fi)));total+=pixels.length;
      if(total>80000)throw new Error('当前图层像素过多，请拆分图层后再交给 AI');
      return {frameIndex:fi,width:f.width,height:f.height,locked:!!f.locked,lockedRegions:f.lockedRegions||[],targetLayerPixels:pixels};
    })}));
    return {projectId:p.projectId,name:q.name,sheetIndex:si,sheetName:q.spriteSheets[si].name,actionIndex:q.currentActionIndex,frameIndex:q.currentFrameIndex,targetLayerIndex:li,targetLayerName:layer.name,motionPolicy:{idleConfirmed:allowOther,explicitOtherActions:allowOther},pixelFormat:'targetLayerPixels 每项为 [x,y,r,g,b,a]，未列出像素为透明',palette:q.palette,layers:q.layers.map((l,i)=>({index:i,name:l.name,sheetIndex:l.sheetIndex,locked:l.locked,visible:l.visible})),actions};
  }
  function showChanges(job){
    const container=$('change-frames');container.replaceChildren();$('changes').hidden=false;$('changes').open=true;
    $('change-title').textContent='待应用：'+job.project.name+' → '+job.project.layers[job.layerIndex].name+' · '+job.count+' 个不同像素';
    const note=document.createElement('p');note.className='ai-note';note.textContent='下面是目标单层的修改前／修改后；尚未画进工程。最多预览十二项。';container.append(note);
    for(const e of job.edits.slice(0,12)){
      const q=job.project,f=q.spriteSheets[e.sheetIndex].actions[e.actionIndex].frames[e.frameIndex],label=document.createElement('button'),row=document.createElement('div');
      const xs=e.pixels.map(v=>v.x),ys=e.pixels.map(v=>v.y);
      label.textContent=q.spriteSheets[e.sheetIndex].name+' / '+q.spriteSheets[e.sheetIndex].actions[e.actionIndex].name+' / 第'+(e.frameIndex+1)+'帧 · x'+Math.min(...xs)+'–'+Math.max(...xs)+', y'+Math.min(...ys)+'–'+Math.max(...ys)+' · 定位';
      label.onclick=()=>{if(busy)return;if(app.project!==job.project){status.textContent='工程已变化，请重新生成预览';return;}app.selectFrame(e.sheetIndex,e.actionIndex,e.frameIndex);pixelAPI.selectLayer(job.layerIndex);app.canvasManager.centerView();app.canvasManager.render();panel.hidden=true;};row.append(label);
      const source=q.layers[job.layerIndex].getFrameData(q.getFrameKey(e.sheetIndex,e.actionIndex,e.frameIndex));
      const data=source?new ImageData(new Uint8ClampedArray(source.data),source.width,source.height):new ImageData(f.width,f.height);
      for(const after of [false,true]){
        if(after)for(const v of e.pixels)data.data.set([v.r,v.g,v.b,v.a],(v.y*data.width+v.x)*4);
        const canvas=document.createElement('canvas');canvas.width=data.width;canvas.height=data.height;canvas.getContext('2d').putImageData(data,0,0);
        const img=document.createElement('img');img.src=canvas.toDataURL();img.alt=after?'修改后（待应用）':'修改前';img.title=img.alt;row.append(img);
      }
      container.append(row);
    }
  }
  async function canvasImage(frames=[]){
    const q=app.project,seen=new Set(),tiles=[];
    for(const f of [{sheetIndex:q.currentSheetIndex,actionIndex:q.currentActionIndex,frameIndex:q.currentFrameIndex},...frames]){
      const key=[f.sheetIndex,f.actionIndex,f.frameIndex].join('/');if(seen.has(key))continue;seen.add(key);
      const result=pixelAPI.getFrameDataURL(f.sheetIndex,f.actionIndex,f.frameIndex);if(!result.success)throw new Error('无法读取工程画面');
      const img=new Image();img.src=result.data.dataURL;await img.decode();tiles.push({key,img});if(tiles.length===12)break;
    }
    const cols=Math.min(3,tiles.length),w=320,h=352,canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=Math.ceil(tiles.length/cols)*h;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#e2e8df';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='15px sans-serif';
    tiles.forEach(({key,img},i)=>{const x=(i%cols)*w,y=Math.floor(i/cols)*h,scale=Math.min(8,304/img.width,304/img.height);ctx.fillStyle='#263b30';ctx.fillText('sheet/action/frame: '+key,x+8,y+22);ctx.drawImage(img,x+8,y+32,Math.round(img.width*scale),Math.round(img.height*scale));});
    return canvas.toDataURL('image/png');
  }
  async function sendChat({review=false,frames=[],retry=false}={}){
    const previous=retry?lastAttempt:null;if(retry&&!previous)return;
    if(previous){review=previous.review;frames=previous.frames;}
    if(busy||loadingImages||(!retry&&!review&&!input.value.trim()&&!references.length))return;
    if(!p.ready){status.textContent='请等待工程读取完成';return;}
    if(!model.value){status.textContent='请先连接并选择模型';return;}
    if(p.projectId==='main'){status.textContent='请先点“从当前工程开分支”，AI 在独立分支里绘画。';return;}
    if(p.conflict||p.saving||app.toolManager.isDrawing){status.textContent='请先处理工程冲突，或等待当前绘画、保存结束';return;}
    if(previous?.snapshot&&(previous.snapshot.project!==app.project||previous.snapshot.version!==p.version||previous.snapshot.revision!==p.revision||previous.snapshot.layer!==app.project.currentLayerIndex||previous.snapshot.sheet!==app.project.currentSheetIndex||previous.snapshot.action!==app.project.currentActionIndex||previous.snapshot.frame!==app.project.currentFrameIndex||previous.snapshot.category!==category.value)){if(!input.value.trim())input.value=previous.text;status.textContent='工程、图层、帧或类别已变化，不能照旧重试。请按当前画面重新发送要求。';return;}
    let info;try{info=context(review,previous?.snapshot?previous.allowOther:$('other-actions').checked);}catch(e){status.textContent=e.message;return;}
    const before=app.exportManager.exportProject(false),version=p.version,revision=p.revision,project=app.project;
    if(!review){$('other-actions').checked=false;$('changes').hidden=true;}
    const text=previous?previous.text:review?'看图检查：请检查当前工程实际画面和此前要求，指出具体问题；只检查，不修改。多帧时最多展示十二帧，不能声称检查了未展示的帧。':(input.value.trim()||'请查看我上传的参考图片。');if(!review&&!retry)input.value='';if(history.at(-1)?.role!=='user'||history.at(-1)?.content!==text)history.push({role:'user',content:text});history=history.slice(-30);store(key,history);render();
    const requestReferences=previous?.references||[...references];
    lastAttempt={text,review,frames,references:requestReferences,allowOther:info.motionPolicy.explicitOtherActions,snapshot:{project,version,revision,layer:info.targetLayerIndex,sheet:info.sheetIndex,action:info.actionIndex,frame:info.frameIndex,category:category.value}};
    busy=true;pending=null;$('retry').disabled=true;$('apply').disabled=true;$('send').disabled=true;$('cancel').disabled=false;
    for(const id of ['model','category','connect','base','branch','layer','clear','attach','review','other-actions'])$(id).disabled=true;
    controller=new AbortController();const timer=setTimeout(()=>controller.abort(),190000);status.textContent=review?'AI 正在查看实际成图并自检（不会修改工程）…':'AI 正在查看工程画面、参考图并读取规范…';remember();
    let returnedResult;
    try{
      const image=await canvasImage(frames);
      const result=await request('chat',{model:model.value,category:category.value,messages:history,context:info,image,references:requestReferences,review},controller.signal);
      returnedResult=result;showOutput(result);
      let edits=[],count=0;
      if(!review){PE.AIEdits.validate(project,info.targetLayerIndex,result.edits);PE.AIEdits.motion(project,category.value,result.edits,info.motionPolicy.explicitOtherActions);edits=PE.AIEdits.changed(project,info.targetLayerIndex,result.edits);count=edits.reduce((n,e)=>n+e.pixels.length,0);}
      const message={role:'assistant',content:(review?'【看图检查，没有修改工程】':count?'【仅生成方案，尚未应用；刷新后需重新生成】':'【未产生像素修改，画面没有改变】')+'\n'+result.reply};history.push(message);store(key,history);render();
      if(count){pending={before,version,revision,project,layerIndex:info.targetLayerIndex,edits,count,category:category.value,allowOther:info.motionPolicy.explicitOtherActions,message};showChanges(pending);$('apply').disabled=false;status.textContent='已生成 '+count+' 个不同像素，修改位置和前后对比见下方；点击“应用 AI 修改”才会画入草稿。';}
      else status.textContent=review?(p.version!==version||p.revision!==revision?'检查期间工程又有变化，本次意见仅对应发送时的画面。':'看图检查已完成，意见在上方；工程未自动修改。'):'未产生任何像素变更。AI 的文字描述不代表已经绘画。';
    }catch(e){status.textContent=e.name==='AbortError'?(review?'看图检查已停止或超时，当前草稿保留。':'已停止或超时，未应用修改。'):e.message;showOutput({...e.details||returnedResult||{},error:e.message},true);}
    finally{clearTimeout(timer);busy=false;$('retry').disabled=!lastAttempt;$('send').disabled=false;$('cancel').disabled=true;for(const id of ['model','category','connect','base','branch','layer','clear','attach','review','other-actions'])$(id).disabled=false;}
  }
  $('send').onclick=()=>sendChat();$('review').onclick=()=>sendChat({review:true});
  $('retry').onclick=()=>sendChat({retry:true});
  $('cancel').onclick=()=>controller?.abort();
  $('apply').onclick=async()=>{
    const job=pending;if(!job||busy)return;
    if(p.conflict||p.version!==job.version||p.revision!==job.revision||app.project!==job.project||app.project.currentLayerIndex!==job.layerIndex){status.textContent='工程或目标图层已变化，请重新发送要求，原草稿已保留。';pending=null;$('apply').disabled=true;return;}
    try{PE.AIEdits.validate(app.project,job.layerIndex,job.edits);PE.AIEdits.motion(app.project,job.category,job.edits,job.allowOther);}catch(e){status.textContent=e.message;return;}
    busy=true;$('apply').disabled=true;const oldSuspend=app.suspendBackup,editor=document.getElementById('app-container'),oldInert=editor.inert;let started=false,applied=false;
    try{
      await p.localWrite(job.before,true);
      // Recheck after asynchronous backup; painting may have occurred while it was being written.
      if(p.version!==job.version||p.revision!==job.revision||app.project!==job.project||app.project.currentLayerIndex!==job.layerIndex)throw new Error('工程已变化，请重新发送要求');
      if(app.toolManager.isDrawing||p.saving)throw new Error('请先结束绘画或等待保存完成，再重新发送');
      app.suspendBackup=true;editor.inert=true;started=true;
      for(const e of job.edits){const r=pixelAPI.setPixels(job.layerIndex,e.sheetIndex,e.actionIndex,e.frameIndex,e.pixels);if(!r.success||r.rejectedPixels?.length)throw new Error(r.error||'部分像素受保护，已取消本次修改');}
      app.updateAll();app.canvasManager.render();
      const first=job.edits[0];app.selectFrame(first.sheetIndex,first.actionIndex,first.frameIndex);pixelAPI.selectLayer(job.layerIndex);app.canvasManager.centerView();
      app.suspendBackup=oldSuspend;editor.inert=oldInert;p.markDirty();
      undo={before:job.before,version:p.version,revision:p.revision,message:job.message};$('undo').disabled=false;status.textContent='AI 修改已应用到分支草稿；查看画面后点击保存或 Ctrl+S。';
      job.message.content=job.message.content.replace(/^【[^】]*】/,'【已应用到分支草稿，保存状态以编辑器为准】');$('change-title').textContent='已应用：'+job.project.name+' → '+job.project.layers[job.layerIndex].name+' · '+job.count+' 个不同像素';store(key,history);render();
      await p.localWrite(app.exportManager.exportProject(false),true).catch(()=>{status.textContent='修改已应用，但浏览器备份失败，请立即保存或导出工程。';});
      history.push({role:'user',content:'已应用上次 AI 像素修改到当前分支草稿。'});history=history.slice(-30);store(key,history);
      applied=true;
    }catch(e){
      // Only roll back if the edits actually began, never overwrite a newer user draft.
      if(started){await p.apply(job.before,true);p.dirty=true;}
      status.textContent=e.message;
    }finally{app.suspendBackup=oldSuspend;editor.inert=oldInert;pending=null;busy=false;}
    if(applied)await sendChat({review:true,frames:job.edits});
  };
  $('undo').onclick=async()=>{
    if(!undo||busy)return;
    if(p.version!==undo.version||p.revision!==undo.revision){status.textContent='之后已有其他修改或保存；请用编辑器撤销按钮逐步撤销。';return;}
    const editor=document.getElementById('app-container'),oldInert=editor.inert,oldSuspend=app.suspendBackup;
    busy=true;editor.inert=true;app.suspendBackup=true;
    try{await p.apply(undo.before,true);app.suspendBackup=oldSuspend;p.markDirty();await p.localWrite(undo.before,true);undo.message.content=undo.message.content.replace(/^【[^】]*】/,'【已撤销本次像素修改】');store(key,history);render();undo=null;$('undo').disabled=true;$('changes').hidden=true;status.textContent='已撤销本次 AI 修改，草稿未自动保存。';}catch(e){status.textContent=e.message;}finally{busy=false;editor.inert=oldInert;app.suspendBackup=oldSuspend;}
  };
  docs();render();connect();
});
