---
markup: occlusion
title: agent/qdagent
description: >-
  求道 — Executable Engineering Knowledge Agent (CLI≥1.4.4 · Ext≥1.5.2).
  Modes: ASK / BUILD / LEARN. Single Agent Runtime: product Preflight +
  agent_eng_* latch; agent.run efi=True; CREATE uses sandbox=True.
  LLM transport failures return mode=error (Marqdo 1.4.4 soft status).
  Tools are ## in this file (code-as-documentation).
  Output contract: agent output AND sedimented notes MUST be runnable
  marqdo documents, gated by execution/docgate (structure + sandbox trial).
import:
  pf: preflight.mq.md
  ctx: ../knowledge/context.mq.md
  resolver: ../knowledge/resolver.mq.md
  metrics: ../knowledge/metrics.mq.md
  amort: ../knowledge/amortization.mq.md
  reuse_met: ../knowledge/metrics_reuse.mq.md
  dec: ../knowledge/decision.mq.md
  run: ../execution/run.mq.md
  gate: ../execution/docgate.mq.md
  session: ../execution/session.mq.md
  verify: ../execution/verify.mq.md
  record: ../execution/record.mq.md
  agent: ext/ai/agent.mq.md
  llm: ext/ai/llm.mq.md
  plugin: lib/plugin.mq.md
  db: ../db/index.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
---

## tool_find
    + `query`=""

Engineering find via Marqdo EKC (read-only). Prefer CALL:tool_find when locating symbols/capabilities.

1. not `query`
  **query = > sys.env_get name="QDAGENT_TOOL_QUERY"**
1. not `query`
  *"tool_find requires query"*
*> resolver.find query=`query`*

## tool_reuse
    + `task`=""

Engineering reuse / preflight payload (read-only / discovery). Prefer CALL:tool_reuse before CREATE.
Discovery alone is never actual reuse — use tool_bind / try_bind_execute for execution.

1. not `task`
  **task = > sys.env_get name="QDAGENT_TASK"**
1. not `task`
  *"tool_reuse requires task"*
*> resolver.reuse task=`task`*

## tool_bind
    + `query`=""
    + `policy`="pure"
    + `project`="."

Actual reuse: agent_eng_bind_execute (bind → execute → actual_reuse trace).

1. not `query`
  **query = > sys.env_get name="QDAGENT_TOOL_QUERY"**
1. not `query`
  *"tool_bind requires query"*
*> try_bind_execute project=`project` query=`query` policy=`policy`*

## tool_verify

Run L3 knowledge checks (verify / duplicate --fail / adjudicate --fail). Prefer CALL:tool_verify before promote.

*> verify.knowledge_checks*

## tool_summarize
    + `preflight`=None

Human-readable summary of a Context Pack map. Prefer CALL:tool_summarize for brief EFI readout.

1. not `preflight`
  *"tool_summarize requires preflight map"*
*> ctx.summarize preflight=`preflight`*

## try_bind_execute
    + `project`="."
    + `query`=""
    + `policy`="pure"
    + `candidate_only`=True

M04: discover → bind → execute. Returns map with actual_reuse / artifact_id / digest.
Never treat discovery_only scores as success.

> ensure_agent_plugin
1. not `query`
  `miss` =

  | ok | actual_reuse | error |
  |----|--------------|-------|
  | False | False | empty_query |

  *miss*
**exec = > agent_eng_bind_execute project=`project` query=`query` policy=`policy` candidate_only=`candidate_only`**
1. `exec`
  **aru = > json.get value=`exec` key="actual_reuse"**
  **kb = > sys.env_get name="QDAGENT_KB_ROOT"**
  1. not `kb`
    **kb = "."**
  1. `aru`
    > reuse_met.record_bind root=`kb` actual_reuse=True
  2. *
    > reuse_met.record_bind root=`kb` actual_reuse=False
  *exec*
`fail` =

| ok | actual_reuse | error |
|----|--------------|-------|
| False | False | bind_execute_unavailable |

*fail*

## eng_tools

