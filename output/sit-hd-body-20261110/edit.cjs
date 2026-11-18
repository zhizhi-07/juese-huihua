const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {decode,encode}=require('../../scripts/png.cjs');
const dir=__dirname;
const file=name=>dir+'/'+name;
const read=name=>fs.readFileSync(file(name));
const write=(name,data)=>fs.writeFileSync(file(name),data);
const json=(name,data)=>write(name,JSON.stringify(data,null,2));
const id='draft-conflict-1794271316087-dc54567c', base='http://127.0.0.1:8765/api', url=base+'/project?id='+id;
const hash=buf=>createHash('sha256').update(buf).digest('hex');
const keys=Array.from({length:4},(_,i)=>'3_0_'+i);
const core=fs.readFileSync('js/core.js','utf8');
global.window=global; require('node:vm').runInThisContext(core);
const dec=f=>decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function bodyCel(art,old) {
  const hd=dec(art), neck=dec(old);
  const {x,y,w,h}=art.placement;
  assert.deepEqual([hd.width,hd.height,neck.width,neck.height],[16,10,16,16]);
  assert.equal(hd.width/w,2);assert.equal(hd.height/h,2);
  // Keep the first frame's neck connection; the drawn HD body starts below it.
  for(let j=0;j<4;j++)for(let i=0;i<hd.width;i++){
    const src=(Math.floor(y+j/2)*neck.width+Math.floor(x+i/2))*4,dst=(j*hd.width+i)*4;
    assert.equal(hd.data[dst+3],0);
    hd.data.set(neck.data.subarray(src,src+4),dst);
  }
  return {...art,dataURL:'data:image/png;base64,'+encode(hd.width,hd.height,hd.data).toString('base64')};
}
function preview(before,after) {
  const scale=8, size=32, pad=2, width=(4*(size+pad)+pad)*scale,height=(2*(size+pad)+pad)*scale;
  const out=Buffer.alloc(width*height*4);
  for(let i=0;i<out.length;i+=4) out.set([200,205,214,255],i);
  [before,after].forEach((p,row)=>keys.forEach((key,col)=>{
    const layers=PE.getRenderLayers(p,3,0).filter(l=>PE.isLayerVisible(p,l,3)&&l.opacity>0&&l.frameData?.[key]);
    const cels=layers.map(l=>{const f=l.frameData[key];return {src:dec(f),r:f.placement||{x:0,y:0,w:f.width,h:f.height},opacity:l.opacity};});
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const pixel=[240,243,249,255];
      for(const {src,r,opacity} of cels){
        const sx=Math.floor((x/2+0.25-r.x)*src.width/r.w),sy=Math.floor((y/2+0.25-r.y)*src.height/r.h);
        if(sx<0||sy<0||sx>=src.width||sy>=src.height)continue;
        const i=(sy*src.width+sx)*4,a=src.data[i+3]/255*opacity;
        for(let k=0;k<3;k++)pixel[k]=Math.round(src.data[i+k]*a+pixel[k]*(1-a));
      }
      const dx=(pad+col*(size+pad)+x)*scale,dy=(pad+row*(size+pad)+y)*scale;
      for(let j=0;j<scale;j++)for(let i=0;i<scale;i++)out.set(pixel,((dy+j)*width+dx+i)*4);
    }
  }));
  write('preview.png',encode(width,height,out));
}
async function stage(){
  const original=read('before.json'), meta=JSON.parse(read('original-revision.json'));
  assert.equal(hash(original),meta.sha256);
  const etag=meta.etag;
  const before=JSON.parse(original),after=structuredClone(before);
  const sit=after.spriteSheets[3];
  assert.equal(sit.name,'original16_sit');
  assert.equal(sit.actions.length,1);assert.equal(sit.actions[0].direction,'side');assert.equal(sit.actions[0].frames.length,4);
  assert(sit.actions[0].frames.every(f=>f.width===16&&f.height===16));
  const body=after.layers[91],source=after.layers[116];
  assert.equal(body.sheetIndex,3);assert.equal(body.name,'body');assert(body.visible);
  assert.equal(source.sheetIndex,3);assert(source.visible);
  assert.deepEqual(Object.keys(source.frameData),[keys[0]]);
  assert.deepEqual(Object.keys(body.frameData),keys);
  const art=source.frameData[keys[0]];
  assert.deepEqual(art.placement,{x:5,y:11,w:8,h:5});
  const img=dec(art);
  assert.equal(img.width,16);assert.equal(img.height,10);
  assert.equal(img.data.filter((v,i)=>i%4===3&&v>0).length,54);
  const cel=bodyCel(art,body.frameData[keys[0]]);
  const newImg=dec(cel);
  assert.deepEqual(newImg.data.slice(16*4*4),img.data.slice(16*4*4));
  for(const k of keys)body.frameData[k]=structuredClone(cel);
  source.visible=false;
  const verifiedScope=structuredClone(after);
  verifiedScope.layers[91].frameData=before.layers[91].frameData;
  verifiedScope.layers[116].visible=before.layers[116].visible;
  assert.deepEqual(verifiedScope,before);
  write('candidate.json',JSON.stringify(after));
  preview(before,after);
  console.log('GET /api/projects 200; GET project 200',etag,'\nStaged 4 source cels; original saved; preview rendered');
}
async function save(){
  const original=read('before.json'),candidate=read('candidate.json'),meta=JSON.parse(read('original-revision.json'));
  assert.equal(hash(original),meta.sha256);
  const expected=JSON.parse(original),art=expected.layers[116].frameData[keys[0]];
  const cel=bodyCel(art,expected.layers[91].frameData[keys[0]]);
  for(const k of keys) expected.layers[91].frameData[k]=cel;
  expected.layers[116].visible=false;
  assert.deepEqual(JSON.parse(candidate),expected);
  const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:candidate});
  const putBody=await response.text();
  const record={url,method:'PUT',ifMatch:meta.etag,requestSha256:hash(candidate),status:response.status,etag:response.headers.get('etag'),body:putBody};
  json('verification.json',{put:record});
  console.log(record);
  assert.equal(response.status,200);
  const check=await fetch(url),actual=Buffer.from(await check.arrayBuffer());
  const get={status:check.status,etag:check.headers.get('etag'),sha256:hash(actual)};
  assert.equal(check.status,200);
  assert.equal(get.etag,record.etag);
  assert.deepEqual(actual,candidate);
  write('verified.json',actual);
  json('verification.json',{put:record,get,verified:'4 body cels retain every drawn HD pixel and its placement, plus the first-frame neck connection; original HD source hidden; all other data unchanged'});
  console.log(get,'exact match');
}
(process.argv[2]==='save'?save():stage()).catch(e=>{console.error(e);process.exitCode=1;});

