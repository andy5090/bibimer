"use strict";
// Host preflight: node --jitless tests/test_node_http.cjs [path/to/wasm-polyfill.js]
// Actual iOS guest probes are still required. No external dependencies.
const assert = require("node:assert/strict");
const path = require("node:path");
const net = require("node:net");
const http = require("node:http");
const shim = path.resolve(process.argv[2] || ".tools/ios-runtime/ios-linuxkit/app/RootfsPatch.bundle/files/lib/wasm-polyfill.js");
assert.equal(typeof globalThis.WebAssembly, "undefined", "Run Node with --jitless");
require(shim);
const source = process.binding("natives")["internal/deps/undici/undici"];
const encoded = source.match(/var wasmBase64 = "([A-Za-z0-9+/=]+)"/);
assert(encoded, "Built-in Undici llhttp fixture is available");
const bytes = Buffer.from(encoded[1], "base64");
let checks = 0;
const pass = name => { checks++; console.log("NODE_HTTP_CHECK\t" + name + "\tPASS"); };

function parser(callbacks = {}) {
  let api, current;
  const events = {begin: 0, statuses: [], body: [], complete: 0, fields: [], values: []};
  const slice = (at, length) => {
    assert(at >= current.ptr && at + length <= current.ptr + current.data.length,
      "Callback pointers must refer to CURRENT input, never a saved scratch buffer");
    return current.data.subarray(at - current.ptr, at - current.ptr + length).toString("latin1");
  };
  const env = {
    wasm_on_url: () => 0,
    wasm_on_message_begin: () => { events.begin++; return 0; },
    wasm_on_status: (p, at, n) => { slice(at, n); return 0; },
    wasm_on_header_field: (p, at, n) => { events.fields.push(slice(at, n)); return 0; },
    wasm_on_header_value: (p, at, n) => { events.values.push(slice(at, n)); return 0; },
    wasm_on_headers_complete: (p, status, upgrade, keepAlive) => {
      events.statuses.push(status); events.keepAlive = keepAlive;
      return callbacks.headers?.(p, status, upgrade, keepAlive) || 0;
    },
    wasm_on_body: (p, at, n) => { events.body.push(slice(at, n)); return callbacks.body?.() || 0; },
    wasm_on_message_complete: () => { events.complete++; return 0; }
  };
  api = new WebAssembly.Instance(new WebAssembly.Module(bytes), {env}).exports;
  const ptr = api.llhttp_alloc(2);
  return {api, ptr, events, feed(data) {
    data = Buffer.from(data); const address = api.malloc(data.length);
    new Uint8Array(api.memory.buffer, address, data.length).set(data);
    current = {ptr: address, data};
    try { return api.llhttp_execute(ptr, address, data.length); }
    finally { api.free(address); }
  }, close() { api.llhttp_free(ptr); }};
}
function directTests() {
  assert(WebAssembly.validate(bytes));
  const empty = Uint8Array.from([0,97,115,109,1,0,0,0]);
  assert.equal(WebAssembly.validate(empty), false);
  assert.throws(() => new WebAssembly.Module(empty), WebAssembly.CompileError);
  const memory = new WebAssembly.Memory({initial: 1});
  new Uint8Array(memory.buffer)[0] = 17;
  assert.equal(memory.grow(1), 1); assert.equal(new Uint8Array(memory.buffer)[0], 17);
  pass("llhttp_only_module_constructors");
  for (const [name, response, expected] of [
    ["identity", "HTTP/1.1 200 OK\r\nContent-Length: 5\r\nX-Empty:\r\n\r\nhello", "hello"],
    ["chunked_trailers", "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2;ext=x\r\nhe\r\n3\r\nllo\r\n0\r\nX-End: yes\r\n\r\n", "hello"]
  ]) {
    const responseBytes = Buffer.from(response);
    // Every possible boundary, plus every single byte, protects saved fragments.
    const fragmentations = [[responseBytes], [...responseBytes].map(b => Buffer.from([b]))];
    for (let at = 1; at < responseBytes.length; at++) fragmentations.push([responseBytes.subarray(0, at), responseBytes.subarray(at)]);
    for (const pieces of fragmentations) {
      const p = parser();
      try {
        for (const piece of pieces) assert.equal(p.feed(piece), 0, `${name} parser code`);
        assert.deepEqual(p.events.statuses, [200]);
        assert.equal(p.events.body.join(""), expected); assert.equal(p.events.complete, 1);
      } finally { p.close(); }
    }
    pass(name + "_all_boundaries");
  }
  for (const value of ["\xA01", "1\xA0", "\xA0\t1", "1 \xA0"]) {
    const invalid = parser();
    try {
      assert.equal(invalid.feed(Buffer.from("HTTP/1.1 200 OK\r\nContent-Length: " + value + "\r\n\r\nx", "latin1")), 11);
      assert.equal(invalid.events.complete, 0);
    } finally { invalid.close(); }
  }
  const ows = parser();
  try {
    assert.equal(ows.feed("HTTP/1.1 200 OK\r\nContent-Length: \t1 \t\r\n\r\nx"), 0);
    assert.equal(ows.events.complete, 1);
  } finally { ows.close(); }
  pass("http_ows_only_rejects_nbsp_content_length");
  const first = parser(), second = parser();
  try {
    assert.equal(first.feed("HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\none"), 0);
    assert.equal(second.feed("HTTP/1.1 201 OK\r\nContent-Length: 3\r\n\r\ntwo"), 0);
    assert.equal(first.events.body.join(""), "one"); assert.equal(second.events.body.join(""), "two");
    assert.equal(first.events.complete, 1); assert.equal(second.events.complete, 1);
    assert.equal(first.feed("HTTP/1.1 204 No Content\r\n\r\n"), 0);
    assert.equal(first.events.complete, 2); assert.equal(second.events.complete, 1);
  } finally { first.close(); second.close(); }
  pass("independent_instances_and_keepalive");
  const interim = parser();
  try {
    assert.equal(interim.feed("HTTP/1.1 100 Continue\r\n\r\nHTTP/1.1 204 No Content\r\n\r\n"), 0);
    assert.deepEqual(interim.events.statuses, [100, 204]); assert.equal(interim.events.complete, 2);
  } finally { interim.close(); }
  pass("informational_and_bodyless_status");
  const head = parser({headers: () => 1});
  try { assert.equal(head.feed("HTTP/1.1 200 OK\r\nContent-Length: 1000\r\n\r\n"), 0); assert.equal(head.events.complete, 1); }
  finally { head.close(); }
  pass("head_callback_skips_body");
  const close = parser();
  try {
    assert.equal(close.feed("HTTP/1.0 200 OK\r\n\r\nclose-body"), 0);
    assert.equal(close.events.keepAlive, 0); assert.equal(close.events.complete, 0);
    assert.equal(close.api.llhttp_finish(close.ptr), 0); assert.equal(close.events.complete, 1);
  } finally { close.close(); }
  pass("close_delimited_finish");
  for (const headers of ["Content-Length: -1", "Content-Length: 3x", "Content-Length: 9007199254740993",
      "Content-Length: 1\r\nContent-Length: 1", "Content-Length: 1\r\nTransfer-Encoding: chunked",
      "Transfer-Encoding: chunked, gzip"]) {
    const p = parser(); try { assert.notEqual(p.feed("HTTP/1.1 200 OK\r\n" + headers + "\r\n\r\n"), 0); }
    finally { p.close(); }
  }
  const badChunk = parser();
  try { assert.notEqual(badChunk.feed("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nxyz\r\n"), 0); }
  finally { badChunk.close(); }
  pass("reject_invalid_lengths_and_chunking");
  let pause = true;
  const paused = parser({body: () => pause ? 21 : 0});
  try {
    assert.equal(paused.feed("HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc"), 21);
    assert.equal(paused.events.complete, 0); pause = false; paused.api.llhttp_resume(paused.ptr);
    assert.equal(paused.feed(""), 0); assert.equal(paused.events.complete, 1);
  } finally { paused.close(); }
  pass("pause_resume_at_exact_body_boundary");
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function networkTests() {
  const sockets = new Set(), gate = {};
  const raw = net.createServer(socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.on("error", () => {});
    let request = "";
    socket.on("data", async data => {
      request += data.toString(); if (!request.includes("\r\n\r\n")) return;
      const route = request.split(" ")[1]; request = "";
      try {
        if (route === "/bytes") {
          for (const byte of Buffer.from("HTTP/1.1 200 OK\r\nContent-Length: 15\r\nConnection: keep-alive\r\nX-Test: fragmented\r\n\r\nfragmented-body")) {
            socket.write(Buffer.from([byte])); await delay(1);
          }
        } else if (route === "/sse") {
          socket.write("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Type: text/event-stream\r\n\r\n");
          const first = "data: first\n\n";
          socket.write(first.length.toString(16) + "\r\n" + first + "\r\n");
          await new Promise(resolve => { gate.finish = resolve; });
          socket.write("0\r\n\r\n");
        } else if (route === "/head") socket.write("HTTP/1.1 200 OK\r\nContent-Length: 999\r\n\r\n");
        else if (route === "/204") socket.write("HTTP/1.1 204 No Content\r\n\r\n");
        else if (route === "/close") socket.end("HTTP/1.0 200 OK\r\n\r\nclosed-body");
        else if (route === "/invalid") socket.write("HTTP/1.1 200 OK\r\nContent-Length: oops\r\n\r\n");
        else if (route === "/truncated") socket.end("HTTP/1.1 200 OK\r\nContent-Length: 20\r\n\r\nshort");
        else if (route === "/abort") {
          socket.write("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\none\r\n");
          socket.on("close", () => { gate.aborted = true; });
        } else socket.end("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
      } catch (error) { if (!socket.destroyed) socket.destroy(error); }
    });
  });
  const normal = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({url: req.url, method: req.method, body}));
  });
  const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  await listen(raw); await listen(normal);
  const base = "http://127.0.0.1:" + raw.address().port;
  const normalBase = "http://127.0.0.1:" + normal.address().port;
  const fetchTimed = (url, options) => fetch(url, {...options, signal: options?.signal || AbortSignal.timeout(8000)});
  try {
    const response = await fetchTimed(base + "/bytes"); assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-test"), "fragmented"); assert.equal(await response.text(), "fragmented-body");
    pass("real_fetch_fragmented_headers_and_body_keepalive");
    const sse = await fetchTimed(base + "/sse"); const reader = sse.body.getReader();
    const event = await reader.read(); assert.equal(Buffer.from(event.value).toString(), "data: first\n\n");
    assert.equal(event.done, false); gate.finish(); assert.equal((await reader.read()).done, true);
    pass("real_fetch_sse_delivered_before_eof");
    assert.equal((await fetchTimed(base + "/head", {method: "HEAD"})).status, 200);
    assert.equal(await (await fetchTimed(base + "/204")).text(), "");
    assert.equal(await (await fetchTimed(base + "/close")).text(), "closed-body");
    pass("real_fetch_head_204_http10_close");
    const payload = "post-data-".repeat(10000);
    const post = await (await fetchTimed(normalBase + "/post", {method: "POST", body: payload})).json();
    assert.equal(post.body, payload); assert.equal(post.method, "POST");
    pass("real_fetch_large_post_full_body");
    const values = await Promise.all(Array.from({length: 16}, (_, i) => fetchTimed(normalBase + "/" + i).then(r => r.json())));
    assert.deepEqual(values.map(value => value.url), Array.from({length: 16}, (_, i) => "/" + i));
    pass("real_fetch_concurrent_requests");
    await assert.rejects(fetchTimed(base + "/invalid"));
    await assert.rejects(async () => (await fetchTimed(base + "/truncated")).text());
    pass("real_fetch_invalid_and_truncated_response");
    const controller = new AbortController();
    const aborted = await fetchTimed(base + "/abort", {signal: controller.signal});
    const abortReader = aborted.body.getReader(); await abortReader.read(); controller.abort();
    await assert.rejects(abortReader.read());
    for (let i = 0; i < 40 && !gate.aborted; i++) await delay(5);
    assert.equal(gate.aborted, true); pass("real_fetch_abort_closes_stream");
  } finally {
    gate.finish?.(); for (const socket of sockets) socket.destroy();
    normal.closeAllConnections(); await Promise.all([new Promise(r => raw.close(r)), new Promise(r => normal.close(r))]);
  }
}
(async () => {
  directTests(); await networkTests();
  console.log("NODE_HTTP_SUMMARY\tPASS\t" + checks);
})().catch(error => { console.error(error); process.exitCode = 1; });
