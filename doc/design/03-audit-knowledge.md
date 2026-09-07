# 执行沉淀：审计轨迹与知识库

| | |
|---|---|
| 状态 | 设计草案 |
| 日期 | 2026-09-07 |
| 相关 | [原生设计](02-marqdo-native-agent.md) · Marqdo `stdlib-writeback` · `okf` · `catalog-cli` |

---

## 0. 目标

**每一次智能体执行，都必须留下可审计、可检索、可复用的 `.mq.md` 痕迹**——无论入口是 Web、语音还是外部 OpenAI 兼容客户端。

---

## 1. 为什么不是「只存 JSONL」

| JSONL / DB transcript | `.mq.md` 工作簿 |
|------------------------|-----------------|
| 人难读，难 diff | Markdown 天然可读 |
| 与执行逻辑分离 | 可再次 `marqdo run` |
| 审计要另建系统 | `git log` + `marqdo view` |
| RAG 只能吃文本碎片 | 可整文件作为 Skill/子程序 |

---

## 2. 目录与生命周期

```text
runs/
  20260907T063012Z-a1b2.mq.md     # 原始执行（不可变建议：只追加写回区）
sessions/
  sess_xxx/
    index.md                      # 指向 runs 的时间线
kb/
  topics/...
  promoted/                       # 从 runs 晋升的条目
.marqdo/                          # marqdo catalog 输出
```

### 生命周期

```text
create run skeleton
  → append process writebacks
    → finalize result
      → (optional) promote to kb/skills
        → catalog refresh
```

---

## 3. 写回策略

| 事件 | 写回内容 |
|------|----------|
| run_start | frontmatter + 用户原文 |
| model_delta（可选） | 不落盘或落「摘要」 |
| tool_call | 工具名、参数（脱敏）、开始时间 |
| tool_result | 结果摘要 / 错误 |
| model_final | 最终答复 |
| run_end | 耗时、token、status |

**脱敏**：API Key、Cookie、家庭住址等经钩子替换为 `[REDACTED]`。

**开关**：

- 默认：`audit=on`  
- `QDAGENT_AUDIT=off` 仅允许本地调试，且 API 面仍强制 on（产品决策：对外强制）。

---

## 4. 知识晋升（Promotion）

从 Hermes「自建 Skill」与 Marqdo OKF 吸收：

| 条件 | 动作 |
|------|------|
| 用户点「收藏为技能」 | 抽取稳定步骤 → `skills/<name>/SKILL.mq.md` |
| 自动：同目标成功 ≥ N 次 | 建议晋升（可人工确认） |
| 失败模式重复 | 写入 `kb/pitfalls/*.mq.md` |

晋升后的 Skill 应：

1. 含 YAML/frontmatter 描述（供检索）  
2. 含可执行 `# main` 或可调用 `##`  
3. 进入 `marqdo catalog` 索引  

---

## 5. 检索平面（与 Marqdo 对齐）

**已定（纠正）：不做默认 dense embedding / 向量知识库。**

知识权威是 **`data/runs/*.mq.md`（及 kb/skills）**：可浏览、可审计、可 `marqdo run` / 晋升。检索优先：

| 方式 | 用途 |
|------|------|
| 笔记 UI / `marqdo view` | 人读 |
| `marqdo catalog data/runs` | OKF 式索引（可删可再生） |
| 关键词（MCP `qd_search` / 标题+正文） | 找 **文档句柄**，再 `qd_get_run` 打开全文 |
| frontmatter / 大纲 | 结构化发现 |

片段摘录只作 **证据**，不是权威。对话默认 **不** 自动注入向量 top-k。

**原则：`.mq.md` 是真相；索引可丢可再生；向量不是本产品的知识平面。**

---

## 6. 外部 API 的审计挂钩

对 `POST /v1/chat/completions`：

1. 分配 `request_id` / `run_id`  
2. 将 `messages` 规范化写入 Run  
3. 若上游流式，先写占位，结束时 finalize  
4. 响应头可带 `X-QDAgent-Run-Id` 便于客户端关联  

即使客户端是 Cursor，**服务端仍保存完整沉淀**。

---

## 7. 合规与保留

| 项 | 建议 |
|----|------|
| 保留期 | 可配置；默认永久（用户本地） |
| 导出 | `runs/` zip + catalog |
| 删除 | 按 session/run API；支持硬删 |
| 多用户 | 路径隔离 `tenants/<id>/runs`（预留） |

---

## 8. 验收用例

1. Web 问一句「现在几点」→ `runs/` 新增文件且含工具调用写回。  
2. 用 curl 打 `/v1/chat/completions` → 同样新增 run，且 `X-QDAgent-Run-Id` 存在。  
3. `marqdo catalog runs`（或 kb 根）生成可浏览索引。  
4. git diff 可看懂一次失败原因。
