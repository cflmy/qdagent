---
markup: occlusion
title: 模型配置的最小表单
import:
  ui: ../agent/ui.mq.md
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
---

表单由原生 label、input、select 与容器组成，字段是普通数据，没有内联事件或第二套业务脚本。保存进入认证后的 JSON 接口，密钥输入不回显，公开配置清单和编辑表单分别刷新。

## field

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| name | text | required | 字段名 |
| label | text | required | 人类说明 |
| kind | text | "text" | 原生输入类型 |
| placeholder | text | "" | 示例 |
| required | bool | True | 是否必填 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 标签与原生输入的最小布局 |

Use `name`, `label`, `kind`="text", `placeholder`="" and `required`=True。显示名、模型标识和 API 地址是不同字段，不让用户在一个字符串里猜测格式。密码类型只用于凭据，不在 value 中填入旧密钥。所有名字来自产品源码，既不是文件路径也不是可执行函数。

The existing component renderer escapes both labels and placeholders. Required fields use native form validation before the submit event. Input ids pair with labels for keyboard and screen-reader use. The form only collects data; server ownership, URL policy and encryption remain independent of browser validation.

We **id = "model-" + `name`**.
We **label_node = component.element(kind="label", value=`label`, attrs=table.put(in=None, at="for", value=`id`))**.

`attrs` =

| id | name | type | placeholder | required | autocomplete |
|---|---|---|---|---|---|
| `id` | `name` | `kind` | `placeholder` | `required` | "off" |

We **input = component.element(kind="input", attrs=`attrs`)**.
Return *[字段与说明共同布局](ui.region(children=table.concat(a=`label_node`, b=`input`), style="qd-model-field"))*.

## form

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 允许用户新增模型的真实提交表单 |

OpenAI 兼容 API 根通常以 /v1 结尾，公开 Ollama 使用服务根。私有本机 Ollama 由管理员环境配置，仍保留固有选项；自定义远程请求遵守公网 HTTPS 限制。Ollama 的思考开关映射 think，兼容服务按它自身模型能力返回 reasoning_content。没有思考字段时界面不显示空占位。

The submit button is a real submit control. The official bridge extracts FormData into the Marqdo handler, prevents page navigation and sends one authenticated request. A refresh of the custom model list never destroys this form, so a partial configuration remains editable. Password content is cleared after a completed save and is never restored from a server response.

Each save creates a separately owned profile. The server responds only with the public identity and list markup. Selecting a profile affects the next task; no browser event rewrites a running job's saved model. Network or validation errors stay in the form status instead of closing the dialog and discarding the user's other fields.

The name is a human label and may differ from the provider's exact model identifier. The endpoint belongs to the API root rather than a website homepage; the adapter appends the appropriate chat path when necessary. Protocol choices use readable option labels, which the server normalizes before validation. A missing API Key is valid for a public service that does not require one, but a supplied key is always encrypted and never restored into the password control.

Private endpoints are deliberately reserved for administrator-owned built-in configuration. A user-defined HTTPS endpoint is resolved and checked at the connection boundary, not merely matched by a browser URL pattern. DNS answers cannot contain private or reserved addresses, and redirects cannot carry Authorization elsewhere. These controls are enforced even if someone sends a request directly to the API without using this form.

The optional checkbox has an explicit native value so FormData represents it consistently. Unchecked means the field is absent, which the endpoint handles with its documented default. Returning a thought field remains the provider's responsibility; selecting the checkbox never creates an artificial transcript in the browser.

We **nodes = field(name="label", label="名称", placeholder="我的模型")**.
We **nodes = table.concat(a=`nodes`, b=field(name="model", label="模型标识", placeholder="供应商提供的模型名称"))**.
We **nodes = table.concat(a=`nodes`, b=field(name="endpoint", label="远程 API 根地址（本机 Ollama 留空）", kind="url", placeholder="https://api.example.com/v1", required=False))**.
We **options = component.element(kind="option", value="OpenAI 兼容")**.
We **options = table.concat(a=`options`, b=component.element(kind="option", value="Ollama"))**.
We **options = table.concat(a=`options`, b=component.element(kind="option", value="本机 Ollama"))**.
We **select = ui.region(children=`options`, kind="select", id="model-protocol", attrs=table.put(in=None, at="name", value="protocol"))**.
We **label = component.element(kind="label", value="接口协议", attrs=table.put(in=None, at="for", value="model-protocol"))**.
We **nodes = table.concat(a=`nodes`, b=ui.region(children=table.concat(a=`label`, b=`select`), style="qd-model-field"))**.
We **nodes = table.concat(a=`nodes`, b=field(name="api_key", label="API Key（加密保存，可留空）", kind="password", required=False))**.
We **check = component.element(kind="input", value="on", attrs=table.put(in=table.put(in=table.put(in=None, at="id", value="model-thinking"), at="name", value="thinking"), at="type", value="checkbox"))**.
We **label = component.element(kind="label", value="启用模型思考（Ollama think；兼容接口按自身能力返回）", attrs=table.put(in=None, at="for", value="model-thinking"))**.
We **nodes = table.concat(a=`nodes`, b=ui.region(children=table.concat(a=`check`, b=`label`), style="qd-model-check"))**.
We **submit = component.element(kind="button", value="保存并使用", attrs=table.put(in=table.put(in=None, at="id", value="model-save"), at="type", value="submit"), style="mq-model-opt")**.
We **nodes = table.concat(a=`nodes`, b=`submit`)**.
We **nodes = table.concat(a=`nodes`, b=ui.text_node(text="", id="model-form-status"))**.
Return *[使用固有 FormData 提交](ui.region(children=`nodes`, id="model-form", kind="form", style="qd-model-form"))*.
