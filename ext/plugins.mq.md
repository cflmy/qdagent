---
markup: occlusion
title: 已安装插件的共同清单
---

此文件只登记安装事实：身份、可读名称、ABI 依赖与实际工程入口。它是 Markdown 字面数据，不是模型动作表，也不解释工具名或业务阶段。Go 页面与 Marqdo 权限文稿都通过官方 document.read_table 读取同一张表，避免新增插件只在一侧登记而界面缺失。

标准库始终启用并从实际 lib 文件发现；本表中的扩展可由用户关闭。安装与授权是两种事实：文件存在不会自动批准某个角色的内部函数。新增扩展应先提供实际入口及能力文稿，再登记该表；修改后服务会根据文件版本刷新元数据，模型仍只能取得当前根文稿明确提供的函数。

## installed

下面每行描述一个已接入包。空 ABI 表示复用内建或其他公开库的组合扩展，不意味着一个不存在的外部服务已经成功执行。实际加载、运行失败与插件开关仍在各自边界核对，不能靠添加一行生成假的能力。

| @ | id | name | abi | entry | description | operations |
|---|---|---|---|---|---|---|
| 1 | "ai" | "模型与智能体" | "libagent.so" | "ext/ai/index.mq.md" | "模型通信、角色隔离与可追溯子任务" | "collect_events,offline_example" |
| 2 | "web" | "网页与阅读渲染" | "libweb.so" | "ext/web/index.mq.md" | "官方 View 与可复用文档组件" | "site_playbook,layout_rules,preview_markdown,preview_nodes" |
| 3 | "net" | "网络与实时连接" | "libweb.so" | "ext/net/index.mq.md" | "HTTP 读取与网络连接能力" | "client_get" |
| 4 | "data" | "数据与存储" | "libweb.so" | "ext/data/index.mq.md" | "SQLite 与结构化数据处理" | "memory_cache,transaction_roundtrip" |
| 5 | "security" | "身份与权限" | "libweb.so" | "ext/security/index.mq.md" | "身份核验与权限边界" | "check_permission" |
| 6 | "quantum" | "量子计算" | "libquantum.so" | "ext/quantum/index.mq.md" | "量子线路与状态模拟" | "bell_circuit,bell_phi_plus,bell_analysis" |
| 7 | "linalg" | "线性代数" | "liblinalg.so" | "ext/linalg/index.mq.md" | "矩阵求解与基础数值运算" | "solve_example" |
| 8 | "engineering" | "工程工具" | "libengineering.so" | "ext/engineering/index.mq.md" | "受限构建与工程校验" | "" |
| 9 | "qdagent" | "任务运行与持久流" | "libqdagent_transport.so" | "ext/qdagent/index.mq.md" | "持久化执行事件与任务资源" | "" |
| 11 | "root-skill" | "根 SKILL · 文档驱动流程" | "libqdagent_transport.so" | "ext/root-skill/index.mq.md" | "意图澄清、框架确认、受限并行与用户验收" | "" |
| 12 | "browser" | "隔离浏览器与真实来源" | "libqdagent_transport.so" | "ext/browser/index.mq.md" | "只读浏览公开页面，保存真实来源、正文快照与截图" | "" |
| 10 | "office" | "办公文档与演示" | "" | "ext/office/index.mq.md" | "Word/PPT 多布局校验、PNG 图文、修订与 PDF 交付" | "" |
| 13 | "search" | "联网搜索" | "libqdagent_transport.so" | "ext/search/index.mq.md" | "自部署 SearXNG 搜索，保留候选来源及上游故障" | "" |
| 14 | "ocr" | "PaddleOCR 文字识别" | "libqdagent_transport.so" | "ext/ocr/index.mq.md" | "识别授权上传的图片与 PDF，保存原件依据与真实文字" | "" |
| 15 | "knowledge" | "知识编译与重现实验" | "libqdagent_transport.so" | "ext/knowledge/index.mq.md" | "论文与源码分段、独立验证、私有知识版本、公式计算及结果自写回" | "" |
