const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
const prevBefore=JSON.parse(fs.readFileSync('output/eyes-down-one-20261111/before.json','utf8'));
const prevUndo=JSON.parse(fs.readFileSync('output/eyes-down-one-20261111/undo-after.json','utf8'));
let total=0,nonEmpty=0;
for(let i=0;i<p.layers.length;i++){
  const l=p.layers[i];
  if(l.isGroup||!/眼睛|eyes?/i.test(l.name))continue;
  const keys=Object.keys(l.frameData||{});
  const nonempty=keys.filter(k=>{const c=l.frameData[k];const b=Buffer.from(c.dataURL.split(',')[1],'base64');return b.length>80;});
  console.log(i,JSON.stringify(l.name),'sheet',l.sheetIndex,'vis',l.visible,'locked',l.locked,'inheritedBase',l.inheritedBase,'cels',keys.length,'hairAnim',l.hairAnimation?JSON.stringify(l.hairAnimation).slice(0,120):'-');
  total+=keys.length;
}
console.log('total cels',total);
// does this project still match previous before.json for eye layers?
const map=new Map(prevBefore.layers.map(l=>[l.name+'|'+l.sheetIndex,l]));
let same=0,diff=0;const diffs=[];
for(const l of p.layers){if(l.isGroup||!/眼睛|eyes?/i.test(l.name))continue;const o=map.get(l.name+'|'+l.sheetIndex);if(!o){diff++;continue;}for(const k of Object.keys(l.frameData)){if(JSON.stringify(l.frameData[k])===JSON.stringify(o.frameData[k]))same++;else{diff++;if(diffs.length<5)diffs.push([l.name,l.sheetIndex,k]);}}}
console.log('vs previous before.json: same',same,'diff',diff,JSON.stringify(diffs));
