#!/bin/bash
# Tests for the Netlify side, using JavaScriptCore (ships with macOS — no Node needed).
#   1. netlify/functions/paper.mjs against an in-memory Netlify Blobs
#   2. site/paper/index.html's script against a tiny fake DOM
set -e
cd "$(dirname "$0")/.."
JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
[ -x "$JSC" ] || { echo "no JavaScriptCore on this machine"; exit 1; }
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "== the /api/paper function =="
sed -e '/^import /d' -e 's/^export default /var __handler = /' \
  netlify/functions/paper.mjs > "$OUT/body.js"
cat tests/shim.js "$OUT/body.js" tests/cases.js > "$OUT/fn.js"
"$JSC" "$OUT/fn.js"

echo; echo "== the /paper/ page =="
python3 -c "import re,sys; print(re.findall(r'<script>(.*?)</script>', open('site/paper/index.html').read(), re.S)[0])" > "$OUT/page.js"
{ cat tests/page_dom.js tests/page_cases.js "$OUT/page.js"
  printf '%s\n' 'run().catch(function (e) { print("CRASH " + e + " " + e.stack); });'
} > "$OUT/page_all.js"
"$JSC" "$OUT/page_all.js"
