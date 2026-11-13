---
markup: occlusion
title: 求道 · 让知识成为可以执行的工作
description: 对话使用 Markdown，实际行动使用 Marqdo call；拓展即插件，每个任务有自己的工作目录与可追溯执行记录。
import:
  development: skills/marqdo-dev/qdagent.mq.md
  plugins: pages/control/plugins.mq.md
  sessions: pages/control/sessions.mq.md
---

> 运行入口已迁移：生产站点使用 React + Go + Python，见 README.md 与 deploy/build.sh。本文件保留为 Marqdo 工具与旧宿主的开发参考，不再用其 serve 启动生产站点。实际智能体任务仍通过登记的 marqdo call 完成。


求道是使用 Marqdo 开发的工程智能体。你可以自然描述任务，阅读普通 Markdown 回答，
再从执行面板查看它实际请求了哪个模型、调用了哪个工具、使用哪些参数、得到了什么结果。
回答中的一句“已完成”不能代替真实操作：实际工作必须通过登记工具形成 marqdo call。

阅读界面沿用 Marqdo View 的纸色、字体与布局。模型不再被迫输出 Marqdo；编号清单、强调、
表格和代码围栏按普通 Markdown 显示。需要执行的程序则写成可阅读的 .mq.md 文件，并通过
工具调用。这两个入口各自清楚，阅读一段回答不会偷偷执行其中的代码。

## 从一个任务开始

工具栏中的“模型”选择下一轮使用的本机模型；“任务”可以新建与切换会话；“执行”显示
当前任务的实际经过。切换任务不停止其他会话，每个任务独立保存对话、事件、作业和工作目录。
文件工具只操作该任务的工作目录，目录位置显示在任务面板。

当前基础工具包括目录列举、文件读取、原子写入、文本搜索、Marqdo 程序调用、库手册阅读、
标准库纯函数调用、已登记拓展操作调用，以及启用网络拓展后的 HTTP 读取。模型必须提供登记身份与命名参数，
不能自己选择可执行文件、服务器文件根或新增权限。小模型若未调用工具就声称完成操作，
界面会明确提示该声明尚未验证。

执行卡片根据真实开始与结束事件显示状态。点击可查看输入、实际 marqdo call 参数、退出与
返回值；轮询只更新卡片中的状态和结果，不重建详情容器。正在运行的步骤有轻微动画，
完成、失败、取消和中断都有实际状态，没有编造的进度百分比，也不公开模型私有思维链。

## 拓展即插件

标准库是固有能力，始终启用，不能关闭。拓展库通过 ABI 与现有能力接入后登记为插件，
可以启用或停用；面板显示真实版本、文档入口与原生产物可用性。目录存在不等于能力已安装，
前端按钮变化也不等于服务端授权已改变。

工具执行前重新核对插件开关。停用 AI 后，任务不会再请求下一轮模型；停用网络拓展后，
不能继续使用其 HTTP 工具。用于阅读设置和停止已有作业的宿主管理仍然可用。已经发生的
效果不会因为关闭插件而消失，取消也不等于回滚已写入文件。

允许在本工程更新已有拓展，以接入实际开发缺口。本轮网络客户端适配位于 ext/net，
使用独立版本 2.7.0-qdagent.1。Marqdo 编译器与仓库源码保持只读。新的 OS 能力确有缺口时，
先登记缺口与移除条件，再以最小 ABI 插件接入，业务逻辑继续写在可读的 Marqdo 源码中。

## Docker 与统一身份登录

当前容器统一通过 7964 提供服务，内置 Marqdo、Python、Node、SQLite、Git 与基础网络工具。
程序目录只读，以 UID 10001 运行，不挂载主机工作区或 Docker socket。SQLite、任务文件与对话
位于独立数据卷，重建镜像不会清空数据。身份来自 id.cflmy.cn，任务和插件偏好按真实主体隔离。

回调根据登录入口动态选择：远程 https://agent.qdqc.com，以及本机 http://127.0.0.1:7964
和 http://localhost:7964，统一使用 /oidc/callback 路径。QDAGENT_OIDC_REDIRECT_ORIGINS
限定允许的来源，身份站需要登记每个完整回调。反向代理须正确转发 Host 与来源协议。客户端密钥只从私有 Docker secret 挂载读取，不在镜像、源码、
公开页面或模型工具参数中保存。公开 healthz 只报告在线状态，首页、API 与静态资源另有认证。

[容器工程入口](deploy/manage.mq.md) 提供 prepare、build、up 和 status；
[运行入口](deploy/index.mq.md) 组合 SQLite、认证、OIDC 与现有 Web 资源。
开发时可以使用 compose.dev.yaml 的独立代码卷，不把主机仓库直接挂进智能体容器。
业务与文件操作继续使用 marqdo call；Python 和 Node 环境用于显式接入的插件与受控开发。

## 开发与验证的入口

先阅读 [可调用开发手册](skills/marqdo-dev/qdagent.mq.md)。它已经组织好安装、隔离回归、
浏览器状态检查与服务启动，开发者不需要临时编写 Python、Shell 或另一套前端业务脚本。

