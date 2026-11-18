const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');
global.window=global;Object.assign(global,{Image,ImageData,document:{addEventListener(){},createElement(){const c=createCanvas(1,1);c.style={};return c;}},FileReader:class{async readAsText(blob){this.result=await blob.text();this.onload();}}});
function load(file){vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});}
load(__dirname+'/before/core.js');const oldOrder=PE.getRenderLayers;
for(const n of ['core','canvas','export','wardrobe'])load('js/'+n+'.js');
const newOrder=PE.getRenderLayers,base='http://127.0.0.1:8765';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function snapshot(id){const r=await fetch(base+'/api/project?id='+id);assert(r.ok);return {bytes:Buffer.from(await r.arrayBuffer()),etag:r.headers.get('etag')};}
(async()=>{
 const status=await (await fetch(base+'/api/status')).json();
 const ids=[status.characterBaseProjectId,'draft-conflict-1794277219868-e36ffb28'];
 for(const [i,id] of ids.entries()){
  const before=await snapshot(id);fs.writeFileSync(__dirname+'/before/'+id+'.json',before.bytes);
  const project=await PE.Wardrobe.decode(JSON.parse(before.bytes)),cm=new PE.CanvasManager(document.createElement('canvas'),project),ex=new PE.ExportManager();ex.project=project;
  const rows=[],report={id,etag:before.etag,sha256:hash(before.bytes),frames:0,back:0,changedBack:0,idle:{}};
  for(const [si,s] of project.spriteSheets.entries())for(const [ai,a] of s.actions.entries()){
    const order=newOrder(project,si,ai),leaves=order.filter(l=>!l.isGroup),back=a.direction==='up';
    if(back)assert.deepEqual(leaves.slice(0,leaves.filter(PE.isHandLayer).length),leaves.filter(PE.isHandLayer));
    else assert.deepEqual(order,oldOrder(project,si,ai));
    if(s.name==='original16_idle'){
      const keys=a.frames.map((_,fi)=>project.getFrameKey(si,ai,fi));
      report.idle[a.direction]=leaves.filter(l=>PE.isLayerVisible(project,l,si)&&l.opacity>0&&keys.some(k=>l.getFrameData(k)?.data.some((v,j)=>j%4===3&&v))).map(l=>l.name);
    }
    for(const [fi] of a.frames.entries()){
      const scale=PE.utils.imageScale(project,si); PE.getRenderLayers=oldOrder;const old=cm.getCompositeImageData(si,ai,fi,true,scale);
      PE.getRenderLayers=newOrder;const now=cm.getCompositeImageData(si,ai,fi,true,scale),png=ex._getCompositeImageData(si,ai,fi);
      assert.deepEqual(now.data,png.data);report.frames++;
      if(!back)assert.deepEqual(old.data,now.data);
      else{
        report.back++;
        if(!Buffer.from(old.data).equals(Buffer.from(now.data)))report.changedBack++;
        rows.push([old,now,scale]);
      }
    }
  }
  const cols=8,cell=84,rowsPerSide=Math.ceil(rows.length/cols);
  const image=createCanvas(cell*cols,cell*rowsPerSide*2),g=image.getContext('2d');g.imageSmoothingEnabled=false;
  for(const [j,pair] of rows.entries())for(const [k,frame] of pair.slice(0,2).entries()){
    const x=j%cols*cell,y=(Math.floor(j/cols)+k*rowsPerSide)*cell,t=createCanvas(frame.width,frame.height);
    t.getContext('2d').putImageData(frame,0,0);g.fillStyle=k?'#e6eedc':'#e3e3ee';g.fillRect(x,y,cell-1,cell-1);g.drawImage(t,x+2,y+2,frame.width*4/pair[2],frame.height*4/pair[2]);
  }
  fs.writeFileSync(__dirname+'/back-'+i+'.png',image.toBuffer('image/png'));
  const after=await snapshot(id);assert.equal(after.etag,before.etag);assert.deepEqual(after.bytes,before.bytes);
  console.log(JSON.stringify(report,null,2));
 }
 for(const n of ['core','wardrobe']){const r=await fetch(base+'/js/'+n+'.js');assert(r.ok);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync('js/'+n+'.js'));}
 console.log('PASS: API bytes and ETags unchanged; live scripts match disk.');
})().catch(e=>{console.error(e);process.exitCode=1;});

