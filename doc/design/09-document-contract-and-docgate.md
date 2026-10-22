---
title: 09 — 文档契约与门禁（智能体输出必须是可运行的 marqdo 文档）
description: >-
  qdagent 的输出契约：智能体的最终答复与沉淀笔记都必须是沙箱可运行的
  `.mq.md`。本文给出契约结构、机械校验（execution/docgate.mq.md）、
  修复闭环、提示词收紧方式与路由对齐。
status: Accepted
---

# 09 — 文档契约与门禁

## 1. 问题

求道的一等真相是 `.mq.md`（见 `qdagent-2.0.md` 四真相与 `03-audit-knowledge.md`）。
但重构前存在三处破口：

1. 智能体最终答复是自由文本，可能既不可运行也不合 Marqdo 标记语法，
   直接沉淀就会产出无法 `marqdo run` 的笔记。
2. `lib/run.mq.md` 装配的笔记只有 `# 任务` / `# 结果` 两段叙述，
   没有 `# main`，因此沉淀物本身跑不起来。
3. 历史 `data/kb/整理-*.mq.md` 曾因把裸 JSON 证据行写进正文而解析失败
   （`trailing input in expression`）。

结论：需要一个**机械可校验的输出契约**与一个**修复闭环**，而不是只在提示词里
写「请输出 marqdo 文档」。

## 2. 契约结构

一份合格的求道文档同时满足两种读者：人（阅读）与解释器（执行）。
这就是 Marqdo 的 multi-view 理念：`.mq.md` 既是文稿也是程序。

| 顺序 | 节 | 面 | 内容 |
|------|----|----|------|
| 1 | `---` frontmatter | 机器 | `title` 必填，可含 `description` / `surface` / `session_id` |
| 2 | `# 任务` | 人 | 以叙述复述用户目标 |
| 3 | `# 结论` | 人 | 结论正文；逐行以文字开头 |
| 4 | `# main` | 机器 | 至少一条可执行语句（`**代码**` / `> 调用` / `*返回*`） |
| 5 | `# 验证` | 人 | 写明沙箱试跑结论与 stdout |
| 6 | `# 元数据` | 人 | GFM 表格：mode / slug / surface |

沉淀笔记用同一契约，把 `# 结论` 换成 `# 结果`：

```
--- → # 任务 → # 结果 → # main → # 元数据
```

`# main` 的内容必须是**无副作用**的：不写宿主文件、不联网、不加载插件，
只做计算与打印。它存在的意义是让文档被验证过，而不是完成副作用。

## 3. 机械校验：`execution/docgate.mq.md`

三段式门禁，每段失败都带结构化诊断：

| 段 | 函数 | 检查 | 失败输出 |
|----|------|------|----------|
| 1 | `## 提取` | 从原始输出里取出文档（剥离围栏、前后缀解释） | `stage=extract` · `missing_frontmatter` |
| 2 | `## 结构检查` | frontmatter / `# main` 存在且非空 / `# main` 外无 `##` / 叙述行无执行标记 | `stage=structure` · `narration_marker` / `empty_main` / `h2_outside_main` 等，带行号 |
| 3 | `## 沙箱试跑` | 写进 CoW 沙箱并 `sandbox.run` | `stage=sandbox` · 解析器原文诊断（如 `11:1: unknown function =`） |

返回 `{ ok, stage, doc, violations, stdout, error }`。
`## 修复提示` 把诊断翻成给模型看的一句话，`## 写入沉淀` 只在 `ok=true` 时落盘。

沙箱能力默认值（实测）：`fs_write=true (CoW only)`、`exec=false`、`net=false`、
`plugin=false`，宿主目录在 `commit` 前不变，因此试跑永远是安全的。

### 3.1 叙述行规则（为什么必须有）

Marqdo 把非标记行当叙述（注释），但**行首执行标记**会被当真执行。
实测会踩雷的写法：

| 行首 | 会被解析成 | 结果 |
|------|------------|------|
| 数字 `9 号是数字。` | 语句 | `unrecognized statement` |
| `-` | 循环 | `foreach needs a list` |
| `>` | 调用 | `unknown function` |
| `\|` | GFM 表格 | 表格上下文错误 |
| 裸 `[{"a":1}]` | 表达式 | `trailing input in expression` |

