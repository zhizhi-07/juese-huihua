/* Browser recovery plus one revision-checked local file shared with the agent. */
window.PE=window.PE||{};
PE.ProjectPersistence=class {
  constructor(app,status){
    this.app=app;this.status=status;this.ready=false;this.dirty=false;this.conflict=false;this.version=0;this.revision='none';
    this.projectId=new URLSearchParams(location.search).get('project')||'main';
    if(!/^[a-z0-9-]{1,80}$/.test(this.projectId))throw new Error('无效工程编号');
    this.localKey=this.projectId==='main'?'last':'project-'+this.projectId;
    this.base=location.protocol==='file:'?(window.PE_LOCAL_BRIDGE?.url||'http://127.0.0.1:8765'):'';
    this.headers={'X-Pixel-Editor':'1'};
    if(location.protocol==='file:'&&window.PE_LOCAL_BRIDGE?.token)this.headers['X-Pixel-Token']=window.PE_LOCAL_BRIDGE.token;
  }
  show(text,error=false){this.status.textContent=text;this.status.classList.toggle('save-error',error);this.status.title='当前工程独立保存；多人协作请先分出 AI 独立稿。';if(this.conflict){const b=document.createElement('button');b.textContent='处理保存冲突';b.onclick=()=>this.openConflictDialog();this.status.append(' ',b);}}
  db(){return this.dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('pixel-workbench',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async localRead(){const db=await this.db();return new Promise((resolve,reject)=>{const store=db.transaction('projects').objectStore('projects'),blob=store.get(this.localKey),meta=store.get(this.localKey+'-meta');meta.onsuccess=()=>resolve({blob:blob.result,meta:meta.result});meta.onerror=()=>reject(meta.error);});}
  async localWrite(blob,pending,archive){
    const db=await this.db();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction('projects','readwrite'),store=transaction.objectStore('projects'),metaKey=this.localKey+'-meta';
      transaction.oncomplete=resolve;
      transaction.onabort=()=>reject(transaction.error||new Error('本地草稿已变化，未替换'));
      const write=()=>{store.put(blob,this.localKey);store.put({pending,revision:this.revision,savedAt:Date.now()},metaKey);};
      if(!archive){write();return;}
      const current=store.get(metaKey);
      current.onsuccess=()=>{
        if(current.result?.savedAt!==archive.meta?.savedAt||current.result?.revision!==archive.meta?.revision||current.result?.pending!==archive.meta?.pending){transaction.abort();return;}
        store.put(archive,this.localKey+'-conflict-'+crypto.randomUUID());write();
      };
    });
  }
  request(options={}){return fetch(this.base+'/api/project?id='+encodeURIComponent(this.projectId),{...options,headers:{...this.headers,...options.headers},cache:'no-store',signal:AbortSignal.timeout(5000)});}
  async apply(blob,preserveView=false){
    const app=this.app,p=app.project;
    const view={sheet:p.getCurrentSheet()?.name,direction:p.getCurrentAction()?.direction,frame:p.currentFrameIndex,layer:p.getCurrentLayer()?.name};
    const suspended=app.suspendBackup;app.suspendBackup=true;
    try{
      await app.exportManager.importProject(blob);
      if(preserveView){const q=app.project,si=q.spriteSheets.findIndex(s=>s.name===view.sheet);if(si>=0){q.currentSheetIndex=si;const s=q.getCurrentSheet(),ai=s.actions.findIndex(a=>a.direction===view.direction);q.currentActionIndex=Math.max(0,ai);q.currentFrameIndex=Math.min(view.frame,q.getCurrentAction().frames.length-1);const li=q.layers.findIndex(l=>l.sheetIndex===si&&l.name===view.layer);if(li>=0)q.currentLayerIndex=li;}}
      const frame=app.project.currentFrameIndex;
      app.animationPlayer.setAction(app.project.currentSheetIndex,app.project.currentActionIndex);
      app.project.currentFrameIndex=frame;app.animationPlayer.currentFrame=frame;app.animationPlayer._renderPreviewFrame();
      app.updateAll();app.syncBackgroundControls?.();app.canvasManager.render();
    }finally{app.suspendBackup=suspended;}
  }
  async restore(){
    const local=await this.localRead().catch(()=>({}));
    try{
      const response=await this.request();
      if(response.status!==404&&!response.ok)throw new Error('共享文件读取失败');
      this.revision=response.status===404?'none':response.headers.get('ETag');
      if(local.blob&&(!local.meta||local.meta.pending)){
        const sharedRevision=this.revision;
        if(response.ok&&sharedRevision&&(local.meta?.revision||'none')!==sharedRevision&&performance.getEntriesByType('navigation')[0]?.type==='reload'){
          const blob=await response.blob();
          await this.apply(blob);
          await this.localWrite(blob,false,local);
          this.ready=true;this.show('已读取共享最新版 · 冲突草稿已留本地备份');return true;
        }
        await this.apply(local.blob);this.ready=true;this.dirty=true;
        // A pending draft still belongs to its original base, not the just-read server version.
        this.revision=local.meta?.revision||'none';
        if(this.revision!==sharedRevision){this.conflict=true;this.show('本地草稿已恢复 · 共享版本有更新',true);}else{this.show('草稿已恢复 · 未保存，请点击保存或 Ctrl+S');}
        return true;
      }
      if(response.ok){const blob=await response.blob();await this.apply(blob);await this.localWrite(blob,false).catch(console.error);this.ready=true;this.show('共享工程已恢复');return true;}
      if(local.blob){await this.apply(local.blob);this.ready=true;this.dirty=true;this.show('未保存 · 点击保存或 Ctrl+S');return true;}
      if(this.projectId!=='main')throw new Error('独立工程不存在，请从工程列表重新打开');
      return false;
    }catch(error){
      if(local.blob){await this.apply(local.blob);this.revision=local.meta?.revision||'none';this.ready=true;this.dirty=true;this.show('本地草稿已恢复 · 请手动保存',true);return true;}
      if(this.projectId!=='main')throw error;
      this.show('共享暂不可用 · 请手动保存',true);return false;
    }
  }
  schedule(){clearTimeout(this.timer);}
  markDirty(){if(!this.ready||this.app.suspendBackup)return;this.dirty=true;this.version++;PE.markSceneSheetDirty?.(this.app);if(this.conflict)this.show('共享版本有更新 · 本地草稿待保存',true);else{this.show('未保存 · 点击保存或 Ctrl+S');}}
  async seed(){this.ready=true;this.dirty=true;this.show('未保存 · 点击保存或 Ctrl+S');return false;}
  saveNow(){
    if(!this.ready||this.app.suspendBackup||this.resolving)return Promise.resolve(false);
    if(this.saving)return this.saving;
    clearTimeout(this.timer);
    this.saving=this.performSave().finally(()=>{this.saving=null;});
    return this.saving;
  }
  async performSave(){
    let pngPlan=null,pngError=null;
    if(!this.conflict){try{pngPlan=await PE.prepareScenePngSave?.(this.app);}catch(error){pngError=error;}}
    const version=this.version,blob=this.app.exportManager.exportProject(false);let localSaved=false;
    try{await this.localWrite(blob,true);localSaved=true;}catch(error){console.error(error);}
    if(this.conflict){this.show('共享版本冲突 · 请处理保存冲突',true);this.openConflictDialog();return false;}
    try{
      const response=await this.request({method:'PUT',headers:{'Content-Type':'application/json','If-Match':this.revision},body:blob});
      if(response.status===409){this.conflict=true;this.show('共享版本有更新 · 本地草稿已保留',true);return false;}
      if(!response.ok)throw new Error('共享保存失败：'+response.status);
      this.revision=response.headers.get('ETag');await this.localWrite(blob,false).catch(console.error);
      let written=null;
      if(pngPlan&&!pngError){try{written=await PE.commitScenePngSave?.(this.app,pngPlan);}catch(error){pngError=error;}}
      if(version===this.version){
        this.dirty=false;
        if(pngError){
          const msg='工程已保存，但导出位置未写入：'+pngError.message;
          this.app.exportManager.notifyExport?.(msg);
          this.show(msg,true);
        }else if(written?.length){
          const label=written.length===1?written[0]:`${written[0]} 等 ${written.length} 个 PNG`;
          this.show('已保存工程并写入 PNG：'+label+' · '+new Date().toLocaleTimeString());
        }else{
          this.show('已保存到本地共享工程 · '+new Date().toLocaleTimeString());
        }
      }else this.show('还有新修改未保存 · 请再次保存');
      return true;
    }catch(error){this.show(localSaved?'本地已保存 · 共享未连接':'保存失败 · 请导出工程',true);console.error(error);return false;}
  }
  async preserveConflictDraft(useShared=false){
    if(!this.ready||this.saving||this.resolving||this.app.toolManager.isDrawing)throw new Error('请等待当前绘画或保存结束');
    this.resolving=true;
    try{
      const version=this.version,project=this.app.project,blob=this.app.exportManager.exportProject(false);
      const id='draft-conflict-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),url=this.base+'/api/project?id='+id;
      const response=await fetch(url,{method:'PUT',headers:{...this.headers,'Content-Type':'application/json','If-Match':'none'},body:blob,signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('草稿副本保存失败：'+response.status+'；原页面未改变');
      const read=await fetch(url,{headers:this.headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!read.ok||await read.text()!==await blob.text())throw new Error('草稿副本回读不一致；原页面未改变');
      const link=new URL(location.href);link.searchParams.set('project',id);
      if(useShared){
        const shared=await this.request();if(!shared.ok||!shared.headers.get('ETag'))throw new Error('共享工程读取失败；原页面未改变');
        const saved=await shared.blob();
        if(this.version!==version||this.app.project!==project||this.app.toolManager.isDrawing)throw new Error('备份期间本页又有新修改，请重试；未读取共享版本');
        await this.apply(saved,true);this.revision=shared.headers.get('ETag');this.conflict=false;this.dirty=false;
        try{await this.localWrite(saved,false);this.show('已读取共享工程 · 原草稿已独立备份');}catch(error){console.error(error);this.show('已读取共享工程 · 草稿副本安全，浏览器备份更新失败',true);}
      }
      return link.href;
    }finally{this.resolving=false;}
  }
  openConflictDialog(){
    if(this.conflictDialog?.open)return;
    const dialog=document.createElement('dialog');dialog.className='advanced-dialog';this.conflictDialog=dialog;
    const title=document.createElement('h2');title.textContent='安全处理保存冲突';
    const info=document.createElement('p');info.textContent='本页草稿与共享文件不是同一版本。不会强制覆盖或自动合并人物像素。两种操作都会先完整另存本页草稿，并回读核对。';
    const result=document.createElement('p');result.setAttribute('role','status');
    const buttons=[];
    const add=(text,fn)=>{const b=document.createElement('button');b.className='studio-button';b.textContent=text;b.onclick=fn;buttons.push(b);dialog.append(b);return b;};
    dialog.append(title,info,result);
    const run=async useShared=>{buttons.forEach(b=>b.disabled=true);result.textContent='正在独立保存草稿…';try{const url=await this.preserveConflictDraft(useShared);result.textContent=useShared?'已读取共享版本。原草稿副本：':'草稿已完整另存，原工程未覆盖。请打开副本继续绘画：';const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='打开本页草稿副本';result.append(a);}catch(error){result.textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}};
    add('本页草稿另存后继续编辑',()=>run(false));
    add('备份本页并读取共享版本',()=>run(true));
    add('关闭',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  }
  async pull(){
    if(!this.ready||this.dirty||this.saving||this.resolving||this.pulling||this.app.suspendBackup||this.app.toolManager.isDrawing)return;
    this.pulling=true;
    try{
      const response=await this.request({headers:{'If-None-Match':this.revision}});
      if(response.status===304||response.status===404)return;
      if(!response.ok)return;
      const blob=await response.blob();
      if(this.dirty||this.saving||this.resolving||this.app.toolManager.isDrawing)return;
      await this.apply(blob,true);this.revision=response.headers.get('ETag');await this.localWrite(blob,false).catch(console.error);this.show('已同步共享修改');
    }catch(error){console.debug('等待共享工程连接',error.message);}
    finally{this.pulling=false;}
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  if(!PE.app)return;
  const app=PE.app,toolbar=document.getElementById('top-toolbar'),status=document.createElement('span');status.id='save-status';status.textContent='正在读取已保存工程…';status.setAttribute('aria-live','polite');toolbar.append(status);
  const persistence=app.persistence=new PE.ProjectPersistence(app,status);
  function button(text,fn){const b=document.createElement('button');b.className='tool-btn';b.textContent=text;b.onclick=fn;toolbar.append(b);}
  button('保存本地修改 (Ctrl+S)',()=>persistence.saveNow());
  // Capture before editor shortcuts, including when a text input has focus.
  window.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
      event.preventDefault();event.stopImmediatePropagation();
      persistence.saveNow();
    }
  },true);
  button('恢复备份',async()=>{const local=await persistence.localRead().catch(()=>({}));if(!local.blob){alert('还没有本地备份');return;}if(!confirm('恢复本地备份？当前内容请先导出工程。'))return;await persistence.apply(local.blob);persistence.conflict=false;persistence.markDirty();});
  window.addEventListener('beforeunload',event=>{if(persistence.dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('focus',()=>persistence.pull());
  setInterval(()=>persistence.pull(),2000);
  document.getElementById('main-canvas').addEventListener('pointerdown',()=>app.animationPlayer.pause(),true);
  pixelAPI.saveSharedProject=()=>persistence.saveNow();
  pixelAPI.getSharedProjectInfo=()=>({ready:persistence.ready,dirty:persistence.dirty,conflict:persistence.conflict,revision:persistence.revision,projectId:persistence.projectId,file:persistence.projectId==='main'?'data/shared-project.json':'data/projects/'+persistence.projectId+'.json'});
});
