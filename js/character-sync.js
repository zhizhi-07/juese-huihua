/* Shared body/head/hands follow main; wardrobe pixels stay in the branch. */
const isHand=require('./character-base.js').isHand;
function restoreHands(branch,main){
  const parents=new Map(branch.layers.map(l=>[l,l.parent==null?l.parent:branch.layers[l.parent]])),selected=branch.layers[branch.currentLayerIndex],restored=[];
  for(const [sourceIndex,source]of main.layers.entries()){
    if(!isHand(source))continue;
    const sourceSheet=main.spriteSheets[source.sheetIndex],si=branch.spriteSheets.findIndex(s=>s.name===sourceSheet?.name);if(si<0)continue;
    const sheet=branch.spriteSheets[si],data={},sourceActions=new Set(),targetActions=new Set();
    for(const [key,pixels]of Object.entries(source.frameData||{})){
      const [sourceSI,ai,fi]=key.split('_').map(Number);if(sourceSI!==source.sheetIndex)continue;
      const action=sourceSheet.actions[ai],targetAI=sheet.actions.findIndex(a=>a.name===action?.name&&a.direction===action?.direction);if(targetAI<0||!sheet.actions[targetAI].frames[fi])continue;
      sourceActions.add(ai);targetActions.add(targetAI);data[si+'_'+targetAI+'_'+fi]=pixels;
    }
    if(!Object.keys(data).length)continue;
    const matches=l=>l.sheetIndex===si&&Object.keys(l.frameData||{}).some(k=>targetActions.has(Number(k.split('_')[1])));
    let target=branch.layers.find(l=>isHand(l)&&l.name===source.name&&matches(l));
    if(!target){
      const anchors=main.layers.map((l,i)=>({l,i})).filter(({l})=>!l.isGroup&&/^(body|head|身体|头部)$/.test(l.name)&&l.sheetIndex===source.sheetIndex&&Object.keys(l.frameData||{}).some(k=>sourceActions.has(Number(k.split('_')[1])))).map(({l,i})=>({i,target:branch.layers.find(b=>b.name===l.name&&matches(b))})).filter(a=>a.target);
      anchors.push(...restored.filter(a=>a.si===si&&[...a.actions].some(ai=>targetActions.has(ai))));anchors.sort((a,b)=>a.i-b.i);
      const next=anchors.find(a=>a.i>sourceIndex),previous=anchors.filter(a=>a.i<sourceIndex).at(-1),anchor=previous||next;
      target={...source,sheetIndex:si,parent:null,depth:anchor?.target.depth||0,frameData:data,referenceOnly:true,locked:true};
      parents.set(target,anchor?parents.get(anchor.target):null);
      const index=next?branch.layers.indexOf(next.target):previous?branch.layers.indexOf(previous.target)+1:branch.layers.length;
      branch.layers.splice(index,0,target);
    }
    restored.push({i:sourceIndex,target,si,actions:targetActions});
  }
  for(const layer of branch.layers){const parent=parents.get(layer);if(parent&&typeof parent==='object')layer.parent=branch.layers.indexOf(parent);}
  if(selected)branch.currentLayerIndex=branch.layers.indexOf(selected);
}
module.exports=function syncCharacterBase(branch,main){
  restoreHands(branch,main);
  const isBase=l=>!l.isGroup&&(/^(body|head|身体|头部)$/.test(l.name)||isHand(l));
  for(const layer of branch.layers.filter(isBase)){
    const sheet=branch.spriteSheets[layer.sheetIndex];if(!sheet)continue;
    const si=main.spriteSheets.findIndex(s=>s.name===sheet.name);if(si<0)continue;
    const sourceSheet=main.spriteSheets[si],data={...layer.frameData};let matched=false;
    const actions=new Set(Object.keys(data).map(k=>Number(k.split('_')[1])));
    if(!actions.size){const group=branch.layers[layer.parent];sheet.actions.forEach((a,i)=>{if(a.name===group?.name||a.direction===group?.name)actions.add(i);});}
    for(const ai of actions){
      const action=sheet.actions[ai];if(!action)continue;
      const sourceAI=sourceSheet.actions.findIndex(a=>a.direction===action.direction&&a.name===action.name);if(sourceAI<0)continue;
      const prefix=si+'_'+sourceAI+'_';
      const source=main.layers.find(l=>isBase(l)&&l.name===layer.name&&l.sheetIndex===si&&Object.keys(l.frameData||{}).some(k=>k.startsWith(prefix)));
      if(!source)continue;
      matched=true;
      if(isHand(source)){layer.referenceOnly=true;layer.visible=source.visible!==false;layer.opacity=source.opacity??1;}
      action.frames.forEach((frame,fi)=>{
        const original=sourceSheet.actions[sourceAI].frames[fi];if(!original)return;
        if(frame.width!==original.width||frame.height!==original.height)throw new Error('人物底稿尺寸与主工程不一致，请先统一画布尺寸');
        const key=layer.sheetIndex+'_'+ai+'_'+fi,sourceKey=prefix+fi;
        if(source.frameData[sourceKey])data[key]=source.frameData[sourceKey];else delete data[key];
      });
    }
    if(matched){layer.frameData=data;layer.inheritedBase=true;layer.locked=true;}
  }
  return branch;
};
