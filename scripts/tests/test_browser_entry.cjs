"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../.."),source=fs.readFileSync(path.join(root,"android/app/src/main/assets/app.js"),"utf8");
const code=source.match(/  async function openBrowser\([^\n]*\) \{[\s\S]*?\n  \}/)[0];
function fixture(session) {
  const dialog={open:false,shown:0,showModal(){this.open=true;this.shown++;}},url={value:""},opened=[];
  const ctx=vm.createContext({canBrowser:true,online:true,paused:false,switchingProject:false,demo:false,browserState:null,
    native:{openBrowserWindow:tag=>opened.push(tag)},$:id=>id==="browser-dialog"?dialog:url,
    fileContext:()=>({project:"project",online:true,path:"/worktree"}),browserKey:()=>"current",
    browserStatus:async state=>{state.session=session;state.loading=false;}});
  vm.runInContext(code,ctx);return {ctx,dialog,opened};
}
(async()=>{
  {
    const {ctx,dialog,opened}=fixture({state:"running",browser_tag:"owned",browser_manual:true});
    await ctx.openBrowser(true);assert.deepEqual(opened,["owned"]);assert.equal(dialog.open,false);
    assert.equal(ctx.browserState.session.browser_manual,true,"Opening the window never grants agent control");
  }
  {
    const {ctx,dialog,opened}=fixture({state:"running",browser_tag:"owned",browser_manual:true});
    await ctx.openBrowser();assert.equal(dialog.open,true);assert.equal(opened.length,0,"Settings opens the control dialog without sending the user to X11");
  }
  {
    const {ctx,dialog,opened}=fixture(null);await ctx.openBrowser(true);
    assert.equal(dialog.open,true);assert.equal(opened.length,0,"A browser without a running window still offers manual startup");
  }
  {
    const {ctx,dialog,opened}=fixture(null);ctx.browserStatus=async state=>{state.session={state:"running",browser_tag:"old"};ctx.browserKey=()=>"another-project";};
    await ctx.openBrowser(true);assert.equal(dialog.open,false);assert.equal(opened.length,0,"A stale response cannot open another project's browser");
  }
  {
    const {ctx,dialog,opened}=fixture(null);ctx.online=false;await ctx.openBrowser(true);
    assert.equal(dialog.open,false);assert.equal(opened.length,0);
  }
  const html=fs.readFileSync(path.join(root,"android/app/src/main/assets/index.html"),"utf8");
  assert.match(html,/<button id="browser-settings-open"[^>]+data-i18n="browser_login_settings"/);
  assert.match(html,/<button id="browser-open"[^>]+data-i18n-aria-label="browser_view"/);
  console.log("Browser entry: settings exposes login/control; globe opens only the owned window; no automatic permission changes, startup fallback and stale/offline guards passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
