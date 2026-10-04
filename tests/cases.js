/* Cases for netlify/functions/paper.mjs. Run with tests/run.sh. */
var pass = 0, fail = 0;
function ok(c, m) { c ? pass++ : fail++; print((c ? "  PASS " : "  FAIL ") + m); }
var TOKEN = "t".repeat(40);
var AUTH = { authorization: "Bearer " + TOKEN, "content-type": "application/json" };
var JPEG = "\xff\xd8\xff\xe0fakejpegdata";
function post(id, extra) {
  return Object.assign({ id: id, title: "Headline " + id, body: "Body of " + id, kind: "Market",
    tickers: ["NVDA"], ts: 1000, pinned: false, developing: false, image: "", comments: 0 }, extra || {});
}
async function call(m, p, o) { return __handler(makeReq(m, p, o)); }

(async function () {
  // ---- reading an empty paper
  var r = await call("GET", "/api/paper");
  ok(r.status === 200 && (await r.json()).posts.length === 0, "empty paper reads fine");

  // ---- writes are locked down
  process.env.FAAM_PAPER_TOKEN = "";
  r = await call("POST", "/api/paper/sync", { headers: AUTH, json: { posts: [post("aaaaaa")] } });
  ok(r.status === 401, "no token configured on the site -> nobody can write");
  process.env.FAAM_PAPER_TOKEN = "short";
  r = await call("POST", "/api/paper/sync", { headers: { authorization: "Bearer short" }, json: { posts: [] } });
  ok(r.status === 401, "a too-short configured token is refused");
  process.env.FAAM_PAPER_TOKEN = TOKEN;
  r = await call("POST", "/api/paper/sync", { json: { posts: [post("aaaaaa")] } });
  ok(r.status === 401, "missing Authorization -> 401");
  r = await call("POST", "/api/paper/sync", { headers: { authorization: "Bearer " + "x".repeat(40) }, json: { posts: [] } });
  ok(r.status === 401, "wrong token -> 401");
  ok(!("posts" in BLOBS), "nothing was stored by refused writes");

  // ---- sync stores cleaned posts and asks for pictures
  r = await call("POST", "/api/paper/sync", { headers: AUTH, json: { posts: [
    post("aaaaaa", { ts: 100 }),
    post("bbbbbb", { ts: 300, image: "0123456789abcdef", developing: true }),
    post("cccccc", { ts: 200, pinned: true }),
    post("aaaaaa", { ts: 999, title: "duplicate" }),
    post("NOT-HEX", {}),
    post("dddddd", { title: "" }),
    post("eeeeee", { ts: 50, kind: "<script>", tickers: ["nvda", "../x", "<b>"], image: "../etc", title: "x".repeat(500) }),
  ] } });
  var d = await r.json();
  ok(r.status === 200 && d.count === 4, "4 valid, unique posts kept (dupes, bad ids, empty titles dropped) — got " + d.count);
  ok(JSON.stringify(d.missingImages) === '["0123456789abcdef"]', "site asks for the one picture it lacks");
  var stored = JSON.parse(BLOBS.posts);
  var e = stored.filter(function (p) { return p.id === "eeeeee"; })[0];
  ok(e.kind === "Market", "unknown section normalised");
  ok(JSON.stringify(e.tickers) === '["NVDA"]', "tickers validated");
  ok(e.image === "", "bad image id dropped");
  ok(e.title.length === 140, "title capped at 140");
  ok(!("author" in stored[0]), "only public fields stored");

  // ---- public read: order + latest
  d = await (await call("GET", "/api/paper")).json();
  ok(d.posts[0].id === "cccccc", "pinned story leads");
  ok(d.posts[1].id === "bbbbbb" && d.posts[2].id === "aaaaaa" && d.posts[3].id === "eeeeee", "then newest first");
  d = await (await call("GET", "/api/paper?latest=1")).json();
  ok(d.posts.length === 1 && d.posts[0].id === "bbbbbb", "latest=1 returns the newest story, pinned or not");
  ok(d.posts[0].developing === true, "developing flag survives");

  // ---- pictures
  r = await call("PUT", "/api/paper/img/0123456789abcdef", { headers: { authorization: AUTH.authorization }, raw: "not a jpeg" });
  ok(r.status === 415, "non-JPEG refused");
  r = await call("PUT", "/api/paper/img/../../etc", { headers: { authorization: AUTH.authorization }, raw: JPEG });
  ok(r.status === 400 || r.status === 404, "bad image id refused (" + r.status + ")");
  r = await call("PUT", "/api/paper/img/0123456789abcdef", { raw: JPEG });
  ok(r.status === 401, "picture upload needs the token");
  r = await call("PUT", "/api/paper/img/0123456789abcdef", { headers: { authorization: AUTH.authorization }, raw: JPEG });
  ok(r.status === 200, "JPEG upload accepted");
  r = await call("GET", "/api/paper/img/0123456789abcdef");
  ok(r.status === 200 && r.headers.get("content-type") === "image/jpeg", "picture served as JPEG");
  ok(/immutable/.test(r.headers.get("cache-control")), "picture cached long-term");
  ok(r.bytes()[0] === 0xff && r.bytes().length === JPEG.length, "picture bytes round-trip");
  r = await call("GET", "/api/paper/img/ffffffffffffffff");
  ok(r.status === 404, "unknown picture -> 404");
  r = await call("POST", "/api/paper/sync", { headers: AUTH, json: { posts: [post("aaaaaa"), post("bbbbbb", { image: "0123456789abcdef" })] } });
  ok((await r.json()).missingImages.length === 0, "already-uploaded picture isn't requested again");

  // ---- deleting the story removes its picture
  await call("POST", "/api/paper/sync", { headers: AUTH, json: { posts: [post("aaaaaa")] } });
  ok(!("img-0123456789abcdef" in BLOBS), "orphaned picture cleaned up");

  // ---- routing variants and junk
  r = await call("GET", "/.netlify/functions/paper");
  ok(r.status === 200 && (await r.json()).posts.length === 1, "direct function path works too");
  r = await call("GET", "/api/paper/whatever");
  ok(r.status === 404, "unknown GET route -> 404");
  r = await call("DELETE", "/api/paper/sync", { headers: AUTH });
  ok(r.status === 404, "unknown method -> 404");
  r = await call("POST", "/api/paper/sync", { headers: AUTH, raw: "{not json" });
  ok(r.status === 400, "invalid JSON -> 400");
  r = await call("POST", "/api/paper/sync", { headers: AUTH, json: { posts: "nope" } });
  ok(r.status === 400, "posts must be a list");
  r = await call("POST", "/api/paper/sync", { headers: Object.assign({}, AUTH, { "content-length": String(5 * 1024 * 1024) }), raw: "{}" });
  ok(r.status === 413, "oversized sync refused");
  ok(JSON.parse(BLOBS.posts).length === 1, "refused writes left the stored paper untouched");

  print("\n" + pass + " passed, " + fail + " failed");
})().catch(function (e) { print("CRASH: " + e + "\n" + e.stack); });
