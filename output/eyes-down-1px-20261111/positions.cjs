const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
const rows={};
for(let i=0;i<p.layers.length;i++){
  const l=p.layers[i];if(l.isGroup||!/眼睛/.test(l.name))continue;
  const s=p.spriteSheets[l.sheetIndex];
  for(const [key,cel] of Object.entries(l.frameData)){
    const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
    const pts=[];
    for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){if(img.data[(y*img.width+x)*4+3])pts.push(x+','+y);}
    const [si,ai,fi]=key.split('_').map(Number);
    const dir=s.actions[ai].direction;
    rows[si]=rows[si]||{};
    rows[si][dir]=rows[si][dir]||{};
    rows[si][dir][fi]=pts.join(' ');
  }
}
for(const si of Object.keys(rows)){console.log('sheet',si,p.spriteSheets[si].name);
  for(const dir of Object.keys(rows[si])){console.log('  ',dir, JSON.stringify(rows[si][dir]));}
}
