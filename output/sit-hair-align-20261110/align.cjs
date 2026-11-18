const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {decode,encode}=require('../../scripts/png.cjs');
const id='draft-conflict-1794271316087-dc54567c',base='http://127.0.0.1:8765/api',url=base+'/project?id='+id;
const path=n=>__dirname+'/'+n, read=n=>fs.readFileSync(path(n)),write=(n,d)=>fs.writeFileSync(path(n),d);
const json=(n,o)=>write(n,JSON.stringify(o,null,2)),hash=b=>createHash('sha256').update(b).digest('hex');
const keys=new Set(Array.from({length:4},(_,i)=>'3_0_'+i));
const addresses=[...keys].map((_,i)=>'original16_sit/side/'+i);
global.window=global;global.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
global.document={addEventListener(){},createElement(){const canvas={};let output;const ctx={getImageData:()=>({data:output}),copy(im){output=new Uint8Array(canvas.width*canvas.height*4);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)output.set(pixel(im,x+.5,y+.5),(y*canvas.width+x)*4);}};canvas.getContext=()=>ctx;return canvas;}};
for(const name of ['core','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+name+'.js','utf8'),{filename:name});
PE.utils.drawImageData=(ctx,im)=>ctx.copy(im);
const H=PE.HairAnimation;
const decodeCel=f=>f?{...decode(Buffer.from(f.dataURL.split(',')[1],'base64')),placement:f.placement}:null;
function pixel(im,x,y){
  const r=im.placement||{x:0,y:0,w:im.width,h:im.height},sx=Math.floor((x-r.x)*im.width/r.w),sy=Math.floor((y-r.y)*im.height/r.h);
  if(sx<0||sy<0||sx>=im.width||sy>=im.height)return [0,0,0,0];
  const i=(sy*im.width+sx)*4;
  return im.data.subarray(i,i+4);
}
function inflate(raw){const p=structuredClone(raw);p.getFrameKey=(...a)=>a.join('_');for(const l of p.layers)l.getFrameData=k=>decodeCel(l.frameData?.[k]);return p;}
function preview(raws){
  const n=160,gap=10,w=4*(n+gap)+gap,h=2*(n+gap)+gap;
  const data=Buffer.alloc(w*h*4);for(let i=0;i<data.length;i+=4)data.set([202,207,216,255],i);
  raws.forEach((raw,row)=>{const p=inflate(raw);[...keys].forEach((key,col)=>{
    const layers=PE.getRenderLayers(p,3,0).filter(l=>PE.isLayerVisible(p,l,3)&&l.opacity>0&&l.frameData?.[key]).map(l=>[l.getFrameData(key),l.opacity]);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const color=[240,243,249,255];
      for(const [im,opacity]of layers){const v=pixel(im,(x+.5)/10,(y+.5)/10),a=v[3]/255*opacity;for(let c=0;c<3;c++)color[c]=Math.round(v[c]*a+color[c]*(1-a));}
      const dx=gap+col*(n+gap)+x,dy=gap+row*(n+gap)+y;data.set(color,(dy*w+dx)*4);
    }
  });});
  write('preview.png',encode(w,h,data));
}
function adjust(before){
  const p=inflate(before),next=structuredClone(before),sit=p.spriteSheets[3];
  assert.equal(sit.name,'original16_sit');
  assert.deepEqual(sit.actions.map(a=>a.direction),['side']);assert.equal(sit.actions[0].frames.length,4);
  const sources=p.layers.filter(l=>l.hairAnimation&&PE.classifyPart(l.name)?.category==='头发'&&['前发','后发'].includes(PE.classifyPart(l.name)?.slot));
  assert.equal(sources.length,2);
  const log=[];
  for(const source of sources){
    const g=source.hairAnimation,prev=H.plan(p,source,g,keys),actual=H.calibrate(p,source);
    const recal=structuredClone(g);
    for(const k of addresses){assert.deepEqual({x:actual[k].x,y:actual[k].y+1},g.offsets[k]);recal.offsets[k]=actual[k];}
    const result=H.plan(p,source,recal,keys);
    assert.equal(result.edits.length,4);assert.equal(result.clipped,0);
    const i=p.layers.indexOf(source);
    next.layers[i].hairAnimation=recal;
    for(const [index,e]of result.edits.entries()){
      assert.equal(e.layer.sheetIndex,3);assert(keys.has(e.key));
      const old=e.layer.getFrameData(e.key);
      const expected=prev.edits[index].image;
      assert.deepEqual([old.width,old.height,old.placement],[expected.width,expected.height,expected.placement]);
      assert.deepEqual(Buffer.from(old.data),Buffer.from(expected.data),'current cel was hand edited; do not overwrite');
      const {width,height,data,placement}=e.image;
      next.layers[p.layers.indexOf(e.layer)].frameData[e.key]={width,height,...(placement?{placement}:{}),dataURL:'data:image/png;base64,'+encode(width,height,data).toString('base64')};
    }
    log.push({layer:source.name,offsetsBefore:addresses.map(k=>g.offsets[k]),offsetsAfter:addresses.map(k=>recal.offsets[k]),frames:4});
  }
  H.validate(inflate(next));
  return {next,log};
}
async function stage(){
  const list=await fetch(base+'/projects');assert.equal(list.status,200);assert((await list.json()).some(p=>p.id===id));
  const r=await fetch(url),b=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');
  assert.equal(r.status,200);assert.equal(etag,'"'+hash(b)+'"');
  fs.writeFileSync(path('before.json'),b,{flag:'wx'});json('revision.json',{url,etag,sha256:hash(b),status:r.status});
  const before=JSON.parse(b),{next,log}=adjust(before);
  write('candidate.json',JSON.stringify(next));json('changes.json',log);
  preview([before,next]);console.log(JSON.stringify(log));
}
async function save(){
  const before=read('before.json'),candidate=read('candidate.json'),rev=JSON.parse(read('revision.json'));
  assert.equal(hash(before),rev.sha256);assert.deepEqual(JSON.parse(candidate),adjust(JSON.parse(before)).next);
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:candidate});
  const put={status:r.status,etag:r.headers.get('etag'),body:await r.text()};
  console.log(put);json('verification.json',{put});assert.equal(put.status,200);
  const response=await fetch(url),b=Buffer.from(await response.arrayBuffer()),get={status:response.status,etag:response.headers.get('etag'),sha256:hash(b)};
  assert.equal(get.status,200);assert.equal(get.etag,put.etag);assert.deepEqual(b,candidate);
  write('verified.json',b);json('verification.json',{put,get,check:'Exact candidate match'});console.log(get,'exact candidate match');
}
(process.argv[2]==='save'?save():stage()).catch(e=>{console.error(e);process.exitCode=1;});
