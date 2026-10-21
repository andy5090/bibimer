// Actual account-quota renderer: source units, unknown values, stale/reset states.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const assets=path.resolve(__dirname,'../../android/app/src/main/assets');
const now=1830000000;
class ClockDate extends Date {static now(){return now*1000;}}
const element=tag=>({tag,hidden:false,textContent:'',dataset:{},attributes:{},children:[],append(...rows){this.children.push(...rows);},replaceChildren(...rows){this.children=rows;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}});
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id);};
const context=vm.createContext({window:{},$:node,Date:ClockDate,document:{createElement:element}});
for(const locale of ['pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de'])vm.runInContext(fs.readFileSync(path.join(assets,`i18n-${locale}.js`),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(assets,'i18n.js'),'utf8'),context);
const app=fs.readFileSync(path.join(assets,'app.js'),'utf8');
const source=app.slice(app.indexOf('  function subscriptionWindowLabel('),app.indexOf('  function renderSession()'));
vm.runInContext(`let session=null,online=true,contextDisplay='used';const i18n=window.BibimerI18n,t=i18n.t;function isChat(){return session?.mode==='chat';}${source}
window.render=(rows,options={})=>{online=options.online!==false;contextDisplay=options.mode||'used';session={mode:'chat',state:options.process||'running',subscription_usage:{state:options.state||'available',windows:rows}};renderSubscriptionUsage();};
window.terminal=()=>{session={mode:'terminal'};renderSubscriptionUsage();};`,context);
const quota=(used=35,minutes=300,extra={})=>({id:'primary',kind:'primary',window_minutes:minutes,used_percent:used,resets_at:now+7200,updated_at:now,...extra});
const render=(rows,options)=>context.window.render(rows,options);
render([]);assert.equal(node('subscription-summary').textContent,'Not reported');assert.equal(node('subscription-meter').hidden,true);
render([quota(),quota(12,10080,{id:'weekly',kind:'secondary'})]);
assert.equal(node('subscription-summary').textContent,'5 hours · 35% used · +1');assert.equal(node('subscription-meter').value,35);
assert.equal(node('subscription-windows').children.length,2);
assert.equal(node('subscription-windows').children[0].children[1].textContent,'Resets in 2 hours');
render([quota()],{mode:'remaining'});assert.equal(node('subscription-summary').textContent,'5 hours · 65% left');assert.equal(node('subscription-meter').value,65);
render([quota(0)]);assert.equal(node('subscription-meter').value,0);assert.ok(node('subscription-summary').textContent.includes('0% used'));
render([quota(100)],{mode:'remaining'});assert.equal(node('subscription-meter').value,0);assert.ok(node('subscription-summary').textContent.includes('0% left'));
for(const value of [null,undefined,'35',NaN,Infinity,-1]){
 render([{...quota(),used_percent:value}]);assert.equal(node('subscription-meter').hidden,true);assert.ok(node('subscription-summary').textContent.includes('Not reported'));
}
render([quota(null,300,{status:'allowed_warning'})]);assert.equal(node('subscription-meter').hidden,true);assert.equal(node('subscription-usage').dataset.level,'high');
render([quota(35),quota(null,10080,{id:'rejected',status:'rejected'})]);assert.ok(node('subscription-summary').textContent.startsWith('Weekly'));assert.equal(node('subscription-meter').hidden,true);
render([quota(80)],{mode:'remaining'});assert.equal(node('subscription-usage').dataset.level,'medium');
render([quota(35,300,{resets_at:now-1})]);assert.ok(node('subscription-summary').textContent.includes('Awaiting update'));assert.equal(node('subscription-meter').hidden,true);
assert.equal(node('subscription-windows').children[0].children[1].textContent,'Reset time passed; awaiting a new report.');
for(const options of [{online:false},{process:'lost'},{state:'stale'}]){render([quota()],options);assert.ok(node('subscription-summary').textContent.startsWith('Last:'));}
render([quota(35,300,{updated_at:now-301})]);assert.ok(node('subscription-summary').textContent.startsWith('Last:'));
render([quota(60,300,{updated_at:now-301}),quota(12,10080,{id:'weekly'})]);
assert.ok(node('subscription-summary').textContent.startsWith('Last:'));
assert.ok(node('subscription-windows').children[0].children[0].children[1].textContent.startsWith('Last:'));
render([quota(35,15,{label:'<script>literal</script>'})]);assert.ok(node('subscription-summary').textContent.includes('15 minutes'));assert.ok(node('subscription-windows').children[0].children[0].children[0].textContent.includes('<script>'));
for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
 context.window.BibimerI18n.setLanguage(locale);
 for(const mode of ['used','remaining']){render([quota()],{mode});assert.ok(!node('subscription-summary').textContent.includes('context_percent'));assert.ok(node('subscription-windows').children[0].children[1].textContent);}
}
context.window.terminal();assert.equal(node('subscription-usage').hidden,true);
console.log('Subscription UI: quotas, both display modes, missing values, reset rollover, status-only limits, stale reports and 10 locales passed');
