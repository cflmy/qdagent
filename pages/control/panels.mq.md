---
markup: occlusion
title: 能力与任务面板
import:
  ui: ../agent/ui.mq.md
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
  time: lib/time.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
---

面板来自真实能力登记和会话目录。先把标题、说明、按钮与状态拆成叶节点，再使用原生容器布局。参数和输出由现有渲染器转义，不能把服务器路径或用户标题直接拼入 HTML。

## plugins

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| entries | list | required | 已安装的真实能力 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 固有能力和拓展开关的原生阅读片段 |

Use `entries`。固有标准库始终显示不可停用，拓展同时展示实际版本、ABI 可用性和当前授权。无法找到原生产物时明确说明不可用；开关不假装安装或卸载宿主。每个模块文档位置也显示出来，便于开发者按源码学习。

A capability card separates its title, version, installation state, documentation location and action. The native element renderer escapes all text. Module names and paths are shown for discovery, while the delegated button carries only the registered identity. The browser never receives a dynamic-library path that it can load itself.

The standard card lists the actual single-file modules and labels the capability as always enabled. Its button is disabled as a usability cue; the service independently rejects an attempt to toggle it. Optional cards keep enabled and available distinct. For example, an installed package can be enabled in settings while its native artifact is absent; the card reports that absence instead of promising it will execute.

Rendering does not mutate authorization. Only an explicit switch request calls the service, persists a real setting and returns a refreshed panel. The panel remains usable while an agent-facing Web capability is disabled because interface hosting is not permission for a model tool. Future capabilities should follow the same card contract rather than embedding hand-written control HTML in a description.

We **nodes = [真实能力卡片](table.empty_list())**.
- [逐项展示实际安装信息](for entries as entry)
  We **id = access(`entry`, "id")**.
  We **label = access(`entry`, "name") + " · " + access(`entry`, "version")**.
  We **header = [能力标题](ui.text_node(text=`label`, style="qd-card-title"))**.
  We **state = "已停用"** and **action = "启用"**.
  1. access(`entry`, "enabled")
    We **state = "已启用"** and **action = "停用"**.
  1. not access(`entry`, "available")
    We **state = `state` + " · 缺少 ABI 产物，当前不可用"**.
  1. access(`entry`, "builtin")
    We **state = "固有能力 · 始终启用"** and **action = "不可停用"**.
  We **info = [真实授权和安装状态](ui.text_node(text=`state`, style="qd-card-meta"))**.
  We **button = [登记身份才允许切换](ui.button(text=`action`, data_id=`id`, style="qd-plugin-toggle mq-btn", disabled=access(`entry`, "builtin")))**.
  We **description = access(`entry`, "entry")**.
  We **operations = json.get(value=`entry`, key="operations")**.
  1. `operations`
    We **description = `description` + "\n已登记操作：" + `operations`**.
  We **location = [真实文档与操作入口](component.element(kind="pre", value=`description`, style="qd-module-path"))**.
  1. access(`entry`, "builtin")
    We **location = [固有模块全部可发现](component.element(kind="pre", value=text.str_join(xs=access(`entry`, "modules"), sep=" · "), style="qd-module-path"))**.
  We **children = [内容与操作分块](table.concat(a=table.concat(a=`header`, b=`info`), b=table.concat(a=`location`, b=`button`)))**.
  We **nodes = [加入插件面板](table.concat(a=`nodes`, b=ui.region(children=`children`, style="qd-capability")))**.
Return *[统一 View 组件展示](ui.render(nodes=`nodes`))*.

## sessions

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| entries | list | required | 实际登记的会话 |
| selected | text | required | 当前会话身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 任务切换按钮与对应工作目录 |

Use `entries` and `selected`。标题可以重复，切换依赖独立身份。每个任务显示实际状态和工作目录，用户能理解文件工具操作哪里。切换只是阅读和控制目标改变，不隐式取消正在运行的其他任务。

The selected style is derived from the actual session id, not from a repeated human title. A task card shows its current job state and workspace location so the user knows where file operations occur. The create input is a separate sibling in the shell and is not replaced when this list refreshes.

Switching dispatches a session-control request. It does not move files, stop the old worker or copy the old task's generation into the new one. A task that finishes while it is hidden can be reopened from its own saved history and event records.

