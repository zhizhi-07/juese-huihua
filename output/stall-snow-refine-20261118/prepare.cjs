const fs=require('fs'),path=require('path'),assert=require('assert/strict'),png=require('../../scripts/png.cjs');
const dir=__dirname,j=JSON.parse(fs.readFileSync(path.join(dir,'before.json'))),layer=j.layers[25];assert.equal(layer.name,'雪顶（House原素材）');
const a=png.decode(Buffer.from(layer.frameData['0_0_0'].dataURL.split(',')[1],'base64'));assert(a.width===64&&a.height===64);
const original=Array.from({length:4096},(_,i)=>a.data[i*4+3]>0);
function components(mask,type){const seen=new Uint8Array(4096),out=[];for(let i=0;i<4096;i++){if(seen[i]||mask[i]!==type)continue;const q=[i];seen[i]=1;let edge=false;for(let k=0;k<q.length;k++){const n=q[k],x=n%64,y=Math.floor(n/64);if(x===0||x===63||y===0||y===63)edge=true;for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(xx>=0&&xx<64&&yy>=0&&yy<64){const next=yy*64+xx;if(!seen[next]&&mask[next]===type){seen[next]=1;q.push(next)}}}out.push({points:q,edge})}return out}
const blobs=components(original,true).sort((a,b)=>b.points.length-a.points.length),mask=new Array(4096).fill(false);assert.equal(blobs[0].points.length,889);for(const i of blobs[0].points)mask[i]=true;
const holes=components(mask,false).filter(c=>!c.edge),opening=holes.find(c=>c.points.includes(15*64+35)&&c.points.length>=160&&c.points.length<200);assert(opening,'Inspect new user opening before proceeding');
let filled=0;for(const hole of holes)if(hole!==opening){assert(hole.points.length<16);for(const i of hole.points){mask[i]=true;filled++}}
for(const i of opening.points)assert(!mask[i]);
const is=(x,y)=>x>=0&&x<64&&y>=0&&y<64&&mask[y*64+x];
const rows=Array.from({length:64},()=>new Array(64).fill('.'));
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 if(!is(x,y))continue;
 let down=0,left=0,right=0;while(is(x,y+down+1))down++;while(is(x-left-1,y))left++;while(is(x+right+1,y))right++;
 const boundary=!is(x-1,y)||!is(x+1,y)||!is(x,y-1)||!is(x,y+1);
 let c='w';
 if(down<=4)c='b';if(down<=2)c='B';
 if(y>=13&&x<25&&right<=2)c=right<=1?'B':'b';
 if(y>=13&&x>47&&left<=2)c=left<=1?'B':'b';
 if(boundary)c='k';
 // Leave a blue glint in the user's two-pixel-long left icicle instead of making it solid black.
 if(y>=26&&left===1&&right===0&&is(x,y+1))c='B';
 rows[y][x]=c;
}
const source=`pal({k:'#2f3b3d',w:'#ebf0ee',b:'#add6e0',B:'#8cbade'});\nsprite('snow',{w:64,h:64},\`\n${rows.map(r=>r.join('')).join('\n')}\n\`);\n`;
fs.writeFileSync(path.join(dir,'snow.px.js'),source);
fs.writeFileSync(path.join(dir,'shape-checks.json'),JSON.stringify({originalOpaque:original.filter(Boolean).length,mainBlob:blobs[0].points.length,removedDetachedPixels:blobs.slice(1).reduce((n,c)=>n+c.points.length,0),filledSmallHoles:filled,preservedSignOpeningPixels:opening.points.length,finalOpaque:mask.filter(Boolean).length,preservedLongLeftDrip:mask[31*64+14]&&mask[31*64+15]},null,2));
console.log('Prepared pixel snow from the user silhouette.');
