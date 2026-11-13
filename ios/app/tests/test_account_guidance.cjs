"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const locales=JSON.parse(fs.readFileSync("ios/app/Resources/ios-locales.json","utf8"));
const source=fs.readFileSync("ios/app/Resources/platform.js","utf8").split("  const labels =")[0]+"\n})();";
for(const language of Object.keys(locales)){
 const window={BibimerIOSLocales:locales,BibimerI18n:{language:()=>language,t:key=>"ANDROID_BRIDGE_UPDATE_"+key,apply(){}}};
 vm.runInNewContext(source,{window});
 for(const [key,index] of [["connection_update_bridge",43],["connection_need_bridge",44],["connections_hint",45],["connection_terminal_in_app_hint",46],["connection_login_hint",47]]){
  assert.equal(window.BibimerI18n.t(key),locales[language][index],language+" uses iOS account guidance");
  assert.ok(!window.BibimerI18n.t(key).includes("ANDROID_BRIDGE_UPDATE_"));
 }
}
assert.match(locales.ko[43],/업데이트는 필요하지 않습니다/);
assert.match(locales.ko[45],/브리지 설치나 업데이트가 필요하지 않습니다/);
assert.match(locales.en[45],/no separate bridge installation or update/);
assert.ok(!locales.ko[43].includes("사용할 수 없습니다"));
assert.match(locales.ko[45],/계정 연결·프로바이더·버전 업데이트/);
console.log("PASS iOS account guidance: app-bundled components, unsupported vs disconnected state, ten locales");
