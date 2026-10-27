/* Shared by the browser and save API so cached pages cannot copy the old wardrobe. */
function characterBase(data){
  const keep=new Set();
  data.layers.forEach((l,i)=>{if(/^(body|head|身体|头部)$/.test(l.name)&&!l.isGroup)keep.add(i);});
  if(!keep.size)throw new Error('没有找到身体或头部图层，未创建分支');
  for(const i of keep){let parent=data.layers[i].parent;const seen=new Set([i]);while(parent!=null){if(seen.has(parent)||!data.layers[parent]?.isGroup)throw new Error('人物分组关系无效，未创建分支');seen.add(parent);keep.add(parent);parent=data.layers[parent].parent;}}
  const indices=[...keep].sort((a,b)=>a-b),mapping=new Map(indices.map((old,i)=>[old,i]));
  data.layers=indices.map(i=>{const l=data.layers[i];if(l.parent!=null)l.parent=mapping.get(l.parent);if(l.isGroup)l.frameData={};return l;});
  data.currentLayerIndex=mapping.get(data.currentLayerIndex)??Math.max(0,data.layers.findIndex(l=>!l.isGroup&&l.sheetIndex===data.currentSheetIndex));
  return data;
}
if(typeof module!=='undefined'&&module.exports)module.exports=characterBase;
else PE.characterBase=characterBase;
