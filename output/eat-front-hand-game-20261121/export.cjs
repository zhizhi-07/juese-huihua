const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const png=require('../../scripts/png.cjs');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
const target=path.resolve('E:/工作/0000-游戏/最后/游戏资产/人物/基础身体/前手/吃东西.png');
const file=name=>path.join(__dirname,name),read=name=>fs.readFileSync(file(name)),save=(name,data)=>fs.writeFileSync(file(name),data);
const sha=buf=>createHash('sha256').update(buf).digest('hex');
(async()=>{
 const list=await fetch(new URL('/api/projects',url));assert.equal(list.status,200);
 assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const r=await fetch(url);assert.equal(r.status,200);
 const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(etag);
 const before=fs.readFileSync(target),old=png.decode(before);
 assert.deepEqual([old.width,old.height],[102,51]);
 save('before.png',before);save('source.json',raw);
 save('before.json',JSON.stringify({url,status:r.status,etag,sha256:sha(raw),target,targetSHA256:sha(before)},null,2));
 const j=JSON.parse(raw),si=j.spriteSheets.findIndex(s=>s.name==='吃东西');
 assert(si>=0);
 const {actions}=j.spriteSheets[si],dirs=['side','down','up'],count=6,size=17;
 assert.deepEqual(actions.map(a=>a.direction),dirs);
 const atlas=Buffer.alloc(old.width*old.height*4);
 const cells=[];
 for(const [a,direction] of dirs.entries()){
   assert.equal(actions[a].frames.length,count);
   const [layer,...others]=j.layers.filter(l=>l.sheetIndex===si&&j.layers[l.parent]?.name===direction&&['hand','hand 描边'].includes(l.name));
   assert(layer?.name==='hand'&&!others.length&&layer.opacity===1);
   for(let f=0;f<count;f++){
     const frame=actions[a].frames[f],rawCell=layer.frameData[si+'_'+a+'_'+f];
     assert.deepEqual([frame.width,frame.height,frame.sourceX,frame.sourceY],[size,size,f*size,a*size]);
     assert(rawCell&&!rawCell.placement&&rawCell.dataURL.startsWith('data:image/png;base64,'));
     const cell=png.decode(Buffer.from(rawCell.dataURL.split(',')[1],'base64'));
     assert.deepEqual([cell.width,cell.height],[size,size]);
     const data=Buffer.from(cell.data);
     for(let y=0;y<size;y++){
       const at=((a*size+y)*old.width+f*size)*4;
       data.copy(atlas,at,y*size*4,(y+1)*size*4);
     }
     cells.push({direction,frame:f+1,duration:frame.duration,data});
   }
 }
 const out=png.encode(old.width,old.height,atlas),check=png.decode(out);
 assert.deepEqual([check.width,check.height],[102,51]);
 const atlasCheck=Buffer.from(check.data);
 for(const [i,{data}] of cells.entries()){
   const a=Math.floor(i/count),f=i%count;
   for(let y=0;y<size;y++){
     const at=((a*size+y)*check.width+f*size)*4;
     assert(atlasCheck.subarray(at,at+size*4).equals(data.subarray(y*size*4,(y+1)*size*4)));
   }
 }
 assert(!atlasCheck.equals(Buffer.from(old.data)), 'target pixels already match');
 save('吃东西.png',out);
 save('layout.json',JSON.stringify({width:check.width,height:check.height,frameWidth:size,frameHeight:size,columns:count,dirs,cells:cells.map(({data,...c})=>c),sha256:sha(out),rgbaMatchesSource:true},null,2));
 console.log('GET',r.status,etag,'; 18 cells verified, sizes 102x51 and 17x17; target backed up:',target);
})().catch(e=>{console.error(e);process.exitCode=1});
