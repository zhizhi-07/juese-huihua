const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>createCanvas(1,1)};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','history','canvas','tools','export','api','frame-tools','hair-animation'])vm.runInThisContext(fs.readFileSync(name==='hair-animation'&&process.env.HAIR_SOURCE||`js/${name}.js`,'utf8'),{filename:name});
const H=PE.HairAnimation;
function fixture(){
  const p=new PE.Project();p.layers=[];
  p.spriteSheets=['idle','pickup'].map((name,si)=>{const size=si?20:16,s=new PE.SpriteSheet('original16_'+name);s.actions=['down','side','up'].map(dir=>{const a=new PE.Action(dir,dir);a.frames=[0,1,2].map(()=>new PE.Frame(0,0,0,size,size));return a;});return s;});
  for(let si=0;si<2;si++){
    const head=new PE.Layer('head');head.sheetIndex=si;head.locked=true;p.layers.push(head);
    for(let ai=0;ai<3;ai++)for(let fi=0;fi<3;fi++){
      const im=new ImageData(3,3);for(let i=0;i<im.data.length;i+=4)im.data.set([254,237,225,255],i);
      im.placement={x:5+si,y:4+fi,w:3,h:3};head.frameData.set(`${si}_${ai}_${fi}`,im);
    }
  }
  const hair=new PE.Layer('头发 / 测试 / 前发');hair.sheetIndex=0;p.layers.push(hair);
  for(let ai=0;ai<3;ai++){const im=new ImageData(2,2);im.data.fill(255);im.placement={x:5,y:3,w:2,h:2};hair.frameData.set(`0_${ai}_0`,im);}
  p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(hair);
  H.setup(p,hair);hair.hairAnimation.live=true;
  return {p,hair,head:p.layers.find(l=>l.name==='head'&&l.sheetIndex===1),target:p.layers.find(l=>l.sheetIndex===1&&l.hairAnimationId===hair.hairAnimation.id)};
}
function points(im){const r=im.placement||{x:0,y:0},a=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])a.push([x+r.x,y+r.y]);return a;}
(async()=>{
 const {p,hair,head,target}=fixture(),key='1_1_1',seed=hair.getFrameData('0_1_0');
 H.refresh(p);const before=points(target.getFrameData(key));
 head.getFrameData(key).placement.x+=2;head.getFrameData(key).placement.y+=1;
 assert.equal(H.refresh(p).length,1,'a head-only placement edit invalidates the live cache');
 assert.deepEqual(points(target.getFrameData(key)),before.map(([x,y])=>[x+2,y+1]),'native 16 hair follows actual head; pickup retains 20px canvas');
 assert.equal(H.refresh(p).length,0,'unchanged state is cached');
 const addr='original16_pickup/side/1';hair.hairAnimation.offsets[addr].x+=1;
 H.refresh(p);assert.deepEqual(points(target.getFrameData(key)),before.map(([x,y])=>[x+3,y+1]),'explicit manual correction survives recalibration');
 const baseline=p.layers.find(l=>l.name==='head'&&l.sheetIndex===0).getFrameData('0_1_0');baseline.placement.y+=1;
 H.refresh(p);assert.deepEqual(points(target.getFrameData(key)),before.map(([x,y])=>[x+3,y]),'directional source head is recalculated too');
 assert.equal(hair.getFrameData('0_1_0'),seed,'source artwork is never moved');
 hair.hairAnimation.live=false;const paused=target.getFrameData(key);head.getFrameData(key).placement.y+=1;H.refresh(p);assert.equal(target.getFrameData(key),paused,'live off remains off');
 H.refresh(p,true);hair.hairAnimation.live=true;
 const ex=new PE.ExportManager();ex.project=p;const reopened=(await new PE.ExportManager().importProject(ex.exportProject(false))).project;
 H.refresh(reopened,true);const rt=reopened.layers.find(l=>l.sheetIndex===1&&l.hairAnimationId===hair.hairAnimation.id);
 assert.deepEqual(points(rt.getFrameData(key)),points(target.getFrameData(key)),'manual correction and head baseline persist through save/reopen');
 const old=fixture();delete old.hair.hairAnimation.headOffsets;old.hair.hairAnimation.offsets[addr]={x:9,y:-8};
 H.refresh(old.p);assert.deepEqual(points(old.target.getFrameData(key)),before,'legacy stale offsets are replaced with current head alignment');
 const added=new PE.Frame(0,0,0,20,20);old.p.spriteSheets[1].actions[1].frames.push(added);old.head.frameData.set('1_1_3',PE.utils.cloneImageData(old.head.getFrameData(key)));
 H.refresh(old.p);assert.deepEqual(points(old.target.getFrameData('1_1_3')),before,'new frames no longer require old offset records');
 old.p.spriteSheets[1].actions[1].frames[1].locked=true;const untouched=old.target.getFrameData(key);
 assert.throws(()=>H.refresh(old.p),/保护/);assert.equal(old.target.getFrameData(key),untouched,'locked targets reject atomically');
 const bad=hair.hairAnimation.headOffsets;hair.hairAnimation.headOffsets=[];assert.throws(()=>H.validate(p),/标定/);hair.hairAnimation.headOffsets=bad;
 hair.hairAnimation.headOffsets[addr]={x:NaN,y:0};assert.throws(()=>H.validate(p),/整数/);
 console.log('PASS current-head sync: head-only live invalidation; native16/20px pickup; source-head movement; manual correction; legacy recalculation; new frames; pause; save/reopen; atomic locks; validation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
