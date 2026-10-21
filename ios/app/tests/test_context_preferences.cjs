// Exercise the shipped iOS JavaScript bridge's stored preference boundary.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const posts=[],defaults={contextDisplay:'used',agentOptions:{}};
const context=vm.createContext({window:{__bibimerEnvironment:defaults,webkit:{messageHandlers:{bibimer:{postMessage:value=>posts.push(value)}}},addEventListener(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../Resources/native.js'),'utf8'),context);
assert.equal(JSON.parse(context.window.Bibimer.environment()).contextDisplay,'used');
assert.equal(context.window.Bibimer.setContextDisplay('remaining'),true);
assert.equal(JSON.parse(context.window.Bibimer.environment()).contextDisplay,'remaining');
assert.equal(posts.at(-1).action,'preference');assert.equal(posts.at(-1).key,'contextDisplay');assert.equal(posts.at(-1).value,'remaining');
for(const value of [null,undefined,'','both','USED',0])assert.equal(context.window.Bibimer.setContextDisplay(value),false);
assert.equal(posts.length,1);assert.equal(defaults.contextDisplay,'remaining');
assert.equal(context.window.Bibimer.setContextDisplay('used'),true);assert.equal(defaults.contextDisplay,'used');
console.log('iOS context preference: valid choices, native persistence message and rejected invalid values passed');
