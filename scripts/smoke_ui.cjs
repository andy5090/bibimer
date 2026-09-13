/* Browser UI + real Termux PTY integration. Android native APIs are an explicit
 * test adapter here; installing the APK and exercising WebView is a separate check.
 * Run: npm install --prefix .tools/ui --ignore-scripts playwright-core@1.55.1
 *      node scripts/smoke_ui.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawn, execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
// Use the installed Termux Chromium, without Playwright's Linux browser download.
if (process.platform === 'android') Object.defineProperty(process, 'platform', {value:'linux'});
const {chromium} = require('../.tools/ui/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'android/app/src/main/assets');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bibimer-ui-'));
const state = path.join(temporary, 'state');
const errors = [];
let bridge, browser, assets, legacyProjectError = false;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  assets = http.createServer((request, response) => {
    const file = request.url === '/' ? 'index.html' : request.url.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(file) || file.includes('..')) { response.writeHead(404).end(); return; }
    try {
      const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      response.writeHead(200, {'Content-Type':type}); response.end(fs.readFileSync(path.join(source, file)));
    } catch (_) { response.writeHead(404).end(); }
  });
  await new Promise(resolve => assets.listen(0, '127.0.0.1', resolve));
  const portProbe = http.createServer();
  await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  bridge = spawn('python', [path.join(root,'bridge/bibimer_bridge.py'), 'serve', '--state-dir',state, '--port',String(port)], {stdio:'ignore'});
  for (let i=0; i<100 && !fs.existsSync(path.join(state,'token.json')); i++) await delay(50);
  const token = JSON.parse(fs.readFileSync(path.join(state,'token.json')));
  const code = execFileSync('python', ['-c',
    'import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); from bibimer_bridge import issue_pairing; print(issue_pairing(Path(sys.argv[2])))',
    path.join(root,'bridge'), state], {encoding:'utf8'}).trim();
  const call = async (method, endpoint, body) => {
    const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, {method,
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      ...(method === 'POST' ? {body:JSON.stringify(body)} : {})});
    return {ok:response.ok,status:response.status,data:await response.json()};
  };
  browser = await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM || path.join(process.env.PREFIX,'bin/headless_shell'),
    headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:393,height:780},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ko-KR'});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('nativeRequest', async (id, method, endpoint, body) => {
    try {
      const result = legacyProjectError && endpoint === '/v1/project'
        ? {ok:false,status:400,data:{error:'읽고 쓸 수 있는 프로젝트 폴더가 필요합니다.'}}
        : await call(method, endpoint.replace('wait=20','wait=1'), JSON.parse(body));
      if (endpoint === '/v1/pair' && result.ok) {
        delete result.data.token;
        await page.evaluate(() => { localStorage.setItem('testPaired','yes'); });
      }
      await page.evaluate(({id,result}) => window.BibimerNativeReply(id,result), {id,result});
    } catch (_) { /* navigation destroys callbacks just like a destroyed Activity */ }
  });
  await page.addInitScript(() => {
    window.setupActions = [];
    window.Bibimer = {
      // Browser-only stand-in for native preferences; Android persistence is
      // verified separately on the installed APK, not by this adapter.
      environment:()=>JSON.stringify({paired:localStorage.getItem('testPaired')==='yes',
        language:localStorage.getItem('testLanguage') || 'en',termuxInstalled:false,version:'0.1.1'}),
      setLanguage:language=>{localStorage.setItem('testLanguage',language);return true;},
      request:(...args)=>window.nativeRequest(...args), forget:()=>{localStorage.removeItem('testPaired');},
      openTermux:()=>window.setupActions.push('termux'),
      openGuide:guide=>window.setupActions.push('guide:'+guide),
      copyCommand:name=>window.setupActions.push('copy:'+name),
      exportInstaller:()=>window.setupActions.push('export')
    };
  });
  await page.goto(`http://127.0.0.1:${assets.address().port}/`);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#go-setup [data-i18n]').innerText(),'Set up this phone');
  await page.locator('#go-setup').click();
  assert.equal(await page.locator('#termux-status').innerText(),'Not installed');
  await page.locator('[data-guide="termux"]').click();
  await page.locator('#export-installer').click();
  assert.deepEqual(await page.evaluate(()=>window.setupActions),['guide:termux','export']);
  fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
  await page.locator('#setup').evaluate(node=>{node.scrollTop=0;});
  await page.screenshot({path:path.join(root,'dist/screenshots/setup-en.png')});
  await page.locator('#language').selectOption('ko');
  assert.equal(await page.locator('html').getAttribute('lang'),'ko');
  assert.equal(await page.locator('#termux-status').innerText(),'설치 필요');
  assert.ok((await page.locator('#install-command').innerText()).startsWith('BIBIMER_LANGUAGE=ko '));
  await page.screenshot({path:path.join(root,'dist/screenshots/setup-ko.png')});
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'),'ko');
  await page.locator('#go-setup').click();
  await page.locator('#language').selectOption('en');
  await page.locator('#pair-code').fill(code);
  await page.locator('#pair').click();
  await page.locator('#project-form').waitFor({state:'visible'});
  await page.locator('#path').fill('relative/project');
  await page.locator('#project-form button').click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Enter an absolute path or a path starting with ~/.');
  // Older live bridges have Korean errors without a code. Updating the app
  // must localize those responses without requiring a bridge restart.
  legacyProjectError = true;
  await page.locator('#project-form button').click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Choose a project folder with read and write access.');
  await page.locator('#tab-setup').click();
  await page.locator('#language').selectOption('ko');
  assert.equal(await page.locator('#notice').innerText(),'읽고 쓸 수 있는 프로젝트 폴더가 필요합니다.');
  assert.equal(await page.locator('#path').inputValue(),'relative/project');
  await page.locator('#language').selectOption('en');
  await page.locator('#tab-work').click();
  legacyProjectError = false;
  // Clear the error before measuring the ordinary project form.
  await page.evaluate(()=>document.querySelector('#reconnect').click());
  await page.locator('#path').fill(path.join(temporary,'project'));
  await page.setViewportSize({width:360,height:460});
  await delay(3300); // A health refresh must not erase an unfinished project path.
  assert.equal(await page.locator('#path').inputValue(),path.join(temporary,'project'));
  const registerBox = await page.locator('#project-form button').boundingBox();
  assert.ok(registerBox.y>=0 && registerBox.y+registerBox.height<=460);
  await page.setViewportSize({width:393,height:780});
  await page.locator('#create-folder').check();
  await page.locator('#project-form button').click();
  await page.locator('#project-form').waitFor({state:'hidden'});
  await page.locator('#launch').click();
  await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='running');
  const initial = (await call('GET','/v1/health')).data.session.id;
  await page.locator('#input').fill("printf 'PHONE_''DEVELOPMENT\\n'");
  await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#input').value==='');
  // Render xterm output and ensure Korean input survives the roundtrip.
  await page.locator('#input').fill("printf '비비''머\\n'");
  await page.locator('#send').click();
  await delay(400);
  const output = (await call('GET',`/v1/sessions/${initial}/events?cursor=0&wait=0`)).data;
  const text = Buffer.from(output.data,'base64').toString('utf8');
  assert.ok(text.includes('PHONE_DEVELOPMENT') && text.includes('비비머'));
  await page.screenshot({path:path.join(root,'dist/screenshots/session-en.png')});
  const draft = 'Draft instruction · 작성 중';
  await page.locator('#input').fill(draft);
  await page.locator('#tab-setup').click();
  await page.locator('#language').selectOption('ko');
  await page.locator('#tab-work').click();
  assert.equal(await page.locator('#input').inputValue(),draft);
  assert.equal(await page.locator('#process').innerText(),'실행 중');
  assert.equal((await call('GET','/v1/health')).data.session.id,initial);
  await page.screenshot({path:path.join(root,'dist/screenshots/session-ko.png')});
  await page.evaluate(()=>window.BibimerPause());
  assert.equal((await call('GET','/v1/health')).data.session.state,'running');
  await page.evaluate(()=>window.BibimerResume());
  await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');
  assert.equal((await call('GET','/v1/health')).data.session.id,initial);
  assert.equal(await page.locator('#input').inputValue(),draft);
  await page.locator('#input').fill('');
  // A narrow viewport / keyboard-height viewport must keep the send action visible.
  await page.setViewportSize({width:360,height:460});
  await delay(300);
  const sendBox = await page.locator('#send').boundingBox();
  assert.ok(sendBox.y>=0 && sendBox.y+sendBox.height<=460);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(root,'dist/screenshots/keyboard-ko.png')});
  await page.locator('#tab-setup').click();
  await page.locator('#language').selectOption('en');
  await page.locator('#tab-work').click();
  const englishSendBox = await page.locator('#send').boundingBox();
  assert.ok(englishSendBox.y>=0 && englishSendBox.y+englishSendBox.height<=460);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(root,'dist/screenshots/keyboard-en.png')});
  await page.setViewportSize({width:393,height:780});
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal((await call('GET','/v1/health')).data.session.id,initial);
  await page.locator('#stop').click();
  await page.locator('#cancel-stop').click();
  assert.equal((await call('GET','/v1/health')).data.session.state,'running');
  await page.locator('#stop').click();
  await page.locator('#confirm-stop').click();
  await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited',{},{timeout:15000});
  assert.equal((await call('GET','/v1/health')).data.session.state,'exited');
  if (process.argv.includes('--probe-codex')) {
    await page.locator('#agent').selectOption('codex');
    await page.locator('#launch').click();
    await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='running');
    await delay(2000);
    const agentSession = (await call('GET','/v1/health')).data.session;
    const agentEvent = (await call('GET',`/v1/sessions/${agentSession.id}/events?cursor=0&wait=0`)).data;
    assert.equal(agentSession.state,'running');
    assert.ok(Buffer.from(agentEvent.data,'base64').toString('utf8').toLowerCase().includes('codex'));
    // No model task is sent, and no agent transcript is captured or logged.
    await page.evaluate(()=>window.BibimerPause());
    await page.evaluate(()=>window.BibimerResume());
    await delay(1500);
    assert.equal((await call('GET','/v1/health')).data.session.id,agentSession.id);
    await page.locator('#stop').click();
    await page.locator('#confirm-stop').click();
    await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited',{},{timeout:15000});
    console.log('PASS: installed Codex startup through xterm, reconnect, explicit stop; no model task sent');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: English default with Korean device locale, Korean selection, localized errors including legacy bridge, language changes preserve session and draft, setup guidance, pairing, PTY input/output, reconnect, mobile layout, explicit stop');
}

main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(bridge){bridge.kill('SIGTERM');await new Promise(resolve=>bridge.once('exit',resolve));}
  if(assets)await new Promise(resolve=>assets.close(resolve));
  fs.rmSync(temporary,{recursive:true,force:true});
});
