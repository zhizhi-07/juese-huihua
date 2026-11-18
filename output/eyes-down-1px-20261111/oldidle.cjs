const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
for(const file of ['after.json','undo-after.json','before.json']){
 const p=JSON.parse(fs.readFileSync('output/eyes-down-one-20261111/'+file,'utf8'));
 const out=[];
 for(const l of p.layers){if(l.isGroup||!/眼睛/.test(l.name))continue;if(l.sheetIndex!==1)continue;
  for(const [k,cel] of Object.entries(l.frameData)){const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));let ys=[];for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3])ys.push(x+','+y);out.push(k+': '+ys.join(' '));}}
 console.log(file, JSON.stringify(out));
}
