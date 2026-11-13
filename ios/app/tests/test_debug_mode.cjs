"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const messages=[],env={debugMode:false};
const ctx={window:{__bibimerEnvironment:env,webkit:{messageHandlers:{bibimer:{postMessage:x=>messages.push(x)}}},addEventListener(){}},crypto:{getRandomValues:a=>a.fill(3)},setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('ios/app/Resources/native.js','utf8'),ctx);
const native=ctx.window.Bibimer;
assert.equal(native.setDebugMode('true'),false);assert.equal(messages.length,0);
assert.equal(native.setDebugMode(true),true);assert.equal(JSON.parse(native.environment()).debugMode,true);assert.deepEqual({...messages.at(-1)},{action:'debugMode',enabled:true});
native.requestDebugDiagnostics('fixed-receipt');assert.deepEqual({...messages.at(-1)},{action:'debugDiagnosticsRead',id:'fixed-receipt'});
native.copyDebugDiagnostics();assert.equal(messages.at(-1).action,'debugDiagnosticsCopy');native.clearDebugDiagnostics();assert.equal(messages.at(-1).action,'debugDiagnosticsClear');
const before=messages.length;native.recordDebugEvent('token=PRIVATE');assert.equal(messages.length,before);native.recordDebugEvent('ui_error');assert.deepEqual({...messages.at(-1)},{action:'debugEvent',event:'ui_error'});
native.setDebugMode(false);assert.equal(JSON.parse(native.environment()).debugMode,false);
const main=fs.readFileSync('ios/app/Sources/main.m','utf8');
for(const action of ['debugDiagnosticsRead','debugDiagnosticsClear','debugDiagnosticsCopy','connectionDiagnostics']){
 const block=main.split('else if ([action isEqual:@"'+action+'"]) {')[1].split('\n    else if')[0];
 assert.match(block,/boolForKey:@"debugMode"/,'native gate for '+action);
}
const load=main.split('- (void)loadConnectionLog {')[1].split('- (void)recordConnection:')[0];assert.ok(load.indexOf('boolForKey:@"debugMode"')<load.indexOf('dataWithContentsOfURL:'));assert.match(load,/removeItemAtURL/);
const record=main.split('- (void)recordConnection:(NSString *)event code:(NSInteger)code {')[1].split('- (void)clearDebugDiagnostics')[0];assert.ok(record.indexOf('boolForKey:@"debugMode"')<record.indexOf('NSDictionary *row'));assert.match(record,/count > 64/);
assert.match(fs.readFileSync('ios/app/build.py','utf8'),/id="ios-connection-diagnostics"[^>]* hidden/);
console.log('PASS iOS debug: native shim settings/actions, strict Boolean, fixed event allowlist, read/copy/clear gates, opt-in persistence and hidden legacy diagnostics');
