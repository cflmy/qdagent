---
markup: occlusion
title: S1 import → publish → actual_reuse story
description: >-
  Offline: write corpus TXT → document.extract draft → check → publish into
  temp kb → eng_bind_execute must report actual_reuse on second ask.
  Uses Marqdo baseline knowledge when bind needs a known artifact; import
  path is asserted independently.
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  plugin: lib/plugin.mq.md
  imp: ../../knowledge/import.mq.md
  metrics: ../../knowledge/metrics_reuse.mq.md
---

# main

**tmpfile = > fs.make_temp**
> fs.remove path=`tmpfile`
**tmpdir = `tmpfile`**
> fs.make_dir path=`tmpdir`
**kb = `tmpdir` + "/kb"**
> imp.ensure_layout kb_root=`kb`
**corpus = `kb` + "/corpus/note.txt"**
> fs.write_text path=`corpus` text="求道导入验收：可执行知识必须带出处与验证。\n"

**d = > imp.import_txt path=`corpus` kb_root=`kb` title="import-note" publish=False**
**ok = access(d, "ok")**
1. not `ok`
  > print text=import-draft-FAIL
  > print text=`d`
  > sys.exit code=1
**draft = access(d, "draft")**
> print text=draft-ok

**pub = > imp.publish_draft draft=`draft` kb_root=`kb` product_gate_ok=True**
**pok = access(pub, "ok")**
1. not `pok`
  > print text=publish-FAIL
  > print text=`pub`
  > sys.exit code=1
> print text=publish-ok

**p = > plugin.native_path name="agent"**
1. not `p`
  > print text=no-agent-plugin-skip-bind
  > print text=s1-import-reuse-partial-ok
  *"s1-import-reuse-partial-ok"*
> plugin.load path=`p`

Second ask: bind against Marqdo fixture knowledge (deterministic actual_reuse).

**root = > sys.env_get name="MARQDO_SRC"**
1. not `root`
  **root = "/home/cflmy/work/marqdo"**
**proj = `root` + "/tests/executable_knowledge/baseline/02-extract"**
`inputs` = > json.parse text={"数量":2,"单价":30}
**exec = > agent_eng_bind_execute project=`proj` query="商品小计" policy="pure" inputs=`inputs` candidate_only=True**
**reuse = > json.get value=`exec` key="actual_reuse"**
1. not `reuse`
  > print text=actual-reuse-FAIL
  > print text=`exec`
  > sys.exit code=1
> metrics.record_bind root=`kb` actual_reuse=True
> print text=actual-reuse-ok
> print text=s1-import-reuse-ok
*"s1-import-reuse-ok"*
