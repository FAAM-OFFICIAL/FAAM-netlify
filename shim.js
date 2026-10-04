/* Minimal stand-ins for what netlify/functions/paper.mjs touches, so it runs in
   JavaScriptCore (no Node on this Mac). In-memory Netlify Blobs included. */
var process = { env: {} };

function bytesOf(x) {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  var s = String(x), out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}
var Buffer = { from: function (s) { return bytesOf(s); } };
var crypto = {
  timingSafeEqual: function (a, b) {
    if (a.length !== b.length) throw new Error("length mismatch");
    var d = 0; for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0;
  },
};

var BLOBS = {};
function getStore(name) {
  return {
    get: async function (key, opts) {
      if (!(key in BLOBS)) return null;
      var v = BLOBS[key];
      if (opts && opts.type === "json") return JSON.parse(v);
      if (opts && opts.type === "arrayBuffer") return v.buffer;
      return v;
    },
    setJSON: async function (key, value) { BLOBS[key] = JSON.stringify(value); },
    set: async function (key, value) { BLOBS[key] = bytesOf(value).slice(); },
    delete: async function (key) { delete BLOBS[key]; },
    list: async function (opts) {
      var p = (opts && opts.prefix) || "";
      return { blobs: Object.keys(BLOBS).filter(function (k) { return k.indexOf(p) === 0; })
        .map(function (k) { return { key: k }; }) };
    },
  };
}

function URL(u) {
  var m = /^https?:\/\/[^/]+(\/[^?#]*)?(\?[^#]*)?/.exec(u);
  this.pathname = (m && m[1]) || "/";
  var q = {};
  ((m && m[2]) || "").slice(1).split("&").forEach(function (kv) {
    if (!kv) return; var i = kv.indexOf("=");
    q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1));
  });
  this.searchParams = { get: function (k) { return k in q ? q[k] : null; } };
}

function Headers(h) {
  var m = {}; Object.keys(h || {}).forEach(function (k) { m[k.toLowerCase()] = h[k]; });
  this.get = function (k) { k = k.toLowerCase(); return k in m ? m[k] : null; };
}
function Response(body, init) {
  init = init || {};
  this.status = init.status || 200;
  this.headers = new Headers(init.headers);
  this._body = body;
}
Response.prototype.json = async function () { return JSON.parse(this._body); };
Response.prototype.bytes = function () { return bytesOf(this._body); };

function makeReq(method, path, opts) {
  opts = opts || {};
  var headers = Object.assign({}, opts.headers || {});
  var raw = opts.raw != null ? opts.raw : (opts.json != null ? JSON.stringify(opts.json) : null);
  if (raw != null && !("content-length" in headers)) headers["content-length"] = String(raw.length);
  return {
    method: method, url: "https://faam-official.netlify.app" + path,
    headers: new Headers(headers),
    json: async function () { return JSON.parse(raw); },
    arrayBuffer: async function () { return bytesOf(raw).buffer; },
  };
}
