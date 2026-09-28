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
const fixtureMode = !process.argv.includes('--probe-codex');
let bridge, browser, assets, legacyProjectError = false, legacyFolders = false, failedEventRequests = 0;
let heldReply = null;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  assets = http.createServer((request, response) => {
    const file = request.url === '/' ? 'index.html' : request.url.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(file) || file.includes('..')) { response.writeHead(404).end(); return; }
    try {
      const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
      response.writeHead(200, {'Content-Type':type}); response.end(fs.readFileSync(path.join(source, file)));
    } catch (_) { response.writeHead(404).end(); }
  });
  await new Promise(resolve => assets.listen(0, '127.0.0.1', resolve));
  const portProbe = http.createServer();
  await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const bridgeEnv = {...process.env};
  if (fixtureMode) {
    const binaries = path.join(temporary,'bin');
    fs.mkdirSync(binaries);
    const python = execFileSync('which',['python'],{encoding:'utf8'}).trim();
    fs.writeFileSync(path.join(binaries,'codex'),'#!'+python+'\n'+fs.readFileSync(path.join(root,'bridge/tests/fake_codex.py'),'utf8'),{mode:0o700});
    bridgeEnv.PATH = binaries+':'+process.env.PATH;
  }
  const startBridge = () => spawn('python', [path.join(root,'bridge/bibimer_bridge.py'), 'serve', '--state-dir',state, '--port',String(port)], {stdio:'ignore',env:bridgeEnv});
  bridge = startBridge();
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
      if (legacyFolders && endpoint === '/v1/health' && result.ok) result.data.features = ['multiple_projects'];
      if (endpoint.includes('/events?') && !result.ok) failedEventRequests++;
      if (heldReply?.endpoint === endpoint) {
        const held = heldReply; heldReply = null; held.entered(); await held.promise;
      }
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
        language:localStorage.getItem('testLanguage') || 'en',termuxInstalled:false,version:'0.4.0'}),
      setLanguage:language=>{localStorage.setItem('testLanguage',language);return true;},
      cancelPoll:()=>{}, request:(...args)=>window.nativeRequest(...args), forget:()=>{localStorage.removeItem('testPaired');},
      openTermux:()=>window.setupActions.push('termux'),
      openGuide:guide=>window.setupActions.push('guide:'+guide),
      copyCommand:name=>window.setupActions.push('copy:'+name),
      copyText:text=>{window.testClipboard=text;},
      openLink:url=>{window.testOpenedLink=url;},
      exportInstaller:()=>window.setupActions.push('export')
    };
  });
  async function verifyRestartAfterExit() {
    const before = (await call('GET','/v1/health')).data;
    assert.equal(before.session.state,'exited');
    await page.evaluate(()=>window.BibimerPause());
    const stopped = new Promise(resolve=>bridge.once('exit',resolve));
    assert.equal((await call('POST','/v1/shutdown',{})).ok,true);
    await stopped;
    bridge = startBridge();
    let after;
    for (let i=0;i<50;i++) {
      try { after = (await call('GET','/v1/health')).data; } catch (_) {}
      if (after?.instance && after.instance !== before.instance) break;
      await delay(100);
    }
    assert.ok(after?.instance && after.instance !== before.instance);
    assert.equal(after.session.id,before.session.id);
    assert.equal(after.session.output_end,0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(state,'token.json'))),token);
    const failuresBefore = failedEventRequests;
    await page.reload();
    await page.waitForFunction(()=>!document.querySelector('#launch').disabled);
    await delay(3500); // Cross the periodic health refresh, not a transient enable.
    assert.equal(await page.locator('#launch').isEnabled(),true);
    assert.equal(await page.locator('#connection').evaluate(node=>node.classList.contains('connected')),true);
    assert.equal(failedEventRequests,failuresBefore);
    await page.locator('#agent').selectOption('codex');
    assert.equal(await page.locator('#mode option[value="chat"]').isEnabled(),true);
    console.log('PASS: bridge restart after exited '+(before.session.mode || 'terminal')+' keeps connection and Start session enabled; pairing retained');
  }
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
  await page.locator('#project-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Enter an absolute path or a path starting with ~/.');
  // Older live bridges have Korean errors without a code. Updating the app
  // must localize those responses without requiring a bridge restart.
  legacyProjectError = true;
  await page.locator('#project-form button[type=submit]').click();
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
  const registerBox = await page.locator('#project-form button[type=submit]').boundingBox();
  assert.ok(registerBox.y>=0 && registerBox.y+registerBox.height<=460);
  await page.setViewportSize({width:393,height:780});
  await page.locator('#create-folder').check();
  await page.locator('#project-form button[type=submit]').click();
  await page.locator('#project-form').waitFor({state:'hidden'});
  await page.locator('#launch').click();
  await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='running');
  const initial = (await call('GET','/v1/health')).data.session.id;
  const projectA = (await call('GET','/v1/health')).data.project.id;
  await page.locator('#input').fill('Draft A · 한글');
  await page.locator('#edit-project').click();
  // Browse existing folders while project A continues running.
  const browseRoot = path.join(temporary, 'existing projects');
  fs.mkdirSync(browseRoot);
  for (let i=0;i<103;i++) fs.mkdirSync(path.join(browseRoot,'folder-'+String(i).padStart(3,'0')));
  for (const name of ['.hidden', 'gone', 'second-project', '한글 & <tag>']) fs.mkdirSync(path.join(browseRoot,name));
  fs.writeFileSync(path.join(browseRoot,'not-a-folder.txt'),'CONTROLLED_TEST_FILE');
  await page.locator('#path').fill(path.join(browseRoot,'not-created'));
  await page.locator('#browse-project').click();
  await page.waitForFunction(home=>document.querySelector('#folder-path').textContent===home && !document.querySelector('#folder-select').disabled, os.homedir());
  await page.locator('#folder-cancel').click();
  assert.equal(await page.locator('#path').inputValue(),path.join(browseRoot,'not-created'));
  await page.locator('#path').fill(browseRoot);
  await page.locator('#browse-project').click();
  await page.waitForFunction(()=>document.querySelectorAll('.folder-entry').length===100 && !document.querySelector('#folder-more').disabled);
  await page.screenshot({path:path.join(root,'dist/screenshots/folders-list-en.png')});
  assert.equal(await page.locator('.folder-entry', {hasText:'.hidden'}).count(),0);
  assert.equal(await page.locator('.folder-entry', {hasText:'not-a-folder.txt'}).count(),0);
  await page.locator('#folder-more').click();
  await page.waitForFunction(()=>document.querySelectorAll('.folder-entry').length===106);
  await page.locator('#folder-hidden').check();
  await page.getByRole('button',{name:'.hidden',exact:true}).waitFor();
  await page.locator('#folder-more').click();
  await page.getByRole('button',{name:'gone',exact:true}).waitFor();
  fs.rmdirSync(path.join(browseRoot,'gone'));
  await page.getByRole('button',{name:'gone',exact:true}).click();
  await page.locator('#folder-retry').waitFor();
  assert.equal(await page.locator('#folder-select').isEnabled(),false);
  fs.mkdirSync(path.join(browseRoot,'gone'));
  await page.locator('#folder-retry').click();
  await page.waitForFunction(()=>!document.querySelector('#folder-select').disabled);
  assert.equal(await page.locator('#folder-status').innerText(),'No subfolders to show. You can select this folder.');
  await page.locator('#folder-up').click();
  await page.waitForFunction(()=>!document.querySelector('#folder-more').disabled);
  await page.locator('#folder-more').click();
  await page.getByRole('button',{name:'한글 & <tag>',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#folder-select').disabled);
  assert.equal(await page.locator('#folder-path tag').count(),0);
  await page.locator('#folder-up').click();
  await page.waitForFunction(()=>!document.querySelector('#folder-more').disabled);
  await page.locator('#folder-more').click();
  await page.getByRole('button',{name:'second-project',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#folder-select').disabled);
  await page.setViewportSize({width:360,height:460});
  const selectFolderBox = await page.locator('#folder-select').boundingBox();
  assert.ok(selectFolderBox.y>=0 && selectFolderBox.y+selectFolderBox.height<=460);
  await page.screenshot({path:path.join(root,'dist/screenshots/folders-en.png')});
  await page.locator('#folder-select').click();
  assert.equal(await page.locator('#path').inputValue(),path.join(browseRoot,'second-project'));
  assert.equal(await page.locator('#create-folder').isChecked(),false);
  assert.equal((await call('GET','/v1/health')).data.session.id,initial);
  await page.setViewportSize({width:393,height:780});
  // An older bridge gives upgrade guidance without preventing manual paths.
  legacyFolders = true;
  await page.evaluate(()=>document.querySelector('#reconnect').click());
  await delay(150);
  await page.locator('#browse-project').click();
  await page.locator('#setup').waitFor({state:'visible'});
  assert.ok((await page.locator('#notice').innerText()).includes('Update the bridge to browse folders'));
  await page.locator('#language').selectOption('ko');
  await page.locator('#tab-work').click();
  legacyFolders = false;
  await page.locator('#reconnect').evaluate(node=>node.click());
  await delay(150);
  await page.locator('#browse-project').click();
  await page.waitForFunction(()=>!document.querySelector('#folder-select').disabled);
  assert.equal(await page.locator('#folder-title').innerText(),'프로젝트 폴더 선택');
  assert.equal(await page.locator('#folder-status').innerText(),'표시할 하위 폴더가 없습니다. 현재 폴더를 선택할 수 있습니다.');
  await page.screenshot({path:path.join(root,'dist/screenshots/folders-ko.png')});
  await page.locator('#folder-cancel').click();
  await page.locator('#tab-setup').click();
  await page.locator('#language').selectOption('en');
  await page.locator('#tab-work').click();
  // A canceled listing must not overwrite a newly opened browser.
  let releaseFolders, foldersAccepted;
  const folderAccepted = new Promise(resolve=>{foldersAccepted=resolve;});
  heldReply = {endpoint:'/v1/folders', entered:foldersAccepted, promise:new Promise(resolve=>{releaseFolders=resolve;})};
  await page.locator('#browse-project').click();
  await folderAccepted;
  await page.locator('#folder-cancel').click();
  await page.locator('#path').fill(browseRoot);
  await page.locator('#browse-project').click();
  await page.waitForFunction(()=>!document.querySelector('#folder-select').disabled);
  releaseFolders(); await delay(150);
  assert.equal(await page.locator('#folder-path').innerText(),browseRoot);
  await page.locator('#folder-cancel').click();
  await page.locator('#path').fill(path.join(browseRoot,'second-project'));
  await page.locator('#project-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#project-path').textContent.endsWith('/second-project'));
  const projectB = (await call('GET','/v1/health')).data.project.id;
  assert.notEqual(projectA,projectB);
  console.log('PASS: folder browsing, hidden folders, pagination, Unicode names, missing-folder retry, cancel/stale replies, existing project import, old bridge guidance and mobile layout in both languages');
  await page.locator('#launch').click();
  await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='running');
  const secondSession = (await call('GET','/v1/health')).data.session.id;
  await page.locator('#input').fill("printf 'PROJECT_''B_ONLY\\n'");
  await page.locator('#input').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#input').value==='');
  await page.locator('#input').fill('Draft B');
  await page.locator('#project-switch').selectOption(projectA);
  await page.waitForFunction(()=>document.querySelector('#input').value==='Draft A · 한글');
  assert.equal((await call('GET','/v1/health')).data.active_sessions,2);
  const heldText = "printf 'PROJECT_''A_ONLY\\n'";
  let releaseReply, inputAccepted;
  const accepted = new Promise(resolve=>{inputAccepted=resolve;});
  heldReply = {endpoint:`/v1/sessions/${initial}/input`, entered:inputAccepted,
    promise:new Promise(resolve=>{releaseReply=resolve;})};
  await page.locator('#input').fill(heldText);
  await page.locator('#input').press('Enter');
  await accepted;
  await page.locator('#project-switch').selectOption(projectB);
  await page.waitForFunction(()=>document.querySelector('#input').value==='Draft B');
  await page.locator('#input').fill(heldText);
  releaseReply(); await delay(100);
  assert.equal(await page.locator('#input').inputValue(),heldText);
  const aOutput = (await call('GET',`/v1/sessions/${initial}/events?cursor=0&wait=0`)).data;
  const bOutput = (await call('GET',`/v1/sessions/${secondSession}/events?cursor=0&wait=0`)).data;
  assert.ok(Buffer.from(aOutput.data,'base64').toString().includes('PROJECT_A_ONLY'));
  assert.ok(!Buffer.from(aOutput.data,'base64').toString().includes('PROJECT_B_ONLY'));
  assert.ok(Buffer.from(bOutput.data,'base64').toString().includes('PROJECT_B_ONLY'));
  assert.ok(!Buffer.from(bOutput.data,'base64').toString().includes('PROJECT_A_ONLY'));
  await page.locator('#stop').click(); await page.locator('#confirm-stop').click();
  await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited');
  assert.equal((await call('GET','/v1/health')).data.active_sessions,1);
  await page.locator('#project-switch').selectOption(projectA);
  await page.waitForFunction(()=>document.querySelector('#project-path').textContent.endsWith('/project'));
  await page.waitForFunction(()=>!document.querySelector('#input').disabled);
  assert.equal(await page.locator('#input').inputValue(),'');
  assert.equal((await call('GET','/v1/health')).data.session.id,initial);
  await page.screenshot({path:path.join(root,'dist/screenshots/projects-en.png')});
  console.log('PASS: two active projects, draft restore, delayed send reply isolation, separate terminal output and scoped stop');
  await page.locator('#input').fill("printf 'PHONE_''DEVELOPMENT\\n'");
  await page.locator('#input').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#input').value==='');
  // Render xterm output and ensure Korean input survives the roundtrip.
  await page.locator('#input').fill("printf '비비''머\\n'");
  await page.locator('#send').click();
  await delay(400);
  const output = (await call('GET',`/v1/sessions/${initial}/events?cursor=0&wait=0`)).data;
  const text = Buffer.from(output.data,'base64').toString('utf8');
  assert.ok(text.includes('PHONE_DEVELOPMENT') && text.includes('비비머'));
  await page.locator('#input').fill("printf '\\033[31mANSI_RED\\033[0m \\033[1;32mBOLD_GREEN\\033[0m\\n\\033[38;5;208mCOLOR_256\\033[0m \\033[38;2;12;180;220mTRUE_COLOR\\033[0m\\n+-------+\\n| ASCII |\\n+-------+\\n'");
  await page.locator('#send').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.xterm-rows span')].some(node=>node.textContent==='ANSI_RED' && getComputedStyle(node).color==='rgb(237, 119, 119)'));
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.xterm-rows span')].some(node=>node.textContent==='TRUE_COLOR' && getComputedStyle(node).color==='rgb(12, 180, 220)')));
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.xterm-rows span')].some(node=>node.textContent.includes('BOLD_GREEN') && Number(getComputedStyle(node).fontWeight)>=700)));
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.xterm-rows span')].some(node=>node.textContent==='COLOR_256' && getComputedStyle(node).color==='rgb(255, 135, 0)')));
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
  await verifyRestartAfterExit();
  if (fixtureMode) {
    await page.locator('#agent').selectOption('codex');
    assert.equal(await page.locator('#mode').inputValue(),'chat');
    await page.locator('#launch').click();
    await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');
    const chatId = (await call('GET','/v1/health')).data.session.id;
    assert.equal(await page.locator('#terminal-area').isVisible(),false);
    assert.equal(await page.locator('#input').getAttribute('enterkeyhint'),'send');
    await page.locator('#input').fill('firstsecond');
    await page.locator('#input').evaluate(node=>node.setSelectionRange(5,5));
    await page.locator('#input').press('Shift+Enter');
    assert.equal(await page.locator('#input').inputValue(),'first\nsecond');
    await page.locator('#input').evaluate(node=>node.setSelectionRange(0,5));
    await page.locator('#input').press('Control+Enter');
    assert.equal(await page.locator('#input').inputValue(),'\n\nsecond');
    await page.locator('#input').press('Meta+Enter');
    assert.equal(await page.locator('#input').inputValue(),'\n\n\nsecond');
    await page.locator('#input').fill('한글 · first\nsecond');
    await page.locator('#input').evaluate(node=>{
      node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));
      node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true}));
      node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
      node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
      node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
      node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));
    });
    assert.equal(await page.locator('#input').inputValue(),'한글 · first\nsecond');
    assert.equal((await call('GET',`/v1/sessions/${chatId}/events?cursor=0&wait=0`)).data.items.filter(item=>item.kind==='user').length,0);
    await page.locator('#input').press('Enter');
    await page.locator('.markdown h2').waitFor();
    assert.equal(await page.locator('.markdown h2').innerText(),'Result');
    assert.equal(await page.locator('.markdown table td').first().innerText(),'Task');
    const sent = (await call('GET',`/v1/sessions/${chatId}/events?cursor=0&wait=0`)).data.items.filter(item=>item.kind==='user');
    assert.equal(sent.length,1); assert.equal(sent[0].text,'한글 · first\nsecond');
    assert.equal(await page.locator('.markdown script').count(),0);
    assert.equal(await page.evaluate(()=>window.untrusted),undefined);
    await page.locator('.markdown .code-heading .copy-button').click();
    assert.ok((await page.evaluate(()=>window.testClipboard)).includes("print('hello')"));
    await page.screenshot({path:path.join(root,'dist/screenshots/chat-en.png')});
    await page.locator('#input').fill('approval'); await page.locator('#send').click();
    await page.locator('.request-card').waitFor();
    assert.equal(fs.existsSync(path.join(temporary,'project/approved')),false);
    const pendingBefore = (await call('GET',`/v1/sessions/${chatId}/events?cursor=0&wait=0`)).data.requests[0].id;
    await page.locator('#project-switch').selectOption(projectB);
    await page.waitForFunction(()=>document.querySelector('#project-path').textContent.endsWith('/second-project'));
    assert.equal((await call('GET',`/v1/sessions/${chatId}/events?cursor=0&wait=0`)).data.requests[0].id,pendingBefore);
    await page.locator('#project-switch').selectOption(projectA);
    await page.locator('.request-card').waitFor();
    await page.reload();
    await page.locator('.request-card').waitFor();
    assert.equal((await call('GET',`/v1/sessions/${chatId}/events?cursor=0&wait=0`)).data.requests[0].id,pendingBefore);
    await page.screenshot({path:path.join(root,'dist/screenshots/chat-approval.png')});
    await page.locator('[data-request-action="chat_decline"]').click();
    await page.locator('.request-card').waitFor({state:'hidden'});
    assert.equal(fs.existsSync(path.join(temporary,'project/approved')),false);
    await page.waitForFunction(()=>!document.querySelector('#send').disabled);
    await page.locator('#input').fill('question'); await page.locator('#send').click();
    await page.locator('.request-card input').fill('한국어 · draft');
    await page.locator('#project-switch').selectOption(projectB);
    await page.waitForFunction(()=>document.querySelector('#project-path').textContent.endsWith('/second-project'));
    await page.locator('#project-switch').selectOption(projectA);
    await page.waitForFunction(()=>document.querySelector('.request-card input')?.value==='한국어 · draft');
    await page.locator('#tab-setup').click(); await page.locator('#language').selectOption('ko'); await page.locator('#tab-work').click();
    assert.equal(await page.locator('.request-card input').inputValue(),'한국어 · draft');
    await page.setViewportSize({width:360,height:460});
    await page.locator('[data-request-action="chat_answer"]').scrollIntoViewIfNeeded();
    const answerBox = await page.locator('[data-request-action="chat_answer"]').boundingBox();
    assert.ok(answerBox.y>=0 && answerBox.y+answerBox.height<=460);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(root,'dist/screenshots/chat-question-ko.png')});
    await page.locator('[data-request-action="chat_answer"]').click();
    await page.locator('.request-card').waitFor({state:'hidden'});
    await page.waitForFunction(()=>!document.querySelector('#send').disabled);
    await page.locator('#input').fill('wait'); await page.locator('#send').click();
    await page.locator('#interrupt-turn').waitFor({state:'visible'});
    await page.locator('#input').fill('Unsent follow-up · 다음 작업');
    await page.locator('#input').press('Enter');
    assert.equal(await page.locator('#input').inputValue(),'Unsent follow-up · 다음 작업');
    await page.locator('#interrupt-turn').click();
    await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='메시지 입력 대기');
    assert.equal(await page.locator('#input').inputValue(),'Unsent follow-up · 다음 작업');
    assert.equal((await call('GET','/v1/health')).data.session.id,chatId);
    assert.equal((await call('GET','/v1/health')).data.session.state,'running');
    await page.setViewportSize({width:393,height:780});
    await page.screenshot({path:path.join(root,'dist/screenshots/chat-ko.png')});
    await page.locator('#stop').click(); await page.locator('#confirm-stop').click();
    await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited',{},{timeout:15000});
    await verifyRestartAfterExit();
    await page.locator('#launch').click();
    await page.waitForFunction(()=>!document.querySelector('#input').disabled);
    assert.equal((await call('GET','/v1/health')).data.session.mode,'chat');
    await page.locator('#stop').click(); await page.locator('#confirm-stop').click();
    await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited',{},{timeout:15000});
    console.log('PASS: Enter sends, Shift/Ctrl/Meta+Enter newline, selection replacement, IME/repeat/busy guards; project switches preserve approval and question drafts; structured chat, formatting and interrupt; no model task sent');
  }
  if (process.argv.includes('--probe-codex')) {
    await page.locator('#agent').selectOption('codex');
    await page.locator('#mode').selectOption('terminal');
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
    await page.locator('#mode').selectOption('chat');
    await page.locator('#launch').click();
    await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message',{},{timeout:25000});
    const actualChat = (await call('GET','/v1/health')).data.session;
    assert.equal(actualChat.mode,'chat');
    await page.evaluate(()=>window.BibimerPause());
    await page.evaluate(()=>window.BibimerResume());
    await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
    assert.equal((await call('GET','/v1/health')).data.session.id,actualChat.id);
    await page.locator('#stop').click();
    await page.locator('#confirm-stop').click();
    await page.waitForFunction(()=>document.querySelector('#process').dataset.state==='exited',{},{timeout:15000});
    console.log('PASS: installed Codex App Server initializes a chat through the UI, reconnects and stops; no model task sent');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: English default with Korean device locale, Korean selection, localized errors including legacy bridge, language changes preserve session and draft, setup guidance, pairing, PTY input/output, reconnect, mobile layout, explicit stop');
}

main().catch(error=>{
  console.error(error.message);
  const location = String(error.stack).split('\n').find(line=>line.includes('smoke_ui.cjs:'));
  if(location)console.error(location.trim());
  process.exitCode=1;
}).finally(async()=>{
  if(browser)await browser.close();
  if(bridge && bridge.exitCode === null && bridge.signalCode === null){
    const stopped = new Promise(resolve=>bridge.once('exit',resolve));
    bridge.kill('SIGTERM');await stopped;
  }
  if(assets)await new Promise(resolve=>assets.close(resolve));
  fs.rmSync(temporary,{recursive:true,force:true});
});