Whitelist list for Marqdo agent CALL: (same-file ## tools). Must be a real list,
not a columnar GFM table (agent.run iterates tool names).

**t = > table.empty_list**
**t = > table.append list=`t` item="tool_find"**
**t = > table.append list=`t` item="tool_reuse"**
**t = > table.append list=`t` item="tool_bind"**
**t = > table.append list=`t` item="tool_verify"**
**t = > table.append list=`t` item="tool_summarize"**
*t*

## ensure_llm

Load LLM credentials: process env → `.env` → `data/qdagent.db` settings.
Set `QDAGENT_DRY=1` to skip credentials (force dry-run / no upstream LLM).

**dry = > sys.env_get name="QDAGENT_DRY"**
1. `dry` == "1"
  *""*
1. `dry` == "true"
  *""*

> llm.load_env path=".env"
**key = > sys.env_get name="OPENAI_API_KEY"**
1. not `key`
  **key = > sys.env_get name="MARQDO_LLM_API_KEY"**
1. not `key`
  **store = > db.open**
  **rows = > `store`.select table="settings" limit=1**
  **cfg = [1](access(rows, "1"))**
  1. `cfg`
    **key = [llm_api_key](access(cfg, "llm_api_key"))**
    **base = [llm_base_url](access(cfg, "llm_base_url"))**
    **model = [llm_model](access(cfg, "llm_model"))**
    1. `key`
      > sys.env_set name="OPENAI_API_KEY" value=`key`
    1. `base`
      > sys.env_set name="OPENAI_BASE_URL" value=`base`
      > sys.env_set name="MARQDO_LLM_BASE_URL" value=`base`
    1. `model`
      > sys.env_set name="OPENAI_MODEL" value=`model`
      > sys.env_set name="MARQDO_LLM_MODEL" value=`model`
*key*

## ensure_agent_plugin

Load Marqdo agent ABI plugin once (no LLM required).

**p = > plugin.native_path name="agent"**
1. `p`
  > plugin.load path=`p`
2. *
  > print text=qdagent: native agent plugin not found (build marqdo_plugin_agent)
  > sys.exit code=1
*True*

## make_agent
    + `standing`
    + `tools`=None

Construct Marqdo agent (loads agent plugin + LLM handle). Call only when API key present.

1. not `tools`
  **tools = > eng_tools**
**model = > llm.llm**
*> agent.agent model=`model` tools=`tools` standing=`standing`*

## latch_efi
    + `task`
    + `pack`
    + `root`="."
    + `out`=".marqdo"

Process-internal EFI latch on top of product Context Pack.
Calls agent_eng_preflight + agent_eng_record (plugin ABI, zero LLM).

> ensure_agent_plugin

**decision = > json.get value=`pack` key="decision"**
**allowed = > json.get value=`pack` key="create_allowed"**
**path = > json.get value=`pack` key="context_path"**
**pf_body = > json.get value=`pack` key="preflight"**

**latch = > agent_eng_preflight task=`task` root=`root` marqdo_dir=`out`**
**latch_status = > json.get value=`latch` key="status"**
**latch_decision = > json.get value=`latch` key="decision"**
**latch_allowed = > json.get value=`latch` key="create_allowed"**

1. `latch_status` == "ok"
  1. `latch_decision`
    **decision = `latch_decision`**
  1. `latch_allowed` == False
    **allowed = False**
2. `latch_status` == "ready"
  1. `latch_decision`
    **decision = `latch_decision`**
  1. `latch_allowed` == False
    **allowed = False**
3. *
  **_ = 1**

> agent_eng_record decision=`decision` root=`root` marqdo_dir=`out`

`ret` =

| ok | decision | create_allowed | context_path | preflight | latch |
|----|----------|----------------|--------------|-----------|-------|
| True | `decision` | `allowed` | `path` | `pf_body` | `latch` |

*ret*

## attach_pack
    + `slug`
    + `pack`
    + `root`="."
    + `out`=".marqdo"

Write Preflight fields into workbook (metrics via eng_record in latch_efi).

**decision = > json.get value=`pack` key="decision"**
**allowed = > json.get value=`pack` key="create_allowed"**
**path = > json.get value=`pack` key="context_path"**
**pf_body = > json.get value=`pack` key="preflight"**
> run.attach_preflight slug=`slug` decision=`decision` create_allowed=`allowed` context_path=`path`
**existing = > json.get value=`pf_body` key="existing"**
**existing_s = > json.stringify value=`existing`**
> run.put_section slug=`slug` section="Existing Capabilities" content=`existing_s`
**recommended = > json.get value=`pf_body` key="recommended"**
**recommended_s = > json.stringify value=`recommended`**
> run.put_section slug=`slug` section="Plan" content=`recommended_s`
**failures = > json.get value=`pf_body` key="failures"**
**failures_s = > json.stringify value=`failures`**
**forbidden = "Forbidden / failures:\n" + `failures_s`**
> run.put_section slug=`slug` section="Changes" content=`forbidden`
> run.attach_decision slug=`slug` decision=`decision`
> dec.record decision=`decision` root=`root` out=`out`
`out` =

| ok | decision | context_path |
|----|----------|--------------|
| True | `decision` | `path` |

*out*

## format_agent_outcome
    + `agent_out`

Prefer human-readable `error` / `result` from Marqdo 1.4.4 soft failures; else stringify.

**status = > json.get value=`agent_out` key="status"**
**err = > json.get value=`agent_out` key="error"**
**result = > json.get value=`agent_out` key="result"**
1. `status` == "ok"
  1. `result`
    *result*
  2. *
    *> json.stringify value=`agent_out`*
2. `err`
  *err*
3. `result`
  *result*
4. *
  *> json.stringify value=`agent_out`*

## attach_agent_evidence
    + `slug`
    + `agent_out`
    + `efi`=None
    + `gate_out`=None

Write efi / usage / token_cost / route into workbook Evidence + Metrics.
`gate_out` (from `门禁沉淀`) adds the doc-gate verdict to the same Evidence row.

**usage = > json.get value=`agent_out` key="usage"**
**token_cost = > json.get value=`agent_out` key="token_cost"**
**route = > json.get value=`agent_out` key="route"**
**err = > json.get value=`agent_out` key="error"**
**st = > json.get value=`agent_out` key="status"**
**efi_body = `efi`**
1. not `efi_body`
  **efi_body = > json.get value=`agent_out` key="efi"**
**gate_ok = "n/a"**
**gate_stage = ""**
**gate_path = ""**
**gate_rep = False**
1. `gate_out`
  **gate_ok = > json.get value=`gate_out` key="ok"**
  **gate_stage = > json.get value=`gate_out` key="stage"**
  **gate_path = > json.get value=`gate_out` key="answer_path"**
  **gate_rep = > json.get value=`gate_out` key="repaired"**

`ev` =

| efi | usage | token_cost | route | status | error | docgate_ok | docgate_stage | docgate_repaired | answer_path |
|-----|-------|------------|-------|--------|-------|------------|---------------|------------------|-------------|
| `efi_body` | `usage` | `token_cost` | `route` | `st` | `err` | `gate_ok` | `gate_stage` | `gate_rep` | `gate_path` |

**ev_s = > json.stringify value=`ev`**
> run.put_section slug=`slug` section="Evidence" content=`ev_s`
> run.attach_agent_metrics slug=`slug` agent_out=`agent_out`
*ev_s*

## 契约骨架

最小可运行 marqdo 文档骨架。模型必须按此形状输出：frontmatter 给机器与人
共同识别，叙述节给人读，`# main` 给沙箱跑。叙述行以文字开头，执行语句只
出现在 `# main` 内，两者在同一份 `.mq.md` 里共存。

| 顺序 | 节 | 面 | 内容 |
|------|----|----|------|
| 1 | `---` frontmatter | 机器 | `title` / `description` |
| 2 | `# 任务` | 人 | 复述用户目标 |
| 3 | `# 结论` | 人 | 结论正文，逐行以文字开头 |
| 4 | `# main` | 机器 | 至少一条可执行语句 |
| 5 | `# 验证` | 人 | 沙箱试跑结论与 stdout |
| 6 | `# 元数据` | 人 | mode / model / slug 表 |

## 契约规则

每一行都是硬约束，`execution/docgate.mq.md` 会逐条机械校验。

+ `契约`=输出必须是单个完整 `.mq.md` 文档，不得夹带任何文档外文字
+ `契约`=首行起 `---` frontmatter，含 `title`
+ `契约`=叙述行必须以文字开头，禁止行首出现数字、`-`、`>`、`|`、`*`、`[`、`#`、`+`
+ `契约`=执行语句只在 `# main` 内；`# main` 外禁止 `##` 子对象
+ `契约`=`# main` 至少一条可执行语句，沙箱内退出码必须为 0
+ `契约`=结论必须与 `# main` 的实际 stdout 一致，禁止编造运行结果
+ `契约`=工具协议只写半角冒号：`CALL:tool_find` / `CALL:tool_reuse`

## 契约提示
    + `mode`="ask"

Return the strict standing prompt for a mode. Single source of truth for the
output contract: the text is injected as agent standing, and the same rules
are enforced mechanically by `execution/docgate.mq.md` afterwards.

**head = "你正在以 marqdo 语言工作，最终答复必须是一篇完整、可在沙箱中运行的 marqdo 文档（后缀 .mq.md）。这不是建议，是硬性输出契约：答复里只能有这篇文档，禁止任何前言、后记、解释或围栏包裹。\n\n"**
**body = "文档结构（顺序固定）：\n1. 首行起 --- frontmatter，含 title 与 description。\n2. # 任务 —— 用叙述复述用户目标（人读）。\n3. # 结论 —— 人读结论；可引用但不得伪造运行结果。\n4. # main —— 知识源码 / 试跑入口：可执行函数与调用；事实函数可无副作用。\n5. # 验证 —— 初稿只写「待验证」；由求道工具填写真实试跑结果，禁止模型自称试跑通过。\n6. # 元数据 —— mode / slug / 来源 digest 表。\n\n"**
**rules = "硬规则：\n1. 叙述行（非标题行）必须以文字开头；禁止以数字、连字符、大于号、竖线、星号、方括号、井号、加号开头。行内反引号与围栏代码块内不受限。\n2. 执行语句只允许出现在 # main 之内；# main 之外不得出现 ## 子对象。\n3. # main 必须无副作用、不写宿主文件、不联网，只做计算与打印。\n4. 结论中的数字必须可追溯到 # main；不得编造。\n5. 验证节禁止写「试跑通过」——由工具回填。\n6. 工具协议半角冒号：CALL:tool_find、CALL:tool_reuse、CALL:tool_bind。禁止 CALL 框架内部函数。\n\n"**
**tail = "工程纪律：先读 Preflight Context Pack；REUSE 走实际 bind_execute（禁止把 discovery_only 当执行）；CREATE 前确认 create_allowed；禁止再造第二套 Agent Runtime 或 EKC。"**
**skill = "求道工程智能体正在执行 BUILD：除上述输出契约外，必须先判定 Reuse / Adapt / Create 并在 # 结论 里写明判定依据；若决定 Create 而 create_allowed 为 false，则在 # 结论 里说明被阻断的原因，不要绕过。\n\n"**
1. `mode` == "build"
  **p = `head` + `skill` + `body` + `rules` + `tail`**
  *p*
2. *
  **p = `head` + `body` + `rules` + `tail`**
  *p*

## 门禁沉淀
    + `slug`
    + `result`
    + `root`="."
    + `sediment`=True
    + `data_root`=""

Gate an agent answer against the output contract and, when it passes, sediment
the document beside the workbook as `<slug>.answer.mq.md`. Returns `{ ok,
stage, doc, stdout, error, violations, answer_path, sedimented }`.
A failed gate never sediments; the caller may run one repair round via
`契约修复` and gate again.

1. not `data_root`
  **data_root = > sys.env_get name="QDAGENT_DATA"**
  1. not `data_root`
    **data_root = "data"**
**g = > gate.门禁 text=`result` root=`root`**
**gok = [ok](access(g, "ok"))**
**doc = > json.get value=`g` key="doc"**
**stage = > json.get value=`g` key="stage"**
**gerr = > json.get value=`g` key="error"**
**gout = > json.get value=`g` key="stdout"**
**viol = > json.get value=`g` key="violations"**
**answer_path = ""**
**sed = False**
1. `gok`
  1. `sediment`
    **answer_path = `data_root` + "/runs/" + `slug` + ".answer.mq.md"**
    **w = > gate.写入沉淀 doc=`doc` path=`answer_path`**
    **sed = `w` == `answer_path`**
  2. *
    **sed = False**
2. *
  **doc = ""**
`ret` =

| ok | stage | doc | stdout | error | violations | answer_path | sedimented |
|----|-------|-----|--------|-------|------------|-------------|------------|
| `gok` | `stage` | `doc` | `gout` | `gerr` | `viol` | `answer_path` | `sed` |

*ret*

## 契约修复
    + `task`
    + `result`
    + `gate_out`

Build the repair-round task from the failed gate verdict. The returned text is
fed back to the same agent handle so the model can fix its own document instead
of regenerating from scratch.

**hint = > gate.修复提示 gate_out=`gate_out`**
**p = `task` + "\n\n你上一次的答复没有通过 marqdo 文档门禁。诊断如下：\n" + `hint` + "\n\n上一次答复全文：\n" + `result` + "\n\n请只输出修复后的完整文档，不要任何解释。"**
*p*

## ask
    + `task`
    + `root`="."
    + `out`=".marqdo"
    + `session_id`=""

ASK — product Preflight + EFI latch + agent.run (efi=True, learn=False). No host mutation.
The answer is gated by `execution/docgate.mq.md` and must be a runnable marqdo doc.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = > json.get value=`pack` key="ok"**
1. not `ok`
  *pack*

**gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
**decision = > json.get value=`gated` key="decision"**
**allowed = > json.get value=`gated` key="create_allowed"**
**path = > json.get value=`gated` key="context_path"**
**pf_body = > json.get value=`gated` key="preflight"**
**_ra = > amort.record task=`task` decision=`decision` root=`root`**

`merged` =

| ok | decision | create_allowed | context_path | preflight |
|----|----------|----------------|--------------|-----------|
| True | `decision` | `allowed` | `path` | `pf_body` |

**wb = > run.create task=`task` intent="ask" surface="ask"**
**slug = > json.get value=`wb` key="slug"**
> attach_pack slug=`slug` pack=`merged` root=`root` out=`out`

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
**status = "dry"**
**err = ""**
**agent_out = ""**
**gated_out = ""**
1. `key`
  **standing = > 契约提示 mode="ask"**
  **助手 = > make_agent standing=`standing`**
  **agent_out = > `助手`.run task=`task` efi=True learn=False verify=True writeback=True reuse=True router="marqdo" max_rounds=3 sandbox=False**
  **ao_s = > json.stringify value=`agent_out`**
  **is_map = > text.contains text=`ao_s` sub="\"status\""**
  1. not `is_map`
    **status = "ok"**
    **raw = > text.str_trim s=`agent_out`**
    **err = ""**
  2. *
    **status = > json.get value=`agent_out` key="status"**
    **raw = > format_agent_outcome agent_out=`agent_out`**
    **err = > json.get value=`agent_out` key="error"**
  1. `status` == "ok"
    **mode = "live"**
    **gated_out = > 门禁沉淀 slug=`slug` result=`raw` root=`root`**
    **gok = [ok](access(gated_out, "ok"))**
    **repaired = False**
    1. not `gok`
      1. `raw`
        **fix_task = > 契约修复 task=`task` result=`raw` gate_out=`gated_out`**
        **second = > `助手`.step task=`fix_task` writeback=False**
        **s2 = > json.get value=`second` key="status"**
        **r2 = > json.get value=`second` key="result"**
        1. `s2` == "ok"
          1. `r2`
            **gated_out = > 门禁沉淀 slug=`slug` result=`r2` root=`root`**
            **gok = [ok](access(gated_out, "ok"))**
            **repaired = `gok`**
          2. *
            **_ = 1**
        2. *
          **_ = 1**
      2. *
        **_ = 1**
    **apath = > json.get value=`gated_out` key="answer_path"**
    1. `gok`
      **result = "答案文档已通过文档门禁并沉淀：" + `apath`**
      1. `repaired`
        **result = "答案文档经一轮修复后通过文档门禁并沉淀：" + `apath`**
      2. *
        **result = "答案文档已通过文档门禁并沉淀：" + `apath`**
    2. *
      **mode = "gated_error"**
      **stage = > json.get value=`gated_out` key="stage"**
      **err = "docgate_" + `stage`**
      **result = "答复未通过 marqdo 文档门禁（stage=" + `stage` + "），未沉淀：" + `raw`**
  2. *
    **mode = "error"**
    **result = `raw`**
  > attach_agent_evidence slug=`slug` agent_out=`agent_out` efi=`gated` gate_out=`gated_out`
2. *
  **result = "（无 API Key）Preflight decision=" + `decision` + " context=" + `path`**
  **mode = "dry"**
  **status = "dry"**

> run.attach_result slug=`slug` result=`result`
**kpi = > metrics.read out=`out` root=`root`**
**kpi_s = > json.stringify value=`kpi`**
> run.put_section slug=`slug` section="Metrics" content=`kpi_s`
**sess = > session.link session_id=`session_id` surface="ask" workbook_slug=`slug` run_id=`slug`**
**sid = > json.get value=`sess` key="session_id"**
`ret` =

| ok | mode | slug | decision | context_path | status | error | result | session_id |
|----|------|------|----------|--------------|--------|-------|--------|------------|
| True | `mode` | `slug` | `decision` | `path` | `status` | `err` | `result` | `sid` |

*ret*

## build
    + `task`
    + `root`="."
    + `out`=".marqdo"
    + `force_create`=False
    + `sandbox`=True
    + `session_id`=""

BUILD — Preflight → EFI latch → Reuse Gate → agent.run (efi=True) → Verify → Record.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](access(pack, "ok"))**
1. not `ok`
  *pack*

**gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
**decision = [decision](access(gated, "decision"))**
**allowed = [create_allowed](access(gated, "create_allowed"))**
**path = [context_path](access(gated, "context_path"))**
**pf_body = [preflight](access(gated, "preflight"))**

1. `decision` == "CREATE"
  1. not `allowed`
    1. not `force_create`
      `blocked` =

      | ok | status | decision | create_allowed | context_path | error |
      |----|--------|----------|----------------|--------------|-------|
      | False | blocked | CREATE | False | `path` | reuse_gate_blocked |

      *blocked*

`merged` =

| ok | decision | create_allowed | context_path | preflight |
|----|----------|----------------|--------------|-----------|
| True | `decision` | `allowed` | `path` | `pf_body` |

**wb = > run.create task=`task` intent="build" surface="build"**
**slug = [slug](access(wb, "slug"))**
> attach_pack slug=`slug` pack=`merged` root=`root` out=`out`
> run.set_status slug=`slug` status="executing"
**sess = > session.link session_id=`session_id` surface="build" workbook_slug=`slug` run_id=`slug`**
**sid = [session_id](access(sess, "session_id"))**
*> build_finish slug=`slug` task=`task` decision=`decision` allowed=`allowed` path=`path` gated=`gated` root=`root` out=`out` sandbox=`sandbox` session_id=`sid`*