所以契约要求：**叙述行以文字开头**（字母或中文字符），执行代码只出现在
`# main`，反引号行内代码与围栏代码块不受限——后者是记录 JSON 证据的正确方式。

## 4. 提示词收紧

`agent/qdagent.mq.md` 的 `## 契约提示` 是唯一契约文本来源，ASK / BUILD
各自取用（BUILD 版追加 Reuse/Adapt/Create 判定要求）。要点：

1. 明确「答复里只能有这篇文档，禁止任何前言、后记、解释或围栏包裹」。
2. 给出固定结构清单与最小骨架。
3. 逐条列出叙述行禁区，并说明 `# main` 必须无副作用、必须跑通。
4. 要求结论数字来自 `# main` 实际输出，禁止编造运行结果。
5. 工具协议固定半角冒号 `CALL:tool_find` / `CALL:tool_reuse`
   （解析器只认半角，全角 `调用：` 不生效）。

## 5. 修复闭环

门禁失败不是终点，而是一次反馈：

```
agent.run → result → 门禁沉淀
                          ├─ ok  → 落盘 data/runs/<slug>.answer.mq.md
                          └─ 失败 → 契约修复(带诊断+原文) → agent.step 一轮
                                        └─ 再门禁：ok 落盘 / 仍失败则 reporter 记 gated_error
```

三条硬性质：

- **最多一轮修复**：避免把门禁变成第二个 agent 循环（H2 红线）。
- **失败绝不沉淀**：`gated_error` 时 `answer_path` 为空，原答复只进 workbook 证据。
- **修复提示含原文**：模型改自己的文档，而不是从零重写。

`mode` 取值新增 `gated_error`，与既有 `live` / `dry` / `blocked` / `error` 并列。
workbook 的 Evidence 行新增 `docgate_ok` / `docgate_stage` / `docgate_repaired` /
`answer_path` 四列，审计时可回溯门禁结论。

## 6. 沉淀笔记契约化

`lib/run.mq.md` 的 `## 装配正文` 产出契约形态：

```
--- title/description/surface/session_id ---
# 任务       ← 叙述
# 结果       ← 叙述
# main       ← > print text="<slug>"  +  *None*
# 元数据     ← GFM 表：slug / surface
```

实测：该笔记经门禁 `ok=true`（stdout 为 slug），且可直接
`marqdo run data/runs/<slug>.mq.md` 退出码 0。

拼接时 `"`、`*`、`|` 必须用 Unicode 转义（`\u{22}`、`\u{2a}`、`\u{7c}`），
否则会在被拼装的正文里提前闭合标记。

## 7. 整理笔记契约化

`lib/kb_format.mq.md` 的 `## 整理文稿` 是「笔记整理 · <关键词>」页面的生成器。
它曾把「建议动作」写成 `1.` / `2.` / `3.` / `4.` 编号列表——**行首数字在
Marqdo 里是语句**，于是整理页自己就不是一份合法文档（门禁 `narration_marker` 四连）。

改法：

1. 编号列表改为以文字开头的自然段（`把重复主题合并为…；把稳定偏好写回…；…`）。
2. 追加 `# main`：`> print text="organize: <query>"` + `*None*`，使整理页可运行。
3. 表格（证据表 / 笔记表）保留——表格是**结构行**，在 `# main` 之外属于合法叙述。

实测：

| 场景 | 门禁 | `marqdo run` |
|------|------|--------------|
| 空数据 | `ok=true`，stdout `organize: host-fix` | 退出码 0 |
| 真实命中（2 条证据 + 2 条笔记） | `ok=true`，`violations=[]` | 退出码 0 |

## 8. 回归自检

`execution/docgate-selftest.mq.md` 用 5 条固定夹具断言门禁自身没有退化，
无 API Key 也能跑，已接入 `scripts/ci-knowledge-gate.sh`（失败即非零退出）。

| 夹具 | 期望 | 断言 |
|------|------|------|
| 干净文档 | 通过 | `ok=true` 且 stdout 非空 |
| 行首数字文档 | 结构阶段拦下 | `stage=structure` |
| 语法错文档 | 沙箱阶段拦下 | `stage=sandbox` |
| 缺入口文档 | 结构规则命中 | violations 含 `missing_main` |
| 整理页 | 通过 | `ok=true` |

输出单行 JSON：`{"ok":true,"passed":true,"cases":5,"ok_count":5,"fail_count":0,"failures":"[]"}`。

