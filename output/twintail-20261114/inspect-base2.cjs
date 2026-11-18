const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const hex=(r,g,b)=>'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
(async()=>{const j=JSON.parse(fs.readFileSync(__dirname+'/base-original.json'));
console.log(j.layers.map((l,i)=>[i,l]).filter(([i,l])=>!l.isGroup&&(l.parent==null)).filter(([i])=>i<238).map(([i,l])=>i+' sh'+l.sheetIndex+' '+l.name+' vis='+l.visible+' cels='+Object.keys(l.frameData).length+(l.hairAnimation?' MASTER':'')+' hid='+(l.hairAnimationId||'').slice(0,6)).join('\n'));
const m=j.layers[378],g=m.hairAnimation;console.log(JSON.stringify({...g,offsets:undefined,headOffsets:undefined}));
const ks=Object.keys(g.offsets);console.log('offset keys',ks.length,[...new Set(ks.map(k=>k.split('/').slice(0,2).join('/')))].join(' '));
console.log('diff offsets vs headOffsets',ks.filter(k=>JSON.stringify(g.offsets[k])!==JSON.stringify(g.headOffsets[k])).map(k=>k+JSON.stringify(g.offsets[k])+JSON.stringify(g.headOffsets[k])));
console.log('keys of 378',Object.keys(m.frameData).join(','),JSON.stringify({...m.frameData['1_0_0'],dataURL:0}),JSON.stringify({...m.frameData['1_0_1'],dataURL:0}));
const map=new Map();
const asc=async(c,w,h)=>{const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;if(c){const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};cx.drawImage(im,p.x,p.y,p.w,p.h);}const d=cx.getImageData(0,0,w,h).data;let o='';for(let y=0;y<h;y++){for(let x=0;x<w;x++){const i=(y*w+x)*4;if(!d[i+3]){o+='.';continue;}const k=hex(d[i],d[i+1],d[i+2]);if(!map.has(k))map.set(k,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'[map.size]);o+=map.get(k);}o+='\n';}return o;};
for(const [ai,a] of j.spriteSheets[1].actions.entries()){const f=a.frames[0],key='1_'+ai+'_0';console.log('## idle',a.direction,f.width,f.height);
 for(const l of j.layers.filter(l=>l.sheetIndex===1&&!l.isGroup&&l.frameData[key]&&l.visible!==false&&(l.parent==null||j.layers[l.parent].name===a.direction))){console.log('-- ['+j.layers.indexOf(l)+'] '+l.name+' '+JSON.stringify(l.frameData[key].placement||null)+' '+l.frameData[key].width+'x'+l.frameData[key].height);console.log(await asc(l.frameData[key],f.width,f.height));}}
console.log(JSON.stringify([...map]));
})();
