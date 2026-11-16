---
markup: occlusion
title: 文档结构与实际引用的确定性检查
import:
  materials: materials.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  document: lib/document.mq.md
---

## check

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前确定性验证现场 |
| item | map | required | 自己的已发表单元 |
| rules | map | required | 独立角色冻结的结构与来源要求 |
| trial | map | required | 写时复制沙盒的真实执行结果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | check 的真实结果，失败保留诊断 |

Use `context`, `item`, `rules`, `trial`。

This verifier observes output after actual execution. It never asks another model to invent a passing verdict. A citation must be a real Markdown link recognized by the same parser used for document reading, and its address must match a persisted browser observation from the current unit or an approved dependency. Repeating one link cannot satisfy a multiple-source requirement. The text length is a structural lower bound, not a quality score. An article can satisfy both assertions and still require substantial editorial revision, so the result explicitly preserves that limitation. The author does not provide the rules here, and a failed rule leaves the source available for repair while keeping the unit incomplete.

研究文章没有可预知的逐字返回，所以核对实际运行得到的正文，而不编造预期文章。长度按实际文字计数，引用通过标准库 document.links 与渲染器同源解析，只有正文中的真实链接与已观察来源一致才计数。模型仅写下一个未访问的网址不能满足来源要求，重复链接也不重复计数。

这些检查能拒绝空正文、遗失正文、虚构来源和旧摘要，不能替代领域事实审核或证明文章完整回答了问题。用户最终仍需核对主题、论证和质量。独立规则在实现前冻结，此函数只确定性执行规则，不访问另一模型来重新评价或修改预期。来源列表只来自当前职责及仍有效的依赖，不扩大文件权限。

来源检查带有可读正文规则的版本身份。旧版本的空页面证明不能因为仍保留 passed 字段而继续使用，必须用同一独立契约重新验证。

We **tests = access(`trial`,"cases")**.
We **first = table.at(xs=`tests`,i=0)**.
We **content = access(access(`first`,"actual"),"result")**.
We **known = materials.sources(context=`context`,item=`item`)**.
We **urls = table.empty_list()**.
- [列出实际读取过的来源地址](for known as source)
  We **urls = table.append(list=`urls`,item=access(`source`,"url"))**.
We **cited = table.empty_list()**.
1. type(`content`) == "text"
  We **links = document.links(text=`content`)**.
  - [只计入真正访问且实际引用的不同地址](for links as link)
    We **target = access(`link`,"target")**.
    1. table.contains(list=`urls`,item=`target`) and not table.contains(list=`cited`,item=`target`)
      We **cited = table.append(list=`cited`,item=`target`)**.
We **length_ok = type(`content`) == "text" and len(`content`) >= access(`rules`,"minimum_chars")**.
We **sources_ok = table.len(xs=`cited`) >= access(`rules`,"minimum_sources")**.
We **passed = access(`trial`,"passed") and `length_ok` and `sources_ok`**.

`contract` =

| passed | length_ok | sources_ok | cited | limitation |
|---|---|---|---|---|
| `passed` | `length_ok` | `sources_ok` | `cited` | "结构与可追溯来源检查，不等同于事实或主题审核；仍需用户审阅。" |

We **contract = table.put(in=`contract`,at="rules",value=`rules`)**.
We **contract = table.put(in=`contract`,at="evidence_version",value="readable-page-v1")**.
We **contract = table.put(in=`contract`,at="observed_urls",value=`urls`)**.
We **observed_chars = 0**.
1. type(`content`) == "text"
  We **observed_chars = len(`content`)**.
We **contract = table.put(in=`contract`,at="observed_chars",value=`observed_chars`)**.
We **trial = table.put(in=`trial`,at="passed",value=`passed`)**.
Return *table.put(in=`trial`,at="contract",value=`contract`)*.
