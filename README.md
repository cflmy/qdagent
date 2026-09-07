# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) 的文档驱动智能体助手（**求道**）。实现语言是 **Marqdo（`.mq.md`）**，不是 Python。

- **登录后使用**：打开站点先登录，无单独「后台」
- **对话界面**：首页即聊天；沉淀走 Marqdo（表单 / `求道-捕捉`）
- **大模型 / 语音分设**：保存前连通性测试
- **本地代理（:7432）**：仅 CORS/SSE 中继 + 触发 `marqdo run`（见 [缺口文档](doc/gaps/01-marqdo-hard-limits.md)）
- **知识平面**：`.mq.md` + `marqdo catalog` / `view`；不做默认向量 RAG
- **MCP**：stdio 宿主暂为 Python（GAP-03）；工具转调 Marqdo
- **Docker Compose** 默认交付

详见 [doc/README.md](doc/README.md)。**新增非 Marqdo 脚本必须引用并更新 `doc/gaps/`。**

## 本机快速开始

```bash
chmod +x scripts/mq.sh scripts/pack-marqdo.sh scripts/llm_proxy.py scripts/qdagent_mcp.py scripts/mq_bridge.py
./scripts/mq.sh run index.mq.md
# → UI  http://127.0.0.1:7431
# → 代理 http://127.0.0.1:7432/health
```

演示账号：**demo / demo**。

1. 「大模型设置」填 Key / Base URL / Model，保存（会先 ping）
2. 可选：「MCP 接入」复制配置
3. 对话后自动沉淀；CLI 亦可用：

```bash
./scripts/mq.sh run 求道-捕捉.mq.md
./scripts/mq.sh run 求道-询问.mq.md
./scripts/mq.sh view data/runs --port 7429 --no-open
python3 scripts/mq_bridge.py list
```

## Docker

```bash
cp .env.example .env
bash scripts/pack-marqdo.sh
docker compose up --build
```

## 入口

| 文件 | 作用 |
|------|------|
| `index.mq.md` | Web：登录 · 对话 · 笔记 · 设置 |
| `求道-捕捉.mq.md` | CLI 无 LLM 沉淀 |
| `求道-询问.mq.md` | CLI agent 询问 + 沉淀 |
| `求道-同步.mq.md` | 库 → `data/runs/*.mq.md` |
