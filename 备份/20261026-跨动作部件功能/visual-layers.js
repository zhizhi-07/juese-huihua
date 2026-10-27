/* Visual part picker layered over the existing editor. No project format changes. */
window.PE=window.PE||{};
PE.VisualLayers={
  slot(layer){
    const n=layer.name||'';
    if(n.startsWith('头发 /'))return n.endsWith('前发')?'前发':n.endsWith('后发')?'后发':null;
    if(n.startsWith('发饰 /'))return '饰品';
    if(n.includes('嘴'))return '嘴巴';
    if(n.includes('眼'))return '眼睛';
    if(n.startsWith('服装 /'))return n.split(' / ').at(-1);
    return null;
  },
  category(layer){
    const n=layer.name||'';
    if(n.startsWith('头发 /')||n.startsWith('发饰 /'))return '头发';
    if(n.startsWith('服装 /'))return '衣服';
    if(n.includes('眼')||n.includes('嘴'))return '五官';
    if(n==='head'||n==='body')return '身体';
    return '其他';
  },
  thumbnail(layer,project){
    const key=project.getFrameKey(),prefix=project.currentSheetIndex+'_'+project.currentActionIndex+'_';
    const current=layer.frameData.get(key);
    const sheet=project.getCurrentSheet?.(),direction=sheet?.actions?.[project.currentActionIndex]?.direction;
    if(this.slot(layer)==='前发'&&direction==='up'&&(!current||!current.data.some((v,i)=>i%4===3&&v))){
      const down=sheet.actions.findIndex(a=>a.direction==='down');
      return [...layer.frameData].find(([k,d])=>k.startsWith(project.currentSheetIndex+'_'+down+'_')&&d.data.some((v,i)=>i%4===3&&v))?.[1]||current||null;
    }
    return current||[...layer.frameData].find(([k])=>k.startsWith(prefix))?.[1]||null;
  },
  choose(app,index){
    const p=app.project,l=p.layers[index];if(!l||l.isGroup||PE.isHandLayer(l))return;
    const slot=this.slot(l),before=p.layers.map(x=>x.visible),selected=p.currentLayerIndex;
    if(slot)for(const other of p.layers){if(other.sheetIndex===l.sheetIndex&&this.slot(other)===slot)other.visible=other===l;}
    l.visible=true;p.currentLayerIndex=index;app.animationPlayer.pause();
    const after=p.layers.map(x=>x.visible),restore=(values,li)=>{p.layers.forEach((x,i)=>x.visible=values[i]);p.currentLayerIndex=li;};
    app.history.undoStack.push({description:'选用'+(slot||'图层'),changes:[],undo:()=>restore(before,selected),redo:()=>restore(after,index)});
    app.history.redoStack=[];app.history._notifyChange();
    app.updateLayerList();app.canvasManager.render();app.animationPlayer._renderPreviewFrame();app.persistence?.markDirty();
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,list=document.getElementById('layer-list'),original=app.updateLayerList.bind(app),V=PE.VisualLayers;
  const names=['头发','衣服','五官','身体','其他'];
  function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
  function drawThumbnail(canvas,data){
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(!data)return;
    const tmp=document.createElement('canvas');tmp.width=data.width;tmp.height=data.height;tmp.getContext('2d').putImageData(data,0,0);
    let x0=data.width,y0=data.height,x1=-1,y1=-1;
    for(let y=0;y<data.height;y++)for(let x=0;x<data.width;x++)if(data.data[(y*data.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(x1<0)return;const w=x1-x0+1,h=y1-y0+1,s=Math.min(4,Math.floor(44/Math.max(w,h))||1);
    ctx.drawImage(tmp,x0,y0,w,h,Math.floor((48-w*s)/2),Math.floor((48-h*s)/2),w*s,h*s);
  }
  app.updateLayerList=function(){
    original();if(!this.project.getCurrentSheet()?.name.startsWith('original32_'))return;
    const p=this.project,rows=[...list.querySelectorAll('.layer-item[data-layer-index]')].filter(row=>!p.layers[Number(row.dataset.layerIndex)]?.isGroup);
    this.visualLayerCategory??=V.category(p.layers[p.currentLayerIndex]||{});
    const nav=element('div','part-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','部件分类');
    for(const name of names){
      const b=element('button','part-tab',name);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(this.visualLayerCategory===name));
      b.onclick=event=>{event.stopPropagation();this.visualLayerCategory=name;this.updateLayerList();};nav.append(b);
    }
    const panel=element('div','part-panel');panel.setAttribute('role','tabpanel');const groups=new Map();
    const entries=rows.filter(row=>V.category(p.layers[Number(row.dataset.layerIndex)])===this.visualLayerCategory);
    for(const row of entries){
      const index=Number(row.dataset.layerIndex),l=p.layers[index],slot=V.slot(l)||'图层';
      if(!groups.has(slot)){const group=element('section','part-slot'),title=element('h5','part-slot-title',slot);group.append(title);groups.set(slot,group);}
      row.classList.add('visual-layer-card');row.classList.toggle('part-visible',!!l.visible);
      const label=row.querySelector('.layer-name'),icons=[...row.querySelectorAll('.layer-icon-btn')],opacity=row.querySelector('input'),clone=row.querySelector('.layer-mini');
      const thumb=element('canvas','part-thumb');thumb.width=48;thumb.height=48;thumb.setAttribute('aria-label',(l.name||'图层')+'预览');drawThumbnail(thumb,V.thumbnail(l,p));
      const main=element('div','part-card-main');
      label.textContent=l.name==='head'?'头部底稿':l.name==='body'?'身体底稿':l.name.startsWith('头发 /')||l.name.startsWith('发饰 /')?l.name.split(' / ')[1].replace(/^\d+\s*/,''):l.name.split(' / ').at(-1);
      const backBang=slot==='前发'&&p.getCurrentSheet()?.actions?.[p.currentActionIndex]?.direction==='up';
      const state=element('small','part-state',backBang?'背面不显示 · 正面缩略图':(l.visible?'已显示':'已隐藏')+(l.locked?' · 锁定':''));
      const choose=element('button','part-choose',l.visible?'编辑':'选用');choose.type='button';choose.onclick=event=>{event.stopPropagation();V.choose(this,index);};
      for(const icon of icons)icon.onclick=()=>{state.textContent=backBang?'背面不显示 · 正面缩略图':(l.visible?'已显示':'已隐藏')+(l.locked?' · 锁定':'');choose.textContent=l.visible?'编辑':'选用';row.classList.toggle('part-visible',!!l.visible);app.animationPlayer._renderPreviewFrame();};
      const actions=element('div','part-card-actions');actions.append(choose,...icons);main.append(label,state,actions);
      const more=element('details','part-more'),summary=element('summary','', '更多');summary.onclick=event=>event.stopPropagation();more.append(summary);
      if(opacity){opacity.title='不透明度';opacity.setAttribute('aria-label',l.name+'不透明度');more.append(opacity);}if(clone)more.append(clone);
      row.replaceChildren(thumb,main,more);groups.get(slot).append(row);
    }
    const order=this.visualLayerCategory==='头发'?['前发','后发','饰品']:this.visualLayerCategory==='五官'?['眼睛','嘴巴']: [...groups.keys()];
    for(const slot of order)if(groups.has(slot))panel.append(groups.get(slot));
    for(const [slot,group]of groups)if(!order.includes(slot))panel.append(group);
    if(!entries.length)panel.append(element('p','part-empty','这个方向还没有此类部件。'));
    list.replaceChildren(nav,panel);
  };
  app.updateLayerList();
});
