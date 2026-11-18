const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
const pal=p.palette.map(c=>c.toLowerCase());
function ch(r,g,b,a){if(!a)return '.';const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');if(hex===pal[0])return 'b';if(hex===pal[1])return 's';if(hex===pal[2])return 'l';return '?';}
function showLayer(name,si,ai,fi){
  const l=p.layers.find(x=>x.name===name&&x.sheetIndex===si&&!x.isGroup);
  const cel=l.frameData[si+'_'+ai+'_'+fi];
  const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
  console.log('=== ',name,si,ai,fi,img.width+'x'+img.height);
  for(let y=0;y<img.height;y++){let row='';for(let x=0;x<img.width;x++){const o=(y*img.width+x)*4;row+=ch(img.data[o],img.data[o+1],img.data[o+2],img.data[o+3]);}console.log(String(y).padStart(2,' '),row);}
}
showLayer('head',1,0,0);
showLayer('head',1,1,0);