## build_start
    + `task`
    + `root`="."
    + `out`=".marqdo"
    + `force_create`=False
    + `session_id`=""

Async BUILD start — Preflight + workbook + status=executing, returns immediately.
Caller (Web) must spawn `build_finish` / `cli/求道-构建-继续` as orphan job.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](access(pack, "ok"))**
1. not `ok`
  *pack*
**gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
**decision = [decision](access(gated, "decision"))**
**allowed = [create_allowed](access(gated, "create_allowed"))**
**path = [context_path](access(gated, "context_path"))**
**pf_body = [preflight](access(gated, "preflight"))**
1. `decision` == "CREATE"
  1. not `allowed`
    1. not `force_create`
      `blocked` =

      | ok | status | decision | create_allowed | context_path | error | async |
      |----|--------|----------|----------------|--------------|-------|-------|
      | False | blocked | CREATE | False | `path` | reuse_gate_blocked | False |

      *blocked*
`merged` =

| ok | decision | create_allowed | context_path | preflight |
|----|----------|----------------|--------------|-----------|
| True | `decision` | `allowed` | `path` | `pf_body` |

**wb = > run.create task=`task` intent="build" surface="build"**
**slug = [slug](access(wb, "slug"))**
> attach_pack slug=`slug` pack=`merged` root=`root` out=`out`
> run.set_status slug=`slug` status="executing"
**sess = > session.link session_id=`session_id` surface="build" workbook_slug=`slug` run_id=`slug`**
**sid = [session_id](access(sess, "session_id"))**
**job = > json.stringify value=`merged`**
> run.put_section slug=`slug` section="Plan" content=`job`
`ret` =

