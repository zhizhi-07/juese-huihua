const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve('test/layer-resize-mode-browser.cjs');
let code=fs.readFileSync(filename,'utf8');
code=code.replace("res.end(await fs.readFile(file));", "res.end(await fs.readFile(require('node:fs').existsSync(path.join(root,'备份/20261102-brush-size',path.relative(root,file)))?path.join(root,'备份/20261102-brush-size',path.relative(root,file)):file));");
code=code.replace("await page.getByRole('button',{name:'图像工具',exact:true}).click();", "page.setDefaultTimeout(5000);await page.getByRole('button',{name:'图像工具',exact:true}).click();");
console.log('BASELINE overlay: original five source files, unchanged regression inputs.');
const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(code,filename);
