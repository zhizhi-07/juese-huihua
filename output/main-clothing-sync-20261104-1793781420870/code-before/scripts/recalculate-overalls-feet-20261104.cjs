const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {warp,body,raster,encode}=require('./try-idle-overalls-20261104.cjs');
const {clothing,check,preview}=require('./sync-user-overalls-20261104.cjs');
const red=(im,i)=>im.data[i+3]&&im.data[i]===255&&im.data[i+1]===0&&im.data[i+2]===0;
function bounds(im,outlineOnly=false){const xs=[],ys=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3]&&(!outlineOnly||im.data[i]===70&&im.data[i+1]===70&&im.data[i+2]===94)){xs.push(x);ys.push(y);}}assert(xs.length);return {left:Math.min(...xs),bottom:Math.max(...ys)};}
function fit(src,target,{shadeLegs=false,soleReference=null,soles=[],collar=null}={}){
  const out=warp(src.body,src.clothes,target),bottom=bounds(target).bottom;
  if(shadeLegs)for(let y=bottom-1;y<=bottom;y++)for(let x=0;x<out.width;x++){
    const i=(y*out.width+x)*4;if(!out.data[i+3])continue;
    // Only the two denim tones follow the base's front/back leg shading, not buttons or shirt.
    if(out.data[i]===114&&out.data[i+1]===149&&out.data[i+2]===190||out.data[i]===82&&out.data[i+1]===107&&out.data[i+2]===149)out.data.set(target.data[i]===254?[114,149,190,255]:[82,107,149,255],i);
  }
  if(collar){
    assert(soles.length&&soleReference,'collar needs the confirmed foot boundary');
    // The head layer also contains neck pixels; only its outline defines the collar edge.
    const sourceHead=bounds(collar.sourceHead,true),targetHead=bounds(collar.targetHead,true),dx=targetHead.left-sourceHead.left,dy=targetHead.bottom-sourceHead.bottom;
    const legTop=Math.min(...soles.map(p=>p[1]))+bounds(target).bottom-bounds(soleReference).bottom;
    for(let y=0;y<legTop;y++)for(let x=0;x<out.width;x++){
      const i=(y*out.width+x)*4;out.data.fill(0,i,i+4);const sx=x-dx,sy=y-dy;
      if(sx<0||sy<0||sx>=src.clothes.width||sy>=src.clothes.height||!target.data[i+3]||target.data[i]===70||y<=targetHead.bottom&&collar.targetHead.data[i+3])continue;
      const j=(sy*src.clothes.width+sx)*4;out.data.set(src.clothes.data.subarray(j,j+4),i);
    }
    const sourceBody=bounds(src.body),targetBody=bounds(target);
    for(let y=legTop;y<out.height;y++)for(let x=0;x<out.width;x++){
      const i=(y*out.width+x)*4;out.data.fill(0,i,i+4);const sx=x-targetBody.left+sourceBody.left,sy=y-targetBody.bottom+sourceBody.bottom;
      if(sx<0||sy<0||sx>=src.clothes.width||sy>=src.clothes.height||!target.data[i+3]||target.data[i]===70)continue;
      const j=(sy*src.clothes.width+sx)*4;out.data.set(src.clothes.data.subarray(j,j+4),i);
    }
  }
  if(soles.length){
    // shortcut: the user's confirmed sitting-side sole mask; fail if the pose topology changes.
    const a=bounds(soleReference),b=bounds(target);
    for(const [x,y]of soles){const tx=x+b.left-a.left,ty=y+b.bottom-a.bottom;assert(tx>=0&&ty>=0&&tx<out.width&&ty<out.height);const i=(ty*out.width+tx)*4;assert(target.data[i+3]&&target.data[i]!==70,'sole no longer matches body');out.data.fill(0,i,i+4);}
  }
  for(let i=0;i<out.data.length;i+=4)assert(!red(out,i),'annotation red leaked into output');return out;
}
async function main(){
  const id='character-1f622669-b72b-4df8-bafd-ce25df22c486',api='http://127.0.0.1:8765/api/';await(await fetch(api+'projects')).json();
  const r=await fetch(api+'project?id='+id);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=structuredClone(before),dir=path.resolve(__dirname,'../output/overalls-feet-recalc-20261104-'+Date.now());fs.mkdirSync(dir);
  fs.writeFileSync(dir+'/before.json',raw);fs.writeFileSync(dir+'/source-meta.json',JSON.stringify({id,etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));
  const sources={},sitSources={},soles=[];
  for(let ai=0;ai<3;ai++){
    const direction=p.spriteSheets[1].actions[ai].direction,f=p.spriteSheets[1].actions[ai].frames[0];sources[direction]={body:body(p,1,ai,0),clothes:raster(clothing(p,`1_${ai}_0`).frameData[`1_${ai}_0`],f.width,f.height)};
    const sf=p.spriteSheets[3].actions[ai].frames[0],cel=clothing(p,`3_${ai}_0`).frameData[`3_${ai}_0`],im=raster(cel,sf.width,sf.height);
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(red(im,i)){assert.equal(direction,'side');soles.push([x,y]);im.data.fill(0,i,i+4);}}
    sitSources[direction]={body:body(p,3,ai,0),clothes:im};
  }
  assert.equal(soles.length,8,'expected the eight user-marked sitting-side sole pixels');fs.writeFileSync(dir+'/calibration.json',JSON.stringify({soles,sitting:Object.fromEntries(Object.entries(sitSources).map(([d,s])=>[d,{body:encode(s.body),clothes:encode(s.clothes)}]))},null,2));
  const regression=[],checks=[];
  for(let si=0;si<4;si++)for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
    if(si===1&&fi===0)continue;const direction=p.spriteSheets[si].actions[ai].direction,key=`${si}_${ai}_${fi}`,target=body(p,si,ai,fi),src=si===3?sitSources[direction]:sources[direction],out=fit(src,target,{shadeLegs:si===0||si===2,soleReference:sitSources.side.body,soles:si===3&&direction==='side'?soles:[]});
    for(let i=0;i<out.data.length;i+=4)if(out.data[i+3])assert(target.data[i+3]&&target.data[i]!==70,'escaped body '+key);
    if(['0_0_0','0_0_1','2_0_1','2_0_2'].includes(key)){const f=p.spriteSheets[si].actions[ai].frames[fi],expected=raster(clothing(before,key).frameData[key],f.width,f.height);assert.deepEqual(Buffer.from(out.data),Buffer.from(expected.data),'manual leg correction not reproduced '+key);regression.push(key);}
    if(si===3&&fi===0)assert.deepEqual(Buffer.from(out.data),Buffer.from(src.clothes.data),'sitting correction changed '+key);
    clothing(p,key).frameData[key]=encode(out);checks.push({key,solePixels:si===3&&direction==='side'?soles.length:0});
  }
  assert.equal(checks.length,63);assert.equal(regression.length,4);const changed=check(before,p);
  fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));preview(before,dir);fs.renameSync(dir+'/preview.png',dir+'/before-preview.png');preview(p,dir);
  fs.writeFileSync(dir+'/checks.json',JSON.stringify({changed,generatedFrames:63,idleSourceFramesPreserved:3,nonClothingUnchanged:true,regression,soleMask:soles,soleFrames:checks.filter(c=>c.solePixels).length,redPixelsInGeneratedOutput:0,sittingCorrectionsPreservedExceptAnnotation:true,checks},null,2));
  console.log(JSON.stringify({dir,changedCels:changed.length,regression,soleFrames:4,status:'PASS; candidate only'},null,2));
}
module.exports={fit};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
