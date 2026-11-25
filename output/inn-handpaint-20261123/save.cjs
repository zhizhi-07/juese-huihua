const fs=require('fs'),assert=require('assert');
const d='C:/Users/Administrator/Desktop/角色绘画/output/inn-handpaint-20261123';
(async()=>{
 const source=fs.readFileSync(d+'/inn.px.js','utf8');
 assert(!/imageDataURL|data:image|readFile|fetch\(|include\(|import\s|require\(/.test(source),'Drawing source must not load raster images');
 const old=JSON.parse(fs.readFileSync(d+'/original.json','utf8')),p=structuredClone(old),si=p.spriteSheets.findIndex(s=>s.name==='旅馆外观·参考还原');assert(si>=0);
 const file=n=>d+'/out/scenes/'+n+'.png',url=n=>'data:image/png;base64,'+fs.readFileSync(file(n)).toString('base64');
 const names=[['wall','墙体与木梁'],['balcony','左侧阳台'],['windows','四扇楼上窗'],['sign','招牌与雨篷'],['door','入口双门'],['fixtures','告示与壁灯'],['plants','四盆植物'],['roof','斜坡瓦顶']];
 for(const n of ['inn',...names.map(x=>x[0])]){const b=fs.readFileSync(file(n));assert(b.readUInt32BE(16)===66&&b.readUInt32BE(20)===78);}
 p.spriteSheets[si]={...p.spriteSheets[si],frameWidth:66,frameHeight:78,columns:1,rows:1,imageDataURL:url('inn'),actions:[{name:'旅馆外观',direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:66,height:78,locked:false,lockedRegions:[],status:'completed',duration:0,notes:'从空白图层以手写坐标绘图；源文件output/inn-handpaint-20261123/inn.px.js；无图片采样、无AI生图输入。'}]}]};
 p.layers=p.layers.filter(l=>l.sheetIndex!==si);const li=p.layers.length;
 for(const [id,name]of names)p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[`${si}_0_0`]:{width:66,height:78,dataURL:url(id)}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=li;
 fs.writeFileSync(d+'/candidate.json',JSON.stringify(p));
 const r=await fetch('http://127.0.0.1:8765/api/project?id=scene-inn-20261119',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fs.readFileSync(d+'/original.etag','utf8')},body:JSON.stringify(p)});const msg=await r.text();if(!r.ok)throw Error(r.status+' '+msg);
 const qr=await fetch('http://127.0.0.1:8765/api/project?id=scene-inn-20261119');assert(qr.ok);const q=await qr.json();fs.writeFileSync(d+'/readback.json',JSON.stringify(q));
 const v={saveStatus:r.status,noRasterInputInDrawing:true,handwrittenDrawingLines:source.split('\n').length,dimensions:[66,78],editableLayers:names.length,renderMatchesReadback:q.spriteSheets[si].imageDataURL===url('inn'),layersMatchReadback:JSON.stringify(q.layers.filter(l=>l.sheetIndex===si))===JSON.stringify(p.layers.filter(l=>l.sheetIndex===si)),otherSheetsUnchanged:JSON.stringify(q.spriteSheets.filter((_,i)=>i!==si))===JSON.stringify(old.spriteSheets.filter((_,i)=>i!==si)),otherLayersUnchanged:JSON.stringify(q.layers.filter(l=>l.sheetIndex!==si))===JSON.stringify(old.layers.filter(l=>l.sheetIndex!==si)),sceneUnchanged:JSON.stringify(q.sceneAssembly)===JSON.stringify(old.sceneAssembly)};
 assert(!Object.values(v).includes(false));fs.writeFileSync(d+'/verification.json',JSON.stringify(v,null,2));console.log(v);
})();