| ok | async | slug | decision | create_allowed | context_path | status | session_id |
|----|-------|------|----------|----------------|--------------|--------|------------|
| True | True | `slug` | `decision` | `allowed` | `path` | executing | `sid` |

*ret*

## build_finish
    + `slug`
    + `task`=""
    + `decision`=""
    + `allowed`=True
    + `path`=""
    + `gated`=None
    + `root`="."
    + `out`=".marqdo"
    + `sandbox`=True
    + `session_id`=""

Continue BUILD after `build_start` / sync `build` mid-point (agent → verify → record → completed).

1. not `task`
  **meta = > run.load_state slug=`slug`**
  **sec = [sections](access(meta, "sections"))**
  **task = [task](access(sec, "task"))**
1. not `gated`
  **pack = > pf.run task=`task` root=`root` out=`out`**
  **gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
  **decision = [decision](access(gated, "decision"))**
  **allowed = [create_allowed](access(gated, "create_allowed"))**
  **path = [context_path](access(gated, "context_path"))**

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
**agent_out = None**
**gated_out = ""**
**reuse_trace = None**
**actual_reuse = False**
**artifact_id = ""**
**artifact_digest = ""**

REUSE path: actual bind_execute before LLM CREATE (discovery_only is never success).

1. `decision` == "REUSE"
  **reuse_trace = > try_bind_execute project=`root` query=`task`**
  **actual_reuse = > json.get value=`reuse_trace` key="actual_reuse"**
  **artifact_id = > json.get value=`reuse_trace` key="artifact_id"**
  **artifact_digest = > json.get value=`reuse_trace` key="digest"**
  1. `actual_reuse`
    **mode = "live"**
    **status = "ok"**
    **result = > json.stringify value=`reuse_trace`**
    > run.put_section slug=`slug` section="ActualReuse" content=`result`

