const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {read,load,save,pic,createCanvas,assert}=require('./helpers.cjs');
const file=name=>path.join(__dirname,name),bytes=name=>fs.readFileSync(file(name));
const hash=b=>createHash('sha256').update(b).digest('hex');
const log=[];
const record=item=>{log.push(item);save('verification.json',JSON.stringify(log,null,2));console.log(JSON.stringify(item));};
(async()=>{
 const base=read('before.meta.json'),diff=read('diff.json'),candidate=bytes('candidate.json'),before=bytes('before.json');
 assert.equal(base.sha256,hash(before));
 const main=base.url.replace(/id=.*/,'id=main');
 const mainBefore=await fetch(main);assert.equal(mainBefore.status,200);
 const mainSHA=hash(Buffer.from(await mainBefore.arrayBuffer()));
 const headers={'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':base.etag};
 const put=await fetch(base.url,{method:'PUT',headers,body:candidate});
 record({method:'PUT',url:base.url,headers,body:'candidate.json',sha256:hash(candidate),status:put.status,etag:put.headers.get('etag'),response:await put.text()});
 assert.equal(put.status,200,'save failed; candidate preserved. Do not retry 409 with a new ETag.');
 const get=await fetch(base.url,{cache:'no-store'}),after=Buffer.from(await get.arrayBuffer());
 save('after.json',after);
 record({method:'GET',url:base.url,status:get.status,etag:get.headers.get('etag'),response:'after.json',sha256:hash(after)});
 assert.equal(get.status,200);assert(after.equals(candidate),'readback bytes do not match');
 const mainAfter=await fetch(main);assert.equal(mainAfter.status,200);
 const mainAfterSHA=hash(Buffer.from(await mainAfter.arrayBuffer()));assert.equal(mainAfterSHA,mainSHA);
 const j=JSON.parse(after),original=JSON.parse(before),copy=structuredClone(j);
 for(const {layer,frame} of diff.edits){assert.notEqual(j.layers[layer].frameData[frame].dataURL,original.layers[layer].frameData[frame].dataURL);copy.layers[layer].frameData[frame]=original.layers[layer].frameData[frame];}
 assert.deepEqual(copy,original,'inverse on an extra copy must reproduce original');
 const [p,cm]=await load(j),si=diff.sheet;
 assert.equal(p.spriteSheets[si].getTotalFrames(),18);
 const timings=j.spriteSheets[si].actions.map(a=>a.frames.map(f=>f.duration));
 assert(timings.every(t=>JSON.stringify(t)===JSON.stringify(timings[0])));
 const args=[];
 for(let f=0;f<6;f++){
   const c=createCanvas(408,154),ctx=c.getContext('2d');
   ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,c.width,c.height);
   ctx.font='bold 15px sans-serif';ctx.fillStyle='#2a3432';ctx.textAlign='center';
   for(let a=0;a<3;a++){
     pic(ctx,cm.getCompositeImageData(si,a,f),a*136,0,8);
     ctx.fillText(['Side','Front','Back'][a],a*136+68,141);
   }
   const name='motion-'+(f+1)+'.png';save(name,c.toBuffer('image/png'));
   args.push('-delay',String(timings[0][f]/10),name);
 }
 args.push('-loop','0','animation.gif');
 const {spawnSync}=require('node:child_process');
 const run=(...args)=>spawnSync('magick',args,{cwd:__dirname,encoding:'utf8'});
 const build=run(...args);record({command:['magick',...args],exit:build.status,out:build.stdout,err:build.stderr});assert.equal(build.status,0);
 const gif=run('identify','-format','%wx%h:%T\n','animation.gif');
 record({command:['magick','identify','-format','%wx%h:%T\\n','animation.gif'],exit:gif.status,out:gif.stdout,err:gif.stderr});assert.equal(gif.status,0);
 assert.deepEqual(gif.stdout.trim().split(/\r?\n/),timings[0].map(ms=>'408x154:'+ms/10));
 record({checks:'Only 6 side rear-hand cels changed, saved readback equals candidate, inverse verified on data copy, project reopens and renders, GIF frames and durations verified.',sharedProjectBefore:mainSHA,sharedProjectAfter:mainAfterSHA,preview:'animation.gif'});
})().catch(e=>{record({error:e.message});console.error(e);process.exitCode=1});

