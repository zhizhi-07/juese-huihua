const fs=require('fs'),crypto=require('crypto');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const D=__dirname+'/';
const hex=(d,i)=>'#'+[0,1,2].map(q=>d[i+q].toString(16).padStart(2,'0')).join('').toUpperCase();
async function px(c,w,h){const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;if(c){const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};cx.drawImage(im,p.x,p.y,p.w,p.h);}return cx.getImageData(0,0,w,h);}
function crop(im,sym){let L=im.width,T=im.height,R=-1,B=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){L=Math.min(L,x);R=Math.max(R,x);T=Math.min(T,y);B=Math.max(B,y);}if(R<0)return '(empty)';let o=[];for(let y=T;y<=B;y++){let r='';for(let x=L;x<=R;x++){const i=(y*im.width+x)*4;r+=im.data[i+3]?sym(hex(im.data,i)):'.';}o.push(r);}return o.join('\n');}
(async()=>{
const r=await fetch('http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561');const raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(D+'base-original.json',raw);fs.writeFileSync(D+'base-original.meta.json',JSON.stringify({etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
const j=JSON.parse(raw);const S={'#46465E':'A','#FEEDE1':'D','#E0C5B4':'E'};const sym=h=>S[h]||'?';
for(const name of ['body','hand','hand 2']){const shapes=new Map();
 for(const [si,s] of j.spriteSheets.entries())for(const [ai,a] of s.actions.entries()){const g=j.layers.findIndex(l=>l.isGroup&&l.sheetIndex===si&&l.name===a.direction);const l=j.layers.find(l=>l.parent===g&&l.name===name);
  for(let fi=0;fi<a.frames.length;fi++){const f=a.frames[fi];const k=a.direction+'\n'+crop(await px(l.frameData[`${si}_${ai}_${fi}`],f.width,f.height),sym);if(!shapes.has(k))shapes.set(k,[]);shapes.get(k).push(s.name.replace('original16_','')+fi);}}
 console.log('=====',name,'distinct',shapes.size);for(const [k,v] of shapes)console.log(k+'\n  x'+v.length+': '+v.slice(0,14).join(' ')+(v.length>14?' …':'')+'\n');}
console.log('clothes-ish layers',j.layers.filter(l=>/服|衣|裤|裙|鞋/.test(l.name)).map(l=>l.name+' sh'+l.sheetIndex));
})();
