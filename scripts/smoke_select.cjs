/* Selection-sheet behavior with real assets and controlled option models. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'android/app/src/main/assets');
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=req.url==='/'?'index.html':req.url.slice(1);
    if(!/^[\w./-]+$/.test(file)||file.includes('..'))return res.writeHead(404).end();
    try {
      let data=fs.readFileSync(path.join(assets,file));
      // Isolate the shared control from the live bridge and session controller.
      if(file==='index.html')data=data.toString().replace('<script src="app.js" defer></script>','');
      const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html';
      res.writeHead(200,{'Content-Type':type});res.end(data);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||path.join(process.env.PREFIX,'bin/headless_shell'),args:['--no-sandbox','--disable-dev-shm-usage']});
    const page=await browser.newPage({viewport:{width:320,height:460},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(()=>{
      document.querySelector('#welcome').hidden=true;document.querySelector('#workspace').hidden=false;
      const source=document.querySelector('#project-switch');source.hidden=false;
      source.replaceChildren(...Array.from({length:120},(_,index)=>{
        const option=new Option(index===97?'한글 <img src=x onerror="window.untrusted=true"> · long project name':'Project '+index,String(index));
        option.disabled=[3,119].includes(index);return option;
      }));
      source.value='97';window.choiceChanges=0;source.addEventListener('change',()=>window.choiceChanges++);
      document.querySelector('#permission').replaceChildren(new Option('Read only','read-only'),new Option('Full Access','yolo'));
      window.contextKey='original';
      window.choices=new BibimerSelect(BibimerI18n.t,{context:()=>window.contextKey,description:(select,option)=>select.id==='project-switch'?'/projects/controlled/'+option.value:''});
    });
    const open=()=>page.locator('#project-switch-trigger').click();
    await open();
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'97');
    assert.equal(await page.locator('#select-options img').count(),0);
    assert.equal(await page.evaluate(()=>window.untrusted),undefined);
    const listBox=await page.locator('#select-options').boundingBox(),selectedBox=await page.locator('#select-options [data-value="97"]').boundingBox();
    assert.ok(selectedBox.y>=listBox.y && selectedBox.y+selectedBox.height<=listBox.y+listBox.height+1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,'dist/screenshots/select-long-projects.png')});
    await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'0');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'4');
    await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'118');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#project-switch').inputValue(),'97');assert.equal(await page.evaluate(()=>window.choiceChanges),0);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'project-switch-trigger');
    await page.evaluate(()=>{document.querySelector('#project-switch').value='20';choices.sync();});
    assert.equal(await page.locator('#project-switch-trigger .select-value').innerText(),'Project 20');
    await open();
    await page.evaluate(()=>{
      window.staleChoice=document.querySelector('#select-options [data-value="21"]');
      window.contextKey='another session';choices.sync();staleChoice.click();
    });
    assert.equal(await page.locator('#select-dialog').isVisible(),false);
    assert.equal(await page.locator('#project-switch').inputValue(),'20');assert.equal(await page.evaluate(()=>window.choiceChanges),0);
    await open();
    await page.evaluate(()=>{
      const stale=document.querySelector('#select-options [data-value="21"]');
      document.querySelector('#project-switch option[value="21"]').remove();stale.click();
    });
    assert.equal(await page.locator('#project-switch').inputValue(),'20');
    await page.locator('#select-close').click();
    await page.evaluate(()=>document.querySelector('#settings-dialog').showModal());
    await page.locator('#permission-trigger').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settings-dialog').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'permission-trigger');
    await page.locator('#permission-trigger').click();
    await page.locator('#select-options [data-value="yolo"]').click();
    assert.equal(await page.locator('#permission').inputValue(),'yolo');
    assert.equal(await page.locator('#settings-dialog').isVisible(),true);
    await page.locator('#permission-trigger').click();
    await page.evaluate(()=>document.querySelector('#settings-dialog').close());
    await page.locator('#select-dialog').waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);
    console.log('PASS: long lists/Unicode/literal HTML, selected-row scrolling at 320×460, disabled-option navigation, cancel/focus return, programmatic value sync, stale context/removal guards and nested dialogs');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
