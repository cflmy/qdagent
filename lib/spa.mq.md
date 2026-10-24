---
title: lib/spa
description: >-
  React SPA bootstrap builder (markup: occlusion — the 遍历 for-each needs it).
  Reads the Vite build output public/app/index.html at boot, extracts its hashed
  asset tags (<script>/<link> referencing /static/app/assets/), and returns the
  raw HTML string that the home-page shell injects verbatim into <main> via the
  page map's images_html field. Dynamic extraction means rebuilds with new
  content hashes keep working without editing this module.
markup: occlusion
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
---

## bootstrap
    + `root`="."

The raw HTML to drop into the home page's main slot: a #root mount node plus
the Vite-emitted <script>/<link> tags (module script executes on initial load
→ React mounts → SPA takes the viewport). Falls back to an empty mount if the
build output is absent (server still boots; the SPA is just missing).

**path = `root` + "/public/app/index.html"**
**exists = > fs.exists path=`path`**
1. not `exists`
  *"<div id=\"root\"></div><p style=\"padding:2rem;color:#888\">前端尚未构建：在 frontend/ 下执行 npm run build。</p>"*
**raw = > fs.read_text path=`path`**
**lines = > text.str_split s=`raw` sep="\n"**
**assets = > table.empty_list**
- [line](遍历 lines 为 line)
  **hit = > text.contains text=`line` sub="/static/app/assets/"**
  1. `hit`
    **assets = > table.append list=`assets` item=`line`**
**tags = > text.str_join xs=`assets` sep=""**
**html = "<div id=\"root\"></div>" + `tags`**
*html*
