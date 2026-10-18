"use strict";
// Real browser touch input exercises long press, native scrolling and drawer swipe arbitration.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'../..'),assets=path.join(root,'android/app/src/main/assets');
let browser;
(async()=>{
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync(path.join(assets,'app.css'),'utf8')}</style><div id="app"><button id="sidebar-open">Open</button></div>
    <dialog id="sidebar" class="sidebar"><div class="sidebar-heading"><h2>Projects</h2><button id="sidebar-close">Close</button></div>
    <div class="sidebar-tools"><button id="sidebar-refresh">Refresh</button><button id="sidebar-archived">Archived</button></div>
    <p id="sidebar-status" class="hint" role="status"></p><div id="sidebar-projects"></div></dialog>`);
  await page.addScriptTag({path:path.join(assets,'sidebar.js')});
  for(const file of ['i18n-de.js','i18n-es.js','i18n-fr.js','i18n-id.js','i18n-ja.js','i18n-pt-BR.js','i18n-zh-Hans.js','i18n-zh-Hant.js','i18n.js'])await page.addScriptTag({path:path.join(assets,file)});
  await page.evaluate(()=>{
    window.moves=[];window.current={projects:Array.from({length:12},(_,i)=>({id:'p'+i,name:'Project '+i,path:'/projects/'+i,sessions:[]})),
      projectId:'p0',worktrees:{},online:true,library:true,disabled:false,dragOrdering:true,title:row=>row.title,status:()=>'',responding:()=>false};
    window.sidebar=new BibimerSidebar(BibimerI18n.t,{refresh(){sidebar.render(current);},moveProject(id,position){moves.push({id,position});},create(){},project(){},manageProject(){},session(){},import(){}});
    sidebar.render(current);sidebar.open();
  });
  const cdp=await page.context().newCDPSession(page),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:0}]});
  const header=id=>page.locator(`[data-project="${id}"] > summary`);
  const point=async id=>{await header(id).scrollIntoViewIfNeeded();const b=await header(id).boundingBox();return {x:b.x+35,y:b.y+b.height/2};};
  const ids=()=>page.locator('.sidebar-project').evaluateAll(nodes=>nodes.map(node=>node.dataset.project));
  const hold=async id=>{const p=await point(id);await touch('touchStart',p.x,p.y);await page.waitForFunction(()=>document.querySelector('#sidebar').classList.contains('project-reordering'));return p;};
  // A tap retains the normal expand/collapse behavior.
  assert.equal(await page.locator('[data-project="p0"]').evaluate(node=>node.open),true);
  await header('p0').tap();assert.equal(await page.locator('[data-project="p0"]').evaluate(node=>node.open),false);
  let p=await hold('p0');
  await page.evaluate(()=>sidebar.render({...current,loading:true}));assert.equal(await page.locator('.project-drag-ghost').count(),1,'poll renders preserve a held row');
  let b=await header('p3').boundingBox();await touch('touchMove',p.x,b.y+b.height-1);
  assert.equal((await ids())[3],'p0');assert.equal(await page.locator('#sidebar').evaluate(node=>node.open),true);
  fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});await page.screenshot({path:path.join(root,'dist/screenshots/project-drag-393-en.png')});
  await touch('touchEnd');await pause(50);
  assert.deepEqual(await page.evaluate(()=>moves),[{id:'p0',position:3}]);assert.equal((await ids())[0],'p0','preview restores until the saved order arrives');
  assert.equal(await page.locator('[data-project="p0"]').evaluate(node=>node.open),false,'release does not click the header');
  assert.equal(await page.locator('.project-drag-ghost').count(),0);
  await pause(520);
  // Hold without movement is a no-op and suppresses the synthesized click.
  await hold('p0');await touch('touchEnd');await pause(50);assert.equal(await page.evaluate(()=>moves.length),1);
  assert.equal(await page.locator('[data-project="p0"]').evaluate(node=>node.open),false);
  // Native scrolling before activation cancels the hold.
  p=await point('p2');await touch('touchStart',p.x,p.y);for(let step=1;step<=5;step++){await touch('touchMove',p.x,p.y-step*18);await pause(30);}await pause(550);
  assert.equal(await page.locator('.project-drag-ghost').count(),0);await touch('touchEnd');
  assert.ok(await page.locator('#sidebar-projects').evaluate(node=>node.scrollTop)>0,'ordinary touch scroll remains available');
  // Dragging at the edge scrolls the list and reaches a project outside the viewport.
  await page.locator('#sidebar-projects').evaluate(node=>node.scrollTop=0);p=await hold('p0');
  b=await page.locator('#sidebar-projects').boundingBox();await touch('touchMove',p.x,b.y+b.height-5);await pause(600);
  assert.ok(await page.locator('#sidebar-projects').evaluate(node=>node.scrollTop)>0);
  await touch('touchCancel');assert.equal(await page.evaluate(()=>moves.length),1);assert.equal((await ids())[0],'p0');
  // Escape, closing, offline updates and a second finger cancel without saving.
  for(const cancel of ['escape','close','offline','multitouch']){
    await page.evaluate(()=>{current.online=true;sidebar.render(current);sidebar.open();document.querySelector('#sidebar-projects').scrollTop=0;});
    p=await hold('p0');b=await header('p2').boundingBox();await touch('touchMove',p.x,b.y+b.height-1);
    if(cancel==='escape')await page.keyboard.press('Escape');
    if(cancel==='close')await page.evaluate(()=>sidebar.close(true));
    if(cancel==='offline')await page.evaluate(()=>{current.online=false;sidebar.render(current);});
    if(cancel==='multitouch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:0},{x:p.x+40,y:p.y,id:1}]});
    await touch('touchEnd');await pause(50);
    assert.equal(await page.locator('.project-drag-ghost').count(),0,cancel);assert.equal(await page.evaluate(()=>moves.length),1,cancel);
  }
  await page.evaluate(()=>{current.online=true;current.dragOrdering=false;sidebar.render(current);sidebar.open();});
  p=await point('p0');await touch('touchStart',p.x,p.y);await pause(550);assert.equal(await page.locator('.project-drag-ghost').count(),0,'older bridge cannot activate drag');await touch('touchEnd');
  // Desktop mouse hold uses the same ordering while a quick movement stays native.
  await page.setViewportSize({width:1200,height:900});await page.evaluate(()=>{current.dragOrdering=true;sidebar.render(current);sidebar.open();});
  p=await point('p0');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForFunction(()=>!!document.querySelector('.project-drag-ghost'));
  b=await header('p2').boundingBox();await page.mouse.move(p.x,b.y+b.height-1);await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>moves.at(-1)),{id:'p0',position:2});assert.equal(await page.locator('#sidebar').evaluate(node=>node.open),true);
  // A drag owns horizontal motion too; a normal outward swipe still closes the drawer.
  await page.setViewportSize({width:320,height:600});await page.evaluate(()=>sidebar.open());
  p=await hold('p0');await touch('touchMove',p.x-80,p.y);await touch('touchEnd');
  assert.equal(await page.locator('#sidebar').evaluate(node=>node.open),true);
  await pause(520);p=await point('p0');await touch('touchStart',p.x+140,p.y);await touch('touchMove',p.x+40,p.y);await touch('touchEnd');
  assert.equal(await page.locator('#sidebar').evaluate(node=>node.open),false,'ordinary outward swipe closes the drawer');
  for(const language of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
    await page.evaluate(lang=>{BibimerI18n.setLanguage(lang);sidebar.signature='';sidebar.render(current);sidebar.open();},language);
    assert.ok(await page.locator('#sidebar-status').innerText());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    p=await hold('p0');
    if(language==='ko'||language==='en')await page.screenshot({path:path.join(root,`dist/screenshots/project-drag-320-${language}.png`)});
    await touch('touchCancel');
  }
  assert.deepEqual(errors,[]);console.log('Sidebar drag: native touch hold/release, polling, no-move, click suppression, scroll, edge auto-scroll, cancel/close/Escape/offline/multitouch, old bridge and desktop passed');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
