const fs=require('fs');
const {decode}=require('../../scripts/png.cjs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/after-api.json','utf8'));
const pal=p.palette.map(c=>c.toLowerCase());
function vis(l){let v=l.visible!==false,pp=l.parent;while(pp!=null&&pp>=0){v=v&&p.layers[pp].visible!==false;pp=p.layers[pp].parent;}return v;}
function under(si,ai,fi,exclude){const f=p.spriteSheets[si].actions[ai].frames[fi],w=f.width,h=f.height,d=new Uint8Array(w*h*4);const key=si+'_'+ai+'_'+fi;
 for(const l of p.layers){if(!vis(l)||l.isGroup||exclude(l))continue;const cel=l.frameData?.[key];if(!cel)continue;const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));if(img.width!==w||img.height!==h)continue;
  for(let i=0;i<w*h;i++){const a=img.data[i*4+3];if(!a)continue;const o=i*4;if(a===255){d[o]=img.data[o];d[o+1]=img.data[o+1];d[o+2]=img.data[o+2];d[o+3]=255;}else{const sa=a/255,da=d[o+3]/255,oa=sa+da*(1-sa);for(let c=0;c<3;c++)d[o+c]=Math.round((img.data[o+c]*sa+d[o+c]*da*(1-sa))/oa);d[o+3]=Math.round(oa*255);}}}
 return {w,h,data:d};}
const issues=[];
for(const l of p.layers){if(l.isGroup||!/眼睛/.test(l.name))continue;
 for(const [key,cel] of Object.entries(l.frameData)){const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
  const [si,ai,fi]=key.split('_').map(Number);const base=under(si,ai,fi,x=>x.isGroup||/眼睛/.test(x.name));
  for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const o=(y*img.width+x)*4;if(!img.data[o+3])continue;
    const oo=(y*base.w+x)*4;const a=base.data[oo+3];let hex='none';if(a){hex='#'+[base.data[oo],base.data[oo+1],base.data[oo+2]].map(v=>v.toString(16).padStart(2,'0')).join('');}
    if(!a||!pal.includes(hex))issues.push([l.sheetIndex,key,x,y,hex]);}}
}
console.log('issue count',issues.length);
console.log(JSON.stringify(issues.slice(0,40)));
