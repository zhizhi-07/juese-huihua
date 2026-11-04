// Replay only the saved canvas geometry on the supplied recovery draft; never overwrite the original project.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs'),canvas=require('../js/character-canvas.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/保存冲突修复-20261102/canvas-merge');
const sourceFile=path.join(root,'备份/保存冲突修复-20261102/用户_项目存档.json'),referenceFile=path.join(root,'备份/保存冲突修复-20261102/user-followup-api.json');
const decode=url=>png.decode(Buffer.from(url.split(',')[1],'base64')),encode=im=>'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
function ink(c,dx=0,dy=0){const im=decode(c.dataURL),r=c.placement||{x:0,y:0,w:im.width,h:im.height},map=new Map();for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3])map.set((r.x+x*r.w/im.width+dx).toFixed(6)+','+(r.y+y*r.h/im.height+dy).toFixed(6),Buffer.from(im.data.subarray(i,i+4)).toString('hex'))}return map}
function merge(source,reference){
  const p=structuredClone(source),deltas={},rows=[];let referencePixelsOutsideViewport=0;
  for(let si=0;si<p.spriteSheets.length;si++){
    const s=p.spriteSheets[si],target=reference.spriteSheets.find(v=>v.name===s.name);if(!target?.canvasLayout)continue;
    assert.equal(target.canvasLayout.margin,4);
    const original=decode(s.imageDataURL),width=target.frameWidth,height=target.frameHeight,columns=Math.max(...s.actions.map(a=>a.frames.length)),atlas=new Uint8Array(width*columns*height*s.actions.length*4),layouts=[];
    for(let ai=0;ai<s.actions.length;ai++){
      const action=s.actions[ai],tai=target.actions.findIndex(a=>a.name===action.name&&a.direction===action.direction);assert(tai>=0);
      const layout=structuredClone(target.canvasLayout.actions[tai]),old=s.canvasLayout?.actions[ai],dx=layout.x-(old?.x||0),dy=layout.y-(old?.y||0);layouts.push(layout);deltas[si+'_'+ai]={dx,dy};
      rows.push({sheet:s.name,direction:action.direction,frames:action.frames.length,before:[action.frames[0].width,action.frames[0].height],after:[layout.width,layout.height],translation:[dx,dy]});
      for(let fi=0;fi<action.frames.length;fi++){
        const frame=action.frames[fi],key=`${si}_${ai}_${fi}`;
        for(const layer of p.layers)if(layer.frameData?.[key])layer.frameData[key]=canvas.move(layer.frameData[key],layout.width,layout.height,dx,dy,{preserveOffCanvas:true});
        for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
          const i=((frame.sourceY+y)*original.width+frame.sourceX+x)*4,nx=x+dx,ny=y+dy;
          // Reference atlas follows the viewport; the complete old atlas stays in the source JSON backup.
          if(nx<0||ny<0||nx>=layout.width||ny>=layout.height){if(original.data[i+3])referencePixelsOutsideViewport++;continue}
          atlas.set(original.data.subarray(i,i+4),(((ai*height+ny)*width*columns)+fi*width+nx)*4);
        }
        Object.assign(frame,{width:layout.width,height:layout.height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(frame.lockedRegions||[]).map(r=>({...r,x:r.x+dx,y:r.y+dy}))});
      }
    }
    Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:encode({width:width*columns,height:height*s.actions.length,data:atlas}),canvasLayout:{...target.canvasLayout,actions:layouts}});
  }
  let cels=0,outside=0;
  assert.equal(p.layers.length,source.layers.length);
  p.layers.forEach((layer,i)=>{
    const before=source.layers[i];assert.deepEqual({...layer,frameData:undefined},{...before,frameData:undefined});assert.deepEqual(Object.keys(layer.frameData||{}),Object.keys(before.frameData||{}));
    for(const [key,cel]of Object.entries(before.frameData||{})){
      const [si,ai]=key.split('_'),d=deltas[si+'_'+ai],now=layer.frameData[key];
      if(!d){assert.deepEqual(now,cel);continue}
      assert.deepEqual(ink(now),ink(cel,d.dx,d.dy),'every source pixel retains its color and relative coordinates: '+i+'/'+key);cels++;if(now.placement)outside++;
    }
  });
  for(let si=0;si<source.spriteSheets.length;si++)if(!p.spriteSheets[si].canvasLayout)assert.deepEqual(p.spriteSheets[si],source.spriteSheets[si]);
  return {project:p,report:{sourceFile,referenceFile,layersPreserved:p.layers.length,checkedCels:cels,placedCelsPreserved:outside,referencePixelsOutsideViewport,completeOriginalAtlasRetainedIn:sourceFile,rows}};
}
module.exports=merge;
if(require.main===module)(async()=>{
  const source=JSON.parse(fs.readFileSync(sourceFile)),reference=JSON.parse(fs.readFileSync(referenceFile)),{project,report}=merge(source,reference);
  project.name=source.name+'（草稿＋画布尺寸合并）';
  fs.mkdirSync(out,{recursive:true});const raw=JSON.stringify(project);fs.writeFileSync(path.join(out,'merged-project.json'),raw);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
  console.log('VERIFIED',report.layersPreserved,'layers;',report.checkedCels,'cels;',report.rows.length,'action directions');console.table(report.rows);
  if(!process.argv.includes('--save'))return;
  const id='draft-user-canvas-merged-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),url='http://127.0.0.1:8765/api/project?id='+id;
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:raw});assert.equal(saved.status,200,await saved.text());
  const read=await fetch(url);assert.equal(read.status,200);assert.equal(await read.text(),raw);fs.writeFileSync(path.join(out,'saved.json'),JSON.stringify({id,url:'http://localhost:8765/index.html?project='+id,etag:read.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex'),originalProjectUntouched:true},null,2));console.log('SAVED',id);
})().catch(e=>{console.error(e);process.exitCode=1});
