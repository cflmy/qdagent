# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) 的文档驱动智能体助手（**求道**）。实现语言是 **Marqdo（`.mq.md`）**，不是 Python。

- **登录后使用**：打开站点先登录，无单独「后台」
- **对话界面**：首页即聊天；可沉淀为本轮笔记
- **模型自助配置**：大模型 / ASR / TTS 的 OpenAI 兼容 API
- **笔记库**：每次执行与对话沉淀为 `.mq.md`
- **Docker Compose** 默认交付

详见 [doc/README.md](doc/README.md)。

## 本机快速开始

```bash
chmod +x scripts/mq.sh scripts/pack-marqdo.sh
# 若曾跑过旧库，建议清一次：rm -f data/qdagent.db

./scripts/mq.sh run index.mq.md
# → http://127.0.0.1:7431
```

演示账号：**demo / demo**（登录后进对话页）。

在「设置」填写 `llm_api_key` 等后即可聊天。也可：

```bash
./scripts/mq.sh run 求道-捕捉.mq.md
./scripts/mq.sh run 求道-询问.mq.md
./scripts/mq.sh view data/runs --port 7429 --no-open
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
