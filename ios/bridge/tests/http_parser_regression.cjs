"use strict";
// Exercise the actual pinned helper, including packet boundaries and SSE body
// delivery. Run with the guest's jitless Node, or host Node --jitless for the
// parser contract; this does not replace an original CLI tool roundtrip.
const assert = require("node:assert/strict");
const path = require("node:path");
require(path.resolve(process.argv[2]));
const bundledUndici = process.binding("natives")["internal/deps/undici/undici"];
const bundledParser = bundledUndici.match(/var wasmBase64 = "([A-Za-z0-9+/=]+)"/);
assert.ok(bundledParser, "Extract the actual Node-bundled llhttp module for this restricted helper");
const parserBytes = Buffer.from(bundledParser[1], "base64");

async function parse(name, pieces, expectedBody, streaming = false) {
  const seen = {begin: 0, statuses: [], body: [], complete: 0};
  let api;
  const text = (at, length) => Buffer.from(api.memory.buffer, at, length).toString("utf8");
  const env = {
    wasm_on_url: () => 0,
    wasm_on_message_begin: () => { seen.begin++; return 0; },
    wasm_on_status: () => 0,
    wasm_on_header_field: () => 0,
    wasm_on_header_value: () => 0,
    wasm_on_headers_complete: (parser, status) => { seen.statuses.push(status); return 0; },
    wasm_on_body: (parser, at, length) => { seen.body.push(text(at, length)); return 0; },
    wasm_on_message_complete: () => { seen.complete++; return 0; }
  };
  const module = await WebAssembly.compile(parserBytes);
  api = (await WebAssembly.instantiate(module, {env})).exports;
  assert.equal(typeof api.llhttp_execute, "function", "HTTP parser helper must be preloaded in jitless Node");
  const parser = api.llhttp_alloc(2);
  try {
    for (let index = 0; index < pieces.length; index++) {
      const bytes = Buffer.from(pieces[index]);
      const address = api.malloc(bytes.length);
      new Uint8Array(api.memory.buffer, address, bytes.length).set(bytes);
      const result = api.llhttp_execute(parser, address, bytes.length);
      assert.equal(result, 0, `${name}: parser rejected packet ${index}`);
      if (streaming && index === pieces.length - 2) {
        assert.equal(seen.body.join(""), expectedBody, `${name}: SSE must be delivered before the final chunk`);
        assert.equal(seen.complete, 0, `${name}: stream must remain open before its terminating chunk`);
      }
    }
    assert.equal(seen.begin, 1, `${name}: expected one native message begin`);
    assert.deepEqual(seen.statuses, [200], `${name}: HTTP status must survive packet boundaries`);
    assert.equal(seen.body.join(""), expectedBody, `${name}: body bytes must roundtrip`);
    assert.equal(seen.complete, 1, `${name}: completion must occur at the exact body boundary`);
    console.log(`HTTP_PARSER_CHECK\t${name}\tPASS`);
  } finally {
    api.llhttp_free(parser);
  }
}

(async () => {
  const identity = Buffer.from("HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhello");
  await parse("identity_complete", [identity], "hello");
  await parse("identity_byte_fragments", [...identity].map(byte => Buffer.from([byte])), "hello");
  const body = "data: first\n\n";
  const headers = "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Type: text/event-stream\r\n\r\n";
  const chunk = body.length.toString(16) + "\r\n" + body + "\r\n";
  await parse("chunked_stream_before_close", [headers, chunk, "0\r\n\r\n"], body, true);
  const chunked = Buffer.from(headers + chunk + "0\r\n\r\n");
  await parse("chunked_byte_fragments", [...chunked].map(byte => Buffer.from([byte])), body);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
