# 网络界面与语音交互

| | |
|---|---|
| 状态 | 设计草案（已对齐笔记式差异化） |
| 日期 | 2026-09-07 |
| 对标 | OpenClaw Control UI · Hermes Web UI · **Obsidian/备忘录式阅读** |
| 相关 | [模型矩阵](../research/04-models-and-providers.md) · [**笔记 UI 与 MCP**](07-notes-ui-and-mcp.md) · Marqdo `ext/web` |

---

## 0. 目标

提供 **浏览器可访问的求道界面**：默认是 **笔记/知识库**，并支持对话抽屉与 **语音输入（ASR）/ 可选 TTS**。  
所有交互仍进入同一套 Run 沉淀管道。  
完整差异化说明见 [07-notes-ui-and-mcp.md](07-notes-ui-and-mcp.md)。

---

## 1. 信息架构（笔记优先）

| 页面 | 功能 |
|------|------|
| **库 / 今日**（默认着陆） | 笔记时间线；卡片进正文 |
| **笔记正文** | `.mq.md` 阅读画布；内联写回批注；Run again / 晋升 |
| **对话抽屉** | 次级；发送后跳到新笔记 |
| **Skills / KB** | 知识浏览与编辑入口 |
| **Models** | Provider 状态、连通性 |
| **Voice** | ASR/TTS 选择 |
| **Settings** | API Token、MCP 说明、沙箱、审计 |

### 1.1 主界面要素（修订）

- **不是**默认大气泡墙；气泡仅在抽屉。  
- 正文：纸感排版 + 可执行块高亮 + 批注 callout。  
- 顶栏：标题、标签、`run_id`、模型、耗时。  
- 输入：在抽屉或正文底部「续写」；📎 + 🎤。  
- 「查看源文件」打开原始 `.mq.md`。

---

## 2. 技术选型建议

| 层 | 选项 | 建议 |
|----|------|------|
| 后端 | Marqdo web ext / 薄宿主 | 与 API / MCP 同机或反代 |
| 前端 | SPA | **阅读体验优先**；可参考笔记应用双栏布局 |
| 实时 | SSE（聊天）· WebSocket（语音） | 聊天先 SSE |
| 文档渲染 | 增强 `marqdo view` 或专用渲染器 | 必须理解 Marqdo 标记，避免当纯 MD |

品牌：工具感纸面，避免通用「AI 仪表盘」紫光卡片堆砌。

---

## 3. 语音交互模式

### 模式 A — 管道（默认，利审计）

```text
Mic → ASR Provider → 文本
        → 与打字相同进入 Agent（生成 Run）
        → 文本答复
        →（可选）TTS → Speaker
```

Run 中保存：`user_audio_transcript`、`assistant_text`、可选 `tts_voice`。

### 模式 B — Realtime S2S（可选）

```text
Mic ⇄ Realtime Provider（含工具）
        → 旁路写出「转写+答复摘要」到 Run
```

若 Provider 不返回文本，用并行 ASR 补转写，保证沉淀。

---

## 4. 浏览器能力需求

| 能力 | 用途 |
|------|------|
| `getUserMedia` | 麦克风 |
| WebAudio / MediaRecorder | 录音分片 |
| AudioElement / WebAudio | 播放 TTS |
| 可选 WebRTC | 后期电话场景 |

移动端：优先管道模式；注意 iOS 音频会话限制。

---

## 5. ASR/TTS 接入点（产品）

设置页可选：

- ASR：`openai-whisper` | `funasr-local` | `deepgram` | …  
- TTS：`openai-speech` | `edge-tts` | `cosyvoice-local` | …  
- 开关：`auto_tts_on_reply`  

详见模型矩阵文档。

---

## 6. 与 OpenClaw / Hermes UI 的差异化

| 竞品 | qdagent |
|------|---------|
| 强通道/设备 | 强 **轨迹与知识** 可视化 |
| Canvas 伴侣 | 可用 Marqdo view 嵌文档，而非另造 Canvas 协议（首期） |
| 会话为主 | 会话 + **Runs 审计墙** 并列一级导航 |

---

## 7. MVP 范围

1. 单页 Chat + Runs 列表。  
2. SSE 流式。  
3. 麦克风 → 上传整段音频 → ASR → 自动发送。  
4. TTS 按钮「朗读答复」。  
5. 显示 `run_id` 与文件路径。

非 MVP：移动原生壳、唤醒词、电话 SIP（可学 OpenAI Realtime SIP / OpenClaw companion）。
