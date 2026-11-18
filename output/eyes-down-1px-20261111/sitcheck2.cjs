const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/after-api.json','utf8'));
const pal=p.palette.map(c=>c.toLowerCase());
function ch(r,g,b,a){if(!a)return '.';const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');if(hex===pal[0])return 'b';if(hex===pal[1])return 's';if(hex===pal[2])return 'l';return '?';}
function show(layerIdx,key){const l=p.layers[layerIdx];const cel=l.frameData[key];const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
 console.log('===',layerIdx,l.name,key,img.width+'x'+img.height);
 for(let y=0;y<img.height;y++){let row='';for(let x=0;x<img.width;x++){const o=(y*img.width+x)*4;row+=ch(img.data[o],img.data[o+1],img.data[o+2],img.data[o+3]);}console.log(String(y).padStart(2,' '),row);}}
show(329,'13_0_0');
show(330,'13_0_0');
