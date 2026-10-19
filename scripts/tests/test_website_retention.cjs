"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync('release/website/maintenance-worker.js', 'utf8');
  const {default: worker} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  let sql, cutoff, calls = 0;
  const db = {prepare(query) {sql = query; return {bind(value) {cutoff = value; return {async run() {calls++;}};}};}};
  const before = Date.now();
  await worker.scheduled({}, {CONTACT_DB: db});
  assert.equal(sql, 'DELETE FROM contact_inquiries WHERE created_at < ?');
  assert.ok(cutoff >= before - 90*86400000 && cutoff <= Date.now() - 90*86400000);
  assert.equal(calls, 1);
  await assert.rejects(worker.scheduled({}, {CONTACT_DB: {prepare() {throw Error('storage unavailable');}}}), /storage unavailable/);
  assert.equal(worker.fetch, undefined, 'Retention has no public data endpoint');
  console.log('Website retention: daily callback, cutoff, fixed parameterized SQL and failure propagation passed');
})().catch(error => {console.error(error);process.exitCode=1;});
