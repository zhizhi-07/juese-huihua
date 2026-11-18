const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
const pal=p.palette.map(c=>c.toLowerCase());
const base=pal[0],shadow=pal[1],line=pal[2];
function ch(r,g,b,a){if(!a)return '.';const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');if(hex===base)return 'b';if(hex===shadow)return 's';if(hex===line)return 'l';return '?';}
function show(i,key){
  const l=p.layers[i];const cel=l.frameData[key];if(!cel){console.log('no cel');return;}
  const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
  console.log('=== layer',i,l.name,'sheet',l.sheetIndex,'cel',key,'size',img.width+'x'+img.height);
  for(let y=0;y<img.height;y++){let row='';for(let x=0;x<img.width;x++){const o=(y*img.width+x)*4;row+=ch(img.data[o],img.data[o+1],img.data[o+2],img.data[o+3]);}console.log(String(y).padStart(2,' '),row);}
}
show(4,'0_0_0');
show(26,'1_0_0');
show(33,'1_1_0');
show(330,'13_0_0');

