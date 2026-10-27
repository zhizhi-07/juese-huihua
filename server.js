/**
 * Pixel Art Editor - Lightweight Local Static Server
 * Pure Node.js, zero dependencies.
 * Run: node server.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
const BASE_DIR = path.resolve(__dirname);
const DATA_DIR=path.join(BASE_DIR,'data'),PROJECT_FILE=path.join(DATA_DIR,'shared-project.json');
fs.mkdirSync(DATA_DIR,{recursive:true});fs.mkdirSync(path.join(BASE_DIR,'js'),{recursive:true});
const tokenFile=path.join(DATA_DIR,'bridge-token');
const token=fs.existsSync(tokenFile)?fs.readFileSync(tokenFile,'utf8'):crypto.randomBytes(32).toString('hex');
if(!fs.existsSync(tokenFile))fs.writeFileSync(tokenFile,token);
// Only a local file page can read this script; HTTP requests never receive its secret.
fs.writeFileSync(path.join(BASE_DIR,'js','local-bridge.js'),'window.PE_LOCAL_BRIDGE='+JSON.stringify({url:'http://127.0.0.1:'+PORT,token})+';');
const revision=bytes=>'"'+crypto.createHash('sha256').update(bytes).digest('hex')+'"';
function validProject(project){
  if(!project||!Array.isArray(project.layers)||!project.layers.length||project.layers.length>1024||!Array.isArray(project.spriteSheets)||project.spriteSheets.length>128)return false;
  let pixels=0;
  for(const sheet of project.spriteSheets){if(!sheet||!Array.isArray(sheet.actions))return false;for(const action of sheet.actions){if(!action||!Array.isArray(action.frames))return false;for(const f of action.frames){if(!f||!Number.isSafeInteger(f.width)||!Number.isSafeInteger(f.height)||f.width<1||f.height<1||f.width>4096||f.height>4096)return false;pixels+=f.width*f.height;}}}
  return pixels<=16*1024*1024;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath;
  try { reqPath = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400);res.end('Bad path');return; }
  res.setHeader('X-Content-Type-Options','nosniff');
  if(reqPath.startsWith('/api/')){
    const origin=req.headers.origin,local=['http://localhost:'+PORT,'http://127.0.0.1:'+PORT].includes(origin);
    const filePage=origin==='null'&&req.headers['x-pixel-token']===token;
    const preflight=origin==='null'&&req.method==='OPTIONS';
    if(origin&&!local&&!filePage&&!preflight){res.writeHead(403);res.end('Origin denied');return;}
    if(req.headers['sec-fetch-site']==='cross-site'&&!filePage&&!preflight){res.writeHead(403);res.end('Cross-site request denied');return;}
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Expose-Headers','ETag');}
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, PUT, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, If-Match, If-None-Match, X-Pixel-Editor, X-Pixel-Token');if(preflight)res.setHeader('Access-Control-Allow-Private-Network','true');res.writeHead(204);res.end();return;}
    if(reqPath.startsWith('/api/ai/')){
      require('./ai-service.cjs').handle(req,res,BASE_DIR);return;
    }
    if(reqPath==='/api/status'&&req.method==='GET'){res.end(JSON.stringify({version:2,ai:true,sharedProject:'data/shared-project.json'}));return;}
    if(reqPath==='/api/projects'&&req.method==='GET'){
      const folder=path.join(DATA_DIR,'projects');
      const projects=fs.existsSync(folder)?fs.readdirSync(folder).filter(n=>/^[a-z0-9-]{1,80}\.json$/.test(n)).map(n=>({id:n.slice(0,-5),name:JSON.parse(fs.readFileSync(path.join(folder,n),'utf8')).name})):[];
      res.end(JSON.stringify([{id:'main',name:'人物主工程'},...projects]));return;
    }
    if(reqPath!=='/api/project'){res.writeHead(404);res.end('{}');return;}
    const projectId=new URL(req.url,'http://localhost').searchParams.get('id')||'main';
    if(!/^[a-z0-9-]{1,80}$/.test(projectId)){res.writeHead(400);res.end('{"error":"Invalid project id"}');return;}
    const projectFile=projectId==='main'?PROJECT_FILE:path.join(DATA_DIR,'projects',projectId+'.json');
    if(req.method==='GET'){
      if(!fs.existsSync(projectFile)){res.writeHead(404);res.end('{"exists":false}');return;}
      const bytes=fs.readFileSync(projectFile),etag=revision(bytes);res.setHeader('ETag',etag);
      if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
      res.end(bytes);return;
    }
    if(req.method!=='PUT'){res.writeHead(405);res.end('{}');return;}
    if(req.headers['x-pixel-editor']!=='1'){res.writeHead(403);res.end('{"error":"Missing editor header"}');return;}
    if(!req.headers['if-match']){res.writeHead(428);res.end('{"error":"A project revision is required"}');return;}
    const chunks=[];let size=0,tooLarge=false;
    req.on('data',chunk=>{size+=chunk.length;if(size>128*1024*1024){if(!tooLarge){tooLarge=true;res.writeHead(413);res.end('{"error":"Project too large"}');}return;}chunks.push(chunk);});
    req.on('end',()=>{
      if(tooLarge)return;
      let bytes=Buffer.concat(chunks),project;
      try{project=JSON.parse(bytes.toString('utf8'));}catch{res.writeHead(400);res.end('{"error":"Invalid JSON"}');return;}
      if(!validProject(project)){res.writeHead(400);res.end('{"error":"Invalid project"}');return;}
      try{
        const previous=fs.existsSync(projectFile)?fs.readFileSync(projectFile):null,current=previous?revision(previous):'none';
        if(req.headers['if-match']!==current){res.writeHead(409);res.end('{"error":"Shared project changed; local draft retained"}');return;}
        if(!previous&&projectId.startsWith('character-')){
          try{require('./js/character-base.js')(project);bytes=Buffer.from(JSON.stringify(project));}
          catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}));return;}
        }
        fs.mkdirSync(path.dirname(projectFile),{recursive:true});
        if(previous)fs.copyFileSync(projectFile,projectFile+'.bak');
        const temp=projectFile+'.tmp';fs.writeFileSync(temp,bytes);fs.renameSync(temp,projectFile);
        const etag=revision(bytes);res.setHeader('ETag',etag);res.end(JSON.stringify({saved:true,revision:etag}));
      }catch(error){res.writeHead(500);res.end('{"error":"Could not save project"}');console.error(error.message);}
    });return;
  }
  if(reqPath==='/js/local-bridge.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end('/* Local file bridge is intentionally not exposed over HTTP. */');return;}
  if(reqPath.startsWith('/data/')||reqPath==='/data'){res.writeHead(403);res.end('Private project data');return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.normalize(path.join(BASE_DIR, reqPath));
  const privateRelative=path.relative(DATA_DIR,filePath);
  if((!privateRelative.startsWith('..')&&!path.isAbsolute(privateRelative))||filePath===path.join(BASE_DIR,'js','local-bridge.js')){res.writeHead(403);res.end('Private editor data');return;}

  // Security: prevent path traversal out of workspace
  if (path.relative(BASE_DIR,filePath).startsWith('..') || path.isAbsolute(path.relative(BASE_DIR,filePath))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: 路径越界访问被拒绝');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: 找不到文件 ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`🚀 像素角色编辑网页 (Pixel Art Character Editor) 已启动`);
  console.log(`📡 本地访问地址: http://localhost:${PORT}`);
  console.log(`🧪 自动化测试套件: http://localhost:${PORT}/test.html`);
  console.log(`📑 Agent 接口文档: http://localhost:${PORT}/API_DOCS.md`);
  console.log(`====================================================`);
});
