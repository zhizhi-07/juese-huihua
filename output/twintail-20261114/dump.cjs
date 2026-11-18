const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const D='output/twintail-20261114/';
const hex=(r,g,b)=>'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
async function cel(c,w,h){const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;if(!c)return cx.getImageData(0,0,w,h);const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};cx.drawImage(im,p.x,p.y,p.w,p.h);return cx.getImageData(0,0,w,h);}
function ascii(img,map){let out='';for(let y=0;y<img.height;y++){let row='';for(let x=0;x<img.width;x++){const i=(y*img.width+x)*4;if(!img.data[i+3]){row+='.';continue;}const k=hex(img.data[i],img.data[i+1],img.data[i+2]);if(!map.has(k))map.set(k,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[map.size]);row+=map.get(k);}out+=row+'\n';}return out;}
(async()=>{
const m=JSON.parse(fs.readFileSync(D+'merchant-original-1794364657183-original.json'));
const map=new Map();
// merchant idle sheet0 frame0, each direction: hair alone and head+hair
for(const [ai,a] of m.spriteSheets[0].actions.entries()){const f=a.frames[0],key='0_'+ai+'_0';
 const grp=m.layers.findIndex(l=>l.isGroup&&l.sheetIndex===0&&l.name===a.direction);
 const ls=m.layers.filter(l=>l.parent===grp);
 console.log('## merchant idle',a.direction,f.width+'x'+f.height,'order:',ls.map(l=>l.name).join('>'));
 for(const n of ['hair','head','body']){const l=ls.find(l=>l.name===n);console.log('-- '+n);console.log(ascii(await cel(l.frameData[key],f.width,f.height),map));}
}
console.log('merchant colors',JSON.stringify([...map]));
const j=JSON.parse(fs.readFileSync(D+'main-original.json'));
const map2=new Map();
for(const [ai,a] of j.spriteSheets[1].actions.entries()){const f=a.frames[0],key='1_'+ai+'_0';
 console.log('## main idle',a.direction,f.width+'x'+f.height);
 for(const l of j.layers.filter(l=>l.sheetIndex===1&&!l.isGroup&&l.frameData[key])){console.log('-- ['+j.layers.indexOf(l)+'] '+l.name+' vis='+l.visible+' par='+l.parent);console.log(ascii(await cel(l.frameData[key],f.width,f.height),map2));}
}
console.log('main colors',JSON.stringify([...map2]));
console.log('palette',JSON.stringify(j.palette));
})();
