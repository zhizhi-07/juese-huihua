const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','history','canvas','tools','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const out=path.join(__dirname,'../自检记录/蓝瞳参考高清试装-20261030');
(async()=>{
  const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../备份/20261030-蓝瞳参考待机/before.json'))),p=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
  const si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),cm=new PE.CanvasManager(Object.assign(createCanvas(360,360),{style:{}}),p),sheet=createCanvas(4*240,3*280),ctx=sheet.getContext('2d');ctx.fillStyle='#eee5dc';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
  const stats=[];
  p.spriteSheets[si].actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>{
    const image=cm.getCompositeImageData(si,ai,fi,false);assert(image.data.some((v,i)=>i%4===3&&v));ctx.fillStyle='#333';ctx.font='16px sans-serif';ctx.fillText(a.direction+' #'+(fi+1),fi*240+10,ai*280+24);PE.utils.drawImageData(ctx,image,fi*240+12,ai*280+38,6);
    const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(si+'_'+ai+'_'+fi));assert(head);const d=head.getFrameData(si+'_'+ai+'_'+fi),colors=new Map();let left=d.width,top=d.height,right=-1,bottom=-1;
    for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const i=(y*d.width+x)*4;if(!d.data[i+3])continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);const c=[...d.data.slice(i,i+4)].join(',');colors.set(c,(colors.get(c)||0)+1);}
    stats.push({ai,fi,bounds:{left,top,right,bottom},colors:[...colors].sort((a,b)=>b[1]-a[1])});
    if(ai===1){const c=createCanvas(432,432);c.getContext('2d').fillStyle='#e3d5c9';c.getContext('2d').fillRect(0,0,432,432);PE.utils.drawImageData(c.getContext('2d'),d,0,0,12);fs.writeFileSync(path.join(out,'正面头部-'+fi+'.png'),c.toBuffer('image/png'));}
  }));
  fs.writeFileSync(path.join(out,'修改前-全部待机.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'头部定位.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify({front:stats.filter(x=>x.ai===1),tailLayers:raw.layers.slice(-8).map(l=>({name:l.name,parent:l.parent,visible:l.visible,sheetIndex:l.sheetIndex,keys:Object.keys(l.frameData||{})}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
