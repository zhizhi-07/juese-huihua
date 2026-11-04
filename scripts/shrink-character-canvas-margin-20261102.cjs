const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),png=require('./png.cjs'),canvas=require('../js/character-canvas.cjs'),sync=require('../js/character-sync.js');
const oldDir=fs.readFileSync(path.resolve(__dirname,'../自检记录/当前画布居中备份路径.txt'),'utf8'),ids=JSON.parse(fs.readFileSync(path.join(oldDir,'save-results.json'))).map(p=>p.id),out=path.resolve('备份','20261102-画布留白4像素-'+Date.now()),url=id=>'http://127.0.0.1:8765/api/project?id='+id,decode=url=>png.decode(Buffer.from(url.split(',')[1],'base64')),encode=im=>'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
fs.mkdirSync(out,{recursive:true});
function resize(p){
 const work=structuredClone(p);for(const s of work.spriteSheets)if(s.canvasLayout)delete s.canvasLayout;
 const plans=canvas.measure(work),deltas={};
 for(const plan of plans){const s=p.spriteSheets[plan.si],old=s.canvasLayout;assert(old,'expected previously aligned canvas');
  const layouts=plan.actions.map((b,ai)=>({name:b.name,direction:b.direction,x:old.actions[ai].x+4-b.left,y:old.actions[ai].y+4-b.top,width:b.right-b.left+8,height:b.bottom-b.top+8})),width=Math.max(...layouts.map(b=>b.width)),height=Math.max(...layouts.map(b=>b.height)),columns=Math.max(...s.actions.map(a=>a.frames.length)),source=decode(s.imageDataURL),data=new Uint8Array(width*columns*height*s.actions.length*4);
  for(let ai=0;ai<s.actions.length;ai++){
   const b=plan.actions[ai],dx=4-b.left,dy=4-b.top,l=layouts[ai];deltas[plan.si+'_'+ai]={dx,dy};
   for(let fi=0;fi<s.actions[ai].frames.length;fi++){
    const f=s.actions[ai].frames[fi],key=`${plan.si}_${ai}_${fi}`;for(const layer of p.layers)if(layer.frameData?.[key])layer.frameData[key]=canvas.move(layer.frameData[key],l.width,l.height,dx,dy,{preserveOffCanvas:true});
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=l.width||ny>=l.height)continue;const i=((f.sourceY+y)*source.width+f.sourceX+x)*4;data.set(source.data.subarray(i,i+4),(((ai*height+ny)*width*columns)+fi*width+nx)*4);}
    Object.assign(f,{width:l.width,height:l.height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(f.lockedRegions||[]).map(r=>({...r,x:r.x+dx,y:r.y+dy}))});
   }
  }
  Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:encode({width:width*columns,height:height*s.actions.length,data}),canvasLayout:{version:1,margin:4,actions:layouts}});
 }
 return {project:p,deltas};
}
function ink(c,dx=0,dy=0){const im=decode(c.dataURL),r=c.placement||{x:0,y:0,w:im.width,h:im.height},map=new Map();for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3])map.set((x*r.w/im.width+r.x+dx).toFixed(6)+','+(y*r.h/im.height+r.y+dy).toFixed(6),Buffer.from(im.data.subarray(i,i+4)).toString('hex'));}return map;}
function verify(before,after,deltas){let cels=0,retained=0;assert.equal(after.layers.length,before.layers.length);
 before.spriteSheets.forEach((s,si)=>{if(!s.canvasLayout)assert.deepEqual(after.spriteSheets[si],s);});
 for(let i=0;i<before.layers.length;i++){const a=before.layers[i],b=after.layers[i];assert.deepEqual({...a,frameData:undefined},{...b,frameData:undefined});assert.deepEqual(Object.keys(a.frameData||{}),Object.keys(b.frameData||{}));for(const [key,c]of Object.entries(a.frameData||{})){const [si,ai]=key.split('_'),d=deltas[si+'_'+ai],n=b.frameData[key];if(!d){assert.deepEqual(n,c);continue;}assert.deepEqual(ink(n),ink(c,d.dx,d.dy),'no character pixel moved relative to the border '+key);if(n.placement)retained++;cels++;}}
 return {cels,retainedOutsideViewport:retained};
}
(async()=>{const rows=[];for(const id of ids){const r=await fetch(url(id));assert.equal(r.status,200);const raw=await r.text(),p=JSON.parse(raw);fs.writeFileSync(path.join(out,id+'.before.json'),raw);rows.push({id,etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex'),before:p,...resize(structuredClone(p))});}
 const main=rows.find(r=>r.id==='main').project;for(const row of rows){if(row.id.startsWith('character-'))sync(row.project,main);row.validation=verify(row.before,row.project,row.deltas);fs.writeFileSync(path.join(out,row.id+'.candidate.json'),JSON.stringify(row.project));console.log('VERIFIED',row.id,row.validation.cels);}
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({margin:4,rows:rows.map(({before,project,...row})=>row)},null,2));fs.writeFileSync('自检记录/当前4像素留白备份路径.txt',out);
 if(!process.argv.includes('--apply')){console.log('STAGED',out);return;}
 for(const row of rows){const r=await fetch(url(row.id));assert.equal(r.headers.get('etag'),row.etag,'用户刚保存了新稿，停止避免覆盖：'+row.id);}
 const results=[];for(const row of rows){const r=await fetch(url(row.id));assert.equal(r.status,200);const current=await r.json(),expected=structuredClone(row.before);if(row.id!=='main'&&row.id.startsWith('character-'))sync(expected,main);assert.deepEqual(current,expected,'保存前检测到并发修改：'+row.id);const saved=await fetch(url(row.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(row.project)});assert.equal(saved.status,200,await saved.text());const read=await fetch(url(row.id)),raw=await read.text();assert.deepEqual(JSON.parse(raw),row.project);fs.writeFileSync(path.join(out,row.id+'.after-api.json'),raw);results.push({id:row.id,etag:read.headers.get('etag'),...row.validation});console.log('SAVED',row.id);}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({margin:4,results},null,2));console.log('COMPLETE',rows.length,out);
})().catch(e=>{console.error(e);process.exitCode=1});
