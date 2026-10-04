# FAAM website — faam-official.netlify.app

The same site that's live now, plus **The FAAM Stock Paper**:

- A **"See our STOCK PAPER"** strip at the top of the landing page, showing the newest headline,
  and a **Stock Paper** link in the menu.
- A public **`/paper/`** page — every story, readable by anyone. It refreshes itself every 30
  seconds, so new stories appear without a reload.
- Stories go live **automatically when you publish in the FAAM app** (signed in as `dev`). No
  redeploy, no copying anything by hand.

Comments stay inside the FAAM app; the site shows how many there are and links to the download.

## How publishing reaches the site

```
FAAM app (your Mac)  ── publish ──▶  /api/paper  (Netlify Function)  ──▶  Netlify Blobs
                                                                           │
                         anyone ◀── /paper/ and the landing strip ◀───────┘
```

Only your FAAM app can post: it sends a secret token, and the function refuses every write without
it. The token lives on your Mac at `~/.faam/paper_site_token` and must match `FAAM_PAPER_TOKEN`
in Netlify.

## Deploying

**This needs a Git-connected deploy.** Dragging the folder onto Netlify Drop publishes the pages
but *not* the function, so stories wouldn't load.

1. Put this folder in a GitHub repo (for example `FAAM-OFFICIAL/faam-site`).
2. In Netlify, open the **faam-official** site → *Site configuration → Build & deploy → Link
   repository*, and pick that repo. `netlify.toml` already sets everything else.
3. *Site configuration → Environment variables →* add **`FAAM_PAPER_TOKEN`**. Copy the value from
   your Mac without displaying it:

   ```bash
   pbcopy < ~/.faam/paper_site_token
   ```

   then paste it as the value. Redeploy so the function picks it up.
4. In FAAM, open the Stock Paper as `dev`. The status line under the AI bar should turn green
   after **Sync now**. From then on, every publish, delete and comment updates the site by itself.

If the site ever moves to another address, put the new one in `~/.faam/paper_site_url`
(e.g. `https://faam.example.com`).

## Files

| Path | What it is |
|---|---|
| `site/` | The website. Everything except `paper/` is the current live site |
| `site/paper/index.html` | The public Stock Paper |
| `netlify/functions/paper.mjs` | `/api/paper` — stores and serves stories and pictures |
| `netlify.toml` | Routes (same as the live site) + the function |
| `package.json` | The one dependency, `@netlify/blobs` |
| `tests/` | `./tests/run.sh` — tests the function and the page, no Node needed |

## Changes from the live site

- Added the Stock Paper strip, menu link, and `/paper/`.
- Footer reads "Built with Python · Yahoo Finance" (it previously named the AI vendor).
- Netlify's own hosting comment was removed from the HTML — Netlify adds it back when it serves.
