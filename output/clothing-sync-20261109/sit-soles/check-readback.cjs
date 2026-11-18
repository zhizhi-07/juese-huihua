const fs=require('node:fs'),assert=require('node:assert/strict'),png=require('../../../scripts/png.cjs');
const read=n=>fs.readFileSync(require('node:path').join(__dirname,n));
(async()=>{const ep='http://127.0.0.1:8765/api/project?id=',r=await fetch(ep+'draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba');
assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer()),result=JSON.parse(bytes),before=JSON.parse(read('before.json'));
assert.deepEqual(result,JSON.parse(read('candidate.json')));
const i=before.layers.findIndex(l=>l.name==='高清 · 衣服'&&l.sheetIndex===3),a=before.layers[i],b=result.layers[i];
const keys=Object.keys(b.frameData).filter(k=>JSON.stringify(a.frameData[k])!==JSON.stringify(b.frameData[k])).sort();
assert.deepEqual(keys,['3_0_0','3_0_1','3_0_2','3_1_0','3_1_2','3_1_3']);
result.layers[i]=a;assert.deepEqual(result,before);
const mr=await fetch(ep+'main');assert.equal(mr.status,200);assert(Buffer.from(await mr.arrayBuffer()).equals(read('main-before.json')));
const im=c=>png.decode(Buffer.from(c.dataURL.split(',')[1],'base64'));
let count=0;for(const k of keys){
const base=im(before.layers.find(l=>l.name==='body'&&l.frameData[k]).frameData[k]),hd=im(b.frameData[k]);
for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
const at=(y*base.width+x)*4;if(base.data.slice(at,at+4).join()!=='210,181,163,255')continue;
for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const j=((y*2+dy)*hd.width+x*2+dx)*4;assert.equal(hd.data.slice(j,j+4).join(),y===14?'178,174,174,255':'36,36,36,255');count++;}
}}
assert.equal(count,160);
console.log('Verified',r.headers.get('etag'),'only 6 sitting clothing frames, exact shoe colors on',count,'sole subpixels, main unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
