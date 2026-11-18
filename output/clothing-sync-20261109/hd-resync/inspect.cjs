const fs=require('fs'),p=require('./before.json'),old=require('../hd-write/readback.json');
console.log(p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex,p.currentLayerIndex,p.layers[p.currentLayerIndex]?.name,p.layers.length);
const cmp=(l,q)=>{let a=l.frameData||{},b=q?.frameData||{};return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>k+(!a[k]?'-':!b[k]?'+':'*'));};
for(const [i,l] of p.layers.entries()){
 const q=old.layers[i]?.name===l.name&&old.layers[i]?.sheetIndex===l.sheetIndex?old.layers[i]:old.layers.find(v=>v.name===l.name&&v.sheetIndex===l.sheetIndex&&v.parent===l.parent);
 const changes=cmp(l,q);
 if(changes.length||/衣服/.test(l.name))console.log(i,l.name,l.sheetIndex,l.visible,'count',Object.keys(l.frameData||{}).length,'diff',changes.join(' '));
}
