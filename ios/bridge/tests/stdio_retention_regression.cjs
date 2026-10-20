'use strict';

// Run with Node --require ../experimental-stdio-retention.cjs. --control
// intentionally demonstrates the real output loss before a late subscriber.
const assert = require('node:assert/strict');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const {createHash} = require('node:crypto');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const active = new Set();
const key = Symbol.for('bibimer.experimental.stdio-retention.v1');
const read = async stream => {
  if (!stream) return Buffer.alloc(0);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};
const done = child => new Promise(resolve => {
  let error;
  child.once('error', value => {error = value;});
  child.once('close', (code, signal) => resolve({code, signal, error}));
});
const waitClosed = async stream => {
  if (stream && !stream.closed) await once(stream, 'close').catch(() => {});
};
const run = (script, options = {}) => {
  const child = spawn(process.execPath, ['-e', script], {stdio: ['ignore', 'pipe', 'pipe'], ...options});
  active.add(child);
  return {child, closed: done(child).then(exit => {active.delete(child); return exit;})};
};
const waitBuffered = async child => {
  const deadline = Date.now() + 3000;
  while (!child.stdout.readableLength && Date.now() < deadline) await delay(5);
  assert.ok(child.stdout.readableLength > 0, 'Native producer did not write before the signal test');
};

