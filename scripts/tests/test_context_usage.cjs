// Exercise the real renderer across missing, partial, excessive and stale data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const assets=path.resolve(__dirname,'../../android/app/src/main/assets');
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',dataset:{},style:{setProperty(k,v){this[k]=v;}},attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}});return nodes.get(id);};
const context=vm.createContext({window:{},$:node});
for(const locale of ['pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de'])vm.runInContext(fs.readFileSync(path.join(assets,`i18n-${locale}.js`),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(assets,'i18n.js'),'utf8'),context);
const app=fs.readFileSync(path.join(assets,'app.js'),'utf8');
const renderer=app.slice(app.indexOf('  function renderContextUsage()'),app.indexOf('  function renderSession()'));
assert.ok(renderer.includes('function renderContextUsage()'));
vm.runInContext(`let session=null,online=true,contextDisplay='used';const i18n=window.BibimerI18n,t=i18n.t;function isChat(){return session?.mode==='chat';}${renderer}
window.setMode=value=>{contextDisplay=value;};window.render=(value,connected=true)=>{session=value;online=connected;renderContextUsage();};`,context);
const render=(usage,extra={},connected=true)=>context.window.render({mode:'chat',state:'running',context_usage:usage,...extra},connected);
const usage=(used=76000,limit=200000,estimated=false)=>({used_tokens:used,limit_tokens:limit,estimated});
for(const value of [null,undefined,usage(-1),usage(NaN),usage(Infinity),usage(2**53),usage('1'),usage(true)]){
  render(value);assert.equal(node('context-summary').textContent,'Not reported');assert.equal(node('context-meter').hidden,true);
}
render(usage());assert.equal(node('context-summary').textContent,'38% used');
assert.equal(node('context-compact').textContent,'38%');assert.equal(node('context-usage').style['--usage-progress'],'38');
assert.equal(node('context-usage').dataset.known,'true');assert.ok(node('context-toggle').attributes['aria-label'].includes('Context · 38% used'));
assert.equal(node('context-detail').textContent,'76,000 / 200,000 tokens used');
assert.equal(node('context-overview').textContent,'38% used');
assert.equal(node('context-meter').value,38);assert.equal(node('context-meter').attributes['aria-valuetext'],'38% used');
render(usage(0));assert.equal(node('context-summary').textContent,'0% used');
render(usage(300000));assert.equal(node('context-summary').textContent,'150% used');
assert.equal(node('context-meter').value,100);assert.equal(node('context-usage').dataset.level,'high');
render(usage(150000));assert.equal(node('context-usage').dataset.level,'medium');
for(const limit of [null,0,-1,'200000',true,Infinity]){
  render(usage(76000,limit));assert.equal(node('context-summary').textContent,'76,000 tokens used');assert.equal(node('context-meter').hidden,true);
  assert.equal(node('context-overview').textContent,'76,000 tokens used');
}
render(usage(76000,200000,true));assert.ok(node('context-summary').textContent.startsWith('≈ '));
assert.ok(node('context-note').textContent.startsWith('Approximate'));
render(usage(),{},false);assert.ok(node('context-note').textContent.includes('offline'));assert.equal(node('context-usage').dataset.stale,'true');
render(usage(),{state:'lost'});assert.ok(node('context-note').textContent.includes('ended'));
render(null);assert.equal(node('context-note').textContent,'');assert.equal(node('context-meter').value,0);
assert.equal(node('context-compact').textContent,'—');assert.equal(node('context-usage').dataset.known,'false');assert.equal(node('context-usage').style['--usage-progress'],'0');
assert.equal(node('context-meter').attributes['aria-valuetext'],undefined);
render(usage(),{mode:'terminal'});assert.equal(node('context-usage').hidden,true);
context.window.render(null);assert.equal(node('context-usage').hidden,true);
for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
  context.window.BibimerI18n.setLanguage(locale);render(usage());
  assert.equal(node('context-summary').textContent,context.window.BibimerI18n.t('context_percent_used',{used:38,remaining:62}));
  context.window.setMode('remaining');render(usage());
  assert.equal(node('context-summary').textContent,context.window.BibimerI18n.t('context_percent_remaining',{remaining:62}));
  assert.equal(node('context-meter').value,62);
  assert.equal(node('context-compact').textContent,'62%');assert.equal(node('context-usage').style['--usage-progress'],'62');
  context.window.setMode('used');
}
context.window.BibimerI18n.setLanguage('en');context.window.setMode('remaining');
render(usage(0));assert.equal(node('context-summary').textContent,'100% left');assert.equal(node('context-meter').value,100);
render(usage(200000));assert.equal(node('context-summary').textContent,'0% left');assert.equal(node('context-meter').value,0);
render(usage(300000));assert.equal(node('context-summary').textContent,'0% left');assert.equal(node('context-meter').value,0);
assert.equal(node('context-usage').dataset.level,'high','Risk color always follows consumption');
render(usage());assert.equal(node('context-detail').textContent,'124,000 / 200,000 tokens left');
render(usage(76000,null));assert.equal(node('context-summary').textContent,'Not reported');assert.equal(node('context-meter').hidden,true);
render(usage(76000,null,true));assert.equal(node('context-summary').textContent,'Not reported');
console.log('Context UI: window math, unknown/partial data, compaction decrease, stale sessions, estimates, PTY and 10 locales passed');
