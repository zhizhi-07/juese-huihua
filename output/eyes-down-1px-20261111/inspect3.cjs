const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
for(const i of [0,1,2,3,4,5,6]){
 const l=p.layers[i];
 console.log('=== idx',i,l.name,'isGroup',l.isGroup,'parent',l.parent,'depth',l.depth,'sheet',l.sheetIndex,'vis',l.visible,'lock',l.locked,'opacity',l.opacity);
 const fd=l.frameData||{};
 console.log(' frameData keys',Object.keys(fd).slice(0,10), 'count',Object.keys(fd).length);
 const k=Object.keys(fd)[0];
 if(k!==undefined){const v=fd[k];console.log(' fd[0] type',typeof v, Array.isArray(v)?'array len '+v.length:'');console.log(' sample',JSON.stringify(v).slice(0,300));}
}
