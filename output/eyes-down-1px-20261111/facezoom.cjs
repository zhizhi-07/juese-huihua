const fs=require('fs');
const {decode,encode}=require('../../scripts/png.cjs');
const before=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/before.json','utf8'));
const after=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/after-api.json','utf8'));
function vis(proj,l){let v=l.visible!==false,pp=l.parent;while(pp!=null&&pp>=0){v=v&&proj.layers[pp].visible!==false;pp=proj.layers[pp].parent;}return v;}
function comp(proj,si,ai,fi){const f=proj.spriteSheets[si].actions[ai].frames[fi],w=f.width,h=f.height,d=new Uint8Array(w*h*4),key=si+'_'+ai+'_'+fi;
 for(const l of proj.layers){if(!vis(proj,l))continue;const cel=l.frameData?.[key];if(!cel)continue;const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));if(img.width!==w||img.height!==h)continue;
  for(let i=0;i<w*h;i++){const a=img.data[i*4+3];if(!a)continue;const o=i*4;if(a===255){d[o]=img.data[o];d[o+1]=img.data[o+1];d[o+2]=img.data[o+2];d[o+3]=255;}else{const sa=a/255,da=d[o+3]/255,oa=sa+da*(1-sa);for(let c=0;c<3;c++)d[o+c]=Math.round((img.data[o+c]*sa+d[o+c]*da*(1-sa))/oa);d[o+3]=Math.round(oa*255);}}}
 return {w,h,data:d};}
function box(proj){let minx=1e9,miny=1e9,maxx=-1,maxy=-1;for(const l of proj.layers){if(l.isGroup||!/眼睛/.test(l.name))continue;for(const cel of Object.values(l.frameData||{})){const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3]){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);}}}return [minx,miny,maxx,maxy];}
const scale=26,m=5,pad=2;
function tileTile(c,x0,y0,x1,y1){const x0c=Math.max(0,x0),y0c=Math.max(0,y0),x1c=Math.min(c.w-1,x1),y1c=Math.min(c.h-1,y1);
 const cw=x1c-x0c+1,chh=y1c-y0c+1,ow=cw*scale+pad*2,oh=chh*scale+pad*2,out=new Uint8Array(ow*oh*4);
 for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const bx=x-pad,by=y-pad;const ck=((Math.floor(x/4)+Math.floor(y/4))%2)?205:230;let rgb=[ck,ck,ck];
  if(bx>=0&&by>=0&&bx<cw*scale&&by<chh*scale){const sx=Math.floor(bx/scale)+x0c,sy=Math.floor(by/scale)+y0c,o=(sy*c.w+sx)*4,a=c.data[o+3]/255;rgb=[0,1,2].map(k=>Math.round(c.data[o+k]*a+rgb[k]*(1-a)));}
  const o=(y*ow+x)*4;out[o]=rgb[0];out[o+1]=rgb[1];out[o+2]=rgb[2];out[o+3]=255;}
 return {w:ow,h:oh,data:out};}
const frames=[[0,1,0],[1,1,0],[13,0,0]];
const tiles=[];for(const f of frames){const cb=comp(before,...f),ca=comp(after,...f);const bb=(()=>{let minx=1e9,miny=1e9,maxx=-1,maxy=-1;const key=f[0]+'_'+f[1]+'_'+f[2];for(const l of before.layers){if(l.isGroup||!/眼睛/.test(l.name))continue;const cel=l.frameData?.[key];if(!cel)continue;const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3]){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);}}return [minx,miny,maxx,maxy];})();
 const x0=Math.max(0,bb[0]-m),y0=Math.max(0,bb[1]-m),x1=bb[2]+m,y1=Math.min(cb.h-1,bb[3]+m+2);
 tiles.push([tileTile(cb,x0,y0,x1,y1),tileTile(ca,x0,y0,x1,y1)]);}
const cols=2,cw=Math.max(...tiles.flat().map(t=>t.w)),chh=Math.max(...tiles.flat().map(t=>t.h));
const W=cols*cw,H=tiles.length*chh,img=new Uint8Array(W*H*4).fill(255);for(let i=0;i<W*H;i++)img[i*4+3]=255;
tiles.forEach((p,r)=>p.forEach((t,c)=>{const ox=c*cw,oy=r*chh;for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++)img.set(t.data.slice((y*t.w+x)*4,(y*t.w+x)*4+4),((oy+y)*W+ox+x)*4);}));
fs.writeFileSync('output/eyes-down-1px-20261111/face-zoom.png',encode(W,H,img));
console.log(W,H);
