const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/白裙侧面呼吸与鞋子-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const entry=data=>({width:32,height:32,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')});
const C={W:[247,245,241,255],S:[210,211,222,255],D:[179,181,197,255],O:[119,119,119,255],K:[65,65,73,255],L:[126,128,143,255],B:[43,49,52,255]};
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),before=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const dress=p.layers.find(l=>l.sheetIndex===8&&l.name==='服装 / 01 简单白色连衣裙');assert(dress);const shoes={sheetIndex:8,isGroup:false,parent:null,depth:0,referenceOnly:false,name:'鞋子 / 01 深灰玛丽珍鞋',visible:true,locked:false,opacity:1,frameData:{}};
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const key=`8_${ai}_${fi}`,body=p.layers.find(l=>l.sheetIndex===8&&l.name==='body'&&l.frameData[key]),im=png.decode(Buffer.from(body.frameData[key].dataURL.split(',')[1],'base64'));let bodyTop=32;for(let y=0;y<32;y++){let count=0;for(let x=0;x<32;x++)if(im.data[(y*32+x)*4+3])count++;if(count>=8){bodyTop=y;break;}}
  assert([22,24].includes(bodyTop));const low=bodyTop===24,waist=low?26:25,cloth=new Uint8Array(4096),shoe=new Uint8Array(4096);
  const set=(data,x,y,c)=>data.set(C[c],(y*32+x)*4);
  for(let y=bodyTop;y<=29;y++){
   const topPart=y<=waist;
   let left,right;if(topPart){left=10;right=23;}else{const t=y-waist;left=t===1?10:9;right=33-left;}
   if(y===29){left=10;right=23;}
   if(ai===0&&y>waist){left=y===29?11:10;right=y===29?24:24;}
   for(let x=left;x<=right;x++){
    const neck=ai===0?[17,21]:ai===2?[15,18]:[14,19];
    if(y===bodyTop&&x>=neck[0]&&x<=neck[1])continue;
    let c='W';
    if(x===left||x===right||y===29)c='O';
    else if(ai===0){if(x===12||x===13)c='S';if(y>waist&&x===15)c='S';if(x===right-1)c='D';}
    else {if(x===right-1)c='S';if(y>waist&&((x===13&&y>=27)||(x===20&&y>=27)))c='S';}
    if(y===waist&&x>left&&x<right)c=ai===0&&x<=14?'D':'S';
    set(cloth,x,y,c);
   }
  }
  const feet=ai===0?[[12,16,12,17],[18,21,19,23]]:[[12,15,11,15],[18,21,18,22]];
  for(const [a,b,c,d]of feet){for(let x=a;x<=b;x++)set(shoe,x,30,x===a?'L':'K');for(let x=c;x<=d;x++)set(shoe,x,31,'B');if(ai!==2)set(shoe,a+1,30,'L');}
  dress.frameData[key]=entry(cloth);shoes.frameData[key]=entry(shoe);
 }
 p.layers.push(shoes);
 // Near hands occlude the dress; rear hands keep their original placement.
 const oldLayers=[...p.layers],nearHands=p.layers.filter(l=>l.sheetIndex===8&&l.name==='hand');p.layers=p.layers.filter(l=>!nearHands.includes(l));p.layers.push(...nearHands);
 const indexMap=new Map(oldLayers.map((l,i)=>[i,p.layers.indexOf(l)]));for(const l of p.layers)if(l.parent!=null)l.parent=indexMap.get(l.parent);p.currentLayerIndex=indexMap.get(p.currentLayerIndex);
 for(let i=0;i<before.layers.length;i++){if(before.layers[i].name===dress.name)continue;const expected=JSON.parse(JSON.stringify(before.layers[i]));if(expected.parent!=null)expected.parent=indexMap.get(expected.parent);assert.deepEqual(p.layers[indexMap.get(i)],expected);}
 assert.deepEqual(p.spriteSheets,before.spriteSheets);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=png.decode(Buffer.from(shoes.frameData[`8_${ai}_${fi}`].dataURL.split(',')[1],'base64'));assert(im.data.slice(31*128).some(v=>v));assert.deepEqual(shoes.frameData[`8_${ai}_${fi}`],shoes.frameData[`8_${ai}_0`]);}
 assert.notDeepEqual(dress.frameData['8_0_0'],dress.frameData['8_1_0']);
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,384),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;project.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('前发')).visible=true;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);const blob=await ex.exportFrameAsBlob(8,ai,fi);assert.deepEqual(Array.from(png.decode(Buffer.from(await blob.arrayBuffer())).data),Array.from(im.data));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=ai===1?'#ddd5ed':'#45434b';ctx.fillRect(fi*128,ai*128,128,128);ctx.drawImage(tile,fi*128,ai*128,128,128);fs.writeFileSync(path.join(out,`idle-${ai}-${fi}.png`),tile.toBuffer('image/png'));}
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const detail=createCanvas(576,192),dc=detail.getContext('2d');dc.imageSmoothingEnabled=false;
 for(const l of project.layers)if(l.sheetIndex===8&&/^(头发|发饰) \//.test(l.name))l.visible=false;
 for(let ai=0;ai<3;ai++){const tile=createCanvas(32,32);tile.getContext('2d').putImageData(cm.getCompositeImageData(8,ai,0),0,0);dc.fillStyle='#ddd5ed';dc.fillRect(ai*192,0,192,192);dc.drawImage(tile,ai*192,0,192,192);}
 fs.writeFileSync(path.join(out,'dress-without-hair.png'),detail.toBuffer('image/png'));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);}
 console.log('PASS: side dress separately drawn, waist follows +1px and shoulders +2px, fixed hem/shoe floor, hands and other pixels preserved.'+(process.argv.includes('--publish')?' Saved and verified.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
