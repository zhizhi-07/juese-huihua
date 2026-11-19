const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36,source=JSON.parse(fs.readFileSync(D+'/reference-pixels.json','utf8').replace(/^\uFEFF/,''));
const p=JSON.parse(fs.readFileSync(D+'/readback.json')),buffers=p.layers.map(()=>Buffer.alloc(W*H*4));
const bounds={12:[6,11],13:[5,12],14:[4,13],15:[4,13],16:[3,14],17:[2,15],18:[1,16],19:[2,15],20:[3,14],21:[4,13],22:[4,13],23:[5,12],24:[6,11]};
for(let y=0;y<33;y++)for(let x=0;x<36;x++){
 let rgb=source.slice((y*36+x)*3,(y*36+x)*3+3),layer=-1;
 if(y>=16)layer=0;
 if(y<12&&x>=5&&x<=15&&Math.min(...rgb)>166&&Math.max(...rgb)-Math.min(...rgb)<38)layer=1;
 if(bounds[y]&&x>=bounds[y][0]&&x<=bounds[y][1])layer=1;
 if(y>=16&&y<=23&&x>=22&&x<=33)layer=2;
 if(layer===2&&rgb[1]>rgb[0]*1.03&&rgb[1]>rgb[2]*1.15)layer=3;
 if(y>=28&&x>=5&&x<=12&&rgb[0]>rgb[1]*1.2&&rgb[0]>rgb[2]*1.5)layer=4;
 if(layer<0)continue;
 if(Math.max(...rgb)<105&&Math.max(...rgb)-Math.min(...rgb)<28)rgb=[47,59,61];
 buffers[layer].set([...rgb,255],((y+1)*W+x+2)*4);
}
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(t,b){const tag=Buffer.from(t),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([tag,b])));return Buffer.concat([n,tag,b,c]);}
function png(b,w=W,h=H){const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.from([0]),b.subarray(y*w*4,(y+1)*w*4));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
function fill(i,x,y,rgb){buffers[i].set([...rgb,255],(y*W+x)*4);}
const outline=[47,59,61],stone=[183,184,172],wood=[178,139,109];
// Complete the surfaces concealed by movable objects, keeping the reference's visible pixels.
for(let y=17;y<=33;y++)for(let x=2;x<=37;x++){
 const n=(y*W+x)*4;
 if(!buffers[0][n+3])fill(0,x,y,y===17||x===2||x===37?outline:stone);
}
for(let y=17;y<=24;y++)for(let x=24;x<=35;x++){
 const n=(y*W+x)*4;
 if(!buffers[2][n+3])fill(2,x,y,y===17||y===24||x===24||x===35?[126,95,84]:wood);
}
// Separate flame from the complete dark firebox underneath it.
for(let n=0;n<buffers[4].length;n+=4)if(buffers[4][n+3])buffers[0].set([...outline,255],n);
for(let x=2;x<=37;x++)fill(0,x,34,outline);
for(let i=0;i<5;i++)fs.writeFileSync(D+'/complete-layer-'+i+'.png',png(buffers[i]));
assert(buffers[0][(20*W+10)*4+3]===255,'Stone below pot must be complete');
assert(buffers[2][(20*W+29)*4+3]===255,'Board below vegetables must be complete');
const all=Buffer.alloc(W*H*4);buffers.forEach((b,i)=>{assert(b.some((v,n)=>n%4===3&&v));for(let n=0;n<b.length;n+=4)if(b[n+3])b.copy(all,n,n,n+4);p.layers[i].frameData['0_0_0'].dataURL='data:image/png;base64,'+png(b).toString('base64');});
p.palette[0]={r:47,g:59,b:61,a:255};p.spriteSheets[0].imageDataURL='data:image/png;base64,'+png(all).toString('base64');fs.writeFileSync(D+'/completed.png',png(all));
(async()=>{const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text();fs.writeFileSync(D+'/before-completion.json',raw);const current=JSON.parse(raw);assert.deepStrictEqual(current.layers,JSON.parse(fs.readFileSync(D+'/corrected-readback.json')).layers,'Layers changed');p.bgColor=current.bgColor;const out=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(out.ok,await out.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/completed-readback.json',JSON.stringify(back));console.log('Verified five corrected layers and #2f3b3d outlines');})();



