const fs=require('fs'),http=require('http'),png=require('../../scripts/png.cjs');
const dir='备份/20261026-双马尾背后分界加深';fs.mkdirSync(dir,{recursive:true});
const j=JSON.parse(fs.readFileSync('备份/20261026-双马尾背后分界加深-current.json'));const layer=j.layers[5];
for(let fi=0;fi<4;fi++){const key='8_2_'+fi, f=layer.frameData[key], im=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));for(let y=14;y<=22;y++)for(const x of [5,26]){const i=(y*im.width+x)*4;im.data[i]=119;im.data[i+1]=119;im.data[i+2]=119;im.data[i+3]=255;}f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');}
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));
const body=JSON.stringify(j);const req=http.request({hostname:'127.0.0.1',port:8765,path:'/api/project?id=main',method:'PUT',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'X-Pixel-Editor':'1','If-Match':fs.readFileSync('备份/20261026-双马尾背后分界加深-current.json.etag','utf8').trim()}},r=>{let d='';r.on('data',x=>d+=x);r.on('end',()=>{console.log(r.statusCode,d);fs.writeFileSync(dir+'/readback.json',d)})});req.end(body);
