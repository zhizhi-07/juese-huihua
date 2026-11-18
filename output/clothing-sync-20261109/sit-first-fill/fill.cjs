const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture}=require('../../../test/clothing-sync.cjs'),png=require('../../../scripts/png.cjs'),B=require('../../../js/body-sync.cjs');
const from='3_1_1',key='3_1_0',read=n=>fs.readFileSync(path.join(__dirname,n)),write=(n,data)=>fs.writeFileSync(path.join(__dirname,n),typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));
const draft=JSON.parse(read('before.json')),main=JSON.parse(read('main-before.json')),disk=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../data/projects',B.BASE_PROJECT_ID+'.json')));
const clean=x=>JSON.parse(JSON.stringify(x)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const layer=(p,n)=>{const ls=p.layers.filter(l=>l.name===n&&l.frameData?.[key]);assert.equal(ls.length,1,n);return ls[0]};
const decode=c=>png.decode(Buffer.from(c.dataURL.split(',')[1],'base64')),encode=im=>'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
const alpha=im=>im.data.filter((v,i)=>i%4===3&&v).length,blank=(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)});
function pad(c,w,h){const im=decode(c),out=blank(w,h);assert(im.width<=w&&im.height<=h&&!c.placement);for(let y=0;y<im.height;y++)out.data.set(im.data.subarray(y*im.width*4,(y+1)*im.width*4),y*w*4);return {...c,width:w,height:h,dataURL:encode(out)};}
const end='http://127.0.0.1:8765/api/project?id=',proj=end+B.BASE_PROJECT_ID,master=end+'main';
async function get(url,name){const r=await fetch(url),b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);const tag=r.headers.get('etag');assert.equal(tag,'"'+sha(b)+'"');if(name)write(name,b);return {b,tag};}
async function put(url,obj,tag,name){
 const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tag},body:JSON.stringify(obj)}),body=await r.text();
 write(name,{status:r.status,tag:r.headers.get('etag'),body});console.log(name,r.status,body);assert.equal(r.status,200);
 return r.headers.get('etag');
}
(async()=>{
 const action=draft.spriteSheets[3].actions[1];assert.equal(action.direction,'down');
 const frame=action.frames[0];assert(!frame.locked&&!frame.lockedRegions?.length);
 assert.equal(alpha(decode(layer(draft,'body').frameData[key])),0);
 assert(alpha(decode(layer(draft,'body').frameData[from]))>0);
 const stage=structuredClone(draft);
 // Enlarge only the storage for this legacy crop; these pixels stay identical until the main body is copied.
 for(const n of ['body','body 描边']){const l=layer(stage,n);l.frameData[key]=pad(l.frameData[key],frame.width,frame.height);}
 const stageSim=structuredClone(stage),mainSim=structuredClone(main);
 assert.equal(B.push(stageSim,mainSim,disk).mainChanged,0);
 B.pull(stageSim,mainSim);assert.deepEqual(clean(stageSim),stage);
 const mainNext=structuredClone(main),target=layer(mainNext,'body').frameData;
 assert.equal(target[from].width,mainNext.spriteSheets[3].actions[1].frames[0].width);
 assert(!target[from].placement);target[key]=structuredClone(target[from]);
 const filled=structuredClone(stage);B.pull(filled,mainNext);const candidate=clean(filled);
 for(const n of ['body','body 描边']){const d=layer(candidate,n).frameData;assert.deepEqual(decode(d[key]),decode(d[from]));}
 const source=candidate.layers.find(l=>l.name==='高清 · 衣服'&&l.sheetIndex===1),sit=candidate.layers.find(l=>l.name===source.name&&l.sheetIndex===3);
 assert(!sit.frameData[key]);
 await fixture();const p=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(candidate)]))).project,C=PE.ClothingSync,F=PE.ClothingFit;
 const sourceBody=C.base(p,1,1,0,'body'),body=C.base(p,3,1,0,'body'),head=C.base(p,3,1,0,'head');
 const im=decode(source.frameData['1_1_0']),r=source.frameData['1_1_0'].placement,hd=blank(body.width*2,body.height*2);
 assert.equal(im.width,r.w*2);assert.equal(im.height,r.h*2);
 for(let k=0;k<4;k++){
   const cloth=blank(sourceBody.width,sourceBody.height);
   for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){
     const i=((y*2+(k>>1))*im.width+x*2+(k&1))*4,j=((y+r.y)*cloth.width+x+r.x)*4;
     cloth.data.set(im.data.subarray(i,i+4),j);
   }
   const fit=F.fromIdle({body:sourceBody,clothes:cloth},body,{sit:true,targetHead:head});
   for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){
     const j=(y*body.width+x)*4;if(!fit.data[j+3])continue;
     assert(body.data[j+3]&&!head.data[j+3]);
     hd.data.set(fit.data.subarray(j,j+4),((y*2+(k>>1))*hd.width+x*2+(k&1))*4);
   }
 }
 assert(alpha(hd)>0);
 sit.frameData[key]={width:hd.width,height:hd.height,placement:{x:0,y:0,w:body.width,h:body.height},dataURL:encode(hd)};
 const finalSim=structuredClone(candidate),mainNextSim=structuredClone(mainNext);
 assert.equal(B.push(finalSim,mainNextSim,stage).mainChanged,0);
 B.pull(finalSim,mainNextSim);assert.deepEqual(clean(finalSim),candidate);assert.deepEqual(mainNextSim,mainNext);
 write('stage.json',stage);write('main-candidate.json',mainNext);write('candidate.json',candidate);write('3_1_0-hd.png',png.encode(hd.width,hd.height,hd.data));
 console.log('Preflight passed: body and outline match front frame 2, garment pixels',alpha(hd),'other poses untouched');
 if(!process.argv.includes('--save'))return;
 const d0=await get(proj),m0=await get(master);assert(d0.b.equals(read('before.json'))&&m0.b.equals(read('main-before.json')),'revision changed before save');
 const t1=await put(proj,stage,d0.tag,'stage-put.json'),d1=await get(proj,'stage-readback.json');
 assert.equal(t1,d1.tag);assert.deepEqual(JSON.parse(d1.b),stage);assert.equal((await get(master)).tag,m0.tag);
 const tm=await put(master,mainNext,m0.tag,'main-put.json'),m1=await get(master,'main-readback.json');
 assert.equal(tm,m1.tag);assert.deepEqual(JSON.parse(m1.b),mainNext);
 const d2=await get(proj,'body-readback.json'),onlyBody=structuredClone(candidate);delete onlyBody.layers.find(l=>l.name===source.name&&l.sheetIndex===3).frameData[key];
 assert.deepEqual(JSON.parse(d2.b),onlyBody);
 const t3=await put(proj,candidate,d2.tag,'final-put.json'),d3=await get(proj,'readback.json');
 assert.equal(d3.tag,t3);assert.deepEqual(JSON.parse(d3.b),candidate);assert.equal((await get(master)).tag,m1.tag);
 console.log('Verified final project',d3.tag,'and main body',m1.tag);
})().catch(e=>{console.error(e);process.exitCode=1});
