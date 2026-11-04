const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
async function main(){
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET'||url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=frame-copy-ui-test`);await page.waitForFunction(()=>document.querySelector('.studio-loading')?.hidden);
    await page.evaluate(()=>{
      const app=PE.app,p=app.project,s=new PE.SpriteSheet('original32_test');s.frameWidth=s.frameHeight=32;
      s.actions=['side','down','up'].map(direction=>{const a=new PE.Action(direction,direction);a.frames=[0,1,2].map(()=>new PE.Frame(0,0,0,32,32));return a;});p.spriteSheets=[s];p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=p.currentLayerIndex=0;
      const hair=new PE.Layer('头发 / 测试 / 前发'),body=new PE.Layer('body'),group=new PE.Layer('头发组');hair.sheetIndex=body.sheetIndex=group.sheetIndex=0;hair.parent=2;group.isGroup=true;body.locked=true;body.inheritedBase=true;
      const pixels=new ImageData(32,32);pixels.data.set([255,0,0,255],(8*32+16)*4);hair.frameData.set('0_0_0',pixels);p.layers=[hair,body,group];app.persistence.ready=true;app.history.clear();app.updateAll();
    });
    await page.getByText('辅助工具',{exact:true}).click();await page.getByRole('button',{name:'图像工具',exact:true}).click();
    const pixel=(ai,fi)=>page.evaluate(({ai,fi})=>PE.app.project.layers[0].getFrameData(`0_${ai}_${fi}`)?.data[(8*32+16)*4]||0,{ai,fi});
    const copy=page.locator('#copy-cel-btn'),paste=page.locator('#paste-cel-btn');await copy.click();
    await page.getByRole('button',{name:'正面',exact:true}).click();assert.equal(await page.evaluate(()=>PE.app.project.currentLayerIndex),0,'empty direction must keep the selected editable grouped hair');
    await paste.click();assert.equal(await pixel(1,0),255);assert.equal(await pixel(0,0),255);await page.keyboard.press('Control+z');assert.equal(await pixel(1,0),0);
    await page.keyboard.press('Control+v');assert.equal(await pixel(1,0),255);await page.keyboard.press('Control+c');await page.keyboard.press('Control+x');assert.equal(await pixel(1,0),0);await page.keyboard.press('Control+z');assert.equal(await pixel(1,0),255);
    await page.getByRole('button',{name:'背面',exact:true}).click();await page.keyboard.press('Control+v');assert.equal(await pixel(2,0),255);assert.doesNotMatch(await page.locator('.part-state').textContent(),/背面不显示/);
    await page.locator('#copy-next-cel-btn').click();assert.equal(await pixel(2,1),255);await page.locator('#copy-next-cel-btn').click();assert.equal(await pixel(2,2),255);
    await page.locator('#copy-next-cel-btn').click();assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),4);await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),3);
    await page.locator('#batch-copy-cel-btn').click();await page.getByLabel('目标朝向',{exact:true}).selectOption('1');await page.getByLabel('起始帧',{exact:true}).fill('2');await page.getByLabel('结束帧',{exact:true}).fill('3');
    assert.match(await page.locator('.frame-copy-dialog[aria-label="批量复制图层"] [data-summary]').textContent(),/2 帧/);await page.getByRole('button',{name:'复制到 2 帧',exact:true}).click();assert.equal(await pixel(1,1),255);assert.equal(await pixel(1,2),255);
    await page.keyboard.press('Control+z');assert.equal(await pixel(1,1),0);assert.equal(await pixel(1,2),0);assert.equal(await pixel(2,0),255);
    await page.locator('#batch-copy-cel-btn').click();await page.getByLabel('目标朝向',{exact:true}).selectOption('all');await page.getByText('目标朝向全部帧',{exact:true}).click();assert.match(await page.locator('.frame-copy-dialog[aria-label="批量复制图层"] [data-summary]').textContent(),/9 帧/);await page.getByRole('button',{name:'复制到 9 帧',exact:true}).click();assert.equal(await pixel(0,2),255);
    await page.locator('#duplicate-frame-btn').click();assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),4);await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>PE.app.project.getCurrentAction().frames.length),3);
    await page.locator('#batch-copy-cel-btn').click();await page.getByLabel('目标朝向',{exact:true}).selectOption('1');await page.evaluate(()=>PE.app.project.spriteSheets[0].actions[1].frames[0].locked=true);await page.getByLabel('起始帧',{exact:true}).fill('1');await page.getByLabel('结束帧',{exact:true}).fill('1');assert(await page.locator('.frame-copy-dialog[aria-label="批量复制图层"] [data-apply]').isDisabled());assert.match(await page.locator('.frame-copy-dialog[aria-label="批量复制图层"] [data-summary]').textContent(),/锁定/);
    await page.screenshot({path:path.join(root,'test/frame-copy-preview.png')});await page.getByRole('button',{name:'关闭',exact:true}).last().click();await page.screenshot({path:path.join(root,'test/frame-toolbar-preview.png')});
    await page.evaluate(()=>{
      const app=PE.app,p=app.project;p.spriteSheets=['walk','idle','sit'].map((key,si)=>{
        const s=new PE.SpriteSheet('original32_'+key);s.frameWidth=s.frameHeight=32;
        s.actions=['down','side'].map(d=>{const a=new PE.Action(d,d);a.frames=[0,1].map(()=>new PE.Frame(si,0,0,32,32));return a;});return s;
      });
      p.layers=[];for(let si=0;si<3;si++){
        const body=Object.assign(new PE.Layer('body'),{sheetIndex:si,locked:true,inheritedBase:true});p.layers.push(body);
        if(si<2){const hair=Object.assign(new PE.Layer('头发 / 测试跨动作 / 前发'),{sheetIndex:si});p.layers.push(hair);if(si===0){const d=new ImageData(32,32);d.data.set([241,83,110,255],(8*32+16)*4);hair.frameData.set('0_0_0',d);}}
      }
      p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=1;app.history.clear();app.updateAll();
    });
    const actionPixel=(si,fi)=>page.evaluate(({si,fi})=>{
      const p=PE.app.project,l=p.layers.find(l=>l.sheetIndex===si&&l.name==='头发 / 测试跨动作 / 前发');return l?.getFrameData(`${si}_0_${fi}`)?.data[(8*32+16)*4]||0;
    },{si,fi});
    await page.keyboard.press('Control+c');await page.locator('.sheet-item').filter({hasText:'待机'}).click();await page.keyboard.press('Control+v');
    assert.equal(await actionPixel(1,0),241);assert.equal(await actionPixel(0,0),241);
    assert.equal(await page.evaluate(()=>PE.app.project.getCurrentLayer().name),'头发 / 测试跨动作 / 前发');
    await page.keyboard.press('Control+z');assert.equal(await actionPixel(1,0),0);await page.keyboard.press('Control+y');assert.equal(await actionPixel(1,0),241);
    await page.locator('.sheet-item').filter({hasText:'坐姿'}).click();await page.keyboard.press('Control+v');assert.equal(await actionPixel(2,0),241);
    await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>PE.app.project.layers.some(l=>l.sheetIndex===2&&l.name.startsWith('头发 /'))),false);
    await page.keyboard.press('Control+y');assert.equal(await actionPixel(2,0),241);
    await page.locator('.sheet-item').filter({hasText:'行走'}).click();await page.getByRole('tab',{name:'头发',exact:true}).click();await page.locator('.visual-layer-card').filter({hasText:'测试跨动作'}).locator('.part-card-actions .part-choose').click();
    await page.locator('#batch-copy-cel-btn').click();await page.getByLabel('目标动作',{exact:true}).selectOption({label:'坐姿'});await page.getByText('目标朝向全部帧',{exact:true}).click();
    assert.equal(await page.getByLabel('目标朝向',{exact:true}).inputValue(),'0','cross-action batch keeps the source direction');
    await page.getByRole('button',{name:'复制到 2 帧',exact:true}).click();assert.equal(await actionPixel(2,1),241);
    await page.keyboard.press('Control+z');assert.equal(await actionPixel(2,1),0);
    assert.equal(await page.evaluate(()=>PE.app.project.layers.filter(l=>l.name==='body').every(l=>l.frameData.size===0)),true);
    await fs.mkdir(path.join(root,'test/output/cross-action-copy'),{recursive:true});await page.screenshot({path:path.join(root,'test/output/cross-action-copy/verified.png')});
    assert.deepEqual(errors,[]);console.log('PASS: grouped-hair direction copying; buttons and Ctrl+C/X/V; next-frame creation; direction batch; walk/front to idle/sit; automatic new hair layer; target-action batch; body protection; undo/redo; no page errors.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
