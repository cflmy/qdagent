---
markup: occlusion
title: 浏览器效果空映射的回归
import:
  call: ../pages/control/call.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 历史、工作台名称、叶节点更新与空映射的真实合并结果 |

首次追加工具卡片时，它没有需要替换的 HTML 叶节点，因此会产生空的 set_html。旧实现把空映射看成不存在，导致另一组效果中的历史、计划和回复被覆盖。这份回归只调用正式客户端的纯效果合并函数，不执行浏览器、不读用户记录，也不模拟另一套合并逻辑。预期选择器在输入里明确列出，因此测试可以识别真实的数据丢失。

Use this check after changing selector-aware merging. Empty-left, empty-right and conflicting selectors exercise different cases: an empty patch must preserve existing targets, a new target must be adopted, and a deliberate update of the same selector must use the later value. The check does not assert stylesheet text, component implementation details or unrelated network behavior. Failure returns a diagnostic instead of pretending that a process exit establishes correctness.

The browser screenshot accompanying this regression must also contain a user message, an assistant message, a plan and at least one trace card at the same time. Seeing only the trace is the original failure, even if the WASM module mounts without an error. This pure check covers the selector-map boundary; the browser fixture covers consumption of those effects by the actual bridge. Together they distinguish an empty patch from an absent effect without changing network, task or file ownership rules.

We **history = table.put(in=None,at="#qd-dialogue",value="历史")**.
We **a = table.put(in=None,at="set_html",value=`history`)**.
We **b = table.put(in=None,at="set_html",value=table.empty_map())**.
We **merged = merge(a=`a`,b=`b`)**.
1. json.get(value=json.get(value=`merged`,key="set_html"),key="#qd-dialogue") != "历史"
  Return *[空工具更新不得清空历史](result.error(code="test.merge.empty_right",message="历史被空映射覆盖",operation="run"))*.
We **merged = merge(a=`b`,b=`a`)**.
1. json.get(value=json.get(value=`merged`,key="set_html"),key="#qd-dialogue") != "历史"
  Return *[空左侧也应接受真实更新](result.error(code="test.merge.empty_left",message="新增目标丢失",operation="run"))*.
We **next = table.put(in=None,at="#qd-dialogue",value="更新")**.
We **next = table.put(in=`next`,at="#qd-workbench",value="计划")**.
We **merged = merge(a=`a`,b=table.put(in=None,at="set_html",value=`next`))**.
We **html = json.get(value=`merged`,key="set_html")**.
1. json.get(value=`html`,key="#qd-dialogue") != "更新" or json.get(value=`html`,key="#qd-workbench") != "计划"
  Return *[后续选择器独立更新](result.error(code="test.merge.targets",message="更新顺序或新增目标错误",operation="run"))*.
Return *[历史保留且新目标可达](result.ok(value=True))*.

## merge

| 参数 | 类型 | 说明 |
|---|---|---|
| a | map | 第一组正式效果 |
| b | map | 第二组正式效果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正式客户端函数的原始结果 |

Use `a` and `b`。客户端的下划线函数通过现有工程调用器进行精确绑定，避免把入口内部函数假定为库导出。子调用只授予 none；测试父过程的文件与进程能力只用于调用协议，不授予被测函数网络、写文件或任意命令能力。参数是两份效果数据，不包含用户历史、模型文本或可执行指令。测试没有复制产品合并算法，因此产品行为退化时断言会直接看到丢失的目标。

We **args = table.put(in=None,at="a",value=`a`)**.
We **args = table.put(in=`args`,at="b",value=`b`)**.
Return *[调用实际客户端入口](call.invoke(file=(sys.cwd() + "/pages/public/client.mq.md"),function="_merge",arguments=`args`,root=sys.cwd(),effects="none"))*.
