# Marqdo 解析 / 运行时缺陷（qdagent 开发实录）

| | |
|---|---|
| 状态 | **Open**（影响 0.3.7；部分已有求道侧规避） |
| 日期 | 2026-09-09 |
| 运行时 | Marqdo **0.3.7**（本机 `plugins/web` 另打 SSE 反缓冲补丁） |
| 发现场景 | 联网搜索（`lib/web_search.mq.md`）+ 对话 SSE 流式 + 记一笔双栏语音 |
| 原则 | 记入本文后可用 `scripts/legacy/` 或语法规避；上游修复后改 **CLOSED** |

> 相对 [`01-marqdo-hard-limits.md`](01-marqdo-hard-limits.md)（产品级能力缺口已关）：本文记录 **语言 / 宿主行为缺陷**，不是「缺功能」。

## 1. 摘要

在实现 `api.web_search` 时，`## search` 体在 `marqdo run --dump-ast` 下被**静默截断**：后续语句（含 `fs.read_text` / `**out**`）不进 AST，函数隐式返回 `None`。  
HTTP invoke 再把 `Null` 包成 `{"ok":true}`（约 0–2ms），表现为「接口成功但无 hits」。根因是 **`.mq.md` 解析器对部分字面量 / 反引号嵌套处理不当**，不是业务逻辑写错。

## 2. 缺陷清单

### GAP-06 · 命名参数反引号嵌套截断函数体 — **Open**

| | |
|---|---|
| 症状 | `*code = > sys.exec cmd="python3" args=`args`` 之后的语句全部丢失 |
| 复现 | `marqdo run --dump-ast`：`exec` 行本身可不出现，或出现后无后续 `assign` / `return` |
| 根因（观察） | 命名参数写成 `args=`args`` 时，闭合反引号与赋值包裹 `*…*` 冲突，解析器提前结束当前 `##` 体 |
| 求道规避 | 写成 **`args=args`**（值侧不加反引号），例如：`*code = > sys.exec cmd="python3" args=args*` |
| 上游期望 | 与文档示例 `args=`args``（见 `lib/sys.mq.md` / `lib/subtask.mq.md`）一致解析，或文档改为禁止嵌套并给出规范 |

**最小对照（同一文件内）：**

```text
# 会截断后续语句
*code = > sys.exec cmd="python3" args=`args`*

# 可解析完整函数体
*code = > sys.exec cmd="python3" args=args*
```

### GAP-07 · `json.parse text=[…]` 非空数组字面量截断 — **Open**

| | |
|---|---|
| 症状 | `*args = > json.parse text=["scripts/legacy/web_search.py"]*` 之后语句丢失 |
| 复现 | `--dump-ast` 仅保留到该 `assign`；`text=[]` 则正常 |
| 根因（观察） | 赋值以 `*…*` 包裹时，JSON 数组的 `]` 与闭合 `*` 相邻（`]*`），易被误切；非空数组更易触发 |
| 求道规避 | 先 `text=[]`，再 `json.append`；路径字符串用拼接：`"scripts" + "/legacy" + "/web_search.py"`，经变量传入 `item=` |
| 上游期望 | `text=[…]` 作为命名参数文本字面量应整段吸收，不截断函数体 |

### GAP-08 · invoke 将 `Null` 伪装成成功 JSON — **Open**

| | |
|---|---|
| 位置 | `plugins/web/src/invoke.rs`：`Value::Null => json!({ "ok": true })` |
| 症状 | `##` 实际返回 `None`（含解析截断后的隐式空返回）时，HTTP 仍 **200** + `{"ok":true}`，耗时接近 0 |
| 影响 | 前端 / 联调误判「搜索成功」；与真正的 `{"ok":true,"hits":[…]}` 难以区分 |
| 求道规避 | 约定业务成功必须带可观察字段（如 `hits` / `provider`）；冒烟检查字段而非仅 `ok` |
| 上游期望 | `Null` → `{"ok":false,"error":"null result"}` 或 500；至少不要与成功同形 |

### GAP-09 · `sys.exec` 只返回退出码、不捕获 stdout — **Open**（设计摩擦）

| | |
|---|---|
| 位置 | `src/host/sys.rs` → `Ok(Value::Int(status.code()))` |
| 症状 | 无法把子进程 stdout 直接绑到 `*raw*`；必须「进程写文件 + `fs.read_text`」 |
| 求道现状 | `scripts/legacy/web_search.py` 写 `data/tmp/last_web_search.json`，由 `lib/web_search.mq.md` 回读 |
| 上游期望 | 可选 `capture=True` 返回 `{code, stdout, stderr}`，减少临时文件 |

### GAP-10 · 流式代理缺少反缓冲响应头 — **Mitigated（本机补丁）**