1. not `actual_reuse`
  1. `key`
    **standing = > 契约提示 mode="build"**
    **助手 = > make_agent standing=`standing`**
    **use_sandbox = False**
    1. `decision` == "CREATE"
      **use_sandbox = `sandbox`**
    **agent_out = > `助手`.run task=`task` efi=True learn=True verify=True writeback=True reuse=True router="auto" max_rounds=4 sandbox=`use_sandbox` sandbox_profile="default" promote=False**
    **status = > json.get value=`agent_out` key="status"**
    **raw = > format_agent_outcome agent_out=`agent_out`**
    1. `status` == "ok"
      **mode = "live"**
      **gated_out = > 门禁沉淀 slug=`slug` result=`raw` root=`root`**
      **gok = access(gated_out, "ok")**
      1. not `gok`
        1. `raw`
          **fix_task = > 契约修复 task=`task` result=`raw` gate_out=`gated_out`**
          **second = > `助手`.step task=`fix_task` writeback=False**
          **s2 = > json.get value=`second` key="status"**
          **r2 = > json.get value=`second` key="result"**
          1. `s2` == "ok"
            1. `r2`
              **gated_out = > 门禁沉淀 slug=`slug` result=`r2` root=`root`**
              **gok = access(gated_out, "ok")**
            2. *
              **_ = 1**
          2. *
            **_ = 1**
        2. *
          **_ = 1**
      **apath = > json.get value=`gated_out` key="answer_path"**
      1. `gok`
        **result = "答案文档已通过文档门禁并沉淀：" + `apath`**
      2. *
        **stage = > json.get value=`gated_out` key="stage"**
        **mode = "gated_error"**
        **result = "答复未通过 marqdo 文档门禁（stage=" + `stage` + "），未沉淀：" + `raw`**
    2. `status` == "blocked"
      **mode = "blocked"**
      **result = `raw`**
    3. *
      **mode = "error"**
      **result = `raw`**
      1. `decision` == "CREATE"
        **qslug = > agent_goal_slug goal=`task`**
        > agent_kb_quarantine kb_dir=".marqdo/agent-kb" slug=`qslug` reason="build_create_failed"
    > attach_agent_evidence slug=`slug` agent_out=`agent_out` efi=`gated` gate_out=`gated_out`
  2. *
    **result = "（无 API Key）BUILD dry-run decision=" + `decision` + " context=" + `path`**
    **mode = "dry"**
    **status = "dry"**

