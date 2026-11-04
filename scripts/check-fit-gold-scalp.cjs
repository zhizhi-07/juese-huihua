const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{const out=path.resolve('自检记录/金发按参考对齐-1793321292701'),p=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),front=p.layers.find(l=>l.name==='头发 / 80011 / 前发'),rear=p.layers.find(l=>l.name==='头发 / 80009 / 后发');
function canvas(w=32,h=32){let c=createCanvas(w,h);c.getContext('2d').imageSmoothingEnabled=false;return c}
async function decode(f){let c=canvas();c.getContext('2d').drawImage(await loadImage(f.dataURL),0,0);return c}
function at(im,x,y){return x>=0&&x<32&&y>=0&&y<32&&im.data[(y*32+x)*4+3]}
let reports=[];
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let key=`8_${ai}_${fi}`,h=p.layers.find(l=>l.name==='head'&&l.sheetIndex===8&&l.frameData?.[key]),hc=await decode(h.frameData[key]),hd=hc.getContext('2d').getImageData(0,0,32,32),fc=await decode(front.frameData[key]),fg=fc.getContext('2d'),fd=fg.getImageData(0,0,32,32),rc=await decode(rear.frameData[key]),rg=rc.getContext('2d'),rd=rg.getImageData(0,0,32,32);let minY=32,maxY=0;for(let y=0;y<24;y++)for(let x=5;x<27;x++)if(at(hd,x,y)){minY=Math.min(minY,y);maxY=Math.max(maxY,y)}maxY=Math.min(maxY,minY+19);
let exposedBefore=[],exposedAfter=[];
for(let y=minY;y<minY+8;y++)for(let x=0;x<32;x++)if(at(hd,x,y)&&!at(fd,x,y)&&!at(rd,x,y))exposedBefore.push([x,y]);
if(ai===2){
 // Warp the source back cap onto the head silhouette; ears remain outside the scalp mask.
 let original=new Uint8ClampedArray(rd.data),sampleRows=[];
 for(let y=0;y<24;y++){let xs=[];for(let x=5;x<27;x++)if(original[(y*32+x)*4+3])xs.push(x);if(xs.length>=5)sampleRows.push({y,l:xs[0],r:xs.at(-1)})}
 assert(sampleRows.length>8);let top=Math.max(0,minY-2),bottom=maxY,mask=[];
 for(let y=top;y<=bottom;y++){
  let xs=[];for(let x=0;x<32;x++){
   let covered=false;for(let yy=y;yy<=Math.min(maxY,y+2);yy++)for(let xx=Math.max(5,x-1);xx<=Math.min(26,x+1);xx++)if(at(hd,xx,yy))covered=true;
   if(covered)xs.push(x)
  }if(!xs.length)continue;let sy=sampleRows[0].y+(y-top)*(sampleRows.at(-1).y-sampleRows[0].y)/Math.max(1,bottom-top),row=sampleRows.reduce((a,b)=>Math.abs(a.y-sy)<Math.abs(b.y-sy)?a:b),l=xs[0],r=xs.at(-1);
  for(let x=l;x<=r;x++){let sx=Math.round(row.l+(x-l)*(row.r-row.l)/Math.max(1,r-l)),i=(row.y*32+sx)*4;if(!original[i+3]){let near=[];for(let xx=row.l;xx<=row.r;xx++)if(original[(row.y*32+xx)*4+3])near.push(xx);sx=near.reduce((a,b)=>Math.abs(a-sx)<Math.abs(b-sx)?a:b);i=(row.y*32+sx)*4}rd.data.set(original.slice(i,i+4),(y*32+x)*4);mask.push([x,y])}
 }
 rg.putImageData(rd,0,0);
}
for(let y=minY;y<minY+8;y++)for(let x=0;x<32;x++)if(at(hd,x,y)&&!at(fd,x,y)&&!at(rd,x,y))exposedAfter.push([x,y]);console.log(key,JSON.stringify(exposedAfter));assert.equal(exposedAfter.filter(v=>v[1]<minY+5).length,0,'Exposed upper scalp '+key);if(ai===2)for(let y=minY;y<=maxY;y++)for(let x=5;x<27;x++)if(at(hd,x,y))assert(at(rd,x,y),'Back scalp leak '+key+' '+x+','+y);
front.frameData[key].dataURL=fc.toDataURL();rear.frameData[key].dataURL=rc.toDataURL();reports.push({key,exposedBefore,exposedAfter});
}
let oldLayers=p.layers.slice(),parents=new Map(oldLayers.map(l=>[l,l.parent==null?null:oldLayers[l.parent]])),group={name:'头发 / 80009 / 后发',sheetIndex:8,isGroup:true,visible:true,locked:false,opacity:1,parent:null,depth:0,expanded:true,frameData:{}},side={name:'头发 / 80009 / 侧面后发',sheetIndex:8,visible:true,locked:false,opacity:1,depth:1,parent:null,frameData:{}};rear.name='头发 / 80009 / 底层后发';for(let fi=0;fi<4;fi++){let key='8_0_'+fi;side.frameData[key]=rear.frameData[key];rear.frameData[key]={width:32,height:32,dataURL:canvas().toDataURL()}}p.layers=[group,rear,...oldLayers.filter(l=>l!==rear&&l!==front),side,front];for(let l of p.layers)if(l.parent!=null)l.parent=p.layers.indexOf(parents.get(l));rear.parent=0;rear.depth=1;side.parent=0;p.currentLayerIndex=p.layers.indexOf(front);fs.writeFileSync(path.join(out,'candidate-fitted.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'scalp-coverage-check.json'),JSON.stringify(reports,null,2));
let preview=canvas(768,576),pg=preview.getContext('2d');for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let c=canvas(),g=c.getContext('2d'),key=`8_${ai}_${fi}`;for(let l of PE.getRenderLayers(p,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(!p.layers[par].visible)visible=false;par=p.layers[par].parent}if(visible&&l.frameData?.[key])g.drawImage(await loadImage(l.frameData[key].dataURL),0,0)}pg.fillStyle=fi%2?'#35434b':'#ccd3cd';pg.fillRect(fi*192,ai*192,192,192);pg.drawImage(c,fi*192,ai*192,192,192);fs.writeFileSync(path.join(out,`校正-${ai}-${fi}.png`),c.toBuffer('image/png'))}fs.writeFileSync(path.join(out,'头部对齐校正.png'),preview.toBuffer('image/png'));console.log(out)
})().catch(e=>{console.error(e);process.exitCode=1})