We **nodes = [真实任务清单](table.empty_list())**.
- [任务与目录一一对应](for entries as entry)
  We **style = "qd-session-select mq-model-opt"**.
  1. access(`entry`, "id") == `selected`
    We **style = `style` + " is-active"**.
  We **button = [选择真实任务](ui.button(text=access(`entry`,"title"),data_id=access(`entry`,"id"),style=`style`))**.
  We **state = access(`entry`,"status")**.
  1. `state` == "idle"
    We **state = "未开始"**.
  1. `state` == "running"
    We **state = "进行中"**.
  1. `state` == "succeeded"
    We **state = "已完成"**.
  We **stamp = ""**.
  1. access(`entry`,"created_ms") != None
    We **stamp = time.format(unix=(access(`entry`,"created_ms") / 1000 + 28800),pattern="%m月%d日 %H:%M") + " · "**.
  We **meta = ui.text_node(text=(`stamp` + `state`),style="qd-session-meta")**.
  We **button = table.concat(a=`button`,b=`meta`)**.
  We **path = [明确文件操作范围](component.element(kind="pre", value=access(`entry`, "workspace"), style="qd-module-path"))**.
  We **nodes = [逐块组合任务卡片](table.concat(a=`nodes`, b=ui.region(children=table.concat(a=`button`, b=`path`), style="qd-session")))**.
Return *[实际会话面板](ui.render(nodes=`nodes`))*.

## models

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| entries | list | required | 当前用户公开配置 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 可选择和删除的自定义模型列表 |

Use `entries`。只展示服务端已去除密钥的字段。选择按钮携带不透明配置身份，删除按钮独立操作；模型名称可以重复，身份不会混淆。列表为空时不显示假模型或多余提示块，新增表单仍能使用。

The model picker groups the fixed shared option, the administrator's local model and private profiles into distinct readable cards. A shared option explains its intended use without claiming the provider has already responded. The local option explicitly says its connection is checked when used; no green availability indicator is fabricated. Private profiles alone receive a delete button. The button's data identity remains stable while its visible label remains human readable, and the server independently resolves every selection.

Rendering is not a provider request and never loads a credential into a browser field. The model and protocol help users identify the selected service, while an active task remains bound to the profile saved at begin. The backend checks the owner again for selection, deletion and actual inference, independently of these buttons.\n\nThe fixed display order is independent of database insertion order: shared service first, local inference second and personal profiles last. Every selectable card keeps the opaque server identity in its event data, while its visible title and help text use only approved public fields. Credentials, remote API roots and local addresses are never included in the rendered fragment.

We **ordered = table.empty_list()**.
- [共享服务优先，其次本机和个人配置](for entries as entry)
  We **id = access(`entry`,"id")** and **rank = 2**.
  1. `id` == "builtin-smart"
    We **rank = 0**.
  1. `id` == "builtin-local"
    We **rank = 1**.
  We **entry = table.put(in=`entry`,at="view_order",value=`rank`)**.
  We **ordered = table.append(list=`ordered`,item=`entry`)**.
We **entries = table.sort_by(list=`ordered`,key="view_order")**.
We **nodes = table.empty_list()** and **last_group = ""**.
- [排序后每组只介绍一次](for entries as entry)
  We **id = access(`entry`,"id")** and **label = access(`entry`,"label")**.
  We **description = "个人配置 · 仅当前账号可管理"** and **group = "我的模型"** and **group_id = "qd-model-group-personal"**.
  1. `id` == "builtin-smart"
    We **group = "共享智能模型"** and **group_id = "qd-model-group-shared"** and **label = "智能模型（默认）"** and **description = "平台提供 · 适合问答、分析、写作与规划"**.
  1. `id` == "builtin-local"
    We **group = "本机模型"** and **group_id = "qd-model-group-local"** and **label = "Qwen（本机）"** and **description = "使用本地算力 · 数据更可控"**.
  We **heading = ui.text_node(text=`group`,id=`group_id`,style="qd-model-group")**.
  1. `group` != `last_group`
    We **nodes = table.concat(a=`nodes`,b=`heading`)** and **last_group = `group`**.
  We **button = ui.button(text=`label`,id=("model-" + `id`),data_id=`id`,style="mq-model-opt qd-model-select")**.
  We **hint = ui.text_node(text=`description`,style="qd-model-description")**.
  We **choices = table.concat(a=`button`,b=`hint`)**.
  1. not text.starts_with(text=`id`,prefix="builtin-")
    We **choices = table.concat(a=`choices`,b=ui.button(text="删除",data_id=`id`,style="mq-btn qd-model-remove"))**.
  We **card = ui.region(children=`choices`,style="qd-custom-model")**.
  We **nodes = table.concat(a=`nodes`,b=`card`)**.
Return *[共享、本机、个人模型按使用顺序展示且不暴露凭据](ui.render(nodes=`nodes`))*.