> run.attach_result slug=`slug` result=`result`
> run.put_section slug=`slug` section="Execution" content=`result`

L1 success only for live mode that is not gated_error / error / dry / blocked.

**l1_ok = False**
1. `mode` == "live"
  **l1_ok = True**
**v = > verify.run slug=`slug` root=`root` out=`out` l1_ok=`l1_ok` artifact_digest=`artifact_digest` result=`result`**
**promote = access(v, "promote_allowed")**
1. `promote`
  1. not `l1_ok`
    **promote = False**
**kpi = > metrics.read out=`out` root=`root`**
**ra_obs = > amort.record task=`task` decision=`decision` root=`root`**
**ra = > amort.read root=`root`**
**ra_s = > json.stringify value=`ra`**
**kpi_s = > json.stringify value=`kpi`**
> run.put_section slug=`slug` section="Metrics" content=`kpi_s`
> run.put_section slug=`slug` section="ReasoningAmortization" content=`ra_s`
1. `promote`
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="L3 verify+duplicate+adjudicate passed" promote_allowed=True
2. *
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="pending — mode=" + `mode` promote_allowed=False

> run.set_status slug=`slug` status="completed"

**err = None**
1. `agent_out`
  **err = > json.get value=`agent_out` key="error"**
2. *
  **_ = 1**
