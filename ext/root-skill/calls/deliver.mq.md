---
markup: occlusion
title: 方案落地的当前可调用文稿
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  delivery: ../delivery.mq.md
  document: lib/document.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
  call: ../../../pages/control/call.mq.md
---

方案落地的当前可调用文稿。真实产物、工程整合与用户验收保持独立。

## finish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| narrative | text | required | 解释真实业务组合、输入、来源、结果与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际整合成功后进入用户验收 |

Use `narrative`。

只整合源码、独立测试和公开规格都仍然有效的单元。把用户交流、业务说明和可调用逻辑写入实际工程入口；未接通项保持可见，最终由用户决定接受还是返工。整合会调用官方检查和真实入口冒烟，不把模型叙述当作证据。

传入 narrative 时要说明用户实际得到什么、调用时传入什么、各单元如何协作、没有实现哪些内容。不要只写“所有步骤已完成”，也不要重写另一份业务控制流。固定工程说明另有可阅读的文稿来源，随实际入口一起呈现；它描述的是执行边界和证据限制，不是替模型补造完成内容。用户确认针对当前源码摘要，审阅期间文件变化必须重新验证和提交。

本次调用成功后仍处于用户审阅阶段，不等于用户已经验收。检查失败会返回真实诊断，调用者需要修复失效单元或说明缺口。最终结果的业务可用性由用户判断，独立案例只覆盖明确声明的输入规则，不能据此推断所有输入或外部研究都正确。

组合说明分为业务叙述与真实工程机制。业务叙述由当前角色依据实际材料填写；附带的工程说明只陈述根文稿确实执行的依赖传递、独立测试、摘要检查和用户验收。它不为模型补造研究结论、外部操作或未发生的产物，也不能代替用户对业务内容的判断。

这一操作只提交本次审阅版本，用户的最终选择另有独立记录。

例如，两个独立函数各自返回固定正文时，说明应该明确它们都忽略输入，统一入口只是收集各自真实返回，不增加外部研究或格式转换。若工程包含依赖，应解释依赖值由前置函数实际产生，而不是从聊天猜测。存在尚未接通的外部能力时，说明应明确这项缺口及其影响，用户可以据此返工或接受有限范围。叙述需要覆盖来源与限制，但无需复制所有测试输入，更不应夹带密钥或私有模型配置。调用返回的路径用于打开真实工程入口，文件存在本身仍不是验收决定。

We **context = io.current()**.
We **permit = flow.authorize(context=`context`,phase="implement",role="deliver")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **notes = io.native(context=`context`,operation="runtime_document",payload=table.put(in=None,at="path",value=(access(`context`,"project") + "/ext/root-skill/runtime/engineering.mq.md")))**.
We **explanation = `narrative` + "\n" + document.section(text=access(access(`notes`,"value"),"source"),title="assembly")**.
We **args = table.put(in=table.put(in=None,at="context",value=`context`),at="narrative",value=`explanation`)**.
We **integrated = call.invoke(file=(access(`context`,"project") + "/ext/root-skill/delivery.mq.md"),function="integrate",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,environment.read")**.
1. not access(`integrated`,"ok")
  Return *integrated*.
Return *result.ok(value=table.put(in=None,at="path",value="solution/index.mq.md"))*.
