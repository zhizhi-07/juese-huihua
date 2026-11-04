/* Display the project's real parent groups without changing its layer model. */
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,update=app.updateLayerList.bind(app),open=new Map();
  app.updateLayerList=function(){
    update();
    const p=this.project;if(p.getCurrentSheet()?.name.startsWith('original32_'))return;
    const list=document.getElementById('layer-list');
    const rows=[...list.children].filter(row=>row.dataset.layerIndex!==undefined);
    const byIndex=new Map(rows.map(row=>[Number(row.dataset.layerIndex),row]));
    const groups=new Map();
    for(const row of rows){
      const index=Number(row.dataset.layerIndex),layer=p.layers[index];
      const parent=layer.isGroup?index:layer.parent;
      if(parent==null||!p.layers[parent]?.isGroup)continue;
      if(!groups.has(parent)){
        const header=byIndex.get(parent);if(!header)continue;
        const details=document.createElement('details'),summary=document.createElement('summary');
        details.className='building-layer-group';details.open=open.get(parent)??(p.layers[p.currentLayerIndex]?.parent===parent);
        details.style.cssText='border:1px solid #d3dcd5;border-radius:6px;margin:5px 0;padding:3px';
        summary.style.cssText='cursor:pointer;font-weight:600;list-style-position:inside';
        const eye=header.querySelector('button[title="切换图层显示/隐藏"]');
        const name=document.createElement('span');name.textContent=p.layers[parent].name;
        if(eye)summary.append(eye);summary.append(name);header.remove();
        list.insertBefore(details,row);details.append(summary);
        details.addEventListener('toggle',()=>open.set(parent,details.open));groups.set(parent,details);
      }
      if(!layer.isGroup){row.style.marginLeft='8px';groups.get(parent).append(row);}
    }
    for(const [,box] of [...groups].sort((a,b)=>a[0]-b[0]))list.append(box);
  };
  app.updateLayerList();
});
