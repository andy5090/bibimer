"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const window={BibimerRichText:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,"../../android/app/src/main/assets/conversation.js"),"utf8"),{window});
module.exports=context=>{
 context.optimisticMessages=new window.BibimerPendingMessages();
 context.optimisticScope=(key=context.viewKey())=>JSON.stringify([context.instance,key]);
 context.conversation ||= {items:new Map(),setOptimistic(){},reconcileOptimistic(){}};
};
