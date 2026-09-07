# Docker 部署（推荐）

| | |
|---|---|
| 状态 | 设计定稿 · 推荐默认部署方式 |
| 日期 | 2026-09-07 |
| 相关 | [总览](../00-overview.md) · [笔记/MCP](07-notes-ui-and-mcp.md) · [OpenAI API](05-openai-compatible-api.md) · [安全](08-security.md)（待写） |

---

## 0. 为什么求道「最好用 Docker」

求道不是单文件脚本，而是一组长期共存的能力：

| 能力 | 容器化收益 |
|------|------------|
| 笔记 UI + Gateway +（可选）MCP | 一键起多端口/多进程，环境一致 |
| 强制写盘 `runs/` `kb/` `skills/` | **命名卷或绑定挂载**，宿主机可 git 审、备份 |
| OpenAI 兼容 API / MCP | 与编辑器同网段或 `host` 网络，不污染本机 Python/Node |
| ASR（FunASR 等）/ 本地 LLM | 重依赖隔离；GPU 可选 `--gpus` |
| 沙箱工具执行 | 可再套 sibling 容器或 Docker-out-of-Docker（受控） |
| 密钥 | `.env` 注入，不进镜像层 |

OpenClaw / Hermes 也强调「装在自己的机器上长期跑」；求道同样是 **常驻 Gateway**，Docker（Compose）是最稳的交付形态。

**本机 `marqdo` CLI 仍可用于开发调试**；**演示与生产默认走 Compose**。

---

## 1. 推荐拓扑

```text
                   ┌─────────────────────────────────────────┐
  Browser / IDE ──►│  qdagent (gateway)                      │
                   │  :7431  OpenAI /v1 + Notes UI           │
                   │  :7432  MCP (SSE) 或 stdio 另述         │
                   └─────────────┬───────────────────────────┘
                                 │ volume
                                 ▼
                          qdagent-data/
                            runs/ kb/ skills/ sessions/
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         (可选) llm            (可选) asr         (可选) tts
         ollama/vllm          funasr             …
```

单机 MVP：**一个 `qdagent` 服务 + 一个 data 卷** 即可；模型可指到宿主机或公网兼容 API。

---

## 2. Compose 草图（规范）

```yaml
# docker-compose.yml（示意；demo 仓库内会提供可运行版本）
services:
  qdagent:
    build: .
    ports:
      - "7431:7431"   # UI + OpenAI-compatible
      - "7432:7432"   # MCP SSE（可选）
    env_file: .env
    volumes:
      - qdagent-data:/data
      # 开发时可改为: ./data:/data
    restart: unless-stopped

volumes:
  qdagent-data:
```

### 环境变量（约定）

| 变量 | 含义 |
|------|------|
| `QDAGENT_DATA` | 容器内数据根，默认 `/data` |
| `QDAGENT_API_KEY` | Bearer Token |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | 可选本机推理；MCP-only 模式可空 |
| `QDAGENT_AUDIT` | 默认 `on` |

---

## 3. 数据持久化与审计

| 路径（容器） | 宿主机 | 说明 |
|--------------|--------|------|
| `/data/runs` | volume 或 `./data/runs` | 每次执行笔记 |
| `/data/kb` | 同上 | 知识库 |
| `/data/skills` | 同上 | 技能 |
| `/data/sessions` | 同上 | 会话索引 |

建议：

1. **绑定挂载到 git 仓库旁的 `data/`**（demo），便于直接打开 `.mq.md`。  
2. 生产用命名卷 + 定时备份。  
3. **切勿**把含密钥的 `.env` 打进镜像。

---

## 4. 网络与编辑器接入

| 场景 | 做法 |
|------|------|
| 本机 Cursor → `/v1` | `base_url=http://127.0.0.1:7431/v1` |
| 本机 Cursor → MCP SSE | `url=http://127.0.0.1:7432/sse`（或文档最终路径） |
| 本机 Cursor → MCP stdio | 不经 Docker 网络：宿主机跑 `docker exec -i … qdagent-mcp` 或单独 stdio 包装脚本 |
| 局域网同事访问 UI | 绑定 `7431`，务必鉴权 + 勿裸奔公网 |

---

## 5. 与「沙箱执行」的关系

工具若需跑命令：

| 级别 | 做法 |
|------|------|
| MVP | Gateway 内受限目录读写，无任意 shell |
| 增强 | 另起 `executor` 容器，Docker socket **只读/代理** 或 rootless |
| 禁止 | 无鉴权将 Docker socket 暴露给模型 |

---

## 6. 资源建议

| 配置 | CPU | 内存 | 备注 |
|------|-----|------|------|
| 仅 Gateway + 云端模型 | 1 核 | 512MB–1GB | demo 足够 |
| + FunASR CPU | 2+ 核 | 2–4GB | SenseVoice |
| + 本地 7B LLM | 按模型 | 8GB+ | 建议独立容器/机 |

---

## 7. 运维清单

- [ ] `docker compose up -d --build`  
- [ ] `curl /health`  
- [ ] UI 打开笔记库  
- [ ] `POST /v1/chat/completions` 后 `/data/runs` 有新文件  
- [ ] （可选）MCP `qd_capture` 落盘  
- [ ] 日志：`docker compose logs -f qdagent`  
- [ ] 升级：重建镜像，**保留 volume**

---

## 8. 决策

1. **默认交付物 = Docker Compose**；README 以 Compose 为首要安装路径。  
2. 开发者可本机跑 Python/Marqdo，但 CI/演示以容器为准。  
3. Demo 版本必须提供可运行的 `Dockerfile` + `docker-compose.yml` + `data/` 挂载示例。
