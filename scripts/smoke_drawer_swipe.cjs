/* Chromium touch input against the actual assets; no bridge or model operations. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'android/app/src/main/assets');
let server,browser;
async function main(){
 server=http.createServer((req,res)=>{try{const name=req.url==='/'?'index.html':req.url.slice(1);if(name.includes('..'))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(path.join(assets,name)));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:393,height:851},isMobile:true,hasTouch:true});page.setDefaultTimeout(7000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.Bibimer={environment:()=>JSON.stringify({paired:false,language:'en',version:'test'}),setBackHandling:()=>{},copyText:()=>{}};});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const cdp=await page.context().newCDPSession(page);
 const point=(x,y,id=1)=>({x,y,id,radiusX:2,radiusY:2});
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const swipe=async(x,y,dx,dy=0,end='touchEnd')=>{
  await touch('touchStart',[point(x,y)]);
  for(let step=1;step<=6;step++){await touch('touchMove',[point(x+dx*step/6,y+dy*step/6)]);await page.waitForTimeout(18);}
  await touch(end);await page.waitForTimeout(220);
 };
 const opened=id=>page.locator('#'+id).evaluate(n=>n.open);
 const open=async(id)=>{await page.waitForTimeout(450);await page.locator('#'+id+'-open').click();await page.waitForTimeout(200);assert.ok(await opened(id));};
 await page.evaluate(()=>{
  const input=document.querySelector('#input');input.disabled=false;input.value='Keep my draft';
  window.rowClicks=0;
  const list=document.querySelector('#sidebar-projects');
  for(let i=0;i<50;i++){const b=document.createElement('button');b.textContent='Session '+i;b.style='display:block;width:100%;height:58px';b.onclick=()=>window.rowClicks++;list.append(b);}
 });
 await open('sidebar');
 // Swipe beginning on a clickable session must only dismiss, then return focus.
 await swipe(260,240,-150);
 assert.equal(await opened('sidebar'),false);assert.equal(await page.evaluate(()=>window.rowClicks),0);
 assert.equal(await page.locator('#sidebar-open').getAttribute('aria-expanded'),'false');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'sidebar-open');
 assert.equal(await page.locator('#input').inputValue(),'Keep my draft');
 await open('sidebar');await swipe(230,220,-35);assert.ok(await opened('sidebar'));
 assert.equal(await page.locator('#sidebar').evaluate(n=>getComputedStyle(n).transform),'none');
 await swipe(130,230,120);assert.ok(await opened('sidebar'));
 // Native scrolling must remain usable, including a later sideways turn.
 await swipe(240,600,-5,-240);assert.ok(await opened('sidebar'));
 assert.ok(await page.locator('#sidebar-projects').evaluate(n=>n.scrollTop>0));
 await swipe(250,260,-110,160);assert.ok(await opened('sidebar'));
 await swipe(250,260,-120,0,'touchCancel');assert.ok(await opened('sidebar'));
 await touch('touchStart',[point(250,260)]);await touch('touchMove',[point(220,260)]);
 await touch('touchStart',[point(220,260),point(250,310,2)]);await touch('touchEnd');await page.waitForTimeout(450);
 assert.ok(await opened('sidebar'));assert.equal(await page.locator('#sidebar').evaluate(n=>n.style.getPropertyValue('--drawer-offset')),'');
 // Mouse drag does not dismiss; existing close and tap controls remain available.
 await page.mouse.move(250,250);await page.mouse.down();await page.mouse.move(80,250,{steps:8});await page.mouse.up();assert.ok(await opened('sidebar'));
 await page.evaluate(()=>getSelection().removeAllRanges());await page.locator('#sidebar-close').click();
 await open('inspector');await swipe(100,130,160);assert.equal(await opened('inspector'),false);
 assert.equal(await page.locator('#inspector-open').getAttribute('aria-expanded'),'false');
 await open('inspector');
 await page.evaluate(()=>{const pre=document.createElement('pre');pre.className='inspect-code';pre.id='swipe-code';pre.textContent='long line '.repeat(80);document.querySelector('#inspect-content').replaceChildren(pre);});
 const code=await page.locator('#swipe-code').boundingBox();
 await swipe(code.x+code.width-35,code.y+25,-150);assert.ok(await opened('inspector'));
 assert.ok(await page.locator('#swipe-code').evaluate(n=>n.scrollLeft>0));
 await swipe(code.x+40,code.y+25,150);assert.ok(await opened('inspector'));
 // Preserve an existing range (synthetic events keep browser default deselection out of this guard check).
 await page.evaluate(()=>{const n=document.querySelector('#inspector-title');const range=document.createRange();range.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(range);});
 await page.evaluate(()=>{
  const target=document.querySelector('#inspector-title');
  const a=new Touch({identifier:1,target,clientX:100,clientY:25});
  const b=new Touch({identifier:1,target,clientX:250,clientY:25});
  target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[a]}));
  target.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[b]}));
  target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[b]}));
 });assert.ok(await opened('inspector'));await page.evaluate(()=>getSelection().removeAllRanges());
 await touch('touchStart',[point(100,130)]);await page.waitForTimeout(650);await touch('touchMove',[point(250,130)]);await touch('touchEnd');
 assert.ok(await opened('inspector'));await page.evaluate(()=>getSelection().removeAllRanges());
 await page.locator('#inspector-close').click();await open('sidebar');
 // Responsive changes cancel a pending gesture and keep the desktop pane docked.
 await touch('touchStart',[point(250,230)]);await touch('touchMove',[point(200,230)]);
 await page.setViewportSize({width:1440,height:900});await touch('touchEnd');await page.waitForTimeout(250);
 assert.equal(await page.locator('#sidebar').evaluate(n=>n.classList.contains('docked')),true);
 assert.ok(await opened('sidebar'));await swipe(240,250,-150);assert.ok(await opened('sidebar'));
 await open('inspector');await swipe(1160,140,150);assert.ok(await opened('inspector'));
 // Reduced motion and a narrow phone still support dismissal.
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:568});await page.waitForTimeout(250);
 await open('sidebar');await swipe(220,200,-120);assert.equal(await opened('sidebar'),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: real touch dismissal left/right, row click suppression, native vertical/code scrolling, short/inward/diagonal/multitouch/cancel/selection/mouse guards, focus and draft preservation, docked/resize/reduced-motion/320px');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