**sess = > session.link session_id=`session_id` surface="build" workbook_slug=`slug` run_id=`slug`**
**sid = [session_id](access(sess, "session_id"))**
`ret` =

| ok | mode | slug | decision | create_allowed | context_path | promote_allowed | status | error | result | session_id | async |
|----|------|------|----------|----------------|--------------|-----------------|--------|-------|--------|------------|-------|
| True | `mode` | `slug` | `decision` | `allowed` | `path` | `promote` | `status` | `err` | `result` | `sid` | False |

*ret*

## learn
    + `task`=""
    + `root`="."
    + `out`=".marqdo"
    + `failure`=""
    + `decision`=""
    + `constraint`=""
    + `quarantine`=False

LEARN — feed Marqdo knowledge learn (official compiler). Optional quarantine on failed skill.

1. not `task`
  **task = "qdagent engineering knowledge refresh"**
1. not `failure`
  **failure = ""**
1. not `decision`
  **decision = ""**
1. not `constraint`
  **constraint = ""**

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](access(gate, "ok"))**
1. not `ok`
  *gate*

1. `quarantine`
  1. `failure`
    > ensure_agent_plugin
    **qslug = > agent_goal_slug goal=`task`**
    > agent_kb_quarantine kb_dir=".marqdo/agent-kb" slug=`qslug` reason=`failure`

> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_TASK" value=`task`
> sys.env_set name="QDAGENT_FAILURE" value=`failure`
> sys.env_set name="QDAGENT_DECISION" value=`decision`
> sys.env_set name="QDAGENT_CONSTRAINT" value=`constraint`

`args` =

| a |
|---|
| "-c" |
| if [ -n "$QDAGENT_FAILURE" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --failure "$QDAGENT_FAILURE" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; elif [ -n "$QDAGENT_DECISION" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --decision-title "$QDAGENT_DECISION" --decision-body "$QDAGENT_DECISION" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; elif [ -n "$QDAGENT_CONSTRAINT" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --constraint-title "$QDAGENT_CONSTRAINT" --constraint-body "$QDAGENT_CONSTRAINT" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; else marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; fi |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
**stderr = [stderr](access(proc, "stderr"))**
1. `code` != 0
  `fail` =

  | ok | error | stderr |
  |----|-------|--------|
  | False | learn_failed | `stderr` |

  *fail*

`ret` =

| ok | stdout |
|----|--------|
| True | `stdout` |

*ret*

## run
    + `task`
    + `mode`="build"
    + `root`="."
    + `out`=".marqdo"
    + `session_id`=""

Dispatch ASK / BUILD / LEARN. Optional `session_id` links server Session (D10).

1. `mode` == "ask"
  *> ask task=`task` root=`root` out=`out` session_id=`session_id`*
2. `mode` == "learn"
  *> learn task=`task` root=`root` out=`out`*
3. *
  *> build task=`task` root=`root` out=`out` session_id=`session_id`*
