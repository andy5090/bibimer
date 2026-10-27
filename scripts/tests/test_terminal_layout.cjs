"use strict";
// Real shared layout and application state; native bridge/provider responses are fixtures.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
if(process.platform==="android")Object.defineProperty(process,"platform",{value:"linux"});
const {chromium}=require("../../.tools/ui/node_modules/playwright-core");
const root=path.resolve(__dirname,"../.."),assets=path.join(root,"android/app/src/main/assets"),ios=path.join(root,"ios/app/Resources"),out=path.join(root,"dist/ios-terminal-ui");
fs.mkdirSync(out,{recursive:true});
let browser,server;
(async()=>{
 const baselineCss=fs.readFileSync(path.join(assets,"app.css"),"utf8");
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost"),isIOS=url.pathname.startsWith("/ios/"),file=url.pathname.replace(/^\/(?:ios\/)?/,"")||"index.html";
  if(!/^[\w./-]+$/.test(file)||file.includes(".."))return res.writeHead(404).end();
  try{
   let body=fs.readFileSync(path.join(["terminal-tools.js","terminal-tools.css"].includes(file)?ios:assets,file));
   if(file==="index.html"&&isIOS)body=body.toString().replace('<script src="app.js" defer>', '<script src="terminal-tools.js" defer></script><link rel="stylesheet" href="terminal-tools.css"><script src="app.js" defer>');
   if(file==="app.js"){
    body=body.toString();const end=body.lastIndexOf("})();");
    body=body.slice(0,end)+(isIOS?fs.readFileSync(path.join(ios,"ui-hooks.js"),"utf8"):"")+"\nwindow.layoutTest={setSession,tab,snapshot:()=>({session})};\n"+body.slice(end);
   }
   res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":file.endsWith(".svg")?"image/svg+xml":file.endsWith(".woff2")?"font/woff2":"text/html");res.end(body);
  }catch(_){res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||(process.platform==="darwin"?"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome":path.join(process.env.PREFIX||"/usr","bin/headless_shell")),headless:true});
 const results=[],keyboardResults=[],errors=[];
 const keyboardOut=path.join(root,"dist/terminal-keyboard");fs.mkdirSync(keyboardOut,{recursive:true});
 for(const platform of ["android","ios"]){
  const page=await browser.newPage({viewport:{width:1100,height:800},reducedMotion:"reduce"});page.on("pageerror",e=>errors.push(platform+": "+e.message));
  await page.addInitScript(()=>{
   const project={id:"p1",name:"UI verification",path:"/projects/example",agent:"shell",sessions:[]};
   const initial={id:"terminal1",agent:"shell",kind:"terminal",mode:"terminal",state:"running",project,output_end:0};
   window.sent=[];window.clipboard="echo reviewed\nsecond command";
   const health={protocol:1,version:"test",instance:"fixture",features:["multiple_projects","session_library","agent_options","persistent_codex_sessions"],agents:[{id:"shell",installed:true,modes:["terminal"]},{id:"codex",installed:true,modes:["terminal","chat"]}],projects:[{...project,session:initial,sessions:[initial]}],project,session:initial};
   window.Bibimer={environment:()=>JSON.stringify({paired:true,language:"en"}),cancelPoll(){},setLanguage(){return true;},copyText(){},readClipboard:async()=>window.clipboard,openLink(){},request(id,method,endpoint,body){
    if(endpoint.includes("/events?"))return;
    let data=endpoint==="/v1/health"?health:{};
    if(endpoint.endsWith("/input")){window.sent.push(JSON.parse(body));data={};}
    queueMicrotask(()=>window.BibimerNativeReply(id,{ok:true,status:200,data}));
   }};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/${platform==="ios"?"ios/":""}`);
  await page.waitForFunction(()=>window.layoutTest?.snapshot().session?.id==="terminal1");
  assert.equal(await page.locator("#input-form").isVisible(),false,platform+" terminal hides common composer");
  assert.equal(await page.locator("#quick-agent-trigger").isVisible(),false,platform+" terminal hides agent switching");
  assert.equal(await page.locator("#model-controls").isVisible(),false,platform+" shell has no empty model-controls row");
  assert.equal(await page.locator("#terminal-keys").isVisible(),true);assert.equal(await page.locator(".xterm-helper-textarea").count(),1);
  await page.evaluate(()=>{document.querySelector("#path").value="/projects/a-long-project-folder";document.querySelector("#edit-project").click();});
  const old=await page.addStyleTag({content:baselineCss+"\n#project-form{grid-template-columns:none}#project-form > *{min-width:auto}#project-form .button-row{flex-wrap:nowrap}"});
  const before=await page.locator("#project-form").evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));
  if(platform==="android")await page.screenshot({path:path.join(out,"sidebar-before-280.png")});
  await old.evaluate(n=>n.remove());
  assert.ok(before.scroll>before.client,"Baseline reproduces project form horizontal overflow");
  for(const language of ["en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"]){
   for(const width of [1100,1400,320,393]){
    await page.setViewportSize({width,height:800});
    await page.waitForFunction(w=>document.querySelector("#sidebar").classList.contains("docked")===(w>=1000),width);
    await page.evaluate(language=>{BibimerI18n.setLanguage(language);BibimerI18n.apply();},language);
    if(!await page.locator("#sidebar").evaluate(n=>n.open))await page.locator("#sidebar-open").click();
    const layout=await page.locator("#project-form").evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth,bounds:[...n.querySelectorAll("input,button,.check span")].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,width:x.getBoundingClientRect().width}))}));
    assert.ok(layout.scroll<=layout.client+1,`${platform} ${language} ${width}: form fits`);
    const form=await page.locator("#project-form").boundingBox();assert.ok(form,`${platform} ${language} ${width}: form visible ${JSON.stringify(await page.locator("#project-form").evaluate(n=>({hidden:n.hidden,sidebar:n.closest("dialog").open})) )}`);
    for(const b of layout.bounds)assert.ok(b.left>=form.x&&b.right<=form.x+form.width+1,`${platform} ${language} ${width}: fields/buttons within card`);
    results.push({platform,language,width,formWidth:layout.client,scrollWidth:layout.scroll});
    if(platform==="ios"&&language==="ko"&&[1100,320].includes(width))await page.screenshot({path:path.join(out,`sidebar-after-${width}-ko.png`)});
   }
  }
  await page.evaluate(()=>{document.querySelector("#cancel-project").click();layoutTest.tab("work");layoutTest.setSession({id:"chat1",agent:"codex",mode:"chat",state:"running",ready:true,turn_state:"ready",project:{id:"p1",path:"/projects/example"},output_end:0});});
  assert.equal(await page.locator("#input-form").isVisible(),true,platform+" Chat keeps composer");
  assert.equal(await page.locator("#quick-agent-trigger").isVisible(),true,platform+" Chat keeps agent switching");
  await page.locator("#input").fill("preserved Chat draft");
  await page.locator("#input").evaluate(n=>n.setSelectionRange(3,7));
  for(const state of ["running","stopping","exited","lost"]){
   await page.evaluate(state=>layoutTest.setSession({id:"codex-terminal",agent:"codex",mode:"terminal",state,project:{id:"p1",path:"/projects/example"},output_end:0}),state);
   assert.equal(await page.locator("#quick-agent-trigger").isVisible(),false,platform+" Codex terminal "+state+" has no agent switching");
  }
  await page.evaluate(()=>layoutTest.setSession({id:"terminal1",agent:"shell",mode:"terminal",state:"running",project:{id:"p1",path:"/projects/example"},output_end:0}));
  assert.equal(await page.locator("#input-form").isVisible(),false);
  assert.equal(await page.locator("#quick-agent-trigger").isVisible(),false);
  await page.screenshot({path:path.join(out,`terminal-no-agent-${platform}.png`)});
  await page.locator(".xterm-helper-textarea").focus();await page.keyboard.type("pwd");
  await page.waitForFunction(()=>sent.length>=3);assert.equal(await page.evaluate(()=>sent.map(row=>atob(row.data)).join("")),"pwd",platform+" direct terminal keyboard remains wired");
  await page.locator('#terminal-keys [data-key="enter"]').click();
  await page.waitForFunction(()=>sent.length>=4);assert.equal(await page.evaluate(()=>atob(sent.at(-1).data)),"\r",platform+" terminal special Enter remains wired");
  await page.evaluate(()=>{sent=[];});
  const keyboard=page.locator("#terminal-keys"), functions=page.locator("#terminal-function-keys"), toggle=page.locator("#terminal-functions-toggle");
  assert.equal(await functions.isVisible(),false,"Function keys start collapsed");
  const keyboardSamples=[{width:320,height:800},{width:393,height:800},{width:700,height:800},{width:1000,height:800},{width:320,height:460}];
  for(const language of ["en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"]){
   for(const viewport of keyboardSamples){
    await page.setViewportSize(viewport);
    await page.waitForFunction(w=>document.querySelector("#sidebar").classList.contains("docked")===(w>=1000),viewport.width);
    await page.evaluate(language=>{BibimerI18n.setLanguage(language);BibimerI18n.apply();layoutTest.setSession(layoutTest.snapshot().session);},language);
    if(await page.locator("#sidebar").evaluate(n=>n.open&&!n.classList.contains("docked")))await page.locator("#sidebar-close").click();
    if(await toggle.getAttribute("aria-expanded")==="true")await toggle.click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    if(platform==="android"&&language==="ko"&&viewport.width===320&&viewport.height===800)await page.screenshot({path:path.join(keyboardOut,"android-ko-320x800-collapsed.png")});
    await toggle.click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await functions.isVisible(),true);
    assert.equal(await toggle.getAttribute("aria-expanded"),"true");
    const geometry=await keyboard.evaluate(n=>{
     const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
     const container=document.querySelector("#work");
     return {nav:rect(document.querySelector(".bottom-nav")),bodyHeight:document.body.scrollHeight,appCount:document.querySelectorAll("#app").length,toolbar:rect(n),panel:rect(n.querySelector("#terminal-function-keys")),base:rect(n.querySelector(".terminal-keyboard")),
      workWidth:container.clientWidth-parseFloat(getComputedStyle(container).paddingLeft)-parseFloat(getComputedStyle(container).paddingRight),
      keys:[...n.querySelectorAll("button")].map(node=>({key:node.dataset.key||node.dataset.modifier||node.id,...rect(node),label:node.getAttribute("aria-label")})),
      arrows:Object.fromEntries(["up","down","left","right"].map(key=>[key,rect(n.querySelector('[data-key="'+key+'"]'))])),
      f:[...n.querySelectorAll("#terminal-function-keys button")].map(rect),scroll:document.documentElement.scrollWidth};
    });
    const where=`${platform} ${language} ${viewport.width}x${viewport.height}`;
    assert.ok(geometry.panel.bottom<=geometry.base.y,"F-key collection must be above the base keyboard: "+where);
    assert.equal(geometry.f.length,12);
    for(const key of geometry.keys){
     assert.ok(key.width>=43.9&&key.height>=43.9,"Every key has a 44px touch target: "+where+" "+key.key);
     assert.ok(key.x>=-0.1&&key.right<=viewport.width+0.1,"Key remains within viewport: "+where+" "+key.key);
     assert.ok(key.bottom<=geometry.nav.y+0.1,"Key remains above navigation: "+where+" "+key.key+" "+JSON.stringify(geometry));
    }
    assert.ok(geometry.scroll<=viewport.width,"No horizontal page overflow: "+where);
    const {up,down,left,right}=geometry.arrows;
    assert.ok(Math.abs(up.x-down.x)<1&&up.y<down.y,"Up sits above Down: "+where);
    assert.ok(left.x<down.x&&down.x<right.x&&Math.abs(left.y-down.y)<1&&Math.abs(right.y-down.y)<1,"Left/Down/Right form the bottom inverted-T row: "+where);
    const columns=geometry.f.filter(key=>Math.abs(key.y-geometry.f[0].y)<1).length;
    assert.equal(columns,geometry.workWidth>=600?12:6,"Function columns follow the workspace width: "+where);
    for(const key of ["left","right"])assert.ok(geometry.keys.find(row=>row.key===key).label?.length,"Localized arrow label: "+where);
    assert.equal(await toggle.getAttribute("aria-label"),await page.evaluate(()=>BibimerI18n.t("expand_function_keys")));assert.equal(await functions.getAttribute("aria-label"),await page.evaluate(()=>BibimerI18n.t("function_keys")));
    keyboardResults.push({platform,language,...viewport,workWidth:geometry.workWidth,columns,toolbar:geometry.toolbar});
    if(["en","ko"].includes(language)&&[320,1000].includes(viewport.width))await page.screenshot({path:path.join(keyboardOut,`${platform}-${language}-${viewport.width}x${viewport.height}-expanded.png`)});
   }
  }
  // A narrow workspace in a large window must retain six F-key columns.
  await page.setViewportSize({width:1000,height:800});
  await page.locator("#work").evaluate(n=>{n.style.maxWidth="560px";});
  assert.equal(await functions.locator("button").evaluateAll(nodes=>nodes.filter(n=>Math.abs(n.getBoundingClientRect().y-nodes[0].getBoundingClientRect().y)<1).length),6);
  await page.locator("#work").evaluate(n=>{n.style.maxWidth="";});
  await toggle.click();assert.equal(await functions.isVisible(),false);assert.equal(await toggle.getAttribute("aria-expanded"),"false");
  await page.setViewportSize({width:393,height:800});
  await page.evaluate(()=>{BibimerI18n.setLanguage("ko");BibimerI18n.apply();layoutTest.setSession(layoutTest.snapshot().session);sent=[];});
  await page.locator('[data-modifier="ctrl"]').click();assert.equal(await page.locator('[data-modifier="ctrl"]').getAttribute("aria-pressed"),"true");
  await page.locator('[data-modifier="alt"]').click();assert.equal(await page.locator('[data-modifier="alt"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.evaluate(()=>sent.length),0,"Modifier toggles never emit terminal data by themselves");
  await toggle.click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator(".xterm-helper-textarea").evaluate(n=>n===document.activeElement),true,"Modifier controls preserve terminal focus");
  await page.screenshot({path:path.join(keyboardOut,`${platform}-ko-modifiers-expanded.png`)});
  await page.locator('[data-key="f12"]').click();await page.waitForFunction(()=>sent.length===1);
  assert.equal(await page.evaluate(()=>atob(sent[0].data)),"\x1b[24;7~","Ctrl+Alt+F12 uses the actual native terminal input path");
  for(const modifier of ["ctrl","alt"])assert.equal(await page.locator('[data-modifier="'+modifier+'"]').getAttribute("aria-pressed"),"false","The next key consumes the modifiers");
  await page.evaluate(()=>layoutTest.setSession({id:"different-terminal",agent:"shell",mode:"terminal",state:"running",project:{id:"p1",path:"/projects/example"},output_end:0}));
  for(const modifier of ["ctrl","alt"])assert.equal(await page.locator('[data-modifier="'+modifier+'"]').getAttribute("aria-pressed"),"false","Changing terminal clears modifiers");
  assert.equal(await functions.isVisible(),false,"Changing terminal collapses the F-key panel");
  await page.evaluate(()=>{layoutTest.setSession({id:"terminal1",agent:"shell",mode:"terminal",state:"running",project:{id:"p1",path:"/projects/example"},output_end:0});sent=[];});
  if(platform==="ios"){
   await page.evaluate(()=>{BibimerI18n.setLanguage("ko");BibimerI18n.apply();layoutTest.setSession(layoutTest.snapshot().session);});
   await page.locator("#ios-terminal-paste").click();await page.locator("#ios-terminal-dialog").waitFor({state:"visible"});
   assert.equal(await page.locator("#ios-terminal-text").inputValue(),"echo reviewed\nsecond command");
   assert.equal(await page.evaluate(()=>sent.length),0,"Clipboard read/preview never runs multiline commands");
   await page.screenshot({path:path.join(out,"paste-preview-393-ko.png")});
   await page.locator("#ios-terminal-text").fill("echo reviewed");await page.locator("#ios-terminal-send").click();
   await page.locator("#ios-terminal-dialog").waitFor({state:"hidden"});
   assert.equal(await page.evaluate(()=>atob(sent[0].data)),"echo reviewed\r","Explicit confirmation invokes actual raw terminal input path");
  }
  await page.evaluate(()=>layoutTest.setSession({id:"chat1",agent:"codex",mode:"chat",state:"running",ready:true,turn_state:"ready",project:{id:"p1",path:"/projects/example"},output_end:0}));
  assert.equal(await page.locator("#input").inputValue(),"preserved Chat draft");
  assert.equal(await page.locator("#quick-agent-trigger").isVisible(),true,platform+" returning to Chat restores agent switching");
  assert.deepEqual(await page.locator("#input").evaluate(n=>[n.selectionStart,n.selectionEnd]),[3,7]);
  await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify({passed:true,layoutCases:results.length,keyboardCases:keyboardResults.length,results,keyboardResults,errors},null,2));
 fs.writeFileSync(path.join(keyboardOut,"verification.json"),JSON.stringify({passed:true,cases:keyboardResults.length,results:keyboardResults,errors},null,2));
 console.log(`${results.length} actual form layouts fit (10 locales, 280/320px docked sidebars and 320/393px mobile); ${keyboardResults.length} keyboard layouts, Android/iOS Chat draft, terminal input and explicit iOS paste preview passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
