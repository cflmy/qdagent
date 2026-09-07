# 模型接入矩阵：LLM · 多模态 · ASR · TTS · Embeddings

| | |
|---|---|
| 状态 | 调研完成（持续增补） |
| 日期 | 2026-09-07 |
| 原则 | **OpenAI 兼容优先**；本地与国产云可并列；语音链路可拆可合 |

---

## 0. 适配层抽象

```text
ProviderSpec:
  id, kind (llm|vlm|asr|tts|embed|realtime),
  base_url, api_key_env, default_model,
  api_mode (chat.completions | responses | realtime | audio.transcriptions | audio.speech),
  extras (region, organization, ...)
```

路由：`assistant.models.yaml` → `primary` + `fallbacks[]`。  
与 Marqdo `ext/ai/llm` 对齐：底层仍走 `OPENAI_BASE_URL` 风格 HTTP。

---

## 1. 文本 LLM（Chat / Completions）

### 1.1 国际云（OpenAI 兼容或官方）

| Provider | 代表模型（示例） | 备注 |
|----------|------------------|------|
| OpenAI | GPT-4.1 / GPT-4o / o 系列 | 标准；Tools / Vision |
| Anthropic | Claude 4/3.5 系 | 官方 Messages API；可用代理转兼容或原生适配 |
| Google | Gemini 2.x | 官方或 OpenAI 兼容网关 |
| xAI | Grok | OpenAI 兼容常见 |
| OpenRouter | 聚合 200+ | Hermes 常用；一键换模 |

### 1.2 国产云（常见 OpenAI 兼容网关）

| Provider | 代表 | 备注 |
|----------|------|------|
| 阿里云百炼 / 通义 | qwen-max / qwen-plus / qwen-vl | 兼容模式广泛 |
| 智谱 | glm-4 / glm-4v | |
| 月之暗面 Kimi | moonshot-* | 长上下文 |
| DeepSeek | deepseek-chat / reasoner | 性价比 |
| 百川 / 零一 / 讯飞等 | 各系列 | 按兼容 endpoint 接入 |
| 硅基流动 / Novita 等 | 聚合 | 类似 OpenRouter |

### 1.3 本地

| 方案 | 说明 |
|------|------|
| Ollama | `http://localhost:11434/v1` |
| vLLM / SGLang / llama.cpp server | OpenAI 兼容 |
| LM Studio | 本地 GUI + 兼容 API |

**MVP 必测：** OpenAI 官方或兼容网关 + Ollama 各一。

---

## 2. 视觉 / 多模态（VLM）

| 类型 | 示例 | 用途 |
|------|------|------|
| 云端 VLM | GPT-4o、Claude Vision、Qwen-VL、Gemini | 截图理解、文档图 |
| 本地 VLM | LLaVA、Qwen2-VL GGUF | 隐私场景 |
| 专用 OCR | PaddleOCR、各云 OCR | 扫描件；可作工具而非主模型 |

Agent 工具形态：`## 看图` 上传/路径 → Provider Hub `vlm.complete`。

---

## 3. 语音识别 ASR

| 方案 | 类型 | 语言/特点 | 接入方式 |
|------|------|-----------|----------|
| **OpenAI Whisper API** | 云 | 多语言 | `/v1/audio/transcriptions` |
| **GPT-Realtime-Whisper** | 云流式 | 低延迟转写 | Realtime API |
| **FunASR** | 本地工具包 | SenseVoice / Paraformer；中英日韩粤；情感/事件 | 自建 OpenAI 兼容 `/v1/audio/transcriptions` |
| **SenseVoiceSmall** | 本地 | CPU 可用 | FunASR |
| **Paraformer 流式** | 本地 | 低延迟中文 | WebSocket |
| **Deepgram Nova** | 云 | 极低延迟 | 专有 API → 适配器 |
| **AssemblyAI** | 云 | 电话场景强 | 适配器 |
| **Azure STT / 讯飞 / 阿里 ASR** | 云 | 中文生态 | 适配器 |
| **faster-whisper** | 本地 | 部署简单 | 包一层兼容 API |

**与 OpenClaw 关系：** FunASR 已有 OpenClaw realtime 插件生态，可参考其音频传输习惯。

**MVP 建议：**  
- 云：OpenAI transcriptions  
- 本地：FunASR SenseVoice（OpenAI 兼容服务）

---

## 4. 语音合成 TTS

| 方案 | 特点 |
|------|------|
| OpenAI `tts-1` / `gpt-4o-mini-tts` 等 | 简单，`/v1/audio/speech` |
| OpenAI Realtime（S2S） | 端到端语音代理 |
| ElevenLabs | 音质；多语言 |
| Edge TTS / 系统 TTS | 成本低 |
| CosyVoice / ChatTTS / Fish-Speech | 本地中文 |
| Azure / 讯飞 / 阿里 | 中文云 |

**MVP：** OpenAI speech 或 Edge TTS；后期加 CosyVoice。

---

## 5. 实时语音 Agent（Speech-to-Speech）

| 方案 | 何时选 |
|------|--------|
| OpenAI Realtime（GPT-Realtime-2 等） | 要打断、工具调用、低延迟会话 |
| Whisper/FunASR + LLM + TTS 管道 | 要可控、可审计中间文本、成本敏感 |
| LiveKit / Pipecat 等编排 | 电话/WebRTC 生产 |

**qdagent 决策倾向：**  
默认 **管道模式**（ASR→文本 Run→LLM→TTS），保证 `.mq.md` 有完整文本轨迹；Realtime 作为可选 Provider（文本侧仍尽量落「转写+答复」摘要）。

---

## 6. Embeddings（检索）

**求道默认不做 dense embedding。** 知识检索对齐 Marqdo：`.mq.md` + catalog/view + 关键词找文档句柄。

若将来作可选证据层（非权威）：

| 方案 | 备注 |
|------|------|
| OpenAI `text-embedding-3-*` | 兼容 |
| bge-m3 / gte / jina-embeddings | 本地多语 |
| 云厂商 embedding | 按兼容接口 |

首期与产品默认：**FTS / 关键词 / catalog**。

---

## 7. 代码 / 推理专用模型

| 类型 | 示例 | 用途 |
|------|------|------|
| 代码模型 | Codex 系、DeepSeek-Coder、Qwen-Coder | 编程助手模式 |
| 推理模型 | o 系列、DeepSeek-R1、QwQ | 复杂 plan；注意延迟与写回「推理摘要」 |

---

## 8. Provider 配置示例

```yaml
providers:
  openai:
    kind: llm
    base_url: https://api.openai.com/v1
    api_key_env: OPENAI_API_KEY
  ollama:
    kind: llm
    base_url: http://127.0.0.1:11434/v1
    api_key_env: OLLAMA_API_KEY   # 可空
  funasr:
    kind: asr
    base_url: http://127.0.0.1:8000/v1
    default_model: sensevoice
  openai_tts:
    kind: tts
    base_url: https://api.openai.com/v1
    default_model: gpt-4o-mini-tts

routing:
  chat: [openai, ollama]
  asr: [funasr, openai]
  tts: [openai_tts]
```

---

## 9. 结论

1. **统一 OpenAI 形状**降低接入成本（与 Marqdo llm ext、外部编辑器一致）。  
2. **语音默认管道化**以保障审计文本；Realtime 可选。  
3. **本地 FunASR + 云 Whisper** 覆盖中文与兜底。  
4. 后续任务：为每个 Provider 写连通性测试用例（见路线图 T4）。
