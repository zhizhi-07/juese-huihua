const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),png=require('./png.cjs');
(async()=>{
const base='http://127.0.0.1:8765';assert((await fetch(base+'/api/projects')).ok);
const url=base+'/api/project?id=base-outlined-1794365455561',r=await fetch(url);assert(r.ok);const raw=Buffer.from(await r.arrayBuffer()),j=JSON.parse(raw);
const backup=path.resolve('备份/待机头部导出-'+Date.now());fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(path.join(backup,'原始工程.json'),raw);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');fs.writeFileSync(path.join(backup,'读取记录.json'),JSON.stringify({url,etag:r.headers.get('etag'),sha256:hash(raw)},null,2));
const si=j.spriteSheets.findIndex(s=>s.name==='original16_idle');assert(si>=0);const s=j.spriteSheets[si],w=17,h=17,cols=4;assert.equal(s.actions.length,3);
const out=Buffer.alloc(w*cols*h*3*4);let count=0;
s.actions.forEach((a,ai)=>{assert.equal(a.frames.length,cols);a.frames.forEach((f,fi)=>{assert.equal(f.width,w);assert.equal(f.height,h);const layers=j.layers.filter(l=>l.sheetIndex===si&&!l.isGroup&&l.name==='head'&&l.frameData?.[`${si}_${ai}_${fi}`]);assert.equal(layers.length,1);assert.equal(layers[0].opacity,1);const d=png.decode(Buffer.from(layers[0].frameData[`${si}_${ai}_${fi}`].dataURL.split(',')[1],'base64'));assert.equal(d.width,w);assert.equal(d.height,h);assert(d.data.some((v,i)=>i%4===3&&v));for(let y=0;y<h;y++)Buffer.from(d.data).copy(out,((ai*h+y)*w*cols+fi*w)*4,y*w*4,(y+1)*w*4);count++;});});
const folder='E:/工作/烟火/素材-美术资产/角色素材/基础身体/头部',file=path.join(folder,'待机.png');assert(!fs.existsSync(file),'目标已存在，停止避免覆盖');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');const c=createCanvas(w*cols,h*3);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(out),w*cols,h*3),0,0);const bytes=c.toBuffer('image/png');
assert(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(raw),'源工程变化，请重新导出');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});const check=png.decode(fs.readFileSync(file));assert.equal(check.width,68);assert.equal(check.height,51);assert(Buffer.from(check.data).equals(out));
const report={result:'PASS',file,frames:count,size:[68,51],cell:[17,17],rows:s.actions.map(a=>a.direction),sha256:hash(bytes),sourceUnchanged:true};fs.writeFileSync(path.join(backup,'验证记录.json'),JSON.stringify(report,null,2));
const preview=createCanvas(544,408),ctx=preview.getContext('2d');ctx.fillStyle='#d9d9df';ctx.fillRect(0,0,544,408);ctx.imageSmoothingEnabled=false;ctx.drawImage(c,0,0,544,408);fs.writeFileSync(path.join(backup,'预览.png'),preview.toBuffer('image/png'));console.log(JSON.stringify({...report,backup},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
