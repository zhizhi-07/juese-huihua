/* Shared body/head/hands follow main; wardrobe pixels stay in the branch. */
const {isHand,isBody}=require('./character-base.js');
const canvas=require('./character-canvas.cjs');
function inherit(pixels,source,ai,target,ti,frame,splitBase){
  if(!splitBase)return source.canvasLayout||target.canvasLayout?canvas.inherit(pixels,source,ai,target,ti,frame):pixels;
  const a=source.canvasLayout?.actions[ai],b=target.canvasLayout?.actions[ti],x=(b?.x??0)-(a?.x??0),y=(b?.y??0)-(a?.y??0);
  if(!x&&!y&&(pixels.placement||pixels.width===frame.width&&pixels.height===frame.height))return pixels;
  return canvas.move(pixels,frame.width,frame.height,x,y,{preserveOffCanvas:true});
}
function restoreBaseLayers(branch,main,splitBase){
  const accepts=l=>isHand(l)||(splitBase&&isBody(l));
  const parents=new Map(branch.layers.map(l=>[l,l.parent==null?l.parent:branch.layers[l.parent]])),selected=branch.layers[branch.currentLayerIndex],restored=[];
  for(const [sourceIndex,source]of main.layers.entries()){
    if(!accepts(source))continue;
    const sourceSheet=main.spriteSheets[source.sheetIndex],si=branch.spriteSheets.findIndex(s=>s.name===sourceSheet?.name);if(si<0)continue;
    const sheet=branch.spriteSheets[si],data={},sourceActions=new Set(),targetActions=new Set();
    for(const [key,pixels]of Object.entries(source.frameData||{})){
      const [sourceSI,ai,fi]=key.split('_').map(Number);if(sourceSI!==source.sheetIndex)continue;
      const action=sourceSheet.actions[ai],targetAI=sheet.actions.findIndex(a=>a.name===action?.name&&a.direction===action?.direction);if(targetAI<0||!sheet.actions[targetAI].frames[fi])continue;
      sourceActions.add(ai);targetActions.add(targetAI);data[si+'_'+targetAI+'_'+fi]=inherit(pixels,sourceSheet,ai,sheet,targetAI,sheet.actions[targetAI].frames[fi],splitBase);
    }
    if(!Object.keys(data).length)continue;
    const matches=l=>l.sheetIndex===si&&Object.keys(l.frameData||{}).some(k=>targetActions.has(Number(k.split('_')[1])));
    let target=branch.layers.find(l=>accepts(l)&&l.name===source.name&&matches(l));
    if(!target){
      const anchors=main.layers.map((l,i)=>({l,i})).filter(({l})=>!l.isGroup&&/^(body|head|身体|头部)$/.test(l.name)&&l.sheetIndex===source.sheetIndex&&Object.keys(l.frameData||{}).some(k=>sourceActions.has(Number(k.split('_')[1])))).map(({l,i})=>({i,target:branch.layers.find(b=>b.name===l.name&&matches(b))})).filter(a=>a.target);
      anchors.push(...restored.filter(a=>a.si===si&&[...a.actions].some(ai=>targetActions.has(ai))));anchors.sort((a,b)=>a.i-b.i);
      const next=anchors.find(a=>a.i>sourceIndex),previous=anchors.filter(a=>a.i<sourceIndex).at(-1),anchor=previous||next;
      const direction=sheet.actions[[...targetActions][0]]?.direction;
      const group=branch.layers.find(l=>l.isGroup&&l.sheetIndex===si&&l.name===direction);
      const parent=anchor?parents.get(anchor.target):group;
      target={...source,sheetIndex:si,parent:null,depth:parent?1:0,frameData:data,...(isHand(source)?{referenceOnly:true}:{}),locked:true};
      parents.set(target,parent);
      const index=next?branch.layers.indexOf(next.target):previous?branch.layers.indexOf(previous.target)+1:branch.layers.length;
      branch.layers.splice(index,0,target);
    }
    restored.push({i:sourceIndex,target,si,actions:targetActions});
  }
  for(const layer of branch.layers){const parent=parents.get(layer);if(parent&&typeof parent==='object')layer.parent=branch.layers.indexOf(parent);}
  if(selected)branch.currentLayerIndex=branch.layers.indexOf(selected);
}
module.exports=function syncCharacterBase(branch,main,splitBase=false){
  // Canvas origins can differ; keep wardrobe coordinates and inherit the base in that same origin.
  const aligned=main.spriteSheets.filter(s=>s.canvasLayout);
  if(aligned.length)require('./character-canvas.cjs').align(branch,Math.max(...aligned.map(s=>s.canvasLayout.margin)),new Set(aligned.map(s=>s.name)));
  // Old branch files follow an enlarged idle canvas before inheriting the new-size body/hands.
  const idle=branch.spriteSheets.find(s=>s.name==='original32_idle'),sourceIdle=main.spriteSheets.find(s=>s.name==='original32_idle');
  if(idle&&sourceIdle&&!sourceIdle.canvasLayout&&(idle.frameWidth<sourceIdle.frameWidth||idle.frameHeight<sourceIdle.frameHeight))require('./idle-canvas.cjs')(branch,sourceIdle.frameWidth,sourceIdle.frameHeight);
  // A rollback may remove only the known empty 2px margin; painted borders fail closed.
  if(idle?.frameWidth===36&&idle.frameHeight===36&&sourceIdle?.frameWidth===32&&sourceIdle.frameHeight===32)require('./idle-canvas.cjs')(branch,32,32,{allowCrop:true});
  restoreBaseLayers(branch,main,splitBase);
  const isBase=l=>isHand(l)||(splitBase?isBody(l):!l.isGroup&&/^(body|head|身体|头部)$/.test(l.name));
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
      if(isHand(source))layer.referenceOnly=true;
      if(isHand(source)||splitBase){layer.visible=source.visible!==false;layer.opacity=source.opacity??1;}
      action.frames.forEach((frame,fi)=>{
        const original=sourceSheet.actions[sourceAI].frames[fi];if(!original)return;
        if(!splitBase&&!sheet.canvasLayout&&!sourceSheet.canvasLayout&&(frame.width!==original.width||frame.height!==original.height))throw new Error('人物底稿尺寸与主工程不一致，请先统一画布尺寸');
        const key=layer.sheetIndex+'_'+ai+'_'+fi,sourceKey=prefix+fi;
        if(source.frameData[sourceKey])data[key]=inherit(source.frameData[sourceKey],sourceSheet,sourceAI,sheet,ai,frame,splitBase);else delete data[key];
      });
    }
    if(matched){layer.frameData=data;layer.inheritedBase=true;layer.locked=true;}
  }
  return branch;
};
