---
markup: occlusion
title: 真实模型的函数段并行验收
import:
  table: lib/table.mq.md
---

这份文稿保存验收任务的公开意图和职责，宿主测试程序不拼接模型提示词。它只用于独立临时工作区，不替真实用户批准正在进行的任务。

## goal

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 测试任务的公开需求 |

本次检查两个独立函数在同一主文稿中并行填写。两者都基于一个实际可访问的公开页面说明有限事实，不提供未知主题的科学结论。来源失败必须保留诊断，不能依赖模型记忆来冒充已经阅读。完成后等待测试审阅，不替用户点击最终验收。

Return *"实际读取 https://example.com/ ，分别写两段不少于80字的中文说明：第一段解释该网站的示例用途，第二段说明使用示例地址的边界。每段引用实际读取的网页，不编造未观察事实。两个独立函数分别实现，保留可核对来源和用户审阅。"*.

## units

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 主方案中的两个独立函数职责 |

每行只对应一个具名函数，不是两个新建工程。第一段只解释用途，第二段只解释边界，互不修改源码，也不需要读取另一段的实现。公开网页可以分别读取，但独立测试仍只看各自的规格。此前某个公开站点不可达的记录应帮助作者选择其他来源，不能改变网络防护。文本不是正式科学研究，检查通过也不能代替用户的领域审阅。

The live check uses two independent authors, not two independent projects. They share a blueprint and the same permitted public source, while their implementation bodies and trial snapshots remain separate. The host supplies only the approved model profile and temporary directories. It does not manufacture article contents, source observations or a passing contract. A rejected address is recorded before the run so recovery must use a genuinely readable alternative. Ending at review preserves the human acceptance gate.

We **none = table.empty_list()**.

`units` =

| @ | id | title | purpose | mode | depends_on |
|---|---|---|---|---|---|
| 1 | "purpose" | "示例网站用途" | "实际打开 https://example.com/ ，用不少于80字中文说明该页面提供示例域名的用途，正文以 Markdown 链接引用实际读取的页面。只说明已观察内容，不添加未经验证的科学或商业结论。输入是当前请求，返回本函数自己的说明文字。" | "research" | `none` |
| 2 | "boundary" | "示例地址使用边界" | "独立打开 https://example.com/ ，用不少于80字中文解释示例网站用途的边界，正文引用实际读取页面并说明它不是正式业务服务。不读取第一段实现，不编造页面未给出的具体事实。输入是当前请求，返回本函数自己的说明文字。" | "document" | `none` |

Return *units*.
