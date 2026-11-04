const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
const {chromium}=require('playwright'),{fixture}=require('./wardrobe.cjs'),JSZip=require('../js/vendor/jszip.min.js');
const root=path.resolve(__dirname,'..');
async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wardrobe-browser-'));
  console.log('TEST directory '+dir);
  for(const file of ['server.js','index.html'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
  for(const folder of ['js','js/vendor','css']){
    fs.mkdirSync(path.join(dir,folder),{recursive:true});
    for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true}))if(entry.isFile())fs.copyFileSync(path.join(root,folder,entry.name),path.join(dir,folder,entry.name));
  }
  console.log('TEST editor files copied');
  fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});const source=fixture();fs.writeFileSync(path.join(dir,'data/projects/draft-wardrobe-test.json'),JSON.stringify(source));
  console.log('TEST fixture generated');
  const reservation=net.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const server=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']}),base='http://127.0.0.1:'+port;
  console.log('TEST server launched');
  let browser;
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server timeout')),10000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:980},acceptDownloads:true}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));let approve=true;page.on('dialog',d=>approve?d.accept():d.dismiss());
    await page.goto(base+'/index.html?project=draft-wardrobe-test');await page.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    const original=await page.evaluate(async()=>{const a=PE.app;a.project.name='含未保存修改的草稿';a.persistence.markDirty();return {data:await a.exportManager.exportProject(false).text(),version:a.persistence.version,tool:a.toolManager.currentTool};});
    await page.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await page.getByText('这里还没有成品。',{exact:false}).waitFor();
    const dialog=page.locator('.wardrobe-dialog'),scene=page.getByLabel('换装测试场景：方向键或WASD移动，C坐下或站起，E拾取');
    await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();await dialog.getByLabel('成品名称').fill('已完成头发');
    await dialog.getByRole('button',{name:'收录为新成品',exact:true}).click();await page.getByText('已独立保存：已完成头发',{exact:false}).waitFor();
    assert.equal(await page.locator('.wardrobe-item').count(),1);
    let projects=await fetch(base+'/api/projects').then(r=>r.json()),hairId=projects.find(p=>p.name==='已完成头发').id;
    const hair=await fetch(base+'/api/project?id='+hairId).then(r=>r.json());assert(hair.layers.every(l=>l.name.startsWith('头发 /')));assert(!JSON.stringify(hair).includes('半成品'));assert(hair.wardrobe);
    await dialog.getByRole('button',{name:'试穿',exact:true}).click();assert((await page.locator('.wardrobe-equipment').textContent()).includes('已完成头发'));
    await scene.focus();const startX=Number(await scene.getAttribute('data-x'));await page.keyboard.down('ArrowRight');await page.waitForTimeout(230);assert.equal(await scene.getAttribute('data-action'),'walk');await page.keyboard.up('ArrowRight');await page.waitForTimeout(80);assert(Number(await scene.getAttribute('data-x'))>startX);assert.equal(await scene.getAttribute('data-action'),'idle');
    await page.keyboard.press('c');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-action'),'sit');await page.keyboard.press('c');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-action'),'idle');
    await dialog.getByLabel('测试朝向').selectOption('up');await dialog.getByLabel('测试动作').selectOption('sit');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-direction'),'up');assert.equal(await scene.getAttribute('data-action'),'sit');
    await dialog.getByRole('button',{name:'重置场景',exact:true}).click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');await page.keyboard.press('e');await page.waitForTimeout(60);assert.equal(await scene.getAttribute('data-picked'),'true');assert.equal(await scene.getAttribute('data-action'),'pickup');
    await dialog.getByRole('button',{name:'选中',exact:true}).click();await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();
    // A second writer changes the finished file after this window loaded its revision.
    let r=await fetch(base+'/api/project?id='+hairId),rev=r.headers.get('ETag'),changed=await r.json();changed.name='其他窗口更新的头发';
    r=await fetch(base+'/api/project?id='+hairId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(changed)});assert.equal(r.status,200);
    await dialog.getByRole('button',{name:'更新选中成品',exact:true}).click();await page.getByText('成品已被其他窗口修改',{exact:false}).waitFor();assert.equal((await fetch(base+'/api/project?id='+hairId).then(r=>r.json())).name,'其他窗口更新的头发');
    await dialog.getByRole('button',{name:'刷新成品列表',exact:true}).click();await page.getByText('其他窗口更新的头发',{exact:true}).waitFor();
    await dialog.getByLabel('成品名称').fill('其他窗口更新的头发');await dialog.getByRole('button',{name:'更新选中成品',exact:true}).click();await page.getByText('已独立保存：其他窗口更新的头发',{exact:false}).waitFor();assert(fs.existsSync(path.join(dir,'data/projects',hairId+'.json.bak')),'updating a finished piece keeps its previous file');
    await dialog.getByText('＋ 标记当前工程的成品',{exact:true}).click();await dialog.getByLabel('成品类别').selectOption('衣服');await dialog.getByLabel('成品名称').fill('已完成衣服');await dialog.getByRole('button',{name:'收录为新成品',exact:true}).click();await page.getByText('已独立保存：已完成衣服',{exact:false}).waitFor();
    const clothing=page.locator('.wardrobe-item').filter({has:page.getByText('已完成衣服',{exact:true})});await clothing.getByRole('button',{name:'试穿',exact:true}).click();assert((await page.locator('.wardrobe-equipment').textContent()).includes('已完成衣服'));
    projects=await fetch(base+'/api/projects').then(r=>r.json());const clothesId=projects.find(p=>p.name==='已完成衣服').id;
    r=await fetch(base+'/api/project?id='+clothesId);rev=r.headers.get('ETag');const incomplete=await r.json();incomplete.spriteSheets[2].actions=[];incomplete.layers=incomplete.layers.filter(l=>l.sheetIndex!==2);
    // Only use this isolated fixture to test that missing actions do not silently freeze an idle frame.
    r=await fetch(base+'/api/project?id='+clothesId,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(incomplete)});assert.equal(r.status,200);
    await dialog.getByRole('button',{name:'刷新成品列表',exact:true}).click();await page.waitForFunction(()=>![...document.querySelectorAll('.wardrobe-dialog button')].find(b=>b.textContent==='刷新成品列表').disabled);await dialog.getByLabel('测试动作').selectOption('sit');await page.waitForTimeout(100);assert((await page.locator('.wardrobe-warnings').textContent()).includes('已完成衣服缺少坐下'));
    const downloadPromise=page.waitForEvent('download');await clothing.getByRole('button',{name:'一键导出',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'已完成衣服-成品.zip');
    const zip=await JSZip.loadAsync(fs.readFileSync(await download.path()));assert(zip.file('成品.json'));assert(zip.file('original32_idle.png'));assert(!JSON.stringify(JSON.parse(await zip.file('成品.json').async('string'))).includes('半成品'));
    await dialog.getByRole('button',{name:'重置场景',exact:true}).click();await scene.focus();await page.keyboard.press('Control+z');await page.keyboard.press('e');await page.keyboard.press('a');
    assert.deepEqual(await page.evaluate(async()=>({data:await PE.app.exportManager.exportProject(false).text(),version:PE.app.persistence.version,tool:PE.app.toolManager.currentTool})),original,'scene controls never change editor pixels, selection, history or tool');assert(await page.evaluate(()=>PE.app.persistence.dirty));
    fs.mkdirSync(path.join(root,'test/output'),{recursive:true});await page.screenshot({path:path.join(root,'test/output/wardrobe-desktop-fixture.png')});
    await page.setViewportSize({width:620,height:860});await page.screenshot({path:path.join(root,'test/output/wardrobe-narrow-fixture.png')});
    assert(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1),'no horizontal overflow at 620px');
    await dialog.getByRole('button',{name:'关闭衣柜',exact:true}).click();
    await page.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await page.getByText('其他窗口更新的头发',{exact:true}).waitFor();assert.equal(await page.locator('.wardrobe-item').count(),2,'items survive close/reopen');
    await clothing.getByRole('button',{name:'移出衣柜',exact:true}).click();await page.getByText('已移出衣柜；独立文件仍保留。',{exact:true}).waitFor();assert.equal(await page.locator('.wardrobe-item').count(),1);assert(fs.existsSync(path.join(dir,'data/projects',clothesId+'.json')));
    const fresh=await browser.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base+'/index.html?project=draft-wardrobe-test');await fresh.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);await fresh.getByRole('button',{name:'成品衣柜 / 换装测试',exact:true}).click();await fresh.getByText('其他窗口更新的头发',{exact:true}).waitFor();assert.equal(await fresh.locator('.wardrobe-item').count(),1,'finished pieces persist into a fresh page');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'data/projects/draft-wardrobe-test.json'),'utf8')),source,'no source project save');assert.deepEqual(errors,[]);
    console.log('PASS: real isolated save API + browser: manual curation, two-category equip, walk/idle, facing, sit, actual proximity pickup, stale-update rejection, update backup, missing-action warning, ZIP download, close/reopen + fresh-page persistence, archive, dirty-draft and shortcut protection; 1440x980 and 620x860 layouts.');
    console.log('Isolated test files retained at '+dir);
  }finally{await browser?.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
