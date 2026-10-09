/* Real isolated bridge + actual app renderer; native ACTION_VIEW needs Android validation. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bibimer-file-links-'));
const state=path.join(tmp,'state'),repo=path.join(tmp,'Workspace'),tree=path.join(tmp,'Worktree');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,bridge,browser,held,hold=false,legacy=false,fail=false;
async function main(){
  fs.mkdirSync(repo);
  const git=(...args)=>execFileSync('git',['-C',repo,...args],{stdio:'pipe'});
  git('init','-b','main');fs.writeFileSync(path.join(repo,'한글 image.png'),Buffer.from('89504e470d0a1a0a','hex'));
  fs.writeFileSync(path.join(repo,'README.md'),'Primary file');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','fixture');
  git('worktree','add','-b','feature',tree);fs.writeFileSync(path.join(tree,'README.md'),'Worktree file');
  server=http.createServer((req,res)=>{try{
    const name=req.url==='/'?'index.html':req.url.slice(1);if(name.includes('..'))throw Error();
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.svg')?'image/svg+xml':'text/html');
    res.end(fs.readFileSync(path.join(root,'android/app/src/main/assets',name)));
  }catch{res.writeHead(404).end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  bridge=spawn('python',[path.join(root,'bridge/bibimer_bridge.py'),'serve','--state-dir',state,'--port',String(port)],{stdio:'ignore'});
  for(let i=0;i<100&&!fs.existsSync(path.join(state,'token.json'));i++)await delay(50);
  const token=JSON.parse(fs.readFileSync(path.join(state,'token.json')));
  const call=async(method,url,data)=>{const response=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(data)}:{})});return{ok:response.ok,status:response.status,data:await response.json()};};
  const project=(await call('POST','/v1/project',{path:repo,add:true})).data.project;
  const session=(await call('POST','/v1/sessions',{project_id:project.id,worktree_path:tree,agent:'shell',mode:'terminal',request_id:crypto.randomUUID()})).data.session;
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:851}});page.setDefaultTimeout(12000);
  const errors=[],requests=[],mutations=[],external=[];let received;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
  await page.exposeFunction('nativeRequest',async(id,method,url,body)=>{
    if(method==='POST'&&url.startsWith('/v1/sessions'))mutations.push(url);
    let result;
    if(url==='/native/open-file'){
      requests.push(JSON.parse(body));
      if(hold){hold=false;await new Promise(resolve=>held=resolve);held=null;}
      if(fail)result={ok:false,status:400,data:{code:'error_file_app'}};
      else{
        result=await call('POST','/v1/files',{...JSON.parse(body),action:'prepare'});
        if(result.ok){
          const info=result.data;received=Buffer.alloc(0);
          try{while(true){const block=await call('POST','/v1/files',{action:'read',id:info.id,offset:received.length});assert.ok(block.ok);received=Buffer.concat([received,Buffer.from(block.data.data,'base64')]);if(block.data.done)break;}}
          finally{await call('POST','/v1/files',{action:'release',id:info.id});}
          result={ok:true,status:200,data:{}}; // Bytes are never returned to the WebView.
        }
      }
    }else result=await call(method,url.replace('wait=20','wait=1'),JSON.parse(body));
    if(legacy&&url==='/v1/health')result.data.features=result.data.features.filter(value=>value!=='file_links');
    try{await page.evaluate(({id,result})=>window.BibimerNativeReply(id,result),{id,result});}catch{}
  });
  await page.addInitScript(()=>{window.Bibimer={environment:()=>JSON.stringify({paired:true,termuxInstalled:true,language:localStorage.language||'en',version:'test'}),request:(...args)=>window.nativeRequest(...args),cancelPoll:()=>{},openLink:url=>window.openedUrl=url,copyText:text=>window.copiedText=text,setLanguage:value=>{localStorage.language=value;return true;},setAgentOptions:()=>true,setEnterBehavior:()=>true,setBackHandling:()=>{}};});
  const connected=()=>page.waitForFunction(()=>['Connected','기기 연결됨'].includes(document.querySelector('#connection').textContent));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await connected();
  const render=()=>page.evaluate(repo=>{
    document.querySelector('#link-fixture')?.remove();
    const box=document.createElement('section');box.id='link-fixture';box.style='position:fixed;top:140px;left:10px;right:10px;z-index:1000;background:#182322';
    box.append(BibimerRichText.markdown(`[File](README.md:12) [Image](<${repo}/한글 image.png>) [URI](file://${repo}/README.md#L2) [Site](https://example.com/a) ![Remote](https://invalid.example/leak.png) [Unsafe](javascript:alert(1)) [Scheme](content://other/file) [Remote file](file://remote/etc/file) [Missing](missing.txt)`,BibimerI18n.t));document.body.append(box);
  },repo);
  await render();await page.locator('#input').fill('Keep my draft');
  const click=label=>page.locator('#link-fixture button').filter({hasText:new RegExp('^'+label+'$')}).click();
  hold=true;await click('File');await page.locator('#notice').getByText('Preparing file…',{exact:true}).waitFor();
  await click('Image');await page.locator('#notice').getByText('Another file is being prepared. Try again shortly.',{exact:true}).waitFor();assert.equal(requests.length,1);
  assert.equal(requests[0].project_id,project.id);assert.equal(requests[0].worktree_path,tree);assert.equal(requests[0].path,'README.md:12');
  held();await page.waitForFunction(()=>document.querySelector('#notice').hidden);assert.equal(received.toString(),'Worktree file');
  await click('Image');await page.waitForFunction(()=>document.querySelector('#notice').hidden);assert.equal(received.toString('hex'),'89504e470d0a1a0a');
  await click('URI');await page.waitForFunction(()=>document.querySelector('#notice').hidden);assert.equal(received.toString(),'Primary file');
  await click('Site');assert.equal(await page.evaluate(()=>window.openedUrl),'https://example.com/a');
  assert.equal(await page.locator('#link-fixture img').count(),0);assert.deepEqual(external,[]);
  assert.equal(await page.locator('#link-fixture button').count(),6);
  await click('Missing');await page.locator('#notice').getByText('Could not read this file. Check its path and Termux access.',{exact:true}).waitFor();
  assert.equal(await page.locator('#input').inputValue(),'Keep my draft');
  await page.evaluate(()=>{localStorage.language='ko';});await page.reload();await connected();await render();fail=true;
  await click('File');await page.locator('#notice').getByText('이 파일 형식을 열 수 있는 Android 앱이 없습니다. 뷰어 앱을 설치하세요.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'File · Android 앱으로 열기',exact:true}).count(),1);
  fail=false;legacy=true;await page.reload();await connected();await render();const before=requests.length;
  await click('File');await page.locator('#notice').getByText('파일 링크를 열려면 앱과 Termux 브리지를 업데이트하세요.',{exact:true}).waitFor();assert.equal(requests.length,before);
  const health=(await call('GET','/v1/health')).data;
  assert.ok(health.projects.some(p=>p.sessions.some(s=>s.id===session.id&&s.state==='running')));
  assert.ok(mutations.every(url=>url.endsWith('/resize')));assert.deepEqual(errors,[]);
  console.log('PASS: file/image/file URI/line references, worktree context, native-only bytes, duplicate clicks, browser URL, no auto-load or unsafe schemes, missing file/no viewer, draft/process preserved, EN/KO and old bridge');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{
  if(held)held();if(browser)await browser.close();if(bridge){bridge.kill('SIGTERM');await new Promise(resolve=>bridge.once('exit',resolve));}
  if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});
});
