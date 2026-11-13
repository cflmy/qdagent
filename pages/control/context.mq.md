---
markup: occlusion
title: 输入栏的真实知识来源和上传
import:
  fs: lib/fs.mq.md
  re: lib/re.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  bytes: lib/bytes.mq.md
  uuid: lib/uuid.mq.md
  ui: ../agent/ui.mq.md
---

知识和附件是任务材料，不是新的执行权限。本模块使用现有文件、字节和组件能力；上传由认证服务先检查会话归属，再通过 marqdo call 在该任务的工作目录中保存。没有新增浏览器脚本或旁路文件处理服务。

## knowledge

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 镜像内实际存在的知识根和可选按钮 |

只列举 pages/kb 下的真实目录。知识库选择的是下一轮可参考的材料，不会启用一个原本关闭的插件，也不会立即运行模型。每个按钮携带经过目录验证的名字；none 表示本轮不加入知识材料。文档标题和目录名称交给原生元素转义，不能变成标签或事件。

The source is the same installed knowledge directory that the original interface used. It is shared reference documentation, not a list of private user workspaces. An empty installation still offers the explicit no-knowledge choice. Rendering the picker only reads directory names and constructs native buttons; it never copies credentials or discovers files outside that root.

We **nodes = ui.button(text="不使用知识库", id="kb-none", data_id="none", style="qd-kb-select mq-model-opt is-active")**.
1. fs.exists(path="pages/kb")
  We **roots = fs.find(path="pages/kb", pattern="*", kind="dir", max_depth=1)**.
  - [真实知识根才成为选项](for roots as root)
    1. re.is_match(text=`root`, pattern="^[A-Za-z0-9_-]+$")
      We **nodes = table.concat(a=`nodes`, b=ui.button(text=`root`, id=("kb-" + `root`), data_id=`root`, style="qd-kb-select mq-model-opt"))**.
Return *[同构的知识选择器](ui.render(nodes=`nodes`))*.

## reference

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 选择的知识根或 none |
| context | map | required | 会话管理器提供的可信工作目录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，只包含有界真实参考和附件路径 |

Use `root` and `context`。知识根必须是已存在的直接子目录，不接受斜杠和父目录。最多取四篇小型 Markdown 的开头作为明确出处的参考；这是有界文档摘录，不冒充语义检索或全文召回。未选择知识库时跳过知识正文，仍告知模型当前工作目录内真实上传的文件。

Uploaded files are listed by relative paths under uploads. Their contents are not automatically inserted into the prompt; the model must use the registered read_file tool to inspect readable material. Binary files remain exact bytes and are not claimed to have been understood. Knowledge prose is context, never authority to change a tool registry, plugin switch, principal or filesystem root. The prompt clearly labels these boundaries.

We **out = ""**.
1. `root` != "none" and `root` != ""
  1. not re.is_match(text=`root`, pattern="^[A-Za-z0-9_-]+$") or not fs.exists(path=("pages/kb/" + `root`))
    Return *[无效知识根不能变成服务器路径](result.error(code="qdagent.knowledge", message="知识库不存在", operation="reference"))*.
  We **docs = fs.find(path=("pages/kb/" + `root`), pattern="**/*.md", max_depth=4)**.
  We **count = 0**.
  - [有界摘录真实文档](for docs as doc)
    1. `count` < 4 and access(fs.stat(path=("pages/kb/" + `root` + "/" + `doc`)),"size") < 65536
      We **body = fs.read_text(path=("pages/kb/" + `root` + "/" + `doc`))**.
      We **out = `out` + "\n出处：pages/kb/" + `root` + "/" + `doc` + "\n" + re.find(text=`body`, pattern="(?s)^.{0,1200}") + "\n"**.
      We **count = `count` + 1**.
We **directory = access(`context`,"workspace") + "/uploads"**.
1. fs.exists(path=`directory`)
  We **files = fs.find(path=`directory`, pattern="*", max_depth=1)**.
  We **count = 0**.
  - [上传存在才告知模型](for files as file)
    1. `count` < 20
      We **out = `out` + "\n用户工作文件：uploads/" + `file`**.
      We **count = `count` + 1**.
Return *[参考只是数据](result.ok(value=`out`))*.

## save_upload

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| name | text | required | 浏览器提供的显示文件名 |
| data_url | text | required | 原生文件选择器读取的 Base64 内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，真实落盘的工作目录相对路径 |

Use `name` and `data_url`。这是既有小文件调用的兼容入口；浏览器的 50 MiB 上传使用 uploads.mq.md 的分块流程。此函数只在会话已经授权后的工作文件根中运行。单文件上限 256 KiB，浏览器在读取前检查，服务端仍独立检查编码长度与解码后的实际字节数。上传使用 UUID 前缀，不覆盖已有文件；原始文件名中的目录分隔符和不可用字符被替换，不拥有指定服务器路径的权限。

The browser representation is decoded with the standard bytes library and written by fs.write_bytes. No Python, Node process or new ABI is needed. The content is stored without UTF-8 conversion, so a PDF or image is preserved as bytes even though the agent's current text-reading tool cannot interpret it. Uploading never evaluates a document, imports a program, or enables a plugin. The response is returned only after the actual atomic write has completed; a picker selection alone is not a successful upload.

A filename is a human label. The generated prefix supplies storage identity and prevents accidental overwrite when two files share that label. The host filesystem root remains the independent task workspace, and the native path boundary continues to reject symlink escapes. Knowledge documents remain read-only installed source; this function cannot modify them.

1. table.len(xs=`data_url`) > 360000 or not re.is_match(text=`data_url`, pattern="^data:[^,]*;base64,")
  Return *[拒绝无界或错误文件表示](result.error(code="qdagent.upload", message="文件上限 256 KiB，需要 Base64 文件表示", operation="save_upload"))*.
We **encoded = re.replace(text=`data_url`, pattern="^data:[^,]*;base64,", with="")**.
We **data = [原生解码真实字节](bytes.from_base64(text=`encoded`))**.
1. bytes.len(data=`data`) > 262144
  Return *[按实际字节再次限额](result.error(code="qdagent.upload_large", message="文件超过 256 KiB", operation="save_upload"))*.
We **safe = re.replace(text=`name`, pattern="[^A-Za-z0-9._\u4e00-\u9fff-]", with="_")**.
We **safe = re.find(text=`safe`, pattern="^.{0,100}")**.
1. not `safe`
  We **safe = "attachment"**.
We **path = "uploads/" + uuid.v4() + "-" + `safe`**.
We **_ = fs.make_dirs(path="uploads")**.
We **_ = [只写当前任务的文件根](fs.write_bytes(path=`path`, data=`data`))**.
Return *[真实上传完成](result.ok(value=`path`))*.