async function main() {
  const control = process.argv.includes('--control');
  assert.equal(Boolean(globalThis[key]), !control);
  const first = run('process.stdout.write("actual-stdout\\n");process.stderr.write("actual-stderr\\n");process.exitCode=7');
  // Awaiting close guarantees that ordinary child_process auto-drain happened.
  const firstExit = await first.closed;
  await delay(25);
  const firstOutput = await Promise.all([read(first.child.stdout), read(first.child.stderr)]);
  assert.equal(firstExit.code, 7); assert.equal(firstExit.signal, null);
  if (control) {
    assert.equal(firstOutput[0].length + firstOutput[1].length, 0);
    console.log('STDIO_RETENTION_CONTROL late_subscriber_lost_native_bytes PASS');
    return;
  }
  assert.deepEqual(firstOutput.map(value => value.toString()), ['actual-stdout\n', 'actual-stderr\n']);
  assert.notEqual(first.child.stdout, first.child.stdio[1]);
  assert.notEqual(first.child.stderr, first.child.stdio[2]);
  console.log('STDIO_RETENTION_CHECK fast_exit_both_streams PASS');

  const only = run('process.stdout.write("stdout-only\\n");process.exitCode=7', {stdio: ['ignore', 'pipe', 'ignore']});
  assert.equal((await only.closed).code, 7);
  await delay(25);
  assert.equal((await read(only.child.stdout)).toString(), 'stdout-only\n');
  assert.equal(only.child.stderr, null);
  console.log('STDIO_RETENTION_CHECK stdout_only PASS');

  // Larger than both the OS pipe and PassThrough highWaterMark. Start late,
  // then consume concurrently with exit; backpressure must not lose bytes.
  const bytes = 2 * 1024 * 1024 + 37;
  const large = run(`process.stdout.write(Buffer.alloc(${bytes}, 65));process.stderr.write(Buffer.alloc(${bytes}, 66));process.exitCode=7`);
  await delay(25);
  const [out, err, exit] = await Promise.all([read(large.child.stdout), read(large.child.stderr), large.closed]);
  assert.equal(exit.code, 7); assert.equal(out.length, bytes); assert.equal(err.length, bytes);
  for (const [actual, value] of [[out, 65], [err, 66]]) {
    assert.equal(createHash('sha256').update(actual).digest('hex'), createHash('sha256').update(Buffer.alloc(bytes, value)).digest('hex'));
  }
  console.log('STDIO_RETENTION_CHECK large_output_backpressure PASS');

  const killed = run('process.stdout.write("before-kill\\n");process.stderr.write("kill-stderr\\n");setInterval(()=>{},1000)');
  await waitBuffered(killed.child);
  assert.equal(killed.child.kill('SIGTERM'), true);
  const [killOut, killErr, killExit] = await Promise.all([read(killed.child.stdout), read(killed.child.stderr), killed.closed]);
  assert.equal(killExit.signal, 'SIGTERM'); assert.equal(killExit.code, null);
  assert.equal(killOut.toString(), 'before-kill\n'); assert.equal(killErr.toString(), 'kill-stderr\n');
  console.log('STDIO_RETENTION_CHECK kill_signal_and_bytes PASS');

  const failed = spawn('/bibimer-nonexistent-executable-8462', [], {stdio: ['ignore', 'pipe', 'pipe']});
  const failedExit = done(failed);
  const [failedOut, failedErr, missing] = await Promise.all([read(failed.stdout), read(failed.stderr), failedExit]);
  assert.equal(missing.error.code, 'ENOENT'); assert.equal(failedOut.length + failedErr.length, 0);
  console.log('STDIO_RETENTION_CHECK spawn_error PASS');

  const ioError = run('process.stdout.write("before-error\\n");setInterval(()=>{},1000)');
  await waitBuffered(ioError.child);
  const errorRead = read(ioError.child.stdout);
  ioError.child.stdio[1].destroy(new Error('synthetic-native-pipe-error'));
  await assert.rejects(errorRead, {message: 'synthetic-native-pipe-error'});
  ioError.child.kill('SIGTERM');
  await Promise.all([read(ioError.child.stderr), ioError.closed]);
  console.log('STDIO_RETENTION_CHECK source_error_is_not_absorbed PASS');

  const aborted = run('process.stdout.write("before-abort\\n");setInterval(()=>{},1000)');
  await waitBuffered(aborted.child);
  aborted.child.stdout.destroy();
  aborted.child.stderr.destroy();
  aborted.child.kill('SIGTERM');
  await aborted.closed;
  for (const child of [first.child, only.child, large.child, killed.child, failed, ioError.child, aborted.child]) {
    for (const stream of [child.stdout, child.stderr, child.stdio[1], child.stdio[2]]) {
      await waitClosed(stream);
      if (stream) assert.equal(stream.closed, true);
    }
  }
  console.log('STDIO_RETENTION_CHECK consumer_abort_and_resource_cleanup PASS');

  const ownSuffix = '--preload ' + require('node:path').resolve(__dirname, '../experimental-stdio-retention.cjs');
  const expected = '--smol  ';
  const childScript = 'process.stdout.write(JSON.stringify({options:process.env.BUN_OPTIONS,patched:Boolean(globalThis[Symbol.for("bibimer.experimental.stdio-retention.v1")])}))';
  const strip = spawnSync(process.execPath, ['--require', require('node:path').resolve(__dirname, '../experimental-stdio-retention.cjs'), '-e', childScript],
    {env: {...process.env, BUN_OPTIONS: expected + ' ' + ownSuffix}, encoding: 'utf8'});
  assert.equal(strip.status, 0, strip.stderr);
  assert.deepEqual(JSON.parse(strip.stdout), {options: expected, patched: true});
  const helperPath = require('node:path').resolve(__dirname, '../experimental-stdio-retention.cjs');
  const inspectScript = 'const {spawnSync}=require("node:child_process");const script=' + JSON.stringify('process.stdout.write(JSON.stringify({options:process.env.BUN_OPTIONS,inspectPreload:process.env.BUN_INSPECT_PRELOAD,patched:Boolean(globalThis[Symbol.for("bibimer.experimental.stdio-retention.v1")])}))') + ';const child=spawnSync(process.execPath,["-e",script],{encoding:"utf8"});if(child.status!==0)throw new Error(child.stderr);process.stdout.write(JSON.stringify({self:{options:process.env.BUN_OPTIONS,inspectPreload:process.env.BUN_INSPECT_PRELOAD},child:JSON.parse(child.stdout)}))';
  for (const [inspectPreload, expectedInspect] of [[helperPath, undefined], ['/user/original-preload.cjs', '/user/original-preload.cjs']]) {
    const inspected = spawnSync(process.execPath, ['--require', helperPath, '-e', inspectScript],
      {env: {...process.env, BUN_OPTIONS: expected, BUN_INSPECT_PRELOAD: inspectPreload}, encoding: 'utf8'});
    assert.equal(inspected.status, 0, inspected.stderr);
    const own = {options: expected};
    if (expectedInspect !== undefined) own.inspectPreload = expectedInspect;
    assert.deepEqual(JSON.parse(inspected.stdout), {self: own, child: {...own, patched: false}});
  }
  console.log('STDIO_RETENTION_CHECK own_inspect_preload_removed_and_user_value_preserved PASS');
  const inherited = run('process.stdout.write(JSON.stringify({options:process.env.BUN_OPTIONS,patched:Boolean(globalThis[Symbol.for("bibimer.experimental.stdio-retention.v1")])}))');
  const [inheritedOut] = await Promise.all([read(inherited.child.stdout), read(inherited.child.stderr), inherited.closed]);
  assert.equal(JSON.parse(inheritedOut).patched, false);
  assert.equal(JSON.parse(inheritedOut).options, process.env.BUN_OPTIONS);
  console.log('STDIO_RETENTION_CHECK own_preload_suffix_only_and_no_child_inheritance PASS');
}

main().catch(error => {
  for (const child of active) child.kill('SIGKILL');
  console.error(error); process.exitCode = 1;
});
