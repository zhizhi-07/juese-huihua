const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8'),source=fs.readFileSync(D+'/../noodle-stove-20261118/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',source.slice(source.indexOf('function decode('),source.indexOf('(async()=>'))+';return decode;')(zlib,assert);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='前台钥匙挂板'),s=p.spriteSheets[si],w=18,H=13;assert(s&&s.frameWidth===w&&s.frameHeight===11);
 const boardLayer=p.layers.find(l=>l.sheetIndex===si&&l.name==='挂板'),keyLayer=p.layers.find(l=>l.sheetIndex===si&&l.name==='钥匙');assert(boardLayer&&keyLayer);
 const frameKey=si+'_0_0',oldBoard=decode(boardLayer.frameData[frameKey].dataURL,w,11),oldKeys=decode(keyLayer.frameData[frameKey].dataURL,w,11),board=Buffer.alloc(w*H*4),keys=Buffer.alloc(w*H*4);
 oldBoard.copy(board);
 const color=(x,y)=>oldBoard.subarray((y*w+x)*4,(y*w+x)*4+4),put=(x,y,c)=>board.set(c,(y*w+x)*4),edge=color(0,0),back=color(1,8),shade=color(1,9);
 for(let y=9;y<H;y++)for(let x=0;x<w;x++)put(x,y,x===0||x===w-1||y===H-1?edge:y===H-2?shade:back);
 for(const y of [3,7])for(const x of [2,6,10,14])put(x,y,back);
 for(const y of [4,8])for(const x of [2,6,10,14])put(x,y,edge);
 oldKeys.copy(keys,w*4);
 for(let y=0;y<11;y++)for(let x=0;x<w;x++){const from=(y*w+x)*4,to=((y+1)*w+x)*4;assert.deepStrictEqual(keys.subarray(to,to+4),oldKeys.subarray(from,from+4));}
 assert.deepStrictEqual(board.subarray(0,3*w*4),oldBoard.subarray(0,3*w*4));
 const uri=b=>'data:image/png;base64,'+png(b,w,H).toString('base64'),merged=Buffer.from(board);
 for(let i=0;i<keys.length;i+=4)if(keys[i+3])keys.copy(merged,i,i,i+4);
 for(const [l,b] of [[boardLayer,board],[keyLayer,keys]])Object.assign(l.frameData[frameKey],{width:w,height:H,dataURL:uri(b)});
 s.frameHeight=H;s.imageDataURL=uri(merged);s.actions[0].frames[0].height=H;
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/before-extend-panel.json',raw);fs.writeFileSync(D+'/before-extend-panel.etag',etag);fs.writeFileSync(D+'/before-extend-panel.sha256',crypto.createHash('sha256').update(raw).digest('hex'));fs.writeFileSync(D+'/extend-panel-candidate.json',JSON.stringify(p));
 const scale=26,large=Buffer.alloc(w*H*scale*scale*4);
 for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;merged.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/extend-panel-preview.png',png(large,w*scale,H*scale));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const backRead=await(await fetch(url)).json();assert.deepStrictEqual(backRead,p);fs.writeFileSync(D+'/extend-panel-readback.json',JSON.stringify(backRead));console.log('Verified keys and hooks down 1px, panel bottom extended 2px, separate layers retained; map unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
