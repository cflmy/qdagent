---
markup: occlusion
title: 求道智能体闭环开发与验收手册
import:
  fs: lib/fs.mq.md
---

## handbook

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实验收状态；以下叙述说明实现与边界 |

求道的核心不是把聊天框旁边增加若干按钮，而是把目标、计划、执行依据和可交付文件放在同一个可阅读、可执行、可恢复的工程中。所有业务用 Marqdo 编写，模型只提出结构化动作，真正的文件、网络和插件操作仍形成 marqdo call。本轮闭环已通过真实模型与 Docker 验收，后文记录实现入口、实际证据与能力边界。

阶段：模型接入；应产生的真实能力：用户授权的 USTC 模型配置加密保存，只用于开发身份；验收标准：真实动作协议请求成功，密钥不进入源码、镜像或日志。

阶段：工作计划；应产生的真实能力：目标、验收标准、步骤和状态持久化；验收标准：刷新恢复；完成状态有实际工具和产物依据；失败不伪装完成。

阶段：办公产物；应产生的真实能力：可编辑 DOCX、PPTX 与 Markdown 源文件；验收标准：真正生成、重新解包、检查内容、可在界面下载；不能只有一段“已完成”文字。

阶段：子智能体；应产生的真实能力：角色、目标、输入、工具子集、预算和结果协议；验收标准：单层有界派生、同一用户、独立目录、随父任务取消；父任务只据实际结果收口。

阶段：产物工作台；应产生的真实能力：计划、子任务、执行记录、预览、版本和下载；验收标准：不重建正在展开的节点，不把模型输出当程序执行。

阶段：完整验收；应产生的真实能力：较强模型驱动一份报告与一份演示文稿；验收标准：真实文件、摘要、执行记录与子任务结果可追查；Docker 内非 root 复验。


为什么采用可执行任务文档


计划保存为可读的任务材料，参数、返回、验收和当前状态放在明确位置。模型可以先读库的源码手册，再调用公开工具，不需要猜测宿主内部命令。执行后的证据反过来写回任务记录，使得阅读不只是展示答案，也能理解做过什么、哪些尚未验证，以及如何继续。

子智能体不是另开一段无法控制的聊天。父任务给它明确的小目标和输入，宿主选择工作目录、继承更小的工具集合和相同的身份；子任务无权继续无限派生。研究、撰写、复核是最初三种角色，但角色名称不授予任何额外权限。真实子任务状态和结果进入父任务执行树，用户能停止，而不是只能看到一个转圈动画。

办公文件不能靠扩展名伪装。基础文字报告和标题正文型演示先用原生 ZIP 与 XML 数据生成真实 Office Open XML。复杂表格、图片排版、导入转换与 WASM 预览再按实际缺口接入插件，公共接口仍接收结构化内容和返回真实产物。Office 模板是声明数据，规划、文件写入、打包和交付流程仍是 Marqdo。

插件研究依据


[CasualOffice/core](https://github.com/CasualOffice/core) 提供 Rust 文档引擎及 WASM/C FFI；项目仍处于早期 API 阶段，接入前需要固定版本和验证兼容性。[ppt-rs](https://github.com/yingkitw/ppt-rs) 提供 PPTX 生成能力，适合作为更复杂演示排版的候选。[Shiva](https://github.com/igumnoff/shiva) 提供多格式解析与生成，可作为转换适配候选。以上均是候选，不因出现在这里就宣称已经安装或可用。

基础包结构遵循 Microsoft 的 [WordprocessingML](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document) 与 [PresentationML](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document) 文档。文件打包通过 Marqdo archive，文本转义通过现有库，不引入 Python 或业务 JavaScript。


已实现的能力与验收


能力：持久计划；真实入口：[plan.mq.md](../../pages/agent/plan.mq.md)；当前边界：目标、验收、步骤、真实文件证据与摘要；有待办不能宣布成功。

能力：办公文件；真实入口：[office/index.mq.md](../../ext/office/index.mq.md)；当前边界：文字 DOCX、标题正文型 PPTX、源稿；render_pdf=true 附带真实 PDF。

能力：子智能体；真实入口：[delegate.mq.md](../../pages/agent/delegate.mq.md)；当前边界：单层顺序，每父运行最多三个、子任务八轮、父任务二十四轮。

能力：产物工作台；真实入口：[artifacts.mq.md](../../pages/agent/artifacts.mq.md)；当前边界：计划、子任务、版本、认证后的预览与下载；当前单附件响应一 MiB。

能力：开发手册；真实入口：[qdagent.mq.md](../../skills/marqdo-dev/qdagent.mq.md)；当前边界：office_acceptance、workbench_acceptance、live_agent、live_status、live_audit 可直接 call。

能力：完整验收；真实入口：[agent-verify.mq.md](../../deploy/agent-verify.mq.md)；当前边界：真实模型、独立文件摘要、完成计划与实际子任务产物检查。


本轮验收于 2026-11-13 在容器中使用 USTC smart/default 完成了真实任务：reviewer 评审，writer 在独立目录生成 DOCX 和 PDF，父任务生成 PPTX 和 PDF，五个计划步骤均有真实文件依据。audit 独立检查通过。应用以 10001:10001 运行，应用文件系统只读，服务仍使用唯一对外端口 7964。开发凭据只加密保存在 agent-development 身份下，不自动开放给其他登录用户。

Office 内容由 Marqdo、声明式 XML 模板和原生 ZIP 生成；标准库没有 Office 字体排版引擎，因此通过已注册 engineering ABI 使用镜像里的 LibreOffice。只立即渲染本次刚生成的安全模板文稿，不公开任意上传二进制转换或任意命令工具。镜像已有中文字体，实际 PDF 图像和文本检查均通过。

父子交接返回明确的父任务 artifacts 路径，避免把子答文 artifacts/id 简写误作父目录文件。独立回归检查了转换后路径与实际摘要。撰写只承诺未来而未运行工具时，有限纠正后保留未完成。任务取消停止父调用组，子调用继承该组，已有文件与未知效果保留。

确定性回归通过计划恢复、缺少证据拒绝、实际 Office 与 PDF、自己的下载、跨用户拒绝及受限子工具拒绝。Chromium 回归通过两任务切换、轮询后详情保持展开、居中浮层关闭与工作台链接。独立回环 HTTP 测试完整保留了含非 UTF-8 的七字节下载样本，测试服务已经停止。原生 Web 安全及 bytes 响应测试通过。

修改文件使用官方逐函数契约与叙述比例检查，阈值仍为 50%；没有修改相邻 Marqdo 源码，没有新增 Python 或业务 JavaScript。结构化证据在 data/agent-development.json 与 data/agent-validation.json。复杂图片、图表、导入编辑、并行或多层子任务尚未实现；上面的 Rust/WASM 项目仍是候选，不把研究链接当成已安装插件。验收任务未联网核验文稿事实，也明确披露这一点。

Return *[读取实际开发验收记录](status())*.

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前开发验收记录，不等于任务自动完成 |

此入口读取持续开发记录，缺失时明确返回尚未建立。记录必须与实际测试对应，不能凭模型计划把功能标为通过。公开界面只展示已安装的真实能力，开发阶段与尚未通过的验收保留在此工程文档，避免用户把路线图误当作已交付产品。开发模型凭据由私有配置保存，不属于该记录。

1. fs.exists(path="data/agent-development.json")
  Return *[读取实际开发记录](fs.read_json(path="data/agent-development.json"))*.
Return *"开发验收记录尚未建立，按各阶段的实际产物和测试推进。"*.
