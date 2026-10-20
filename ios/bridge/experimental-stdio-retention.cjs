'use strict';

// Experimental and opt-in only. Neither bootstrap nor the product wrapper
// loads this file. Preserve real pipe bytes before a lazy reader subscribes.
// Bun 1.3.14's ChildProcess exit handler resumes its original private streams;
// Node flushStdio uses child.stdio. Those original streams stay in place.
const {ChildProcess} = require('node:child_process');
const {PassThrough} = require('node:stream');
const key = Symbol.for('bibimer.experimental.stdio-retention.v1');

// The caller appends exactly this fixed, unquoted absolute path as a suffix.
// Remove only our suffix before a user's Bun subprocess inherits its env.
// Existing user options, including their whitespace, remain byte-for-byte.
const suffix = '--preload ' + __filename;
const options = process.env.BUN_OPTIONS;
if (options === suffix) delete process.env.BUN_OPTIONS;
else if (options && options.endsWith(' ' + suffix)) {
  process.env.BUN_OPTIONS = options.slice(0, -suffix.length - 1);
}
// This scalar path is a separate Bun preload route. Clear only our exact
// value; a different user preload must remain intact for their subprocesses.
if (process.env.BUN_INSPECT_PRELOAD === __filename) delete process.env.BUN_INSPECT_PRELOAD;

if (!globalThis[key]) {
  const originalSpawn = ChildProcess.prototype.spawn;
  const wrapped = new WeakSet();

  function retain(child, name, index) {
    const source = child[name];
    if (!source || typeof source.pipe !== 'function') return;
    // Force stdio to contain the original pipe before replacing only the
    // public property. Never point the runtime's automatic drain at our buffer.
    const stdio = child.stdio;
    if (!stdio || stdio[index] !== source) throw new Error('Unexpected native child stdio contract');
    const retained = new PassThrough();
    const onError = error => retained.destroy(error);
    const onClose = () => {
      if (source.errored) retained.destroy(source.errored);
      else if (!retained.writableEnded && !retained.destroyed) retained.end();
    };
    // Forward the original error unchanged. Do not silently absorb errors
    // when a caller has failed to install an error handler.
    source.once('error', onError);
    source.once('close', onClose);
    retained.once('close', () => {
      source.unpipe(retained);
      source.off('error', onError);
      source.off('close', onClose);
      // A consumer abort must release the actual native pipe too. Normal EOF
      // also reaches here; destroy() is idempotent and changes no exit status.
      if (!source.destroyed) source.destroy();
    });
    Object.defineProperty(child, name, {value: retained, writable: true, configurable: true, enumerable: true});
    source.pipe(retained); // Native backpressure; no manual replay or truncation.
  }

  ChildProcess.prototype.spawn = function (...args) {
    const result = Reflect.apply(originalSpawn, this, args);
    if (!wrapped.has(this)) {
      wrapped.add(this);
      retain(this, 'stdout', 1);
      retain(this, 'stderr', 2);
    }
    return result;
  };
  Object.defineProperty(globalThis, key, {value: Object.freeze({version: 1}), configurable: false});
}
