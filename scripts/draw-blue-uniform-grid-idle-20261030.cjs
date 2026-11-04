const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/蓝瞳统一细网格-20261030'),assets=path.join(root,'五官素材/蓝瞳统一细网格-20261030'),backup=path.join(root,'备份/20261030-蓝瞳统一细网格');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function mainBounds(d){
  const seen=new Set();let biggest=[];
  for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
    const n=y*d.width+x;if(seen.has(n)||!d.data[n*4+3])continue;const points=[],queue=[n];seen.add(n);
    for(let i=0;i<queue.length;i++){const k=queue[i];points.push([k%d.width,Math.floor(k/d.width)]);for(const next of [k-1,k+1,k-d.width,k+d.width]){const nx=next%d.width,ny=Math.floor(next/d.width);if(next<0||nx<0||ny>=d.height||Math.abs(nx-k%d.width)+Math.abs(ny-Math.floor(k/d.width))!==1||seen.has(next)||!d.data[next*4+3])continue;seen.add(next);queue.push(next);}}
    if(points.length>biggest.length)biggest=points;
  }
  assert(biggest.length>100,'must locate the real head, not stray pixels');return {left:Math.min(...biggest.map(p=>p[0])),right:Math.max(...biggest.map(p=>p[0])),top:Math.min(...biggest.map(p=>p[1]))};
}
async function decoded(raw){return (await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;}
async function contacts(raw,file,hideHair=false){
  const p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),cm=new PE.CanvasManager(Object.assign(createCanvas(360,360),{style:{}}),p);
  if(hideHair)for(const l of p.layers)if(l.name.startsWith('头发 /')||l.name.startsWith('发饰 /'))l.visible=false;
  const c=createCanvas(4*316,3*334),ctx=c.getContext('2d');ctx.fillStyle='#e9e0d7';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const image=cm.getCompositeImageData(si,ai,fi,false,8);assert(image.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(image.width,image.height);tile.getContext('2d').putImageData(image,0,0);ctx.fillStyle='#253e39';ctx.font='16px sans-serif';ctx.fillText(p.spriteSheets[si].actions[ai].direction+' #'+(fi+1),fi*316+12,ai*334+25);ctx.drawImage(tile,fi*316+14,ai*334+38);}
  fs.writeFileSync(path.join(out,file),c.toBuffer('image/png'));return p;
}

async function prepare(){
  for(const dir of [out,assets,backup])fs.mkdirSync(dir,{recursive:true});
  const id='character-gold-mix-1793320553623',response=await fetch('http://127.0.0.1:8765/api/project?id='+id);assert(response.ok);const text=await response.text();
  if(fs.existsSync(path.join(backup,'before.json')))assert.equal(fs.readFileSync(path.join(backup,'before.json'),'utf8'),text,'Project changed; keep previous candidate for comparison.');
  else{fs.writeFileSync(path.join(backup,'before.json'),text);fs.writeFileSync(path.join(backup,'revision.json'),JSON.stringify({id,etag:response.headers.get('etag'),sha256:digest(text)},null,2));}
  const raw=JSON.parse(text),candidate=structuredClone(raw),p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
  const li=candidate.layers.findIndex(l=>l.name==='眼睛 / 蓝瞳·可编辑高清画布'&&l.sheetIndex===si);assert(li>=0,'Only change the eye layer created in this task.');
  const layer=candidate.layers[li],c=createCanvas(36,16),ctx=c.getContext('2d');
  const palette={B:'#b78779',P:'#4e103e',K:'#070208',W:'#f7ffff',D:'#29208d',C:'#64e6fa',H:'#f7ffff',M:'#3067d9',L:'#1784d6'};
  const left=['...PKKKK..','.KKKKKKKP.','PKWWDDDWWP','PKWWCHMWWP','PKWWLMMWW.','.PWWLMMWW.','..WWLMMWW.'];
  const right=['..KKKKP...','.PKKKKKKK.','PWWDDDWWKP','PWWCHMWWKP','.WWLMMWWKP','.WWLMMWWP.','.WWLMMWW..'];
  function cell(code,x,y){if(!palette[code])return;ctx.fillStyle=palette[code];ctx.fillRect(x,y,1,1);}
  for(const [grid,x]of [[left,6],[right,23]])for(let y=0;y<grid.length;y++){assert.equal(grid[y].length,10);for(let dx=0;dx<10;dx++)cell(grid[y][dx],x+dx,5+y);}
  for(const x of [12,13,14,25,26,27])cell('B',x,2);cell('B',15,3);cell('B',24,3);
  const sprite=ctx.getImageData(0,0,36,16),png=c.toBuffer('image/png'),dataURL=c.toDataURL('image/png');
  fs.writeFileSync(path.join(assets,'蓝瞳-统一2倍像素网格.png'),png);fs.writeFileSync(path.join(assets,'可编辑像素格.json'),JSON.stringify({width:36,height:16,placementWidth:18,placementHeight:8,palette,left,right,leftOrigin:[6,5],rightOrigin:[23,5]},null,2));
  const keys=Object.keys(layer.frameData);assert.equal(keys.length,4);assert(keys.every(k=>k.startsWith(si+'_'+ai+'_')));
  for(const key of keys){const placement=layer.frameData[key].placement;assert.deepEqual([placement.w,placement.h],[18,8]);assert.equal(36/placement.w,16/placement.h);assert.equal(36/placement.w,2);layer.frameData[key]={width:36,height:16,dataURL,placement};}
  const compare=structuredClone(candidate);compare.layers[li]=raw.layers[li];assert.deepEqual(compare,raw,'Nothing outside eye pixels may change.');
  const zoomed=createCanvas(576,256),zc=zoomed.getContext('2d');zc.fillStyle='#feede1';zc.fillRect(0,0,576,256);zc.imageSmoothingEnabled=false;zc.drawImage(c,0,0,576,256);zc.strokeStyle='#c4b8ae';zc.lineWidth=1;zc.beginPath();for(let x=0;x<=36;x++){zc.moveTo(x*16+.5,0);zc.lineTo(x*16+.5,256);}for(let y=0;y<=16;y++){zc.moveTo(0,y*16+.5);zc.lineTo(576,y*16+.5);}zc.stroke();fs.writeFileSync(path.join(out,'统一细网格-源画布.png'),zoomed.toBuffer('image/png'));
  await contacts(raw,'修改前-全部待机.png');await contacts(candidate,'修改后-全部待机.png');await contacts(candidate,'修改后-无头发检查.png',true);
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({id,layerIndex:li,source:[36,16],placement:[18,8],uniformCell:[.5,.5],keys,allOtherDataUnchanged:true,sourceSHA256:digest(png)},null,2));
  console.log('PREPARED: all source cells map to exactly 0.5×0.5 logical pixels; only four front idle eye cels changed.');
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'Project changed; do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),JSON.parse(bytes));fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
