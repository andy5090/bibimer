"use strict";
// Uses the existing local Playwright/browser tools, synthetic terminal output and a private fake clipboard.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const repo=path.resolve(__dirname,"../../.."), {chromium}=require(path.join(repo,".tools/ui/node_modules/playwright-core"));
const web=path.resolve(process.argv[2] || path.join(repo,".tools/ios-app/iphonesimulator/Bibimer.app/Web"));
const output=path.join(repo,"dist/ios-app/terminal-tools-browser");fs.mkdirSync(output,{recursive:true});
const fixture=()=>{
  window.__bibimerEnvironment={paired:true,selfTest:true,platform:"ios",language:"ko",systemLanguage:"ko",languagePreference:"ko",agentOptions:{},enterBehavior:"newline",quickSetup:{phase:"connected",id:"fixture"}};
  const project={id:"fixture-project",name:"Terminal selection fixture",path:"/fixture",agent:"shell"};
  const session={id:"00000000-0000-4000-8000-000000000001",agent:"shell",mode:"terminal",state:"running",name:"Local Bash",project,options:{permission:"inherit"},output_end:1};
  const content="\x1b[32mconst greeting = '한글 😀';\x1b[0m\r\nhttps://example.invalid/auth?code=sample&next=%2Fcallback\r\n  indented output  \r\n\r\n";
  window.fixtureBoard={text:"",reads:0,copies:[],hold:false,replies:[]};window.fixtureSends=[];window.fixtureErrors=[];
  window.webkit={messageHandlers:{bibimer:{postMessage(message){
    const reply=data=>window.BibimerNativeReply(message.id,{ok:true,status:200,data:JSON.parse(JSON.stringify(data))});
    if(message.action==="copy"){window.fixtureBoard.text=message.text;window.fixtureBoard.copies.push(message.text);return;}
    if(message.action==="readClipboard"){
      window.fixtureBoard.reads++;
      const resolve=()=>window.BibimerClipboardReply(message.id,{ok:true,text:window.fixtureBoard.text});
      if(window.fixtureBoard.hold)window.fixtureBoard.replies.push(resolve);else setTimeout(resolve,0);return;
    }
    if(message.action==="javascriptError"){window.fixtureErrors.push(message.message);return;}
    if(message.action!=="request")return;
    if(message.path==="/v1/health")setTimeout(()=>reply({protocol:1,version:"0.18.0",instance:"fixture-instance",home:"/fixture",features:["multiple_projects","agent_sessions","session_library","agent_options"],project,session,projects:[{...project,session,sessions:[session]}],agents:[{id:"shell",installed:true,modes:["terminal"]},{id:"codex",installed:true,modes:["terminal","chat"]}]}),0);
    else if(message.path.includes("/events?"))setTimeout(()=>reply({session,cursor:1,data:message.path.includes("cursor=0&")?btoa(unescape(encodeURIComponent(content))):""}),100);
    else {if(message.path.endsWith("/input")||message.path.endsWith("/message"))window.fixtureSends.push(message);setTimeout(()=>reply({}),0);}
  }}}};
};
(async()=>{
  const server=http.createServer((request,response)=>{
    const relative=decodeURIComponent(new URL(request.url,"http://localhost").pathname).replace(/^\//,"") || "index.html";
    const file=path.resolve(web,relative);
    if(!file.startsWith(web+path.sep)||!fs.existsSync(file)){response.writeHead(404);response.end();return;}
    const types={".js":"text/javascript",".css":"text/css",".html":"text/html",".svg":"image/svg+xml",".woff2":"font/woff2"};
    response.setHeader("Content-Type",types[path.extname(file)] || "application/octet-stream");response.end(fs.readFileSync(file));
  });await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const browser=await chromium.launch({executablePath:path.join(repo,".tools/mac-ui/bin/headless_shell"),headless:true});
  const results=[];
  try{
    for(const width of [320,393]){
      const context=await browser.newContext({viewport:{width,height:852},hasTouch:true,isMobile:true});
      await context.addInitScript({content:"("+fixture.toString()+")();\n"+fs.readFileSync(path.join(repo,"ios/app/Resources/native.js"),"utf8")});
      const page=await context.newPage();const errors=[];page.on("pageerror",error=>errors.push(error.message));
      await page.goto("http://127.0.0.1:"+server.address().port);
      await page.waitForFunction(()=>window.BibimerIOSSnapshot?.().terminal.includes("https://example.invalid/"));
      assert.equal(await page.evaluate(()=>window.fixtureBoard.reads),0);
      for(const language of ["en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"]){
        await page.evaluate(language=>{const choice=document.getElementById("language");choice.value=language;choice.dispatchEvent(new Event("change"));},language);
        const select=page.locator("#ios-terminal-select");await select.waitFor({state:"visible"});
        await page.screenshot({path:path.join(output,`terminal-${width}-${language}.png`)});
        await select.tap();await page.locator("#ios-terminal-dialog[open]").waitFor();
        const metrics=await page.evaluate(()=>{
          const dialog=document.getElementById("ios-terminal-dialog"),text=document.getElementById("ios-terminal-text");
          const bounds=dialog.getBoundingClientRect();
          return {left:bounds.left,right:bounds.right,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,readonly:text.readOnly,font:getComputedStyle(text).fontSize,buttons:[...dialog.querySelectorAll("button")].map(button=>({width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height,text:button.textContent,wordBreak:getComputedStyle(button).wordBreak,overflow:button.scrollWidth>button.clientWidth})),toolbar:[...document.querySelectorAll("#ios-terminal-tools>button")].map(button=>button.getBoundingClientRect().height)};
        });
        assert(metrics.left>=0 && metrics.right<=width && metrics.scrollWidth<=metrics.clientWidth,"Dialog must fit the mobile viewport");assert.equal(metrics.readonly,true);assert.equal(metrics.font,"16px");assert(metrics.buttons.every(button=>button.width>0&&button.height>=44&&!button.overflow&&button.wordBreak==="keep-all"));assert(metrics.toolbar.every(height=>height>=44));
        await page.screenshot({path:path.join(output,`selection-${width}-${language}.png`)});
        await page.evaluate(()=>{const text=document.getElementById("ios-terminal-text"),start=text.value.indexOf("https://");text.focus();text.setSelectionRange(start,start+"https://example.invalid/auth?code=sample&next=%2Fcallback".length);});
        await page.locator("#ios-terminal-copy-selection").tap();
        assert.equal(await page.evaluate(()=>window.fixtureBoard.text),"https://example.invalid/auth?code=sample&next=%2Fcallback");
        await page.locator("#ios-terminal-close").tap();assert.equal(await page.locator("#ios-terminal-text").inputValue(),"");
        results.push({width,language,dialog:metrics,partialTouchCopy:true,cleanup:true});
      }
      await page.evaluate(()=>{const input=document.getElementById("input");input.value="앞😀뒤";input.focus();input.setSelectionRange(1,3);input.dispatchEvent(new Event("input",{bubbles:true}));window.fixtureBoard.text="A\r\nB\rC";});
      await page.locator("#ios-terminal-paste").tap();await page.waitForFunction(()=>document.getElementById("input").value==="앞A\nB\nC뒤");
      const pasted=await page.evaluate(()=>({value:document.getElementById("input").value,start:document.getElementById("input").selectionStart,end:document.getElementById("input").selectionEnd,sends:window.fixtureSends.length,errors:window.fixtureErrors}));
      assert.equal(pasted.start,6);assert.equal(pasted.end,6);assert.equal(pasted.sends,0);assert.deepEqual(pasted.errors,[]);
      await page.evaluate(()=>{window.fixtureBoard.hold=true;window.fixtureBoard.text="late";});
      await page.locator("#ios-terminal-paste").tap();
      await page.evaluate(()=>{const input=document.getElementById("input");const previous=input.value;input.value="temporary";input.dispatchEvent(new Event("input",{bubbles:true}));input.value=previous;input.dispatchEvent(new Event("input",{bubbles:true}));window.fixtureBoard.replies.shift()();});
      await page.waitForFunction(()=>!document.getElementById("ios-terminal-paste").disabled);
      assert.equal(await page.locator("#input").inputValue(),pasted.value);assert.deepEqual(errors,[]);
      results.push({width,realTextareaCRLFNormalization:true,caret:pasted.start,noAutomaticSend:true,draftRaceRejected:true});
      await context.close();
    }
    fs.writeFileSync(path.join(output,"verification.json"),JSON.stringify(results,null,2)+"\n");
    console.log("Packaged Chromium browser: 20 mobile/locale layouts, touch partial copy, real textarea CRLF/caret and draft-race tests passed; fake board only.");
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
