const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const ref=JSON.parse(fs.readFileSync(D+'/sink-table-samples.json','utf8').replace(/^\uFEFF/,''));
const W=14,H=34,K=[47,59,61],sink=Buffer.alloc(W*H*4),table=Buffer.alloc(W*H*4);
const at=(key,x,y)=>ref[key][y*13+x];
function rect(b,x,y,w,h,c){for(let Y=y;Y<y+h;Y++)for(let X=x;X<x+w;X++)b.set([...c,255],(Y*W+X)*4);}
const rim=at('sink',2,1),inner=at('sink',6,6),shade=at('sink',3,4),metal=at('sink',6,3),wood=at('table',11,4),woodDark=at('table',10,2);
// The lower basin wall and table apron project below their top surfaces.
rect(sink,0,2,14,16,K);
rect(sink,1,3,1,13,at('sink',1,5));
rect(sink,2,3,10,12,rim);
rect(sink,3,4,8,10,shade);
rect(sink,4,6,6,7,inner);
rect(sink,4,5,6,1,metal);
rect(sink,10,5,1,8,at('sink',10,6));
rect(sink,4,13,6,1,metal);
rect(sink,7,8,1,1,shade);rect(sink,7,9,1,1,rim);
rect(sink,12,3,1,13,shade);
rect(sink,2,15,10,1,metal);
rect(sink,2,16,10,1,shade);
rect(sink,4,0,5,1,K);rect(sink,4,1,5,1,K);rect(sink,5,1,3,1,rim);
rect(sink,4,2,1,2,K);rect(sink,5,2,3,1,metal);rect(sink,8,2,1,2,K);
rect(table,0,18,14,16,K);
rect(table,1,18,11,11,wood);
for(let y=19;y<28;y++){
 rect(table,1,y,1,1,at('table',11,Math.min(y-18,8)));
 rect(table,11,y,1,1,woodDark);
}
rect(table,12,18,1,14,at('sink',1,8));
rect(table,1,28,11,1,at('table',11,1));
rect(table,1,29,11,1,at('sink',1,5));
rect(table,1,30,11,3,woodDark);
for(const x of [3,7,11])rect(table,x,30,1,3,at('sink',1,8));
rect(table,1,32,11,1,at('sink',1,8));
const merged=Buffer.from(table);for(let i=0;i<sink.length;i+=4)if(sink[i+3])sink.copy(merged,i,i,i+4);
for(const b of [sink,table])assert(b.some(v=>v!==0));
assert.notDeepStrictEqual([...sink.subarray((16*W+6)*4,(16*W+6)*4+3)],inner);
assert.notDeepStrictEqual([...table.subarray((31*W+6)*4,(31*W+6)*4+3)],wood);
const uri=b=>'data:image/png;base64,'+png(b,W,H).toString('base64');
fs.writeFileSync(D+'/洗手池和木桌.png',png(merged,W,H));
const scale=24,large=Buffer.alloc(W*H*scale*scale*4);
for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const n=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;merged.copy(large,(y*W*scale+x)*4,n,n+4);}
fs.writeFileSync(D+'/洗手池和木桌-preview.png',png(large,W*scale,H*scale));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='洗手池和木桌',si=p.spriteSheets.length;assert(!p.spriteSheets.some(s=>s.name===name));
 fs.writeFileSync(D+'/before-combined-sink-table.json',raw);fs.writeFileSync(D+'/before-combined-sink-table.etag',etag);fs.writeFileSync(D+'/before-combined-sink-table.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 p.spriteSheets.push({name,frameWidth:W,frameHeight:H,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:uri(merged),actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:W,height:H,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 for(const [name,b] of [['木桌',table],['洗手池',sink]])p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:W,height:H,dataURL:uri(b)}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/combined-sink-table-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Preview ready; not saved yet.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/combined-sink-table-readback.json',JSON.stringify(back));console.log('Verified one combined material with basin front, table apron, side thickness; other assets and layout unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
