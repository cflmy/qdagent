---
markup: occlusion
title: AI native flow offline smoke
import:
  flow: ../../ext/ai/flow.mq.md
  context: ../../ext/ai/context.mq.md
  json: ../../lib/json.mq.md
  sys: ../../lib/sys.mq.md
---

# main

这一份离线金样验证 Marqdo 2.9.1 原生 flow 与 context 接口在 qdagent 安装目录内的真实行为，全程不接入模型供应商、不申请凭据、不执行任何 SKILL 业务。它对应 docs/small-model-native-agent.mq.md 的约束：模型候选只是数据，必须先经过受验选项列表的解析门禁；上下文只投影当前函数需要的范围；持久等待门禁属于宿主可信会话与源码修订，不属于模型文本。

选项解析覆盖四种合法形态：与选项完全一致的短语、`选择：office` 这类带标签的回答、`{"choice":"chat"}` 这类结构化回答，以及明确的序号。两义并存的散文回答（`chat 或 office`）必须失败关闭：解析结果 ok 为假，绝不静默挑选最接近的一项，也不执行任何工具或 SKILL 路径。解析失败只产生数据诊断，由上层决定是否进行一次格式修复；格式修复也不改变候选集合本身。

context.scope 检查基于官方解析器约定的工作区选择：它按 Markdown 标题取出 `probe` 函数的叙述片段，忽略围栏代码块里伪装成标题的文本，不把根文稿或其他函数的定义带进结果。context.compose 在此基础上产出 ContextPackV2：最新用户输入与当前函数片段位于必须保留的字段，低优先级的文件级摘录在预算压力下先被丢弃，任何关键约束都不允许藏进可丢弃的工具转录。

flow.input 与 flow.reply 组成持久等待门禁：input 落下的是步骤边界检查点而不是挂起的解释器线程；reply 在同一 id 与同一源码修订下提交一次，重复回答幂等返回同一结果，冲突回答或过期修订会被拒绝且不执行任何副作用。每个断言的验证目的与失败退出码如下表，任何一个失败都以对应退出码停止，保留真实失败而不伪造通过。

这份金样也是后续根流程改造的对照基线：根入口的一次确认（G2 关口）将直接复用同一 flow.input/flow.reply 门禁，而不是在宿主 Python 或 Go 中另写等待循环；解析门禁的失败关闭保证了模型文本永远不能变成 SKILL 路径或宿主命令；scope 选择器则保证发给小模型的提示只包含当前函数的契约与叙述。若本文件在未接通插件或库缺失的环境中运行，接口会返回 ok 为假的数据诊断，金样按真实失败停止，不生成兜底成功。

金样代码与上游 Marqdo v2.9.1 的 tests/ext/ai-native-flow.mq.md 保持同一行为：相同的输入、相同的断言次序与相同的失败退出码，仅将导入路径改到 qdagent 的安装布局，并把叙述补充到本仓的文稿规范。上游示例是接口契约的权威来源；这里的差异记录在本段，便于后续随上游演进时逐条核对。由于本仓把这份金样纳入 deploy/check-document-runtime.sh 的叙述比与契约检查，任何后续修改都必须同时保持可执行断言与叙述解释，不能删除说明段落来凑通过率。

| 验证目的 | 失败退出码 |
|---|---|
| 带标签回答解析为 office | 11 |
| 结构化 JSON 回答解析为 chat | 16 |
| 两义散文回答必须失败关闭 | 12 |
| scope 提取 probe 函数片段 | 13 |
| compose 产出 ContextPackV2 | 15 |
| 持久门禁 reply 提交 office | 14 |

**opts = > json.parse text=["chat","office"]**
**pick = > flow.parse_choice reply="选择：office" options=`opts`**
**value = > json.get value=`pick` key="value"**
1. `value` == "office"
  **_ = 1**
2. *
  **debug_pick = > json.stringify value=`pick`**
  > print text=`debug_pick`
  > sys.exit code=11

**structured = > flow.parse_choice reply="{\"choice\":\"chat\"}" options=`opts`**
**structure_value = > json.get value=`structured` key="value"**
1. `structure_value` == "chat"
  **_ = 1**
2. *
  > sys.exit code=16

**invalid = > flow.parse_choice reply="chat 或 office" options=`opts`**
**not_ok = > json.get value=`invalid` key="ok"**
1. `not_ok`
  > sys.exit code=12
2. *
  **_ = 1**

**ctx = > context.scope scope="function" class="main" function="probe" max_chars=200**
**ok = > json.get value=`ctx` key="ok"**
1. `ok`
  **_ = 1**
2. *
  > sys.exit code=13

**packed = > context.compose user="Test the route" class="main" function="probe" budget_tokens=2048**
**pack_schema = > json.get value=`packed` key="schema"**
1. `pack_schema` == "ContextPackV2"
  **_ = 1**
2. *
  > sys.exit code=15

**gate = > flow.input id="ai_native_flow_ci_gate" question="Continue?" options=`opts` source_revision="fixture-v1" freeform=False**
**answered = > flow.reply id="ai_native_flow_ci_gate" reply="office" source_revision="fixture-v1"**
**answer = > json.get value=`answered` key="value"**
1. `answer` == "office"
  **_ = 1**
2. *
  > sys.exit code=14

Return *"ai-flow-native-ok"*.

## probe

这个私有辅助函数只用于验证范围选择器：它的叙述应被 scope 完整提取，且不包含根文稿或其他相邻函数的定义。

Return *"probe"*.
