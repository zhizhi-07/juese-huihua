const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'output/save-conflict-20261102'),snap=path.join(root,'备份/保存冲突修复-20261102');
const id='character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
function copyFolder(from,to){fs.mkdirSync(to);for(const entry of fs.readdirSync(from,{withFileTypes:true})){const source=path.join(from,entry.name),target=path.join(to,entry.name);if(entry.isDirectory())copyFolder(source,target);else fs.copyFileSync(source,target)}}
(async()=>{
  console.log('START isolated save-conflict browser test');
  fs.mkdirSync(out,{recursive:true});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixel-save-conflict-'));
  console.log('Temporary test directory:',dir);
  for(const folder of ['js','css']){copyFolder(path.join(root,folder),path.join(dir,folder));console.log('Copied',folder)}
  for(const file of ['server.js','index.html','draft-rescue-user.html'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
  fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});
  const file=path.join(dir,'data/projects',id+'.json'),original=fs.readFileSync(path.join(snap,'original-api.json'),'utf8');
  fs.writeFileSync(file,original);
  const port=18791,base='http://127.0.0.1:'+port,child=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});let browser;
  try{
    await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server start timeout')),8000);child.stdout.once('data',()=>{clearTimeout(t);resolve()});child.once('error',reject)});
    console.log('Isolated server ready');browser=await chromium.launch({channel:'msedge',headless:true});console.log('Headless browser ready');
    const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/index.html?project='+id);await page.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    const old=await page.evaluate(()=>PE.app.persistence.revision);
    const draft=fs.readFileSync(path.join(snap,'用户_项目存档.json'),'utf8');
    await page.evaluate(async raw=>{await PE.app.persistence.apply(new Blob([raw]));PE.app.persistence.markDirty()},draft);
    const serialized=await page.evaluate(async()=>PE.app.exportManager.exportProject(false).text());
    const remote=JSON.parse(original);remote.name='隔离测试共享更新';const latest=JSON.stringify(remote);fs.writeFileSync(file,latest);
    assert.equal(await page.evaluate(()=>PE.app.persistence.saveNow()),false);
    assert.equal(fs.readFileSync(file,'utf8'),latest);
    assert(await page.getByRole('button',{name:'处理保存冲突',exact:true}).isVisible());
    // Reload only this disposable test browser; pending drafts must not adopt the remote ETag.
    await page.reload();await page.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await page.evaluate(()=>({conflict:PE.app.persistence.conflict,revision:PE.app.persistence.revision})),{conflict:true,revision:old});
    const restored=await page.evaluate(async()=>PE.app.exportManager.exportProject(false).text());assert.equal(restored,serialized);
    await page.getByRole('button',{name:'保存工程',exact:true}).click();
    await page.getByRole('button',{name:'本页草稿另存后继续编辑',exact:true}).click();
    const link=page.getByRole('link',{name:'打开本页草稿副本',exact:true});await link.waitFor();
    const copyURL=await link.getAttribute('href'),copyId=new URL(copyURL).searchParams.get('project');
    assert.equal(await fetch(base+'/api/project?id='+copyId).then(r=>r.text()),serialized);
    assert.equal(fs.readFileSync(file,'utf8'),latest);
    await page.screenshot({path:path.join(out,'conflict-resolution.png')});
    const copyPage=await context.newPage();await copyPage.goto(copyURL);await copyPage.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.equal(await copyPage.evaluate(()=>PE.app.persistence.conflict),false);assert(await copyPage.evaluate(()=>PE.app.persistence.saveNow()));
    const reopened=JSON.parse(await copyPage.evaluate(async()=>PE.app.exportManager.exportProject(false).text())),localDrawing=JSON.parse(serialized);
    assert.deepEqual(reopened.spriteSheets,localDrawing.spriteSheets,'copy keeps all frame dimensions, directions and durations');
    assert.deepEqual(reopened.layers.map(l=>[l.name,l.frameData]),localDrawing.layers.map(l=>[l.name,l.frameData]),'copy keeps every layer and every pixel cel');
    assert.equal(fs.readFileSync(file,'utf8'),latest);await copyPage.close();
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.getByRole('button',{name:'处理保存冲突',exact:true}).click();
    await page.getByRole('button',{name:'备份本页并读取共享版本',exact:true}).click();
    await page.waitForFunction(()=>!PE.app.persistence.conflict&&!PE.app.persistence.resolving);
    assert.equal(await page.evaluate(()=>PE.app.project.name),'隔离测试共享更新');
    assert.equal(fs.readFileSync(file,'utf8'),latest);
    assert.equal(await page.evaluate(async()=>{const p=PE.app.persistence;return (await p.localRead()).meta.pending}),false);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.evaluate(()=>{PE.app.project.name='隔离测试恢复后正常保存';PE.app.persistence.markDirty()});
    assert(await page.evaluate(()=>PE.app.persistence.saveNow()));
    await page.reload();await page.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.equal(await page.evaluate(()=>PE.app.project.name),'隔离测试恢复后正常保存');
    assert.equal(await page.evaluate(()=>PE.app.persistence.conflict),false);
    // The existing no-reload rescue page must expose a usable saved copy, not only a download.
    await page.evaluate(async raw=>{await PE.app.persistence.apply(new Blob([raw]));PE.app.persistence.markDirty();await PE.app.persistence.saveNow()},draft);
    const helper=await context.newPage();await helper.goto(base+'/draft-rescue-user.html');
    await helper.locator('#open:not([hidden])').waitFor();const rescued=await helper.locator('#open').getAttribute('href');
    const rescuedText=await fetch(base+'/api/project?id='+new URL(rescued,base).searchParams.get('project')).then(r=>r.text());
    assert.equal(rescuedText,await page.evaluate(async()=>PE.app.exportManager.exportProject(false).text()));
    await helper.goto(new URL(rescued,base).href);await helper.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    assert(await helper.evaluate(()=>PE.app.persistence.saveNow()));assert.equal(await helper.evaluate(()=>PE.app.persistence.conflict),false);
    await helper.screenshot({path:path.join(out,'rescued-draft-saves.png')});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-result.json'),JSON.stringify({passed:true,isolatedDirectory:dir,copyId,originalProjectNeverOverwrittenDuringResolution:true,rawDraftReadbackExact:true,originalETagRetainedAfterReload:true,sharedChoiceThenSaveAndReopen:true,oldPageRescueThenSave:true,pageErrors:errors},null,2));
    console.log('PASS: real user snapshots on isolated server; 409 + repeated save expose resolution; reload retains original draft base; exact independent backup saves/reopens; shared choice backs up before loading; original project not overwritten; subsequent ETag save/reopen succeeds; old-page rescue opens a fully saveable draft.');
  }finally{await browser?.close();child.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