| | |
|---|---|
| 症状 | 经 Nginx 等反代时 SSE 可能整包缓冲；行业惯例需 `Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no` |
| 关闭策略 | 本机已改 `plugins/web/src/proxy.rs` 并重装 `~/.marqdo/native/libweb.so`；补丁说明见 `doc/patches/marqdo-0.3.7-sse-anti-buffer.patch` |
| 备注 | qdagent「看起来不流式」主因仍是模型先推 `reasoning_content`（前端已修）；反缓冲头是代理层加固 |
| 上游期望 | 合并进官方 0.3.7+ web 插件 |

### GAP-11 · `表单装配` 无法嵌入自定义页面布局 — **Open**

| | |
|---|---|
| 症状 | `网页.页面` 的 `引言=` 与 `表单装配` 渲染为 **兄弟节点**（`.main-intro` 后再 `.site-form`），无法把表单直接放进引言里的双栏/分区 DOM |
| 发现场景 | 记一笔「语音转写 \| 自己写」双栏：只能把壳写在引言 HTML，再用前端 `appendChild(form)` 挪进右栏 |
| 求道规避 | `public/notes-voice.js` 启动时把 `form` 移入 `#qd-note-form-mount` |
| 上游期望 | 页面提供插槽（如 `表单插槽="#id"`）或允许表单装配目标容器选择器 |

### GAP-12 · 未设置 `MARQDO_EXT` 时 import 报错过简 — **Open**（DX）

| | |
|---|---|
| 症状 | 直接 `marqdo run index.mq.md` → `error: cannot resolve import \`ext/web/网页.mq.md\` from`，不提示缺环境变量 |
| 影响 | 旧进程仍占端口时，用户以为「已重启」但页面无变化；易误判前端没改 |
| 求道规避 | 一律 `./scripts/mq.sh run …`（脚本导出 `MARQDO_EXT=$HOME/.marqdo/ext`） |
| 上游期望 | 报错附带：`hint: set MARQDO_EXT to the directory that contains web/` |

## 3. 非 Marqdo 问题（勿混入上游）

| 现象 | 结论 |
|------|------|
| DDG Instant Answer `connection timed out` | 本机出口网络限制；已用 Bing CN HTML 回退 |
| 仅读 `delta.content` 时 UI 长时间空白 | 模型 / OpenAI 兼容协议的 reasoning 通道；属客户端契约，非 Marqdo bug |
| Win+H 网页无法调用 | Windows 系统听写无 Web API；Chrome/Edge 用 Web Speech API 做实时听写 |
| Web Speech 无音量反馈 | 浏览器不暴露听写用的 MediaStream；求道侧另开 `getUserMedia`+Analyser 做 VU |
| 外配 ASR 与实时听写 | 实时听写已改浏览器原生，设置页去掉 ASR Key/URL；仅保留听写语言 + TTS |
| 知识库 git / 变更提案 | `kb_git.py` / `kb_changes.py` 经 `sys.exec` + `data/tmp/*.json` 回传（GAP-09） |

## 4. 求道侧落地

| 文件 | 作用 |
|------|------|
| `lib/web_search.mq.md` | 规避 GAP-06/07；exec + 读临时 JSON |
| `scripts/legacy/web_search.py` | 弥补 GAP-09 + 网络回退 |
| `scripts/legacy/kb_git.py` / `kb_changes.py` | 知识库 git + 变更提案（GAP-09） |
| `lib/kb_git.mq.md` / `lib/changes.mq.md` | Marqdo 封装 |
| `public/qd-api.js` / `chat.js` | reasoning 流式；不以裸 `ok` 判断搜索 |
| `public/memory.js` | 变更 diff 审查 / git 回滚 |
| `doc/patches/marqdo-0.3.7-sse-anti-buffer.patch` | GAP-10 |
| `scripts/mq.sh` | 规避 GAP-12（强制 `MARQDO_EXT`） |
| `public/notes-voice.js` | 规避 GAP-11（DOM 挪表单）+ 双栏听写 / VU |

## 5. 建议上游回归用例

1. `## f` 内：`*xs = > json.parse text=["a","b"]*` 后紧跟 `*y = 1*` / `**y**`，AST 须含全部语句。  
2. `*c = > sys.exec cmd="true" args=`xs`` 与 `args=xs` 两种写法，函数体后续语句均须保留。  
3. invoke 某 `##` 返回 `None` 时，HTTP 不得为成功形 `{"ok":true}` 且无 error。  
4. `app.proxy` `stream=true` 响应含 `cache-control` / `x-accel-buffering`。  
5. `表单装配` 可指定挂载点（或文档明确「仅能跟在引言后」并提供官方双栏样例）。  
6. 未设置 `MARQDO_EXT` 时，错误信息含环境变量名与期望目录结构。

## 6. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-09 | 初版 GAP-06…10（联网搜索与 SSE 开发中确认） |
| 2026-09-09 | GAP-11/12（记一笔布局 + 裸 `marqdo run` 启动失败）；语音 VU 记入非 Marqdo 表 |
| 2026-09-09 | 知识库 git / 变更提案落地说明（kb_git · kb_changes） |
