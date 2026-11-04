const fs=require('fs'),path=require('path'),assert=require('assert/strict'),png=require('../../scripts/png.cjs');
const file=n=>path.join(__dirname,n),before=JSON.parse(fs.readFileSync(file('before.json'))),p=structuredClone(before);
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function head(si,ai,fi){let key=`${si}_${ai}_${fi}`,l=before.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData?.[key]);assert(l,key);let im=decode(l.frameData[key]),top=im.height;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])top=Math.min(top,y);let xs=[];for(let y=top;y<=top+12;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])xs.push(x);return {top,cx:(Math.min(...xs)+Math.max(...xs))/2}}
const srcRear=before.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 底层后发')),srcSide=before.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 侧面后发')),srcFront=before.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 前发'));
const plans=[
 {name:'original32_walk',phases:[[0,2,3,1,0,2,3,1],[0,2,3,1,0,2,3,1],[0,2,3,1,0,2,3,1]]},
 {name:'original32_pickup',phases:[[0,2,1,0,1,0],[0,2,0,1,0,1],[0,2,1,3,0,1]]},
 {name:'original32_sleep',phases:[[0,1,2,3]]}
],under=[],over=[],manifest=[];
for(const plan of plans){
 let si=p.spriteSheets.findIndex(s=>s.name===plan.name);assert(si>=0);assert(!p.layers.some(l=>l.sheetIndex===si&&l.name.startsWith('头发')),'Existing hair requires merge, not overwrite');
 let gi=under.length,group={sheetIndex:si,isGroup:true,parent:null,depth:0,name:'头发 / 80009 / 后发',visible:true,locked:false,opacity:1,frameData:{}},rear={...structuredClone(srcRear),sheetIndex:si,parent:gi,frameData:{}},front={...structuredClone(srcFront),sheetIndex:si,parent:null,frameData:{}},side=p.spriteSheets[si].actions.some(a=>a.direction==='side')?{...structuredClone(srcSide),sheetIndex:si,parent:gi,frameData:{}}:null;
 under.push(group,rear);
 for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
  let action=p.spriteSheets[si].actions[ai],sourceAi=before.spriteSheets[8].actions.findIndex(a=>a.direction===action.direction);assert(sourceAi>=0);
  for(let fi=0;fi<action.frames.length;fi++){
   let sourceFi=plan.phases[ai][fi],sh=head(8,sourceAi,sourceFi),th=head(si,ai,fi),dx=th.cx-sh.cx,dy=th.top-sh.top;assert(Number.isInteger(dx)&&Number.isInteger(dy));
   let f=action.frames[fi],key=`${si}_${ai}_${fi}`,sourceKey=`8_${sourceAi}_${sourceFi}`;
   for(let [target,source]of [[rear,srcRear],[side,srcSide],[front,srcFront]]){
    if(!target)continue;let im=decode(source.frameData[sourceKey]),data=Buffer.alloc(f.width*f.height*4),n=0;
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
     let i=(y*im.width+x)*4;if(!im.data[i+3])continue;let xx=x+dx,yy=y+dy;assert(xx>=0&&xx<f.width&&yy>=0&&yy<f.height,'Pasted hair would crop '+key+' '+source.name);data.set(im.data.subarray(i,i+4),(yy*f.width+xx)*4);n++;
    }
    target.frameData[key]={width:f.width,height:f.height,dataURL:'data:image/png;base64,'+png.encode(f.width,f.height,data).toString('base64')};
    manifest.push({key,sourceKey,layer:target.name,dx,dy,pixels:n,mode:'exact-rgba-copy-no-scale-no-redraw'});
   }
  }
 }
 if(side)over.push(side);over.push(front);
}
const shift=under.length;
for(let l of p.layers)if(l.parent!=null)l.parent+=shift;
p.layers=[...under,...p.layers,...over];p.currentLayerIndex+=shift;
for(let i=0;i<before.layers.length;i++){let expected=structuredClone(before.layers[i]);if(expected.parent!=null)expected.parent+=shift;assert.deepEqual(p.layers[i+shift],expected,'Existing layer changed')}
assert.deepEqual(p.spriteSheets,before.spriteSheets);fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('复制粘贴映射.json'),JSON.stringify({shift,newLayers:under.length+over.length,manifest},null,2));console.log('PASS: pasted existing idle hair into 24 walking, 18 pickup and 4 sleeping frames; exact RGBA translations, no cropping, redraw or scaling; all old cels retained');

