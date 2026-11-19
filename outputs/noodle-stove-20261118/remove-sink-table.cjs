const fs=require('fs'),assert=require('assert');
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),p=JSON.parse(raw),before=JSON.parse(raw),etag=r.headers.get('etag');assert(etag);
 const names=['洗手池','备菜桌'],cut=p.spriteSheets.length-2;
 assert.deepStrictEqual(p.spriteSheets.slice(cut).map(s=>s.name),names);
 fs.writeFileSync(__dirname+'/before-remove-sink-table.json',raw);fs.writeFileSync(__dirname+'/before-remove-sink-table.etag',etag);
 p.spriteSheets.splice(cut);p.layers=p.layers.filter(l=>l.sheetIndex<cut);
 if(p.sceneAssembly?.objects)p.sceneAssembly.objects=p.sceneAssembly.objects.filter(o=>!names.includes(o.material));
 if(p.currentSheetIndex>=cut){p.currentSheetIndex=cut-1;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===cut-1);}
 assert.deepStrictEqual(p.spriteSheets,before.spriteSheets.slice(0,cut));assert.deepStrictEqual(p.layers,before.layers.filter(l=>l.sheetIndex<cut));
 assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);assert(!back.spriteSheets.some(s=>names.includes(s.name)));console.log('Removed only 洗手池 and 备菜桌; verified all remaining assets and scene layout unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
