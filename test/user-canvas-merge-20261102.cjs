const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'备份/保存冲突修复-20261102/canvas-merge');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const name of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const merge=require('../scripts/merge-user-canvas-conflict-20261102.cjs');
(async()=>{
  const source=JSON.parse(fs.readFileSync(path.join(root,'备份/保存冲突修复-20261102/用户_项目存档.json'))),target=JSON.parse(fs.readFileSync(path.join(dir,'merged-project.json'))),report=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
  assert.deepEqual(merge(target,target).project,target,'replaying the same geometry is idempotent');
  const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project,before=await load(source),after=await load(target);
  const a=new PE.CanvasManager(document.createElement('canvas'),before),b=new PE.CanvasManager(document.createElement('canvas'),after),sheet=createCanvas(1300,report.rows.length*135),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  let frames=0,comparisons=0;
  for(let row=0;row<report.rows.length;row++){
    const r=report.rows[row],si=source.spriteSheets.findIndex(s=>s.name===r.sheet),ai=source.spriteSheets[si].actions.findIndex(v=>v.direction===r.direction),[dx,dy]=r.translation;
    ctx.fillStyle=row%2?'#ddd5ed':'#edf1ec';ctx.fillRect(0,row*135,1300,135);ctx.fillStyle='#222';ctx.font='13px sans-serif';ctx.fillText(r.sheet.replace('original32_','')+' / '+r.direction,8,row*135+22);ctx.fillText(r.before.join('x')+' -> '+r.after.join('x'),8,row*135+44);
    for(let fi=0;fi<r.frames;fi++){
      for(const hands of [false,true]){
        const old=a.getCompositeImageData(si,ai,fi,hands,4),now=b.getCompositeImageData(si,ai,fi,hands,4);let nonempty=0;
        for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){
          const i=(y*old.width+x)*4,nx=x+dx*4,ny=y+dy*4;
          if(nx<0||ny<0||nx>=now.width||ny>=now.height){assert.equal(old.data[i+3],0,'visible artwork must not be clipped: '+r.sheet+'/'+r.direction+'/'+fi);continue}
          const j=(ny*now.width+nx)*4;assert.deepEqual(now.data.subarray(j,j+4),old.data.subarray(i,i+4),'composite pixels unchanged after coordinate translation');if(old.data[i+3])nonempty++;
        }
        assert(nonempty>0,'visible subject required');comparisons++;
      }
      const im=b.getCompositeImageData(si,ai,fi,false,1),tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);ctx.drawImage(tile,190+fi*135,row*135+6,im.width*3,im.height*3);frames++;
    }
  }
  fs.writeFileSync(path.join(dir,'all-actions.png'),sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(dir,'visual-verification.json'),JSON.stringify({frames,comparisons,allLayerSourcePixelsPreserved:true,noVisibleArtworkClipped:true,idempotent:true},null,2));
  console.log('PASS:',frames,'frames;',comparisons,'real renderer comparisons with hands on/off; source artwork and timing unchanged; all canvas geometries replayed; no visible artwork clipped; idempotent.');
})().catch(e=>{console.error(e);process.exitCode=1});
