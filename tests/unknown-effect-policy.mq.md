---
markup: occlusion
title: 业务失败不给自动重试建议
import:
  recovery: ../ext/root-skill/runtime/recovery.mq.md
  text: ../lib/text.mq.md
  test: capabilities.mq.md
---
业务失败与传输失败必须走不同的修复章节。工具已经真实执行并报告业务失败时，分类只能落到通用修复；通用修复要求对照真实诊断与冻结测试，不重放副作用。只有传输层失败才允许指向来源恢复。本用例只断言官方分类，不执行任何外部写入、不启动模型。

# main

这份离线金样把"哪类失败值得重试"从模型猜测变成可断言的事实。它只调用生产 recovery.category 的纯函数，因此不需要可信现场、不启动模型，也不会产生任何副作用。

真实业务失败有两条常见写法：宿主给出的执行失败与工具自身的退出码。两者都必须落到通用修复，而不是语法、参数或来源章节；否则恢复回路会建议模型把已经执行过的调用再提交一遍，重复一次不可撤销的外部写入。

对照分支证明分类不是一律返回通用：语法错误指向语法修复，网络错误指向来源恢复，真正的业务失败才会落到通用。这三条同时固定住"可以重试"与"不可重试"的边界，也说明分类读取的是真实诊断而不是模型自报的状态。

断言只读取类别字符串，不检查文案；实现可以改进匹配方式，但类别归属一旦变化就会失败。类别名称只用于选择修复章节，不会变成宿主操作。

这条边界与模型传输层的重试策略是两件事，必须分开断言。传输层失败发生在模型生成阶段，源码还没有被检查、工具也没有被执行，因此同一请求再试一次不会重复任何外部写入；而这里的业务失败发生在工具已经运行之后，文件可能已经写出、邮件可能已经发出、外部系统可能已经改变。两者的恢复手段因此完全相反：前者可以自动再试，后者只能先核对真实状态。

未知外部效果的处理是本条规则最容易被实现悄悄破坏的地方。任何"失败就重试"的通用回路都会在有副作用的调用上重复一次不可撤销的动作，而模型自己无法判断上一次写入是否成功。文档因此要求恢复回路只提供诊断与修复方法，把是否继续交给真实状态核对和用户确认，绝不代为重放。

分类函数只读取官方诊断里已经存在的字符串事实，不新增错误码表，也不用正则重新解析错误。这样做的代价是分类粒度较粗，收益是任何人都能从真实诊断复现同一结论；新增的错误码必须先更新文稿叙述，再改实现与金样，宿主和前端不另起一套判断。

夹具只覆盖五个有代表性的诊断：宿主执行失败、工具退出码、含副作用的步骤失败、语法错误与网络超时。它们分别代表不可重试、不可重试、不可重试、可修复、可重试四类归属。真实部署里还有更多措辞，但语义归属由同一套分支决定，金样固定的是归属而不是措辞。

断言之外还有一条实现约束值得写下来：分类只返回章节名称，不会写文件、不会启动浏览器、也不会调用模型。修复方法本身来自已安装的指令文稿，模型读取它之后仍然要用普通调用文稿走完整预检，不能借修复过程绕过效果限制或其他门禁。这条约束保证了"恢复"在结构上不可能成为第二条执行通道。

最后一个断言覆盖完全陌生的诊断。真实系统会不断出现新的失败文本，如果分类对未知文本默认返回某个具体修复，恢复回路就会给出未经证实的建议；返回通用章节至少保留了"读真实错误、不要伪造成功"的底线。

We **execution = recovery.category(observed="runtime.execution: 写入后返回 1")**.
We **exit_code = recovery.category(observed="Marqdo 执行失败，退出码 1")**.
We **failure = recovery.category(observed="step failed after effect")**.
We **syntax = recovery.category(observed="call document has a syntax error")**.
We **network = recovery.category(observed="network timeout while reading source")**.
We **_ = test.assert(condition=text.contains(text=`execution`,sub="general"),message="host execution failure must not look retryable")**.
We **_ = test.assert(condition=text.contains(text=`exit_code`,sub="general"),message="tool exit code must not look retryable")**.
We **_ = test.assert(condition=text.contains(text=`failure`,sub="general"),message="a failed effect must not look retryable")**.
We **_ = test.assert(condition=text.contains(text=`syntax`,sub="syntax"),message="syntax errors keep their own repair")**.
We **_ = test.assert(condition=text.contains(text=`network`,sub="source"),message="transport failures keep source recovery")**.

分类还必须真正区分"未知"与"已知可修复"：一条完全陌生的诊断不能被包装成任何具体修复，只能落到通用章节，等待用户或管理员判断。这条断言防止未来的新错误码被默认当成可重试故障。

We **unknown = recovery.category(observed="unexpected subsystem state")**.
We **_ = test.assert(condition=text.contains(text=`unknown`,sub="general"),message="unknown diagnostics stay general")**.
Return *"unknown-effect-policy-ok"*.
