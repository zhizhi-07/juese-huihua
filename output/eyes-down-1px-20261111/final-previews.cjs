const fs=require('fs');
const {decode,encode}=require('../../scripts/png.cjs');
const before=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/before.json','utf8'));
const after=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/after-api.json','utf8'));
function visibleChain(proj,l){let v=l.visible!==false,pp=l.parent;while(pp!=null&&pp>=0){v=v&&proj.layers[pp].visible!==false;pp=proj.layers[pp].parent;}return v;}
function composite(proj,si,ai,fi){
 const f=proj.spriteSheets[si].actions[ai].frames[fi];const w=f.width,h=f.height;const d=new Uint8Array(w*h*4);const key=si+'_'+ai+'_'+fi;
 for(const l of proj.layers){if(!visibleChain(proj,l))continue;const cel=l.frameData?.[key];if(!cel)continue;const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));if(img.width!==w||img.height!==h)continue;
  for(let i=0;i<w*h;i++){const a=img.data[i*4+3];if(!a)continue;const o=i*4;if(a===255){d[o]=img.data[o];d[o+1]=img.data[o+1];d[o+2]=img.data[o+2];d[o+3]=255;}else{const sa=a/255,da=d[o+3]/255,oa=sa+da*(1-sa);for(let c=0;c<3;c++)d[o+c]=Math.round((img.data[o+c]*sa+d[o+c]*da*(1-sa))/oa);d[o+3]=Math.round(oa*255);}}}
 return {w,h,data:d};
}
function eyeBox(proj,si,ai,fi){const key=si+'_'+ai+'_'+fi;let minx=1e9,miny=1e9,maxx=-1,maxy=-1;
 for(const l of proj.layers){if(l.isGroup||!/眼睛/.test(l.name))continue;const cel=l.frameData?.[key];if(!cel)continue;const img=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3]){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);}}
 return maxx<0?null:[minx,miny,maxx,maxy];}
function tile(proj,si,ai,fi,box,scale=18,pad=2){const c=composite(proj,si,ai,fi);const m=6;
 const x0=Math.max(0,box[0]-m),y0=Math.max(0,box[1]-m),x1=Math.min(c.w-1,box[2]+m),y1=Math.min(c.h-1,box[3]+m+2);
 const cw=x1-x0+1,ch=y1-y0+1,ow=cw*scale+pad*2,oh=ch*scale+pad*2,out=new Uint8Array(ow*oh*4);
 for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const bx=x-pad,by=y-pad;const ck=((Math.floor(x/4)+Math.floor(y/4))%2)?205:230;let rgb=[ck,ck,ck];
  if(bx>=0&&by>=0&&bx<cw*scale&&by<ch*scale){const sx=Math.floor(bx/scale)+x0,sy=Math.floor(by/scale)+y0,o=(sy*c.w+sx)*4,a=c.data[o+3]/255;rgb=[0,1,2].map(k=>Math.round(c.data[o+k]*a+rgb[k]*(1-a)));}
  const o=(y*ow+x)*4;out[o]=rgb[0];out[o+1]=rgb[1];out[o+2]=rgb[2];out[o+3]=255;}
 return {w:ow,h:oh,data:out};}
const frames=[[0,0,0],[0,0,1],[0,1,0],[1,0,0],[1,0,1],[1,0,2],[2,0,0],[13,0,0],[13,0,1],[4,0,4]];
const tiles=[];for(const f of frames){const b=eyeBox(before,...f);tiles.push([tile(before,...f,b),tile(after,...f,b)]);}
const cols=2,cellW=Math.max(...tiles.flat().map(t=>t.w)),cellH=Math.max(...tiles.flat().map(t=>t.h));
const W=cols*cellW,H=tiles.length*cellH,img=new Uint8Array(W*H*4).fill(255);for(let i=0;i<W*H;i++)img[i*4+3]=255;
tiles.forEach((pair,r)=>pair.forEach((t,c)=>{const ox=c*cellW,oy=r*cellH;for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++)img.set(t.data.slice((y*t.w+x)*4,(y*t.w+x)*4+4),((oy+y)*W+ox+x)*4);}));
fs.writeFileSync('output/eyes-down-1px-20261111/eyes-zoom-before-after.png',encode(W,H,img));
// idle side 4-frame strip at 10x
const strip=[];for(let fi=0;fi<4;fi++){const b=eyeBox(after,1,0,fi);strip.push(tile(after,1,0,fi,b,12));}
const sw=strip.reduce((n,t)=>n+t.w,0),sh=Math.max(...strip.map(t=>t.h)),si2=new Uint8Array(sw*sh*4).fill(255);for(let i=0;i<sw*sh;i++)si2[i*4+3]=255;
let ox=0;for(const t of strip){for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++)si2.set(t.data.slice((y*t.w+x)*4,(y*t.w+x)*4+4),((y)*sw+ox+x)*4);ox+=t.w;}
fs.writeFileSync('output/eyes-down-1px-20261111/idle-frames-after.png',encode(sw,sh,si2));
console.log('ok',W,H,sw,sh);
