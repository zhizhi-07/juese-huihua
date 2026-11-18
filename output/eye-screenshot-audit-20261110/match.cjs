const {chromium}=require('playwright'),{loadImage,createCanvas}=require('@napi-rs/canvas'),fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await b.newPage(),url='http://127.0.0.1:8765';
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());
 const c=createCanvas(305,337),ctx=c.getContext('2d');
 ctx.drawImage(await loadImage(process.argv[2]),0,0);
 const ref=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++)ref.push(...ctx.getImageData(Math.floor(10+(x+.5)*283/32),Math.floor(9+(y+.5)*283/32),1,1).data.slice(0,3));
 await page.goto(url);await page.waitForFunction(()=>PE.app?.persistence?.ready);
 const ids=['draft-conflict-1794271316087-dc54567c','draft-conflict-1794277219868-e36ffb28','draft-conflict-1794277216751-6efcdec2','character-ff47ea32-14f3-4489-aec3-3c1797b97955','character-682ea651-ce3e-45b6-bdf2-23c5a6766e6e','character-8675d184-f5d7-4b85-88cb-95428736e5cf'];
 const result=await page.evaluate(async({ref,ids})=>{
  const score=(im)=>{let e=0;for(let i=0;i<1024;i++){const a=im[i*4+3]/255;for(let k=0;k<3;k++){const val=im[i*4+k]*a+[221,212,237][k]*(1-a);e+=Math.min(80,Math.abs(val-ref[i*3+k]));}}return e;};
  const out=[];
  for(const id of ids){
    const r=await fetch('/api/project?id='+id),raw=await r.text(),p=(await new PE.ExportManager().importProject(new Blob([raw]))).project;
    for(const mode of ['saved','live']){
      if(mode==='live')try{PE.HairAnimation.refresh(p);}catch(e){console.log(e.message);continue;}
      for(const [si,s] of p.spriteSheets.entries())for(const [ai,a] of s.actions.entries())for(const [fi,f] of a.frames.entries()){
       if(f.width!==16||f.height!==16)continue;
       const key=p.getFrameKey(si,ai,fi),layers=PE.getRenderLayers(p,si,ai).filter(l=>PE.isLayerVisible(p,l,si)&&!l.isGroup&&l.getFrameData(key));
       const cv=document.createElement('canvas');cv.width=cv.height=32;const ctx=cv.getContext('2d');
       for(const l of layers){ctx.globalAlpha=l.opacity??1;PE.utils.drawImageData(ctx,l.getFrameData(key),0,0,2);}
       out.push({id,mode,s:s.name,dir:a.direction,si,ai,fi,key,score:score(ctx.getImageData(0,0,32,32).data),layers:layers.map(l=>[l.name,l.getFrameData(key).placement||null]),png:cv.toDataURL()});
      }
    }
  }
  return out.sort((a,b)=>a.score-b.score).slice(0,10);
 },{ref,ids});
 for(const [i,r] of result.entries()){fs.writeFileSync(__dirname+'/match-'+i+'.png',Buffer.from(r.png.split(',')[1],'base64'));delete r.png;}
 console.log(JSON.stringify(result,null,2));fs.writeFileSync(__dirname+'/matches.json',JSON.stringify(result,null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
