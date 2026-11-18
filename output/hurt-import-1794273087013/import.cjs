const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname, save=(n,v)=>fs.writeFileSync(path.join(dir,n),v);
const url='http://127.0.0.1:8765/api/project?id=draft-conflict-1794271316087-dc54567c';
const hash=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
if(process.argv[2]==='save'){
  const meta=JSON.parse(fs.readFileSync(path.join(dir,'before-meta.json'))), body=fs.readFileSync(path.join(dir,'candidate.json'));
  assert.equal(hash(body),meta.candidateSHA256);
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body}); const response=await r.text(); console.log('PUT',r.status,response); save('put.json',response); assert.equal(r.status,200);
  const check=await fetch(url), bytes=Buffer.from(await check.arrayBuffer());console.log('GET',check.status,check.headers.get('etag'),hash(bytes)); save('readback.json',bytes);assert.equal(check.status,200);assert.deepEqual(JSON.parse(bytes),JSON.parse(body));return;
}
const src=fs.readFileSync('output/hair-reference-20261104/project.json'), source=JSON.parse(src), from=source.spriteSheets.findIndex(s=>s.name==='hurt'), old=source.spriteSheets[from];
const r=await fetch(url);assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert.equal(etag,'"'+hash(raw)+'"');save('before.json',raw);const p=JSON.parse(raw), to=p.spriteSheets.length;
assert(!p.spriteSheets.some(s=>s.name==='hurt'));
const layers=source.layers.map((l,i)=>({l,i})).filter(({l})=>l.sheetIndex===from);
assert(layers.every(({l})=>/^(up|down|side|head|body|hand|hand 2)$/.test(l.name)));
const indices=new Map(layers.map(({i},n)=>[i,p.layers.length+n]));
const atlas=createCanvas(64,48), ctx=atlas.getContext('2d');
const palette={'2f3b3d':'46465e',ebf0ee:'feede1',d4d0cd:'e0c5b4'};
const sheet={name:'hurt',frameWidth:16,frameHeight:16,columns:4,rows:3,spacingX:0,spacingY:0,offsetX:0,offsetY:0,useFrameDurations:true,fps:old.fps,actions:old.actions.map((a,ai)=>({...a,frames:a.frames.map((f,fi)=>({...f,sheetIndex:to,sourceX:16*fi,sourceY:16*ai,width:16,height:16}))}))};
const composites=sheet.actions.map(a=>a.frames.map(()=>createCanvas(16,16)));
for(const {l} of layers){
  const copy={...l,sheetIndex:to,parent:l.parent==null?null:indices.get(l.parent),frameData:{}};
  assert(copy.parent!==undefined);
  for(const [key,fd] of Object.entries(l.frameData)){
    const [si,ai,fi]=key.split('_').map(Number);assert.equal(si,from);assert(composites[ai]?.[fi]);
    const im=await loadImage(fd.dataURL),large=createCanvas(im.width,im.height).getContext('2d');
    assert.equal(im.width,79);assert.equal(im.height,79);large.drawImage(im,0,0);
    const src=large.getImageData(0,0,im.width,im.height).data;
    const c=createCanvas(16,16),g=c.getContext('2d'),out=g.createImageData(16,16);
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
      const i=4*(y*im.width+x);if(!src[i+3])continue;
      assert(x>=31&&x<47&&y>=24&&y<40,'crop would lose pixels');
      const color=palette[Buffer.from(src.slice(i,i+3)).toString('hex')];assert(color&&src[i+3]===255);
      out.data.set([...Buffer.from(color,'hex'),255],4*((y-24)*16+x-31));
    }
    g.putImageData(out,0,0);
    copy.frameData[[to,ai,fi].join('_')]={width:16,height:16,dataURL:c.toDataURL('image/png')};
    if(l.visible!==false)composites[ai][fi].getContext('2d').drawImage(c,0,0);
  }
  p.layers.push(copy);
}
for(const [ai,row] of composites.entries())for(const [fi,c] of row.entries()){
  assert(c.getContext('2d').getImageData(0,0,16,16).data.some((v,i)=>i%4===3&&v));
  ctx.drawImage(c,fi*16,ai*16);
}
sheet.imageDataURL=atlas.toDataURL('image/png'); p.spriteSheets.push(sheet);
const compare=structuredClone(p);compare.spriteSheets.pop();compare.layers.splice(indices.values().next().value);assert.deepEqual(compare,JSON.parse(raw));
const preview=createCanvas(4*112,3*112), pc=preview.getContext('2d');
pc.fillStyle='#ddd5ed';pc.fillRect(0,0,preview.width,preview.height);pc.imageSmoothingEnabled=false;
for(const [ai,row] of composites.entries())for(const [fi,c] of row.entries())pc.drawImage(c,fi*112+8,ai*112+8,96,96);
const body=JSON.stringify(p);save('preview.png',preview.toBuffer('image/png'));save('candidate.json',body);
save('before-meta.json',JSON.stringify({url,etag,beforeSHA256:hash(raw),candidateSHA256:hash(body),sourceSHA256:hash(src),source:'output/hair-reference-20261104/project.json'},null,2));
console.log('GET',r.status,etag,'candidate',hash(body),sheet.actions.map(a=>[a.direction,a.frames.map(f=>f.duration)]),layers.length);
})().catch(e=>{console.error(e);process.exitCode=1;});
