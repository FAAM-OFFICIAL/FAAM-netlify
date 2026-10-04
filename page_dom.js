/* A tiny fake DOM, just enough for site/paper/index.html's script. */
var REG = {}, listeners = {}, timers = [];
function El(tag) { this.tagName = tag; this.children = []; this._text = ""; this.hidden = false;
  this.className = ""; this.attrs = {}; }
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
Object.defineProperty(El.prototype, "textContent", {
  get: function () { return this._text + this.children.map(function (c) { return c.textContent; }).join(""); },
  set: function (v) { this._text = String(v); this.children = []; } });
function TextNode(t) { this.textContent = t; }
["href", "src", "alt", "loading"].forEach(function (k) {
  Object.defineProperty(El.prototype, k, { get: function () { return this.attrs[k]; },
    set: function (v) { this.attrs[k] = v; } }); });
["today","grid","empty","err","front","storyView","sKick","sTitle","sDate","sTicks","sFig","sImg","sCap","sBody","sJoin"]
  .forEach(function (id) { REG[id] = new El("div"); });
REG.empty.hidden = REG.err.hidden = REG.storyView.hidden = REG.sFig.hidden = true;
var document = { title: "", hidden: false,
  getElementById: function (id) { return REG[id] || null; },
  createElement: function (t) { return new El(t); },
  createTextNode: function (t) { return new TextNode(t); },
  addEventListener: function (e, f) { (listeners[e] = listeners[e] || []).push(f); } };
var location = { hash: "" };
var window = { addEventListener: document.addEventListener, scrollTo: function () {} };
function setInterval(f) { timers.push(f); }
Date.prototype.toLocaleDateString = function () { return "Oct 3, 2026"; };
var FEED = null, FAIL = false;
function fetch() { return Promise.resolve(FAIL ? { ok: false, status: 500 }
  : { ok: true, json: function () { return Promise.resolve({ posts: FEED }); } }); }
function settle() { return Promise.resolve().then(function () {}).then(function () {}).then(function () {}); }
function fire(e) { (listeners[e] || []).forEach(function (f) { f(); }); }
