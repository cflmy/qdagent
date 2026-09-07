# Marqdo 能力缺口（qdagent 缺陷文档）

| | |
|---|---|
| 状态 | 现行约束 · 随 Marqdo 升级修订 |
| 日期 | 2026-09-07 |
| 原则 | **能 Marqdo 则 Marqdo**；非 Marqdo 脚本必须引用本文条目，并在脚本头注释标明 |

## 1. 产品原则

求道的实现语言与知识形态是 **Marqdo（`.mq.md`）**。  
凡使用 Python / Shell / 其他语言，**仅允许**作为：

1. Marqdo **暂时做不到**的宿主适配（见下表），或  
2. 调用 `marqdo run …` 的薄封装（业务仍在 `.mq.md`）。

新增非 Marqdo 代码时：

1. 在本文增加或引用一条 **GAP-xx**  
2. 在脚本文件头写明：`Marqdo gap: GAP-xx — …`  
3. 在 PR / 提交说明里点名缺口，禁止 silently 用脚本语言重做知识平面

## 2. 缺口清单

### GAP-01 · 浏览器 → 上游 LLM 的同域流式中继

| | |
|---|---|
| 需要 | 浏览器调用 OpenAI 兼容 API 时绕过对方 CORS；并 **SSE 原样转发**（`text/event-stream`） |
| Marqdo 现状 | `ext/web` 有 CORS 中间件、页面/表单/JSON-DB 查询路由、`lib/net` 有缓冲 `http_*`；**没有**「任意 POST → 管道上游 SSE」的自定义流式路由 |
| 现行绕过 | `scripts/llm_proxy.py` 的 `/proxy` · `/proxy/stream` |
| 解除条件 | Marqdo web 支持用户声明的流式反向代理路由，或浏览器 WASM/`fetch` 效应能安全直连且上游开放 CORS |
| 相关脚本 | `scripts/llm_proxy.py` |

### GAP-02 · 任意 HTTP 处理函数可调用用户 `##`（如 `lib/run.写出`）

| | |
|---|---|
| 需要 | Web 请求（如对话自动沉淀）在同进程内执行 `lib/run.沉淀`，写 `data/runs/*.mq.md` + 入库 |
| Marqdo 现状 | `/_form/*` 仅做 **SQL CRUD**；`configure json=` 仅做 **DB 查询 JSON**；请求路径 **不能** 调用 workbook / `lib/*.mq.md` 中的 `##` |
| 现行绕过 | 对话优先 `POST /_form/note`（Marqdo 入库）；落盘用薄封装 `marqdo run 求道-同步.mq.md` / `求道-捕捉.mq.md`（`scripts/llm_proxy.py` `/store/*`） |
| 解除条件 | 支持「路由 → 指定 `.mq.md` 的 `##` + 请求体映射」，且可返回 JSON |
| 相关脚本 | `scripts/llm_proxy.py`（仅触发 CLI）、`scripts/mq_bridge.py` |

### GAP-03 · MCP Server 宿主（stdio / Streamable HTTP）

| | |
|---|---|
| 需要 | 作为 **MCP Server** 被 Cursor / Claude Desktop 拉起，暴露 `qd_*` 工具 |
| Marqdo 现状 | `ext/ai/agent` 仅有 MCP **客户端 fixture**（`mcp_list_tools` / `mcp_call`）；官方路线图「真 MCP」未交付；**无** stdio/SSE MCP Server |
| 现行绕过 | `scripts/qdagent_mcp.py`（stdio）；工具实现转调 `marqdo run 求道-*.mq.md` |
| 解除条件 | Marqdo 提供 MCP Server 扩展（stdio 与/或 HTTP），工具体可指向 `.mq.md` |
| 相关脚本 | `scripts/qdagent_mcp.py` |

### GAP-04 · 长期进程内嵌「第二监听端口」与 Marqdo web 同寿

| | |
|---|---|
| 需要 | 与 `marqdo run index.mq.md` 同生命周期的 `:7432` 中继，无需另起语言运行时 |
| Marqdo 现状 | 单次 `listen` 服务页面应用；无一等「同进程附加 TCP 服务」装配 |
| 现行绕过 | `scripts/mq.sh` 旁路拉起 `llm_proxy.py` |
| 解除条件 | GAP-01/02 并入主 web 端口后本缺口可关闭 |
| 相关脚本 | `scripts/mq.sh`、`scripts/llm_proxy.py` |

### GAP-05 · 跨模块持有 `web.db` 句柄再调用 `select` / 在纯 `marqdo run` 中使用 `agent_corpus_search`

| | |
|---|---|
| 需要 | 任意 `.mq.md` 中 `*store = > db.open*` 后 `store.select …`；或 `agent.corpus_search` 做关键词检索 |
| Marqdo 现状 | 在 **定义 db 的同一模块**内 `store.select` 正常；跨文件拿到返回的 store 再 `select` 报 `unknown object type db`。`agent_corpus_search` 在普通 `marqdo run` 下未注册 |
| 现行绕过 | `db/index.mq.md` 提供 `## recent`；`求道-列出` / `求道-搜索` 经此导出 JSON；关键词过滤在 `mq_bridge.py` 薄层完成 |
| 解除条件 | db 句柄可跨模块方法分发；或 `corpus_search` 在 CLI run 可用；或语言侧易用的列表 filter/JSON 累积 |
| 相关脚本 | `scripts/mq_bridge.py`（仅过滤） |

## 3. 已用 Marqdo 实现的部分（对照）

| 能力 | Marqdo 入口 |
|------|-------------|
| 写盘 + 入库沉淀 | `lib/run.mq.md` · `求道-捕捉.mq.md` |
| DB → `data/runs/*.mq.md` 同步 | `求道-同步.mq.md` · `lib/run.同步库` |
| 关键词检索（证据） | `求道-搜索.mq.md` 导出窗口 + `mq_bridge` 关键词过滤（GAP-05） |
| 最近笔记列表 | `求道-列出.mq.md`（`db.recent`） |
| Web 笔记 CRUD / 登录 / 设置 | `index.mq.md` + `ext/web` |
| CLI 询问沉淀 | `求道-询问.mq.md` |

## 4. 非目标（不是缺口，是故意不做）

- 默认 **dense embedding / 向量知识库**（见 [design/03-audit-knowledge.md](../design/03-audit-knowledge.md)）  
- 用 Python 重写 Agent 编排或知识权威平面  

## 5. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-07 | 初版：GAP-01…05；脚本改为薄封装 + 标注 |
