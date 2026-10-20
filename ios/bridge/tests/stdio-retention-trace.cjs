'use strict';

// Opt-in synthetic-fixture diagnostics only. Never load in a product wrapper.
const HELPER = '/experimental-stdio-retention.cjs';
const TRACE = '/root/bibimer-probe/runtime-opencode-provider/stdio-trace.jsonl';
const fs = require('node:fs');
const path = require('node:path');
const {ChildProcess} = require('node:child_process');
const key = Symbol.for('bibimer.experimental.stdio-trace.v1');
if (process.env.BUN_INSPECT_PRELOAD === __filename) delete process.env.BUN_INSPECT_PRELOAD;
require(HELPER);

if (!globalThis[key]) {
  Object.defineProperty(globalThis, key, {value: true});
  const MAX_BYTES = 128 * 1024;
  let size = 0, sequence = 0;
  const trace = record => {
    const line = JSON.stringify({format: 1, processPid: process.pid, ...record}) + '\n';
    const bytes = Buffer.byteLength(line);
    if (size + bytes > MAX_BYTES) return;
    fs.appendFileSync(TRACE, line, {mode: 0o600});
    size += bytes;
  };
  trace({event: 'load', helperMarker: globalThis[Symbol.for('bibimer.experimental.stdio-retention.v1')]?.version === 1});
  const original = ChildProcess.prototype.spawn;
  const snapshot = (stream, counter) => stream ? {
    present: true, readableLength: typeof stream.readableLength === 'number' ? stream.readableLength : null,
    ended: stream.readableEnded === true, destroyed: stream.destroyed === true,
    readCalls: counter?.reads || 0, returnedBytes: counter?.bytes || 0, readWrapped: counter?.wrapped === true,
  } : {present: false};

  ChildProcess.prototype.spawn = function (...args) {
    const identity = ++sequence;
    const file = args[0]?.file;
    const executable = typeof file === 'string' ? path.basename(file).slice(0, 128) : 'unknown';
    let result;
    try {
      result = Reflect.apply(original, this, args);
    } catch (error) {
      trace({event: 'spawn_throw', identity, executable, errorType: error?.constructor?.name || 'unknown'});
      throw error;
    }
    const child = this;
    const nativeOut = child.stdio?.[1], nativeErr = child.stdio?.[2];
    const publicOut = child.stdout, publicErr = child.stderr;
    const counters = new Map();
    const observe = stream => {
      if (!stream || counters.has(stream)) return;
      const counter = {reads: 0, bytes: 0, wrapped: false};
      counters.set(stream, counter);
      if (typeof stream.read !== 'function') return;
      const read = stream.read;
      const descriptor = Object.getOwnPropertyDescriptor(stream, 'read');
      if (descriptor && !descriptor.configurable) return;
      Object.defineProperty(stream, 'read', {configurable: true, writable: true, value: function (...readArgs) {
        const value = Reflect.apply(read, this, readArgs);
        counter.reads++;
        if (typeof value === 'string') counter.bytes += Buffer.byteLength(value);
        else if (value && typeof value.byteLength === 'number') counter.bytes += value.byteLength;
        return value;
      }});
      counter.wrapped = true;
    };
    for (const stream of [nativeOut, nativeErr, publicOut, publicErr]) observe(stream);
    const state = () => ({
      stdoutEqualsStdio: publicOut === nativeOut, stderrEqualsStdio: publicErr === nativeErr,
      nativeStdout: snapshot(nativeOut, counters.get(nativeOut)), nativeStderr: snapshot(nativeErr, counters.get(nativeErr)),
      publicStdout: snapshot(publicOut, counters.get(publicOut)), publicStderr: snapshot(publicErr, counters.get(publicErr)),
    });
    trace({event: 'spawn', identity, executable, childPid: child.pid || null, ...state()});
    // Returned-byte counts describe .read() only: flowing native push paths
    // may deliver bytes without returning them through that method.
    // Close observation does not switch a readable into flowing mode.
    child.once('close', (exitCode, signal) => trace({event: 'child_close', identity, executable, exitCode, signal, ...state()}));
    for (const [name, stream] of [['stdout', publicOut], ['stderr', publicErr]]) {
      if (stream) stream.once('close', () => trace({event: 'public_close', identity, executable, stream: name, ...state()}));
    }
    return result;
  };
}
