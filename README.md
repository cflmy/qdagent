# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) 的文档驱动智能体助手（**求道**）。对标 OpenClaw / Hermes，差异化在于：

- **笔记式界面**浏览每次执行与知识库（而非纯聊天墙）
- **双轨接入**：OpenAI 兼容 API（当模型用）+ **MCP**（继续用编辑器自带 AI，也能沉淀知识）
- **默认 Docker Compose 部署**（数据卷即审计仓库）

实现语言：**Marqdo（`.mq.md`）**，不是 Python。

详见 [doc/README.md](doc/README.md)。

## 本机快速开始

前提：`marqdo` 在 `PATH`（推荐 `~/.local/bin`），且 `marqdo ext list` 中 web / agent / llm 为 yes。

```bash
# 包装脚本会设置 MARQDO_EXT=~/.marqdo/ext（仓库外必须）
chmod +x scripts/mq.sh scripts/pack-marqdo.sh

# 干跑沉淀一条笔记 → data/runs/*.mq.md + 笔记库
./scripts/mq.sh run 求道-捕捉.mq.md

# 可选：有 OPENAI_API_KEY 时走一轮 agent.step
cp .env.example .env   # 填密钥
./scripts/mq.sh run 求道-询问.mq.md

# 启动笔记库 Web（默认 :7431）
./scripts/mq.sh run index.mq.md

# 原生浏览 runs
./scripts/mq.sh view data/runs --port 7429 --no-open
```

## Docker

```bash
cp .env.example .env
bash scripts/pack-marqdo.sh    # 打包本机 marqdo + 扩展进 docker/
docker compose up --build
# → http://127.0.0.1:7431
```

数据落在 `./data`（`runs/` / `qdagent.db` 等）。

## 入口文件

| 文件 | 作用 |
|------|------|
| `index.mq.md` | 笔记库 Web（ext/web） |
| `求道-捕捉.mq.md` | 无 LLM 沉淀 |
| `求道-询问.mq.md` | agent 询问 + 沉淀 |
| `求道-同步.mq.md` | 库 → `data/runs/*.mq.md` |
| `lib/run.mq.md` | 写盘 / 入库辅助 |