| 目的 | 直接调用的文件与函数 | 真实证据 |
|---|---|---|
| 安装并准备隔离工程 | skills/marqdo-dev/qdagent.mq.md · prepare_acceptance | 当前 ABI 构建与专用目录 |
| 文件、授权与会话回归 | 同文件 · offline | 实际读写、Schema、开关和过期请求断言 |
| 前端状态回归 | 同文件 · browser_state | 官方 WASM 中的两任务、展开与后续轮询 |
| 运行用户站点 | 同文件 · serve | 本机 7430 端口的实际监听 |
| 隔离 HTTP 服务 | 同文件 · prepare_http，再 serve_test | 独立工程根与测试会话 |
| 原生缺口测试 | 同文件 · native_tests | 生命周期锁与旧令牌发布保护 |
| 源码规范 | 同文件 · check | 参数契约与逐函数叙述比例检查 |

安装与离线回归需要 plugin、fs.read、fs.write、process.exec、time.read、random.read。
启动服务还需要 network.read 与 network.write。浏览器测试传入已安装 Chromium 的绝对路径；
测试不安装浏览器、不接触个人配置。正式服务与隔离服务各自阻塞监听，由调用终端管理生命周期。

本轮回归分别观察后端、真实本机模型和官方 WASM，不能把其中一层冒充整站浏览器验证。
当前环境曾出现 Chromium HTTP 导航超时，因此必须保留这项实际限制。长期在线、多用户鉴权、
任务分页和完整知识自进化流水线仍需独立开发，当前的多任务目录隔离不等于多用户权限系统。

## 阅读源码即可开发

先把复杂界面拆成布局块，直到叶节点能够用简单 Markdown 或原生控件表示。多文件入口用
index.mq.md 组织职责，单文件标准库无需额外入口。函数标题下立即给参数表与返回表，
叙述超过一半；代码嵌入说明文字，用方括号表达意图，用圆括号提供真正生效的调用。

| 阅读顺序 | 源码职责 |
|---|---|
| pages/control/plugins.mq.md | 固有能力与拓展注册、版本、可用性和开关 |
| pages/control/sessions.mq.md | 会话身份、独立根与安装上下文 |
| pages/agent/catalog.mq.md | 模型可见的工具与可信执行元数据 |
| pages/agent/runner.mq.md | 有界决策、真实观察、结束与取消 |
| pages/agent/executor.mq.md | Schema、实时授权、marqdo call 与效果账本 |
| pages/api/dialogue.mq.md | 普通 Markdown 档案与安全阅读 |
| pages/public/client.mq.md | 直接事件状态、请求身份与稳定卡片更新 |
| pages/views/shell.mq.md | 最小组件布局与官方桥接装配 |

所有文件读取、搜索和撰写通过 Marqdo 原生能力完成。已有
[文件开发入口](skills/marqdo-dev/files.mq.md) 可以复用。标准库在 lib，拓展在 ext，
任务运行数据在 data/sessions，智能体文件在 data/workspaces，验收产物在 .marqdo。
README.md 与本入口保持逐字节一致，旧归档不作为当前能力来源。

求道后续仍以知识编译为方向：把说明清楚输入与输出的行为变成可调用单元，把经验和结论变成
有出处的可引用节点，再通过已有 knowledge、find、verify 与冲突检查建立一致性证据。
这些规划应由真实任务逐步验证，不能用一个漂亮的对话界面宣称整个知识闭环已经实现。

## serve

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| port | number | 7430 | 本机端口 |
| host | text | "127.0.0.1" | 绑定地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞运行实际站点 |

Use `port`=7430 and `host`="127.0.0.1"。先通过开发手册安装 ABI，再调用本入口。
它复用同一份开发任务，不启动第二套运行时、不清空历史，也不在启动时请求模型。
本机服务不自动配置公网访问或多用户鉴权，生产部署应另行完成对应边界。

Return *[启动求道](development.serve(port=`port`, host=`host`))*.

## plugin_catalog

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 实际固有能力、拓展版本与当前授权 |

本入口直接读取可信注册表，供 CLI 或开发智能体了解已安装的能力。缺失 ABI 会明确显示
不可用，固有标准库始终启用。读取目录不会替用户切换插件，也不执行目录中描述的函数。

Return *[阅读实际能力目录](plugins.catalog())*.

## task_catalog

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 真实会话与当前工作目录 |

这里按已登记上下文列举任务，首次建立默认任务。它不复制用户文件、不停止后台进程，也不
把任务标题当作目录。当前状态来自对应作业，不能根据模型回答是否使用“完成”来推断。

Return *[列出独立工作任务](sessions.list())*.

模型面板支持本机模型名及自定义远程 OpenAI 兼容/Ollama 服务，密钥加密保存。单文件支持 50 MiB 分块上传；决策与接口返回的思考在对话中展开。开发与验收见 [模型和大文件输入](doc/gaps/models-upload.mq.md)。
