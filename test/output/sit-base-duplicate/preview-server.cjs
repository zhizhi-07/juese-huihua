// Read-only copies on separate origins cannot touch the user's editor draft or saved project.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
for(const [port,original]of [[18881,true],[18882,false]])http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Read-only test fixture');}
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);let file;
  if(name==='/api/projects'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify([{id:'main',name:'坐姿重复底稿复测（只读副本）'}]));}
  if(name==='/api/project')file=path.join(__dirname,original?'main-before.json':'candidate.json');
  else if(original&&/^\/js\/(core|frame-tools|workbench)\.js$/.test(name))file=path.join(__dirname,'before',path.basename(name));
  else file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const bytes=fs.readFileSync(file),etag='"'+crypto.createHash('sha256').update(bytes).digest('hex')+'"';res.setHeader('ETag',etag);res.setHeader('Cache-Control','no-store');
  if(req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:bytes);
}).listen(port,'127.0.0.1',()=>console.log('Read-only fixture http://127.0.0.1:'+port));
