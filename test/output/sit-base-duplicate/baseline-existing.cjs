const fs=require('fs'),path=require('path');let read=fs.readFileSync;fs.readFileSync=function(file,...args){if(String(file).replaceAll('\\','/').endsWith('/js/core.js'))return read.call(this,path.resolve('test/output/sit-base-duplicate/before/core.js'),...args);return read.call(this,file,...args);};require(path.resolve('test/'+process.argv[2]+'.cjs'));

