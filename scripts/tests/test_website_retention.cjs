"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bibimer-retention-'));
const originalFetch = global.fetch;
const schema = ['0001_contact_inquiries.sql', '0002_discord_retention.sql'].map(name =>
  fs.readFileSync('release/website/migrations/' + name, 'utf8')).join('\n');
let sequence = 0;
function sql(file, query, args = [], all = false) {
  const r = spawnSync('python3', ['-c', `import sqlite3,json,sys
x=json.load(sys.stdin); c=sqlite3.connect(x['file']); c.row_factory=sqlite3.Row
if x['schema']: c.executescript(x['schema'])
r=c.execute(x['query'],x['args'])
out={'results':[dict(row) for row in r.fetchall()]} if x['all'] else {'success':True}
c.commit(); c.close(); print(json.dumps(out))`], {encoding:'utf8', input:JSON.stringify({file,query,args,all,schema:query === 'SELECT 1' ? schema : ''})});
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
function database() {
  const file = path.join(tmp, `${sequence++}.sqlite`);
  sql(file, 'SELECT 1');
  return {file, prepare(query) {return {bind(...args) {return {
    async run() {return sql(file, query, args);},
    async all() {return sql(file, query, args, true);},
  };}};}};
}
const url = 'https://discord.com/api/webhooks/123456/test-token';
const old = Date.now() - 91*86400000;
function seed(db, id = '123456789012345678', createdAt = old, webhook = '123456') {
  sql(db.file, 'INSERT INTO contact_discord_messages VALUES (?,?,?)', [id,webhook,createdAt]);
}
function count(db) {return sql(db.file, 'SELECT * FROM contact_discord_messages', [], true).results.length;}
(async () => {
  const source = fs.readFileSync('release/website/maintenance-worker.js', 'utf8');
  const {default: worker} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(worker.fetch, undefined);
  let requests = [];
  global.fetch = async (target, options) => {
    requests.push({target, options}); return new Response(null, {status:204});
  };
  const db = database(); seed(db); seed(db, '123456789012345679', Date.now());
  // Local inquiry cleanup is independent from the deletion identifier queue.
  sql(db.file, `INSERT INTO contact_inquiries
    (request_id,content_hash,category,subject,message,locale,consent,created_at,rate_hash)
    VALUES ('old','hash','bug','subject','test inquiry message','en',1,?,'hash')`, [old]);
  await worker.scheduled({}, {CONTACT_DB:db, DISCORD_WEBHOOK_URL:url});
  assert.equal(count(db), 1);
  assert.equal(sql(db.file,'SELECT * FROM contact_inquiries',[],true).results.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].target, url + '/messages/123456789012345678');
  assert.equal(requests[0].options.method, 'DELETE');
  assert.equal(requests[0].options.redirect, 'manual');
  // Idempotent success after message deletion but before DB cleanup.
  for (const [status, body, gone] of [[404,'{"code":10008}',true], [404,'{"code":10015}',false],
      [404,'not json',false], [401,'{}',false], [403,'{}',false], [429,'{}',false],
      [500,'{}',false], [302,'{}',false]]) {
    const db = database(); seed(db);
    global.fetch = async () => new Response(body, {status});
    if (gone) await worker.scheduled({}, {CONTACT_DB:db,DISCORD_WEBHOOK_URL:url});
    else await assert.rejects(worker.scheduled({}, {CONTACT_DB:db,DISCORD_WEBHOOK_URL:url}), /retained/);
    assert.equal(count(db), gone ? 0 : 1);
  }
  const retryDB = database(); seed(retryDB);
  global.fetch = async () => {throw Error('private network error');};
  await assert.rejects(worker.scheduled({}, {CONTACT_DB:retryDB,DISCORD_WEBHOOK_URL:url}), /retained/);
  assert.equal(count(retryDB), 1);
  global.fetch = async () => new Response(null,{status:204});
  await worker.scheduled({}, {CONTACT_DB:retryDB,DISCORD_WEBHOOK_URL:url});
  assert.equal(count(retryDB), 0);
  const rotated = database(); seed(rotated, '123456789012345678', old, '999999');
  global.fetch = async () => {throw Error('must not use a different webhook');};
  await assert.rejects(worker.scheduled({}, {CONTACT_DB:rotated,DISCORD_WEBHOOK_URL:url}), /retained/);
  assert.equal(count(rotated), 1);
  for (const bad of [undefined, 'https://evil.example/api/webhooks/123456/token',
      'https://discord.com.evil.example/api/webhooks/123456/token', 'http://discord.com/api/webhooks/123456/token']) {
    await assert.rejects(worker.scheduled({}, {CONTACT_DB:database(),DISCORD_WEBHOOK_URL:bad}), /not configured/);
  }
  // Rate limiting stops the batch, leaving every unconfirmed message for a later run.
  const limited = database(); seed(limited); seed(limited,'123456789012345679');
  let calls = 0;
  global.fetch = async () => {calls++; return new Response('{}',{status:429});};
  await assert.rejects(worker.scheduled({}, {CONTACT_DB:limited,DISCORD_WEBHOOK_URL:url}), /retained/);
  assert.equal(calls, 1); assert.equal(count(limited), 2);
  const batch = database();
  for (let i=0;i<21;i++) seed(batch,String(123456789012345678n+BigInt(i)));
  global.fetch = async () => new Response(null,{status:204});
  await worker.scheduled({}, {CONTACT_DB:batch,DISCORD_WEBHOOK_URL:url});
  assert.equal(count(batch), 1, 'Bounded batch leaves remaining work for next scheduled run');
  await worker.scheduled({}, {CONTACT_DB:batch,DISCORD_WEBHOOK_URL:url});
  assert.equal(count(batch), 0);
  await assert.rejects(worker.scheduled({}, {CONTACT_DB:{prepare(){throw Error('storage unavailable');}}}), /storage unavailable/);
  console.log('Website retention passed: real SQLite, 90-day inquiry/message cutoff, DELETE, already gone, retry, rotated webhook, rate limits, bounded batch, no public endpoint');
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => {
  global.fetch = originalFetch;
  fs.rmSync(tmp,{recursive:true,force:true});
});
