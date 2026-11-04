const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+f+'.js','utf8'));
const out=path.resolve('自检记录/黄色鸭鸭正面-20261101'),assets=path.resolve('服装素材/黄色鸭鸭正面-20261101'),backup=path.resolve('备份/20261101-正面黄色衣服-173614');
const id='character-1514538e-509b-4072-bcc8-6f7dfc0d24a4',url='http://127.0.0.1:8765/api/project?id='+id;
const png=d=>{let c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;};
function drawClothes(fi){
 const c=createCanvas(288,288),ctx=c.getContext('2d'),d=new ImageData(288,288),S=8;
 const P={edge:'#9c7d38',yellow:'#ffda35',light:'#ffe765',shade:'#dfb529',deep:'#c89f29',white:'#fff8e5',ivory:'#eee9d5',fold:'#c9c8ad',orange:'#bc8247',duck:'#ffce57',olive:'#768156',bag:'#b3b99a'};
 const rgb=h=>[...h.slice(1).match(/../g).map(v=>parseInt(v,16)),255];
 function dot(x,y,col){if(x>=0&&y>=0&&x<288&&y<288)d.data.set(rgb(P[col]||col),(y*288+x)*4);}
 function line(a,b,col){let x=Math.round(a[0]*S),y=Math.round(a[1]*S),ex=Math.round(b[0]*S),ey=Math.round(b[1]*S),dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1,e=dx+dy;for(;;){dot(x,y,col);if(x===ex&&y===ey)break;const e2=2*e;if(e2>=dy){e+=dy;x+=sx;}if(e2<=dx){e+=dx;y+=sy;}}}
 function poly(points,col,stroke){const p=points.map(([x,y])=>[x*S,y*S]);for(let y=Math.floor(Math.min(...p.map(v=>v[1])));y<=Math.ceil(Math.max(...p.map(v=>v[1])));y++){let xs=[];for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[j],b=p[i];if((a[1]>y+.5)!==(b[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)for(let x=Math.ceil(xs[i]-.5);x<xs[i+1]-.5;x++)dot(x,y,col);}if(stroke)points.forEach((a,i)=>line(a,points[(i+1)%points.length],stroke));}
 const top=fi>=2?26:24,hem=32.1,handBottom=[33,31,31,33][fi],cuff=handBottom-.9;
 // Sleeves cover the existing arms, leaving the original palms untouched below each cuff.
 for(const side of [0,1]){
  const tr=pts=>pts.map(([x,y])=>[side?36-x:x,y]);
  const st=Math.min(top+.6,[27,25,25,27][fi]-.15);
  poly(tr([[12.7,top+.7],[10,st],[8,st+.15],[6.5,st+.8],[6,st+1.5],[6,cuff-.7],[6.7,cuff],[10.9,cuff],[12.3,cuff-1.1]]),'yellow','edge');
  poly(tr([[6.3,st+1.5],[7.2,st+.8],[8.2,st+.65],[7.9,cuff-1.4],[7.2,cuff-.8],[6.4,cuff-.9]]),'light');
  poly(tr([[10.6,st+.8],[11.6,top+1],[12.2,cuff-1.2],[10.8,cuff-.2],[9.8,cuff-.8]]),'shade');
  for(let y=st+1.4;y<cuff-1;y+=1.4)line(tr([[8.7,y],[8.2,y+.65]])[0],tr([[8.7,y],[8.2,y+.65]])[1],'shade');
  poly(tr([[6.4,cuff-.8],[10.9,cuff-.8],[10.8,cuff],[6.7,cuff]]),'light','edge');
  for(let x=7;x<10.7;x+=.6)line(...tr([[x,cuff-.65],[x-.15,cuff-.15]]),'shade');
 }
 // Narrow cream pleated skirt stays at the same height throughout the breath.
 poly([[11.1,31.5],[24.9,31.5],[25.3,33],[23.6,33.1],[22.5,33],[20.7,33.1],[18,33],[15.3,33.1],[13.6,33],[10.7,33]],'white','fold');
 for(let x=12;x<=24;x+=2){poly([[x,31.8],[x+.45,31.8],[x+.7,33],[x+.1,33]],'ivory');line([x+.45,31.9],[x+.7,32.9],'fold');}
 poly([[12,top+.3],[15.7,top],[17.8,top+.7],[20.3,top],[24,top+.3],[25,top+1.2],[24.6,28.8+(top-24)*.4],[25.3,31.7],[24.7,32.1],[20.5,32.25],[17,32.2],[11.2,32.1],[10.7,31.7],[11.4,28.7+(top-24)*.4],[11,top+1.2]],'yellow','edge');
 poly([[11.5,top+1.4],[12.3,top+1.7],[12.5,30.2],[11.8,31.8],[11,31.7]],'light');
 poly([[23.9,top+1],[24.8,top+1.2],[24.3,29.7],[25,31.8],[23.9,32],[23.1,30.9]],'shade');
 line([12.8,27.4+(top-24)*.5],[12.5,29.1+(top-24)*.3],'shade');
 line([22.9,27.7+(top-24)*.5],[23.3,29.2+(top-24)*.3],'light');
 // Reference-style diagonal closure and three warm ochre buttons.
 const ty=y=>top+(y-24)*(hem-top)/(hem-24);
 line([14.8,ty(25.3)],[20.2,31.8],'deep');
 for(const [x,y]of [[15.9,26.7],[17.2,28.5],[18.8,30.5]]){poly([[x-.25,ty(y)-.2],[x+.2,ty(y)-.2],[x+.3,ty(y)+.1],[x,ty(y)+.3],[x-.3,ty(y)+.1]],'orange','edge');line([x-.13,ty(y)-.1],[x+.06,ty(y)-.1],'white');}
 // The two large soft ivory collar lobes frame a small open neckline.
 poly([[12,top+.35],[13.2,top-.05],[15.5,top+.1],[17.6,top+.65],[17,top+1.6],[16.1,top+2],[14.6,top+1.85],[12.5,top+1.2]],'ivory','fold');
 poly([[12.3,top+.35],[13.4,top+.1],[15.4,top+.25],[17.3,top+.7],[16.8,top+1.3],[15.9,top+1.6],[14.5,top+1.5],[12.7,top+.95]],'white');
 poly([[18.4,top+.65],[20.4,top+.1],[22.7,top-.05],[24,top+.35],[23.5,top+1.2],[21.4,top+1.85],[19.9,top+2],[19,top+1.6]],'ivory','fold');
 poly([[18.7,top+.7],[20.5,top+.25],[22.6,top+.1],[23.7,top+.35],[23.3,top+.95],[21.5,top+1.5],[20.1,top+1.6],[19.2,top+1.3]],'white');
 // Duck patch pocket, recognizable without copying tiny photographic details.
 poly([[12.5,30],[13.1,29.6],[13.7,30],[14.5,29.8],[14.7,29.1],[15.3,28.95],[15.8,29.35],[15.8,30.8],[15.2,31.35],[14.1,31.55],[12.9,31.3],[12.4,30.8]],'duck','orange');
 line([12.8,30.5],[13.1,30.9],'light');line([13.1,30.9],[14.5,31.1],'light');line([15.1,29.4],[15.1,29.4],'edge');
 // Olive diagonal strap and a small bottle carrier at the opposite hip.
 line([13.4,top+.1],[22.2,30.2],'olive');line([13.55,top+.1],[22.35,30.2],'ivory');
 poly([[21.2,29.1],[21.6,28.5],[22.5,28.5],[22.9,29.1],[23.2,31.8],[20.9,32],[20.8,29.4]],'olive','edge');
 poly([[21.15,29.65],[22.8,29.5],[23,31.4],[21.1,31.6]],'bag','olive');
 poly([[21.35,29.9],[22.55,29.8],[22.7,31.1],[21.4,31.25]],'white');
 poly([[21.7,30.3],[22.2,30.2],[22.35,30.65],[21.8,30.85],[21.55,30.65]],'duck');
 line([21.45,29.15],[22.4,29.05],'white');
 assert(d.data.some((v,i)=>i%4===3&&v));assert(d.data.every((v,i)=>i%4!==3||v===0||v===255));
 ctx.putImageData(d,0,0);return c;
}
async function main(){
 const before=JSON.parse(fs.readFileSync(backup+'/original.json','utf8')),p=structuredClone(before);
 const layer={name:'服装 / 黄色鸭鸭外套＋奶油短裙 / 正面高清',sheetIndex:8,parent:125,depth:1,isGroup:false,visible:true,locked:false,opacity:1,frameData:{}};
 for(let fi=0;fi<4;fi++){const native=drawClothes(fi);fs.writeFileSync(assets+'/手绘正面-'+fi+'.png',native.toBuffer('image/png'));layer.frameData['8_1_'+fi]={width:288,height:288,placement:{x:0,y:0,w:36,h:36},dataURL:native.toDataURL()};}
 p.layers.push(layer);p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepEqual(p.spriteSheets,before.spriteSheets);
 assert(Object.keys(layer.frameData).every(k=>/^8_1_[0-3]$/.test(k)));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new Blob([JSON.stringify(p)]));
 const cm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),project);ex.init(project,cm);cm.zoom=16;cm.showGrid=false;
 const contact=createCanvas(1152,1152),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let fi=0;fi<4;fi++){
  project.currentFrameIndex=fi;cm.render();const scale=cm.offscreenCanvas.width/36,composite=cm.getCompositeImageData(8,1,fi,true,scale);
  assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36*scale,36*scale).data,composite.data);
  const blob=await ex.exportFrameAsBlob(8,1,fi),exported=await loadImage(Buffer.from(await blob.arrayBuffer())),ec=createCanvas(exported.width,exported.height);ec.getContext('2d').drawImage(exported,0,0);
  const expected=cm.getCompositeImageData(8,1,fi,true,exported.width/36);assert.deepEqual(ec.getContext('2d').getImageData(0,0,ec.width,ec.height).data,expected.data);
  fs.writeFileSync(out+'/正面待机-'+fi+'.png',ec.toBuffer('image/png'));
  cx.fillStyle=fi%2?'#34323e':'#e7e1ee';cx.fillRect((fi%2)*576,Math.floor(fi/2)*576,576,576);cx.drawImage(ec,(fi%2)*576,Math.floor(fi/2)*576,576,576);
 }
 fs.writeFileSync(out+'/四帧浅深底.png',contact.toBuffer('image/png'));
 console.log(JSON.stringify({prepared:true,out,asset:assets+'/手绘正面-0.png',originalSHA256:crypto.createHash('sha256').update(fs.readFileSync(backup+'/original.json')).digest('hex')}));
 if(process.argv.includes('--save')){
  const latest=await fetch(url);assert(latest.ok);const raw=await latest.text();assert.deepEqual(JSON.parse(raw),before,'工程已变化：保留候选稿，不覆盖');
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':latest.headers.get('etag')},body:JSON.stringify(p)});const body=await r.text();assert(r.ok,body);console.log('PUT',r.status,body);
  const check=await fetch(url);assert(check.ok);const saved=await check.json();assert.deepEqual(saved,p);fs.writeFileSync(out+'/api-readback.json',JSON.stringify(saved));
  fs.writeFileSync(out+'/验证记录.txt','目标工程：'+id+'\n原稿 SHA256：'+crypto.createHash('sha256').update(fs.readFileSync(backup+'/original.json')).digest('hex')+'\n只新增1个衣服层，4个正面待机帧；180个原图层和全部原帧元数据不变。\n主画布render、getCompositeImageData、透明PNG导出逐帧像素一致；源图alpha只有0/255；深浅底合成已输出。\nPUT '+r.status+' '+body+'\nAPI回读：与候选工程深比较一致。\n未操作浏览器、未刷新用户前台。未改头发、素体、手、五官、其他方向/动作、编辑器代码。\n');
  console.log('GET',check.status,'deepEqual PASS');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
