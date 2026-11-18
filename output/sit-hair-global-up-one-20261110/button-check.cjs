const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const phase=process.argv[2],browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),url='http://localhost:8765/?project=character-ff47ea32-14f3-4489-aec3-3c1797b97955';
  await page.route('**/api/project?*',r=>r.request().method()==='GET'?r.continue():r.abort());
  if(phase==='before')await page.route('**/js/hair-animation.js?*',r=>r.fulfill({path:__dirname+'/before/hair-animation.js',contentType:'application/javascript'}));
  await page.goto(url);
  await page.waitForFunction(()=>PE.app?.persistence?.ready&&PE.app.project.layers.some(l=>l.hairAnimation?.part==='eyes'));
  const result=await page.evaluate(phase=>{
   const app=PE.app,p=app.project,H=PE.HairAnimation,out={};
   const button=document.querySelector('#hair-sync-all');
   for(const l of p.layers.filter(l=>l.hairAnimation)){
    const g=l.hairAnimation;g.live=false;
    app.selectFrame(l.sheetIndex,0,0);p.currentLayerIndex=p.layers.indexOf(l);app.updateAll();
    const read=()=>p.layers.filter(t=>t.hairAnimationId===g.id).map(t=>[t.sheetIndex,[...t.frameData].map(([k,im])=>{
      if(t.sheetIndex===3&&g.part!=='eyes'){
        const r=im.placement||{x:0,y:0,w:im.width,h:im.height};
        const pixels=[];
        for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
          const i=(y*im.width+x)*4;if(!im.data[i+3])continue;
          pixels.push([r.x+x*r.w/im.width,r.y+y*r.h/im.height+(phase==='after'?1:0),...im.data.slice(i,i+4)]);
        }
        return [k,pixels];
      }
      return [k,im.placement||null,im.width,im.height,im.data.reduce((h,v)=>Math.imul(h^v,16777619),2166136261)];
    })]);
    const sync=H.sync;let called=0;H.sync=(...a)=>{const r=sync(...a);called++;return r;};
    button.click();const first=read();button.click();H.sync=sync;
    if(called!==2||JSON.stringify(read())!==JSON.stringify(first))throw Error(l.name+' sync did not run twice identically');
    out[l.name]={part:g.part||'hair',frames:first};
   }
   return out;
  },phase);
  const file=__dirname+'/before-positions.json';
  if(phase==='before'){fs.writeFileSync(file,JSON.stringify(result,null,2));console.log('Original: sync button captured',Object.keys(result).length,'parts');return;}
  const expected=JSON.parse(fs.readFileSync(file));let shifted=0;
  for(const l of Object.values(expected))if(l.part==='hair')for(const [si,frames] of l.frames)if(si===3)for(const cel of frames){assert(cel[1].length>0);shifted++;}
  assert(shifted>0);assert.deepEqual(result,expected);
  console.log('Actual button twice per part:',shifted,'front/back hair cels shifted up 1; all other cels and pixel checksums identical.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