**双向验证**：故意把行首数字夹具的期望阶段改成 `sandbox`，
自检立即返回 `{"passed":false,"ok_count":4,"fail_count":1,"failures":["digit_stage"]}`；
改回后恢复全绿。这说明自检不是在空跑。

设计约定（写自检时踩到的坑，也是给后来者的护栏）：

- 断言函数只返回布尔/字符串，**状态用返回值串联**，不依赖函数间共享变量
  （模块级变量在不同 `##` 之间不可见）。
- 函数名与叙述里不要出现裸的入口章节名与参数名（会被当变量插值），
  描述文字里的记号一律用行内代码包裹。
- 拼接夹具正文时 `"`、`*`、换行必须用 \u 转义，否则提前闭合标记。

## 9. 路由对齐

产品面新增一条只读校验路由，供 UI 解释「为什么这份笔记还不能跑」：

| 路径 | 方法 | 函数 | 说明 |
|------|------|------|------|
| `/api/eng/docgate` | POST | `api.eng_docgate` | 任意文本过完整门禁，返回 `{ok, stage, doc, stdout, violations}` |

其余路由不变：`/api/eng/*`（31 条工程面）、`/api/store/*`（笔记面）、
`/v1/models`、`/v1/chat/completions`（C2b 薄网关）、`/llm` `/asr` `/tts`（代理）。
前端 `frontend/src/lib/api.ts` 的路由集合与 `serve.mq.md` 的 `调用表`
逐条一致；本文件只做增量（`/api/eng/docgate`），不删不改既有路由，
`scripts/check-v1-thin.sh` 七项断言全部通过。

`/v1/chat/completions` 的 `choices[0].message.content` 现在是**通过门禁的文档**
而非自由文本——对 OpenAI 兼容客户端来说仍是字符串，但对求道来说可运行、可沉淀。

## 10. 验收证据

| 项 | 命令 | 结果 |
|----|------|------|
| 坏输出拦截 | `gate.门禁` on 行首数字 | `ok=false stage=structure violations=[{line:6,rule:narration_marker}]` |
| 语法错拦截 | `gate.门禁` on `**x = = 3**` | `ok=false stage=sandbox error="11:1: unknown function `=`"` |
| 好输出通过 | `gate.门禁` on 契约文档 | `ok=true stdout="answer computed\n"` |
| 沉淀笔记可运行 | `marqdo run data/runs/<slug>.mq.md` | 退出码 0，stdout 为 slug |
| 整理笔记可运行 | `整理文稿` 产出后 `marqdo run` | 退出码 0，stdout 为 `organize: <query>` |
| 门禁沉淀 | `qd.门禁沉淀` | `sedimented=true` / 失败时 `false` 且无文件 |
| 验证套件 | `marqdo run cli/求道-验证.mq.md` | `{"ok":true,"passed":true}` |
| v1 薄网关 | `./scripts/check-v1-thin.sh` | `OK (C2b)` |
| 门禁自检 | `marqdo run execution/docgate-selftest.mq.md` | `{"passed":true,"cases":5}` |
| 全量 CI | `./scripts/ci-knowledge-gate.sh` | 退出码 0，`ci-knowledge-gate: OK` |

## 11. 上游缺陷记录

本次实现对 Marqdo 运行时提出的问题已整理成册并提交在 Marqdo 仓库
（`marqdo@f2d651e`）：

`marqdo/doc/research/qdagent-refactor-defects-2026-10.md`

与本文直接相关的三条：

| ID | 与契约的关系 |
|----|--------------|
| D3 | 叙述行行首执行标记（数字 / `-` / `>` / `\|` / `[`）→ 中文文档解析失败，正是契约要规避的根因 |
| D4 | `sandbox.run source=` 报错丢上下文，影响门禁诊断质量 |
| D5 | `[key](map)` 键缺失硬崩；`sandbox.run` 成功形状无 `error` 键 |

## 12. 红线与不做的事

- 门禁是**验证步骤**（four-truths 的 Verification），不是第二个 agent 循环。
- 不引入新的知识真相源：门禁结论写进既有 workbook Evidence 与磁盘文档。
- 不改 `doc/next/*`；不新增 DSL 或表方言；`# main` 内禁止副作用。
- 门禁失败时不伪造「已通过」，不静默丢弃原答复。
