/* Human controls share the existing pixel engine and agent API. */
document.addEventListener('DOMContentLoaded', () => {
  const app=PE.app, $=id=>document.getElementById(id);
  const hint=document.createElement('div');hint.className='workbench-hint';
  hint.textContent='导入 .aseprite 保留图层与动画；PNG 可调整切帧。B 铅笔 / E 橡皮 / I 吸色 / G 填充 / 空格拖动画布 / Ctrl+S 保存工程。';
  $('top-toolbar').after(hint);
  function button(text, action, parent=$('top-toolbar')) {
    const b=document.createElement('button');b.className='tool-btn';b.textContent=text;b.onclick=action;parent.append(b);return b;
  }
  function refresh(){app.updateLayerList();app.updateFrameList();app.updatePalette();app.updateStatusBar();app.updateHistoryButtons();app.canvasManager.render();app.animationPlayer._renderPreviewFrame();}
  const originalHistoryChange=app.history.onChange;
  app.history.onChange=()=>{originalHistoryChange?.();refresh();markDirty();};
  function structure(description, mutate) {
    const p=app.project;
    const capture=()=>({layers:p.layers.slice(),parents:p.layers.map(l=>l.parent),selected:p.currentLayerIndex});
    const before=capture();mutate(p);const after=capture();
    const restore=s=>{p.layers=s.layers.slice();p.layers.forEach((l,i)=>l.parent=s.parents[i]);p.currentLayerIndex=s.selected;};
    app.history.undoStack.push({description,changes:[],undo:()=>restore(before),redo:()=>restore(after)});
    app.history.redoStack=[];app.history._notifyChange();
  }
  const updateLayers=app.updateLayerList.bind(app);
  app.updateLayerList=function(){
    const p=this.project,prefix=p.currentSheetIndex+'_'+p.currentActionIndex+'_';
    const available=l=>!l.isGroup&&!PE.isHandLayer(l)&&(l.sheetIndex===undefined||l.sheetIndex===p.currentSheetIndex)&&(l.parent==null||l===p.getCurrentLayer()&&!l.isOriginal&&!l.locked||[...l.frameData.keys()].some(k=>k.startsWith(prefix)));
    if(!available(p.getCurrentLayer()||{frameData:new Map()})){const i=p.layers.findIndex(available);if(i>=0)p.currentLayerIndex=i;}
    updateLayers();
    const selected=p.getCurrentLayer(),remove=$('delete-layer-btn');
    if(remove){const reason=!selected?'请先选择图层':selected.inheritedBase?'头部、身体和手部跟随主工程，请到主工程修改':PE.isHandLayer(selected)?'手部参考层受保护':selected.isGroup?'请先选择组内图层':selected.locked?'请先解锁图层':p.layers.length<2?'至少保留一个图层':'';remove.disabled=!!reason;remove.title=reason||'删除当前选中图层，可撤销';}
    const rows=[...$('layer-list').children];
    rows.forEach((row,i)=>{
      const index=p.layers.length-1-i,l=p.layers[index];row.dataset.layerIndex=index;
      if(PE.isHandLayer(l)){row.remove();return;}
      if(l.sheetIndex!==undefined && l.sheetIndex!==p.currentSheetIndex){row.remove();return;}
      const key=p.getFrameKey(),prefix=p.currentSheetIndex+'_'+p.currentActionIndex+'_';
      const used=layer=>[...layer.frameData.keys()].some(k=>k.startsWith(prefix));
      if (l.isGroup ? !p.layers.some(child=>child.parent===index && (used(child)||child===p.getCurrentLayer())) : l.parent!=null && !used(l) && index!==p.currentLayerIndex) {row.remove();return;}
      const label=row.querySelector('.layer-name');label.textContent=(l.isGroup?'▾ ':'')+l.name;label.style.paddingLeft=(l.depth||0)*8+'px';
      label.title='双击重命名';label.ondblclick=()=>{if(l.inheritedBase)return;const name=prompt('图层名称',l.name);if(name?.trim()){const old=l.name;l.name=name.trim();app.history.undoStack.push({description:'图层重命名',changes:[],undo:()=>l.name=old,redo:()=>l.name=name.trim()});app.history.redoStack=[];app.history._notifyChange();}};
      if(l.inheritedBase){l.locked=true;const lock=row.querySelectorAll('.layer-icon-btn')[1];lock.disabled=true;lock.title='头部、身体和手部跟随主工程，请到主工程修改';}
      row.querySelector('input').disabled=!!l.isGroup;
      if(!l.isGroup){
        const clone=document.createElement('button');clone.className='layer-mini';clone.textContent='创建图层副本';clone.title='复制完整图层的所有动作与帧';clone.onclick=()=>structure('复制图层',p=>{const copy=Object.assign(new PE.Layer(l.name+' 副本'),{sheetIndex:l.sheetIndex,parent:l.parent,depth:l.depth,opacity:l.opacity,visible:l.visible});for(const [key,data]of l.frameData)copy.frameData.set(key,PE.utils.cloneImageData(data));p.layers.push(copy);p.currentLayerIndex=p.layers.length-1;});row.append(clone);
        const remove=document.createElement('button');remove.className='layer-delete';remove.textContent='删除';remove.setAttribute('aria-label','删除图层 '+l.name);remove.disabled=!!l.inheritedBase;remove.title=l.inheritedBase?'同步底稿请到主工程修改':'删除此图层，可以撤销';remove.onclick=()=>app.deleteLayer(index);row.append(remove);
      }
    });
    if(p.getCurrentSheet()?.name.startsWith('original32_')){
      this.layerSectionOpen??=new Map();
      const sections=new Map();
      function category(l){
        if(l.isGroup)return null;
        if(l.name.startsWith('头发 /')||l.name.startsWith('发饰 /'))return '头发与发饰';
        if(l.name.startsWith('服装 /'))return '衣服';
        if(l.name.startsWith('眼睛 /')&&!l.visible)return '备用眼型';
        if(l.name.includes('眼')||l.name.includes('嘴'))return '眼睛与嘴巴';
        if(l.name==='head'||l.name==='body')return '身体底稿';
        return '备用与其他图层';
      }
      for(const row of [...$('layer-list').children]){
        const l=p.layers[Number(row.dataset.layerIndex)],name=category(l);
        if(!name){row.remove();continue;}
        if(!sections.has(name)){
          const box=document.createElement('details'),heading=document.createElement('summary');
          box.open=this.layerSectionOpen.get(name)??!['备用眼型','备用与其他图层'].includes(name);
          heading.textContent=name;heading.style.cssText='cursor:pointer;padding:8px;font-weight:600';box.append(heading);
          box.addEventListener('toggle',()=>this.layerSectionOpen.set(name,box.open));sections.set(name,box);
        }
        const label=row.querySelector('.layer-name');
        label.textContent=({head:'头部底稿',body:'身体底稿'})[l.name]||l.name.replace(/^(头发|发饰|服装|眼睛|嘴巴) \/ /,'').replace('01 浅棕披发 / ','').replace('01 深蓝JK / ','');
        label.title=l.name+'（双击重命名）';label.style.paddingLeft='0';
        sections.get(name).append(row);
      }
      for(const name of ['头发与发饰','衣服','眼睛与嘴巴','身体底稿','备用眼型','备用与其他图层']){
        if(sections.has(name))$('layer-list').append(sections.get(name));
      }
    }
  };
  function reorder(delta){
    const p=app.project,i=p.currentLayerIndex,l=p.layers[i];
    if(PE.isHandLayer(l)||l.isGroup || l.parent!=null){alert('源文件分组顺序保持原样；可以复制为独立图层后调整。');return;}
    const j=i+delta,other=p.layers[j];if(!other||other.isGroup||other.parent!=null)return;
    structure('调整图层顺序',p=>{const parents=new Map(p.layers.map(l=>[l,l.parent==null?null:p.layers[l.parent]]));[p.layers[i],p.layers[j]]=[p.layers[j],p.layers[i]];for(const layer of p.layers){const parent=parents.get(layer);layer.parent=parent?p.layers.indexOf(parent):null;}p.currentLayerIndex=j;});
  }
  const layerControls=document.createElement('div');layerControls.className='button-row';$('layer-list').before(layerControls);
  button('↑',()=>reorder(1),layerControls);button('↓',()=>reorder(-1),layerControls);
  app.deleteLayer=index=>{
    const p=app.project,l=p.layers[index];if(!l)return;
    if(l.inheritedBase){alert('头部、身体和手部跟随主工程，请到主工程修改。');return;}
    if(PE.isHandLayer(l)||l.isGroup||p.layers.some(x=>x.parent===index)){alert('请先处理组内图层，不能直接删除源文件图层组。');return;}
    if(l.locked){alert('图层已锁定，请先解锁。');return;}
    if(p.layers.length<2)return;

    structure('删除图层',p=>{p.removeLayer(index);const prefix=p.currentSheetIndex+'_'+p.currentActionIndex+'_';p.currentLayerIndex=p.layers.findIndex(x=>!x.isGroup&&!PE.isHandLayer(x)&&x.visible!==false&&!x.locked&&x.sheetIndex===p.currentSheetIndex&&(x.parent==null||[...x.frameData.keys()].some(k=>k.startsWith(prefix))));});
  };
  $('delete-layer-btn').onclick=()=>app.deleteLayer(app.project.currentLayerIndex);
  // Replace only the new-layer handler; imported source groups stay intact.
  const oldAdd=$('add-layer-btn'),add=oldAdd.cloneNode(true);oldAdd.replaceWith(add);
  add.onclick=()=>structure('新建图层',p=>{const l=p.addLayer('绘画图层 '+(p.layers.length+1));l.sheetIndex=p.currentSheetIndex;});
  button('新建画布',()=>{
    const input=prompt('画布宽×高，例如 16x16 或 32x32','16x16');if(input==null)return;
    const m=/^(\d+)\s*[x×*]\s*(\d+)$/i.exec(input.trim());if(!m||+m[1]<1||+m[2]<1||+m[1]>512||+m[2]>512){alert('请输入 1–512 之间的整数尺寸，例如 16x16');return;}
    const p=app.project,si=p.spriteSheets.length,w=+m[1],h=+m[2],s=new PE.SpriteSheet('新画布 '+w+'×'+h);
    s.frameWidth=w;s.frameHeight=h;s.imageData=new ImageData(w,h);s.columns=1;s.rows=1;
    const a=new PE.Action('绘画'),f=new PE.Frame(si,0,0,w,h);f.originalPixels=new ImageData(w,h);a.frames.push(f);s.actions.push(a);p.spriteSheets.push(s);
    const l=p.addLayer('绘画图层');l.sheetIndex=si;p.selectFrame(si,0,0);app.updateAll();fit();markDirty();
  });
  function fit(){const f=app.project.getCurrentFrame(),cm=app.canvasManager;if(!f)return;cm.zoom=Math.max(1,Math.min(32,Math.floor(Math.min(cm.canvas.width/f.width,cm.canvas.height/f.height)*.82)));cm.centerView();app.updateZoomDisplay();app.updateStatusBar();}
  button('适应画布',fit);
  const hex=document.createElement('input');hex.setAttribute('aria-label','颜色十六进制');hex.placeholder='#RRGGBB';hex.value=$('color-primary').value;hex.style.width='88px';$('color-primary').after(hex);
  hex.oninput=()=>{if(!/^#[0-9a-f]{6}$/i.test(hex.value))return;app.setPrimaryColor(PE.utils.hexToRGBA(hex.value));};
  $('color-primary').addEventListener('input',()=>hex.value=$('color-primary').value);
  const setColor=app.setPrimaryColor.bind(app);app.setPrimaryColor=c=>{setColor(c);hex.value=$('color-primary').value;};
  const importFiles=app.handleImport.bind(app);app.handleImport=async files=>{await importFiles(files);app.history.clear();fit();extractPalette();markDirty();};
  function extractPalette(){const frame=app.project.getCurrentFrame();if(!frame?.originalPixels)return;const counts=new Map(),d=frame.originalPixels.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const key=[...d.slice(i,i+4)].join(',');counts.set(key,(counts.get(key)||0)+1);}const colors=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,64).map(([key])=>{const[r,g,b,a]=key.split(',').map(Number);return{r,g,b,a};});if(colors.length){app.project.palette=colors;app.updatePalette();}}
  button('提取原图色板',extractPalette);
  const tools=$('tool-select').parentElement;
  for(const [label,scale] of [['缩小图片',.8],['放大图片',1.25]])button(label,()=>{if(!app.toolManager.resizeSelection(scale))alert('请先用“移动 / 缩放”点选可编辑图片；缩放不能超出画布或覆盖保护区域');else refresh();},tools);
  button('复制选区',()=>document.getElementById('copy-cel-btn').click(),tools);
  button('粘贴选区',()=>document.getElementById('paste-cel-btn').click(),tools);
  button('取消选区',()=>{app.toolManager.clearSelection();app.canvasManager.render();},tools);
  const duration=document.createElement('input');duration.type='number';duration.min='10';duration.max='10000';duration.step='10';duration.setAttribute('aria-label','当前帧时长（毫秒）');duration.style.width='80px';
  const durationLabel=document.createElement('label');durationLabel.textContent='当前帧时长（毫秒） ';durationLabel.append(duration);$('properties-panel').append(durationLabel);
  const props=app.updateFrameProperties.bind(app);app.updateFrameProperties=()=>{props();duration.value=app.project.getCurrentFrame()?.duration||Math.round(1000/app.animationPlayer.fps);};
  duration.onchange=()=>{const ms=Number(duration.value);if(Number.isSafeInteger(ms)&&ms>=10&&ms<=10000){app.project.getCurrentFrame().duration=ms;app.project.getCurrentSheet().useFrameDurations=true;markDirty();}else app.updateFrameProperties();};
  button('导出原始源文件',()=>{const s=app.project.getCurrentSheet();if(!s?.sourceBytes){alert('当前素材不是 Aseprite 源文件');return;}const bytes=Uint8Array.from(atob(s.sourceBytes),c=>c.charCodeAt(0));app.exportManager._downloadBlob(new Blob([bytes]),s.name+'.aseprite');});
  const importProject=app.exportManager.importProject.bind(app.exportManager);
  app.exportManager.importProject=async file=>{
    app.animationPlayer.pause();const result=await importProject(file);app.project=result.project;
    if(!app.persistence?.projectId?.startsWith('character-'))for(const l of app.project.layers)if(l.inheritedBase){delete l.inheritedBase;l.locked=false;}
    PE.project=app.project;app.canvasManager.setProject(app.project);app.toolManager.init(app.project,app.canvasManager,app.history);app.animationPlayer.project=app.project;app.inspectionManager.init(app.project,app.canvasManager);app.toolManager.clearSelection();app.history.clear();app.updateAll();fit();return result;
  };
  function markDirty(){app.persistence?.markDirty();}
  $('layer-list').addEventListener('input',markDirty);
  // Clicking a timeline frame must also move the preview to that exact frame.
  const selectFrame=app.selectFrame.bind(app);app.selectFrame=(si,ai,fi)=>{app.animationPlayer.pause();app.toolManager.clearSelection();selectFrame(si,ai,fi);app.animationPlayer.sheetIndex=si;app.animationPlayer.actionIndex=ai;app.animationPlayer.currentFrame=fi;app.animationPlayer.totalFrames=app.project.getCurrentAction().frames.length;app.animationPlayer._renderPreviewFrame();};
  app.animationPlayer.onFrameChange=fi=>{app.project.currentFrameIndex=fi;[...$('frame-list').children].forEach((thumb,i)=>thumb.classList.toggle('active',i===fi));app.updateFrameProperties();app.updatePalette();app.updateStatusBar();app.canvasManager.render();};
  const selectAction=app.selectAction.bind(app);app.selectAction=ai=>{app.animationPlayer.pause();app.toolManager.clearSelection();selectAction(ai);app.updateLayerList();};
  const selectSheet=app.selectSheet.bind(app);app.selectSheet=si=>{app.animationPlayer.pause();selectSheet(si);app.toolManager.clearSelection();const l=app.project.layers.findLastIndex(l=>!l.isGroup&&!l.locked&&!PE.isHandLayer(l)&&(l.sheetIndex===undefined||l.sheetIndex===si));if(l>=0)app.project.currentLayerIndex=l;refresh();fit();};
  app.updateAll();fit();
});
