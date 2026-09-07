# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) 的文档驱动智能体助手（**求道**）。对标 OpenClaw / Hermes，差异化在于：

- **笔记式界面**浏览每次执行与知识库（而非纯聊天墙）
- **双轨接入**：OpenAI 兼容 API（当模型用）+ **MCP**（继续用编辑器自带 AI，也能沉淀知识）
- **默认 Docker Compose 部署**（数据卷即审计仓库）

详见 [doc/README.md](doc/README.md)、[doc/design/07-notes-ui-and-mcp.md](doc/design/07-notes-ui-and-mcp.md)、[doc/design/08-docker-deploy.md](doc/design/08-docker-deploy.md)。

## 本机前提

- `marqdo` 已在 `~/.local/bin`（v0.3.5）
- 扩展：`marqdo ext list` 中 agent / llm / web 等为 yes
- 演示：见仓库内 Docker demo（`docker compose up`）
