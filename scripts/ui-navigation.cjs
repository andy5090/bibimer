"use strict";
// Shared smoke-test navigation through the visible settings button and page Back.
// Browser startup/control remains the caller's responsibility.
exports.openPage=async function openPage(page,name){
 if(!["work","settings","setup"].includes(name))throw Error("Unknown page: "+name);
 for(let attempt=0;attempt<4;attempt++){
  if(await page.locator("#"+name).isVisible())return;
  if(name==="work")await page.locator("#page-back").click();
  else if(name==="settings")await page.locator("#app-settings-open").click();
  else{
   if(!(await page.locator("#settings").isVisible()))await page.locator("#app-settings-open").click();
   await page.locator("#setup-guide-open").click();
  }
 }
 throw Error("Could not open page: "+name);
};
