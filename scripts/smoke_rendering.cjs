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
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
      res.end(fs.readFileSync(path.join(assets,file)));
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM || path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:'))external.push(request.url());});
  await page.addInitScript(()=>{
    window.Bibimer={environment:()=>JSON.stringify({paired:false,language:'en',version:'0.8.1'}),copyText:text=>{window.copiedText=text;},openLink:url=>{window.openedLink=url;}};
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
    $('edit-project').textContent='Add'; $('edit-project').disabled=false;
    $('connection').textContent='Connected'; $('connection').classList.add('connected');
    $('process').textContent='Running'; $('process').classList.add('running');
    $('turn-status').textContent='Ready for your message'; $('stop').hidden=false;
    $('input').disabled=false; $('input').placeholder='Describe a task or send a follow-up'; $('send').disabled=false;
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
  await page.getByRole('button',{name:'app.py · Copy file path',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.copiedText),'src/app.py:12');
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
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
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
