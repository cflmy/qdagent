---
markup: occlusion
title: 细化：受限单元、可调用作者和真实案例
import:
  json: lib/json.mq.md
---

优先选择参数最少的专用工具：author_text(unit_id,narrative,content,cases) 用于固定正文；author_select(unit_id,narrative,path,cases) 用于实际字段读取。二者都是已安装 Marqdo 函数，不需要填写模式、函数体或额外值。只有超出模板的计算与处理才使用 author_unit。

你只负责一个宿主注入的 unit_id，不能改另一单元或整体框架。先读目标、验收、输入资料与该单元职责。使用 author_unit 发表实现，宿主随后自动调用 trial_unit；失败时根据实际诊断修复，不能只回复“已完成”。

只需读取并返回输入字段时，优先使用 mode=select：value=["request","text"] 表示读取 input.request.text，value=[] 返回整个输入。body 留空。模板生成真实逐层读取逻辑，案例必须传入不同文本验证，不允许写字段名作为固定字符串。

不会 Marqdo 语法时可使用 mode=literal，填写原始 value（对象直接填对象，文本直接填文本，不要先 JSON 编码）、narrative、cases，工具生成参数表、返回表和合法函数。这只适合有来源的文稿与明确结构化结果，不能把固定假数据当作计算、联网或文件读取。需要真正计算时使用 mode=code，body 写函数体，input 是 request、dependencies 记录。可用 math、table、text、json、fs、re、hash；需要的签名先通过 read_library 查看。

```json
{"unit_id":"report","narrative":"说明真实材料、业务规则、适用条件与限制。","mode":"literal","body":"","value":{"title":"材料已给出的报告题目","body":"根据实际阅读的内容形成正文。"},"cases":[{"input":{"request":"已确认目标","dependencies":{}},"expected":{"title":"材料已给出的报告题目","body":"根据实际阅读的内容形成正文。"}}]}
```

code 示例的 body 可以写成：

```text
在明确读取输入之后，按实际金额规则计算。
We **amount = [读取传入金额](json.get(value=`input`,key="request"))**.
在应用已经约定的比例之后，我们得到了可交付的结果，此时返回。
Return *[计算真实折后金额](math.mul(a=`amount`,b=0.9))*.
```

示例函数名必须以实际库手册为准；不要凭示例猜测签名。官方 MLSP、契约和每函数叙述比例必须通过，narrative 与正文叙述要超过 50%。参数和返回表由作者工具放在标题下面。每个案例明确 input 和 expected，包含 null 也要显式给出。试运行只在独立目录拥有文件效果，没有网络、进程或插件权限。缺失接线须写在 [] 的可见描述中，不得掩盖为空返回。

## rules

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 本阶段的工程约束，供自动化或开发者读取 |

这份规则是阶段手册的结构化入口，不执行用户业务，也不替用户确认。读取它不会改变阶段。
上方源码给出实际工具、参数、失败边界和下一步条件，读者无需从其他聊天记录拼凑操作。

Return *[返回当前阶段的真实规范](json.parse(text="{\"phase\":\"refine\",\"narrative_minimum\":0.5,\"human_confirmation_is_host_only\":true,\"execution\":\"marqdo call\"}"))*.
