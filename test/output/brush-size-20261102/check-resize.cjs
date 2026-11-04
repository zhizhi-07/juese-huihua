const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve('test/layer-resize-mode-browser.cjs');
let code=fs.readFileSync(filename,'utf8').replace("await page.getByRole('button',{name:'图像工具',exact:true}).click();", "if(!await page.getByLabel('图层缩放方式',{exact:true}).isVisible())await page.getByRole('button',{name:'图像工具',exact:true}).click();");
console.log('REGRESSION input correction only: open auxiliary toolbar only when hidden; original test file unchanged.');
const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(code,filename);
