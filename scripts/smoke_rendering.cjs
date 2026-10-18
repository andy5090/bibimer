/* Renderer and mobile layout checks with controlled agent events; no model calls. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
if (process.platform === 'android') Object.defineProperty(process, 'platform', {value:'linux'});
const {chromium} = require('../.tools/ui/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'android/app/src/main/assets');
let server, browser;
const errors = [], external = [];
const text = `## A workspace that stays with you

Project switching now keeps **each agent running**, with a separate draft for every project.

### What changed
- **Session isolation**
  - Commands stay in their project.
  - Approvals remain explicit.
- [x] Preserve drafts on project switch
- [ ] Check the Android keyboard

> A disconnected screen does not mean a stopped agent.

| Check | Result | Duration |
| :--- | :---: | ---: |
| PTY \\| input | **Passed** | 42 ms |
| Reconnect | Passed | 18 ms |

\`\`\`python
from pathlib import Path

def open_project(name: str) -> Path:
    """Keep development on this phone."""
    return Path.home() / "projects" / name
\`\`\`

Review [the setup guide](https://example.com/docs) and [app.py](src/app.py:12).
*Ready to review.* ~~Temporary workaround~~ removed.

---

<img src="https://invalid.example/leak" onerror="window.untrusted=true">
<script>window.untrusted=true</script>

![Reference](https://invalid.example/image.png)
[Unsafe](javascript:alert(1))
`;
const diff = '@@ -10,2 +10,3 @@\n-def load():\n+def load(project_id):\n+    restore_draft(project_id)\n     return session\n';
const items = [
  {id:'user', kind:'user', text:'Keep my agents running when I switch projects.', status:'completed'},
  {id:'plan', kind:'plan', steps:[{step:'Trace project and session state',status:'completed'},{step:'Preserve each project’s draft',status:'completed'},{step:'Verify reconnect on Android',status:'in_progress'}]},
  {id:'command',kind:'command',title:'python -m unittest discover -s bridge/tests',text:'Ran 37 tests in 44.372s\n\nOK',exit_code:0,status:'completed'},
  {id:'diff',kind:'diff',changes:[{path:'src/session.py',diff}],status:'completed'},
  {id:'reply',kind:'assistant',text,status:'completed'}
];
async function main() {
  server = http.createServer((req,res)=>{
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!/^[\w./-]+$/.test(file) || file.includes('..')) return res.writeHead(404).end();
    try {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html');
      res.end(fs.readFileSync(path.join(assets,file)));
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM || path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:'))external.push(request.url());});
  await page.addInitScript(()=>{
    window.Bibimer={environment:()=>JSON.stringify({paired:false,language:'en',version:'0.9.0'}),copyText:text=>{window.copiedText=text;},openLink:url=>{window.openedLink=url;}};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(items=>{
    const $=id=>document.getElementById(id);
    $('welcome').hidden=true; $('workspace').hidden=false;
    $('workspace').classList.add('chat-mode');
    for(const id of ['terminal-area','terminal-keys','launch-controls','mode-controls','mode-hint','project-form','project-name'])$(id).hidden=true;
    $('chat-panel').hidden=false; $('chat-state').hidden=false; $('chat-empty').hidden=true;
    $('project-switch').hidden=false; $('project-switch').disabled=false;
    $('project-switch').append(new Option('bibimer · Running','project'));
    $('project-path').textContent='~/projects/bibimer';
    $('edit-project').textContent='Project Add'; $('edit-project').disabled=false;
    $('connection').textContent='Connected'; $('connection').classList.add('connected');
    $('process').textContent='Running'; $('process').classList.add('running');
    $('turn-status').textContent='Ready for your message'; $('stop').hidden=false;
    $('input').disabled=false; $('input').placeholder='Describe a task or send a follow-up'; $('send').disabled=false;
    window.BibimerOpenFile=path=>{window.openedFile=path;};
    window.renderer=new BibimerConversation($('conversation'),$('chat-requests'),BibimerI18n.t,async()=>{});
    renderer.enable(true);renderer.update({items,requests:[]});
  },items);
  await page.locator('.markdown .hljs-keyword').first().waitFor();
  assert.equal(await page.locator('.markdown ul ul li').count(),2);
  assert.equal(await page.locator('.task-item input').count(),2);
  assert.equal(await page.locator('.task-item input').first().isChecked(),true);
  assert.equal(await page.locator('.markdown table td').first().innerText(),'PTY | input');
  assert.equal(await page.locator('.markdown em').innerText(),'Ready to review.');
  assert.equal(await page.locator('.markdown del').innerText(),'Temporary workaround');
  assert.equal(await page.locator('.markdown hr').count(),1);
  assert.equal(await page.locator('.markdown img,.markdown script,.markdown iframe').count(),0);
  assert.equal(await page.evaluate(()=>window.untrusted),undefined);
  assert.deepEqual(external,[]);
  await page.getByRole('button',{name:'the setup guide · Open in browser',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.openedLink),'https://example.com/docs');
  await page.getByRole('button',{name:'app.py · Open in Android app',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.openedFile),'src/app.py:12');
  assert.equal(await page.getByRole('button',{name:'Unsafe',exact:true}).count(),0);
  await page.locator('.markdown .copy-button').click();
  assert.ok((await page.evaluate(()=>window.copiedText)).startsWith('from pathlib import Path'));
  await page.locator('.markdown [aria-pressed]').click();
  assert.equal(await page.locator('.markdown .code-block').evaluate(node=>node.classList.contains('wrapped')),true);
  await page.locator('.command summary').click();
  assert.ok(await page.locator('.command summary').evaluate(node=>node.scrollWidth<=node.clientWidth));
  await page.evaluate(item=>renderer.update({items:[{...item,status:'inProgress'}],requests:[]}),items[2]);
  assert.equal(await page.locator('.command details').evaluate(node=>node.open),true);
  await page.locator('.command summary').click();
  await page.evaluate(item=>renderer.update({items:[item],requests:[]}),items[2]);
  await page.evaluate(item=>renderer.update({items:[{...item,text:item.text+'\nFollow-up.'}],requests:[]}),items[4]);
  assert.equal(await page.locator('.markdown .code-block').evaluate(node=>node.classList.contains('wrapped')),true);
  assert.equal(await page.locator('.diff-line.added').count(),2);
  assert.equal(await page.locator('.diff-line.removed').count(),1);
  assert.ok((await page.locator('.diff-line.added .diff-numbers').first().innerText()).includes('10'));
  assert.equal(await page.locator('.plan-steps .completed').count(),2);
  assert.equal(await page.locator('.plan-count').innerText(),'2/3');
  // The transcript should occupy most of the phone rather than app chrome.
  const panel=await page.locator('#chat-panel').boundingBox();
  assert.ok(panel.height>400);
  await page.locator('#conversation').evaluate(node=>{node.scrollTop=0;});
  await page.screenshot({path:path.join(root,'dist/screenshots/agent-work-en.png')});
  await page.locator('.assistant').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,'dist/screenshots/agent-response-en.png')});
  // Respect the reading position while a different item streams at the bottom.
  await page.locator('#conversation').evaluate(node=>{node.scrollTop=100;});
  const before=await page.locator('#conversation').evaluate(node=>node.scrollTop);
  await page.evaluate(()=>renderer.update({items:[{id:'stream',kind:'assistant',text:'## Streaming\n```js\nconst ready = ',status:'inProgress'}],requests:[]}));
  const after=await page.locator('#conversation').evaluate(node=>node.scrollTop);
  assert.ok(Math.abs(before-after)<3);
  await page.locator('#chat-latest').waitFor({state:'visible'});
  await page.locator('#chat-latest').click();
  await page.evaluate(()=>renderer.update({items:[{id:'stream',kind:'assistant',text:'## Streaming\n```js\nconst ready = true;\n```',status:'completed'}],requests:[]}));
  assert.ok(await page.locator('#conversation').evaluate(node=>node.scrollHeight-node.scrollTop-node.clientHeight<5));
  assert.ok(await page.locator('.assistant').last().locator('.hljs-keyword').count()>0);
  // Language changes preserve expansion and code wrapping.
  await page.evaluate(()=>{BibimerI18n.setLanguage('ko');renderer.localize();});
  assert.equal(await page.locator('.markdown .code-block').first().evaluate(node=>node.classList.contains('wrapped')),true);
  await page.setViewportSize({width:360,height:460});
  await page.locator('#conversation').evaluate(node=>{node.scrollTop=0;});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const send=await page.locator('#send').boundingBox();
  assert.ok(send.y+send.height<=460);
  await page.screenshot({path:path.join(root,'dist/screenshots/agent-work-small-ko.png')});
  // Long fences and unknown languages remain inert and copyable.
  await page.evaluate(()=>renderer.update({items:[{id:'edge',kind:'assistant',text:'```unknown\n<img src=x onerror=alert(1)>\n```\n'+'> quote\n'.repeat(30),status:'completed'}],requests:[]}));
  assert.equal(await page.locator('.assistant').last().locator('img').count(),0);
  // Empty public summaries from restored history must not become blank cards.
  // A later nonempty update must still appear at its original transcript position.
  await page.evaluate(()=>{
    BibimerI18n.setLanguage('en'); renderer.clear();
    const empty=Array.from({length:64},(_,n)=>({id:'summary-'+n,kind:'plan',summary:true,
      text:n%2?' \n\t':'',status:n%2?'inProgress':'completed'}));
    window.summaryFixture=[{id:'request',kind:'user',text:'Check the workspace'},...empty,
      {id:'answer',kind:'assistant',text:'Workspace checked',status:'completed'}];
    renderer.update({items:summaryFixture,requests:[]});
  });
  assert.equal(await page.locator('.message:visible').count(),2);
  assert.equal(await page.locator('.plan:visible').count(),0);
  assert.doesNotMatch(await page.locator('#conversation').innerText(),/Activity summary|Agent summary/);
  await page.evaluate(()=>renderer.update({items:[{id:'summary-0',kind:'plan',summary:true,text:'**Checking** the workspace',status:'inProgress'}],requests:[]}));
  assert.deepEqual(await page.locator('.message:visible').evaluateAll(nodes=>nodes.map(node=>node.className)),['message user','message plan','message assistant']);
  assert.equal(await page.locator('.plan:visible .activity-title').innerText(),'Agent summary');
  await page.locator('.plan:visible summary').click();
  assert.equal(await page.locator('.plan:visible .markdown strong').innerText(),'Checking');
  await page.evaluate(()=>renderer.update({items:[{id:'summary-0',kind:'plan',summary:true,text:'**Checked** the workspace',status:'completed'}],requests:[]}));
  assert.equal(await page.locator('.plan:visible details').evaluate(node=>node.open),true);
  await page.evaluate(()=>{BibimerI18n.setLanguage('ko');renderer.localize();});
  assert.equal(await page.locator('.plan:visible .activity-title').innerText(),'에이전트 요약');
  await page.evaluate(()=>renderer.update({items:[{id:'summary-0',kind:'plan',summary:true,text:'\n',status:'completed'},
    {id:'real-plan',kind:'plan',steps:[{step:'Run checks',status:'completed'}]}],requests:[]}));
  assert.equal(await page.locator('.plan:visible').count(),1);
  assert.equal(await page.locator('.plan:visible .plan-count').innerText(),'1/1');
  await page.evaluate(()=>{renderer.update({items:[],retained:['answer'],requests:[]});renderer.localize();});
  assert.equal(await page.locator('.message').count(),1);
  console.log('PASS: 64 empty historical/live summaries hidden; later content keeps order; Markdown, expansion and EN/KO labels; normal plans and pruning preserved');
  // Responsive work surfaces use the same document and draft across window sizes.
  await page.evaluate(items=>{renderer.clear();renderer.update({items,requests:[]});},items);
  await page.locator('#input').fill('Responsive draft · 태블릿에서도 유지');
  for (const [width,height] of [[768,1024],[820,1180],[1024,768],[1440,900],[2560,1440],[1100,460],[393,780],[320,460]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: no page overflow`);
    const composer=await page.locator('#input-form').boundingBox(), send=await page.locator('#send').boundingBox();
    const chat=await page.locator('#chat-panel').boundingBox();
    assert.ok(send.y>=0 && send.y+send.height<=height,`${width}: send stays visible`);
    assert.ok(chat.height>100,`${width}: conversation retains useful height`);
    assert.ok(chat.width<=920 && Math.abs(chat.x-composer.x)<1,`${width}: aligned readable conversation/composer`);
    assert.equal(await page.locator('#input').inputValue(),'Responsive draft · 태블릿에서도 유지');
    if(width>=1000) {
      const sidebar=await page.locator('#sidebar').boundingBox();
      assert.ok(sidebar.width>=280 && sidebar.width<=320 && sidebar.x+sidebar.width<=chat.x);
      assert.equal(await page.locator('#sidebar').evaluate(node=>node.matches(':modal')),false);
      await page.locator('#input').click();
      assert.equal(await page.locator('#input').evaluate(node=>node===document.activeElement),true);
    }
    await page.locator('#conversation').evaluate(node=>{node.scrollTop=0;});
    if([768,1440,1100].includes(width)) await page.screenshot({path:path.join(root,`dist/screenshots/responsive-chat-${width}.png`)});
  }
  // A phone drawer becomes a non-modal pane without trapping the composer.
  await page.locator('#sidebar-open').click();
  assert.equal(await page.locator('#sidebar').evaluate(node=>node.matches(':modal')),true);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#sidebar').evaluate(node=>node.open && !node.matches(':modal')),true);
  await page.locator('#input').click();
  await page.locator('#sidebar-close').click();
  assert.equal(await page.locator('#sidebar').isVisible(),false);
  await page.locator('#sidebar-open').click();
  assert.equal(await page.locator('#sidebar').isVisible(),true);
  await page.setViewportSize({width:393,height:780});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#sidebar').isVisible(),false);
  await page.locator('#sidebar-open').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#sidebar').isVisible(),false);
  await page.setViewportSize({width:1440,height:900});
  const longDraft='Keep this multiline draft\n'.repeat(16);
  await page.locator('#input').fill(longDraft);
  await page.waitForTimeout(200);
  assert.equal(Math.round((await page.locator('#input').boundingBox()).height),160);
  await page.setViewportSize({width:1440,height:460});
  await page.waitForTimeout(200);
  assert.equal(Math.round((await page.locator('#input').boundingBox()).height),100);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(200);
  assert.equal(Math.round((await page.locator('#input').boundingBox()).height),160);
  assert.equal(await page.locator('#input').inputValue(),longDraft);
  console.log('PASS: tablet/desktop/short-window/phone layouts; aligned chat/composer, draft and focus preservation; modal-to-docked transitions, collapse and Escape');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  // Command outcomes are distinct from session/process lifecycle. Failed events
  // take precedence over a zero code; missing codes must never imply success.
  const processBefore=await page.locator('#process').innerText();
  const commandCases=[
    {id:'success',kind:'command',status:'completed',exit_code:0,label:'command_succeeded',badge:null,success:true},
    {id:'nonzero',kind:'command',status:'completed',exit_code:1,label:'chat_status_failed',badge:'command_failure_code',failed:true},
    {id:'failed',kind:'command',status:'failed',exit_code:127,label:'chat_status_failed',badge:'command_failure_code',failed:true},
    {id:'no-code',kind:'command',status:'failed',exit_code:null,label:'chat_status_failed',badge:'command_failure_code_unavailable',failed:true},
    {id:'failed-zero',kind:'command',status:'failed',exit_code:0,label:'chat_status_failed',badge:'command_failure_code',failed:true},
    {id:'running',kind:'command',status:'inProgress',exit_code:0,label:'chat_status_inProgress',badge:'exit_code'},
    {id:'interrupted',kind:'command',status:'interrupted',exit_code:130,label:'chat_status_interrupted',badge:'exit_code'},
    {id:'unknown',kind:'command',status:'completed',label:'chat_status_completed',badge:null},
    {id:'tool',kind:'tool',status:'completed',exit_code:0,label:'chat_status_completed',badge:'exit_code'}
  ];
  await page.setViewportSize({width:320,height:640});
  for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']) {
    await page.evaluate(({locale,cases})=>{
      renderer.clear(); BibimerI18n.setLanguage(locale);
      renderer.update({items:cases.map(({label,badge,failed,success,...item})=>({...item,title:'command --long-option /path/with/spaces',text:'controlled output'})),requests:[]});
    },{locale,cases:commandCases});
    for(const item of commandCases) {
      const card=page.locator('.message').nth(commandCases.indexOf(item));
      const result=card.locator('summary .item-status');
      assert.equal(await result.textContent(),await page.evaluate(key=>BibimerI18n.t(key),item.label));
      assert.equal(await result.evaluate(node=>node.classList.contains('succeeded')),Boolean(item.success));
      assert.equal(await result.evaluate(node=>node.classList.contains('failed')),Boolean(item.failed));
      assert.equal(await card.getAttribute('data-status'),item.status);
      const code=card.locator('summary .exit-code');
      assert.equal(await code.count(),item.badge?1:0);
      if(item.badge)assert.equal(await code.textContent(),await page.evaluate(({key,code})=>BibimerI18n.t(key,{code}),{key:item.badge,code:item.exit_code}));
      assert.ok(await card.locator('summary').evaluate(node=>node.scrollWidth<=node.clientWidth),locale+' '+item.id);
    }
    if(['en','ko'].includes(locale)) {
      await page.locator('#conversation').evaluate(node=>{node.scrollTop=0;});
      await page.screenshot({path:path.join(root,`dist/screenshots/command-results-320-${locale}.png`)});
    }
    await page.locator('.message details').first().evaluate(node=>{node.open=true;});
    await page.evaluate(()=>renderer.localize());
    assert.equal(await page.locator('.message details').first().evaluate(node=>node.open),true);
  }
  assert.equal(await page.locator('#process').innerText(),processBefore);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: command success/failure with explicit failure codes, absent/conflicting codes, unchanged lifecycle and tool states, ten locales at 320px');
  // Controlled icon preview, separate from actual launcher verification.
  await page.setViewportSize({width:560,height:240});
  await page.evaluate(()=>{
    document.body.replaceChildren();
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:center;gap:32px;height:240px;background:#111417';
    for(const size of [108,72,48,32]){const img=document.createElement('img');img.src='brand.svg';img.width=size;img.height=size;row.append(img);}
    document.body.append(row);
  });
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth));
  await page.screenshot({path:path.join(root,'dist/screenshots/brand-preview.png')});
  console.log('PASS: GFM nesting/tasks/tables/links, syntax highlighting, code copy/wrap, diff lines, plans, streaming/scroll anchoring, preserved expansion, inert HTML/images, compact mobile layout and brand SVG');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
