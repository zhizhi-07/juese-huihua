const fs=require('node:fs'),path=require('node:path'),read=fs.readFileSync;
const live=new Set(['core.js','hair-animation.js'].map(f=>path.resolve('js',f)));
fs.readFileSync=function(file,...opts){if(typeof file==='string'&&live.has(path.resolve(file)))file=path.join(process.env.REAR_BACKUP,path.basename(file));return read.call(this,file,...opts);};
