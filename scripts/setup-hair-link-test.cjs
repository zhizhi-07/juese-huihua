// Make an isolated test project; never move/delete pixels in the source project.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','canvas','export','hair-animation'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../js/${n}.js`,'utf8'),{filename:n});
(async()=>{
 const backup=fs.readFileSync('备份/latest-hair-link-sway.txt','utf8'),manifest=JSON.parse(fs.readFileSync(backup+'/manifest.json'));
 const url='http://127.0.0.1:8765/api/project?id=',r=await fetch(url+manifest.sourceProject),raw=await r.text();assert(r.ok);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sourceSHA256,'source changed; reread before creating test');
 const source=JSON.parse(raw),target=structuredClone(source),wanted=new Set([5,198]);
 assert.equal(source.layers[5].name,'头发 / 2 / 后发');assert.equal(source.layers[198].name,'1 前发');
 const keep=source.layers.map((l,i)=>({l,i})).filter(({l,i})=>wanted.has(i)||PE.classifyPart(l.name)?.category!=='头发'),mapping=new Map(keep.map(({i},j)=>[i,j]));
 target.layers=keep.map(({i})=>{const l=target.layers[i];l.parent=l.parent==null?null:mapping.get(l.parent)??null;if(wanted.has(i))l.visible=true;return l;});
 target.name='头发1＋2 · 实时同步与持续飘动测试';target.currentSheetIndex=8;target.currentActionIndex=1;target.currentFrameIndex=0;target.currentLayerIndex=mapping.get(5);
 const p=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(target)]))).project;
 const chosen=[p.layers[mapping.get(5)],p.layers[mapping.get(198)]];
 for(const l of chosen){const s=PE.HairAnimation.setup(p,l);s.hairAnimation.live=true;s.hairAnimation.enabled=true;PE.HairAnimation.applyPlan(PE.HairAnimation.plan(p,s));}
 p.currentLayerIndex=p.layers.indexOf(chosen[0]);
 const ex=new PE.ExportManager();ex.project=p;const candidate=await ex.exportProject(false).text();
 const id='draft-hair-link-test-'+Date.now(),put=await fetch(url+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:candidate});assert(put.ok,await put.text());
 const back=await fetch(url+id),text=await back.text();assert.equal(text,candidate,'API exact readback');
 const after=await(await fetch(url+manifest.sourceProject)).text();assert.equal(after,raw,'original project untouched');
 fs.writeFileSync(backup+'/test-project.json',candidate);
 const report={sourceProject:manifest.sourceProject,sourceSHA256:manifest.sourceSHA256,sourceUnchanged:true,id,url:'http://localhost:8765/index.html?project='+id,testETag:back.headers.get('etag'),layers:p.layers.length,groups:chosen.map(l=>({name:l.name,live:l.hairAnimation.live,enabled:l.hairAnimation.enabled,offsets:l.hairAnimation.offsets})),createdAt:new Date().toISOString()};
 fs.writeFileSync(backup+'/test-project-info.json',JSON.stringify(report,null,2));console.log(JSON.stringify({id,url:report.url,layers:report.layers,sourceUnchanged:true,groups:report.groups.map(g=>g.name)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
