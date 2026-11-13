"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('ios/bridge/run.py','utf8');
const hook=source.match(/CLAUDE_CODE_INPUT = r'''([\s\S]*?)'''/)[1].replace('await import("node:readline")','await nativeImport("node:readline")');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function challenge(code){
 const writes=[],errors=[],accepted=[];let handler,closed=0,paused=0;
 const input={once(name,fn){assert.equal(name,'line');handler=fn;},close(){closed++;}};
 const process={stdin:{pause(){paused++;}},stdout:{write:text=>writes.push(text)},stderr:{write:text=>errors.push(text)},exit:code=>{throw {exit:code};}};
 const nativeImport=async name=>{assert.equal(name,'node:readline');return {createInterface:options=>{assert.equal(options.terminal,false);assert.equal(options.input,process.stdin);return input;}};};
 await new AsyncFunction('X','j','process','nativeImport','URL','let bibimerInput;'+hook)(
  'https://claude.ai/oauth/authorize?state=fictional-state',{handleManualAuthCodeInput:value=>accepted.push(value)},process,nativeImport,URL);
 assert.equal(accepted.length,0,'Opening the browser cannot submit a code');
 assert.ok(writes.join('').includes('Paste code'));let exit;
 try{handler(code);}catch(error){exit=error.exit;}
 return {writes,errors,accepted,closed,paused,exit};
}
(async()=>{
 const valid=await challenge('  fictional-code#fictional-state  ');
 assert.deepEqual(valid.accepted,[{authorizationCode:'fictional-code',state:'fictional-state'}]);assert.equal(valid.closed,1);assert.equal(valid.paused,1);
 assert.ok(!valid.writes.join('').includes('fictional-code'),'Codes are not echoed into CLI output');
 for(const code of ['fictional-code#other-state','fictional-code','#fictional-state','fictional-code#fictional-state#extra']){
  const invalid=await challenge(code);assert.equal(invalid.accepted.length,0);assert.equal(invalid.exit,1);assert.ok(!invalid.errors.join('').includes(code));
 }
 console.log('PASS Claude UI manual-code adapter: explicit input, native handler, matching state, no code echo, invalid challenge rejected');
})().catch(error=>{console.error(error);process.exitCode=1;});
