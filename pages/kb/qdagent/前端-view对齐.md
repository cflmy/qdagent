# 前端：全量对齐 marqdo view

求道站点的页面真相只有一条：**阅读面全量对齐 `marqdo view`，上方只加一条产品对话条**。其余壳层都是错误遗留，不得再实现、不得再扩写。

**实现状态：** `pages/index.mq.md#serve` 对照 marqdo `src/view` 原样迁入级联（view-base.css /
reader.css / assets），用 `view output` 生成官方 document-surface，合成进同一 DOM 的
`body.reader-page`，并叠底部浮动对话胶囊（对齐 reader-dock 玻璃岛）；同宿主提供 `/api/chat`。禁止 iframe、禁止
改写 reader 选择器到 mq-document、禁止改 marqdo 源码。

---

## 1. 正确结构（自上而下）

```text
┌─────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────────────────┐
│              marqdo view 阅读面（全量对齐）                │
│         米白底 · 衬线正文 · 结构/叙述保真 · 金色强调        │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  [插件库][知识库][工作区] 上传 模型  输入  (金)发送  停止   │
│              ← 底部浮动对话胶囊（对齐 reader-dock）         │
└─────────────────────────────────────────────────────────┘
                 ○ 刷新 设置 (运行) 清理 更多  ← view dock
```

- **底部浮动对话胶囊**：视觉对齐 `reader-dock`（玻璃底、圆角岛、金色主按钮）。内含三标签 + 上传/模型/输入/发送/停止。
- **面板**：标签打开浮动面板，不替代阅读面，不做左侧常驻导航。
- **阅读面**：视觉与结构令牌对齐 `marqdo view` 的 `reader.css`（`--bg #fcf9f5`、`--ink #29251f`、`--gold #b88a45`、衬线正文、阅读行长）。站点不得另起一套工作台壳。

交互与结构分文件：结构在 `pages/components/`，样式在 `pages/styles/shell.mq.md`，行为在 `pages/public/client.mq.md`。

---

## 2. 必须揪出并停用的错误设计

下列写法来自旧文档或本轮误实现，**一律作废**：

| 错误形态 | 出处（遗留） | 为何错 |
|---|---|---|
| 左栏会话/笔记/知识库 + 中栏 Chat + 右栏资源的 DesktopFrame 工作台 | `old/doc/design/multi-provider-and-knowledge-workbench-2026-10-25.md`、`agent-capabilities-and-preview-2026-10-27.md`、旧 `frontend/src/components/layout/DesktopFrame.tsx` | 把求道做成通用 IDE/Chat 壳，阅读面不是 view |
| 默认着陆 Chat、底部续写抽屉、ChatGPT 式主界面 | `old/doc/design/06-web-ui-and-voice.md` 中的反模式与早期落地 | 与「默认是笔记/知识浏览」及 view 阅读面冲突；且顶栏对话条已取代底栏 |
| 自定义左侧结构目录 + 右侧正文 + **底部**对话栏 + 右下角**浮标** + 全屏工作区遮罩 | 本仓误写的 `pages/components/{nav,float,workspace}.mq.md`、`pages/index.mq.md` 旧叙述、`pages/styles/shell.mq.md` 的 fab/veil 几何 | 自造工作台几何，不是 view；浮标与底栏都不是正确产品壳 |
| 对话条内塞「模型 + 知识库 + 插件」三组下拉 | 旧 `pages/components/chat.mq.md` selectors | 插件库/知识库/工作区应是上方三个标签，不应挤进窄长条 |

`old/doc/next/001.md` / `002.md` 与 `old/.cursor/rules/doc-next-immutable.mdc` 仍是架构真相源，但其中偏「工程知识浏览器导航树 / Notebook 中心」的 UI 草图，落到本站点时必须收敛为：**view 阅读面 + 顶栏三标签与窄对话条**，不得借机恢复 DesktopFrame。

---

## 3. 验收口径

1. 首屏阅读面单独截取时，应能被认成 marqdo view 阅读页（令牌、衬线、行长），而不是侧栏工作台。
2. 产品控件收敛为底部浮动对话胶囊（可与 view dock 叠放）；无左栏工作台、无右下角另造浮标。
3. 窄长条控件集合恰好是：上传、模型、输入、发送、停止。
4. 三标签打开的是面板，不改阅读面的 view 语义。
5. 源码与样式只通过 `marqdo call` 与 `.mq.md` 维护，不引入第二套前端工程。

---

## 4. 文件职责（实现时）

| 文件 | 职责 |
|---|---|
| `pages/components/chat.mq.md` | 悬浮对话壳（暂缓装配）：三标签 + 窄长条 |
| `pages/components/panels.mq.md` | 插件库 / 知识库 / 工作区三个面板 |
| `pages/components/main.mq.md` | view 阅读面正文 |
| `pages/components/index.mq.md` | 装配：顶栏 → 阅读面 → 面板 → 运行时 |
| `pages/public/generated/reader.css` | 官方 view 主题原文（逐字节，不改写选择器） |
| `pages/styles/shell.mq.md` | 仅 Document 适配层；禁止另造配色或工作台壳 |
| `pages/public/client.mq.md` | 标签开合、发送/停止、上传、模型 |
| `pages/index.mq.md` | 入口叙述与本设计一致 |

废弃不再装配：`nav.mq.md`、`float.mq.md` 的旧职责任（文件可留作废止说明，但不得进入 `nodes` 拼接链）。

## 5. 阅读面必须是真实 marqdo 文档

不得再用 components 拼普通 Markdown 冒充阅读面；不得 iframe；不得把 reader.css
选择器改写成 `mq-document`；不得修改 marqdo 源码（只读对照）。

迁入路径（对照 `marqdo/src/view/html.rs`、`reader.css`、`document.rs`）：

1. 原样 vendoring → `pages/public/generated/{view-base,reader}.css` 等
2. `marqdo view output index.mq.md --no-exec --out pages/public/generated/view-site`
3. `compose` 注入顶栏对话壳 → 同一 `body.reader-page` DOM
4. `serve`：`web.prepare` + `layout=bare` + `body_class=reader-page` + 合成 intro

对外演示：

marqdo call pages/index.mq.md serve --effects plugin,fs.read,fs.write,network.write,process.exec --fs-root .

像素核对仍可用：`marqdo view index.mq.md --port 7429 --no-open`（只读对照，非产品入口）。
