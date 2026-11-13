---
markup: occlusion
title: 工作目录的基础工具
import:
  call: ../control/call.mq.md
  sys: lib/sys.mq.md
  fs: lib/fs.mq.md
  re: lib/re.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

本文件由实际 marqdo call 调用，fs-root 明确指向当前会话的工作目录。
读写、搜索、检查与调用不接受操作系统命令，也不生成 Python 或 Shell。
模型没有工具时不能执行任务，因此这些固有能力默认可用；拓展能力另经注册表授权。

## list_files

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | "." | 工作目录中的相对位置 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，包含实际目录条目 |

Use `path`="."。目录条目来自原生 fs，不使用示例列表。路径仍受 CLI 文件根限制，
父目录或符号链接不能变成读取其他会话的捷径。失败保留诊断，不能用空数组冒充成功。

Return *[枚举真实工作文件](result.ok(value=fs.list_dir(path=`path`)))*.

## read_file

| 参数 | 类型 | 说明 |
|---|---|---|
| path | text | 要读取的工作文件 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，最多提供一万二千字符的实际内容 |

Use `path`。先检查大小，大于一 MiB 的文件要求调用者缩小范围；文本观察限制长度，
避免一次读取把整个模型上下文挤满。实际内容由 Marqdo 原生 UTF-8 文件能力读取，
不是浏览器缓存、模型记忆或“看起来像”文件的回复。

We **stat = [核验实际文件](fs.stat(path=`path`))**.
1. access(`stat`, "size") > 1048576
  Return *[需要更小的输入范围](result.error(code="qdagent.file_large", message="文件超过一 MiB", operation="read_file"))*.
We **body = [原生读取内容](fs.read_text(path=`path`))**.
Return *[提供有界真实观察](result.ok(value=re.find(text=`body`, pattern="(?s)^.{0,12000}")))*.

## write_file

| 参数 | 类型 | 说明 |
|---|---|---|
| path | text | 工作目录中的目标文件 |
| text | text | 实际要保存的内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，仅原子写入完成后成功 |

Use `path` and `text`。写入的每个字节来自通过契约校验的参数。父目录由已有 fs 创建，
文件由原子写入更新；工作目录以外的路径由宿主拒绝。工具结果记录真实文件名与内容摘要，
不能把模型声称“已写入”当作完成证据。

We **parts = [取得父目录](text.str_split(s=`path`, sep="/"))**.
We **parent = [从工作目录开始]("")** and **count = 0** and **length = table.len(xs=`parts`)**.
- [逐级准备明确的父目录](for parts as part)
  We **count = `count` + 1**.
  1. `count` < `length`
    We **parent = `parent` + `part` + "/"**.
1. `parent` != ""
  We **_ = [创建允许的父目录](fs.make_dirs(path=`parent`))**.
We **_ = [原子保存真实内容](fs.atomic_write(path=`path`, text=`text`))**.
Return *[实际保存完成](result.ok(value=`path`))*.

## search_files

| 参数 | 类型 | 说明 |
|---|---|---|
| query | text | 要寻找的文字 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，最多二十个实际命中文件 |

Use `query`。搜索当前授权目录中的普通 UTF-8 小文件，目录和大文件不作为正文输入。
结果保留文件名及可核验的片段，不把模型预测的路径当成命中。此入口不是全盘索引器，
较大工程应接入已经登记的知识或搜索拓展。

Search examines existing text under the granted workspace and returns a bounded set of actual matches. It is not a web search and does not claim semantic recall. Large files and unreadable binary files are skipped through the native bounded checks. A hit includes the path and a short real excerpt so the model can read the relevant file before rewriting it.

We **paths = [只遍历当前工作根](fs.walk(path="."))**.
We **hits = [从真实空结果开始](table.empty_list())**.
- [读取实际小文件](for paths as path)
  1. table.len(xs=`hits`) < 20
    We **stat = [确认文件种类](fs.stat(path=`path`))**.
    1. access(`stat`, "is_file") and access(`stat`, "size") < 1048576
      We **read = [可恢复读取文本](fs.try_read_text(path=`path`))**.
      1. access(`read`, "ok") and text.contains(text=access(`read`, "value"), sub=`query`)
        We **hit = [记录实际出处](table.put(in=None, at="path", value=`path`))**.
        We **hit = [保留有界正文](table.put(in=`hit`, at="preview", value=re.find(text=access(`read`, "value"), pattern="(?s)^.{0,600}")))**.
        We **hits = [加入实际命中](table.append(list=`hits`, item=`hit`))**.
Return *[搜索结束](result.ok(value=`hits`))*.

## run_marqdo

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 工作目录内的 .mq.md 文件 |
| function | text | "run" | 非实例函数名 |
| arguments | any | None | 实际命名参数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 受限文件根中的实际调用结果 |

Use `path`, `function`="run" and `arguments`=None。只能调用当前工作根内存在的 Marqdo 文件，
没有 Shell 或 Python 入口。子调用只获文件读写权限，不获网络、进程或插件权限。
需要拓展能力必须回到登记工具，不能用生成的源码绕过开关或扩大文件根。

A code fence in an answer is only an explanation. To verify a program, first write a real .mq.md file and then name its function here. The child receives filesystem effects only; generated source cannot use this wrapper to start Python, a shell, another process or an arbitrary native plugin.

1. not text.ends_with(text=`path`, suffix=".mq.md") or not fs.exists(path=`path`)
  Return *[需要实际 Marqdo 文件](result.error(code="qdagent.source", message="需要工作目录中的 .mq.md", operation="run_marqdo"))*.
We **raw = [执行写出的真实函数](call.invoke(file=(sys.cwd() + "/" + `path`), function=`function`, arguments=`arguments`, root=sys.cwd(), effects="fs.read,fs.write"))**.
1. text.starts_with(text=json.stringify(value=`raw`), prefix="{") and json.get(value=`raw`, key="ok") == False
  Return *raw*.
Return *[保留真实运行结果](result.ok(value=`raw`))*.

## file_info

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 当前工作根内的文件或目录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际文件类型、大小和修改时间 |

Use `path`。先检查材料的真实类型与大小，再选择读取范围。只允许当前任务工作目录，权限由原生文件根强制执行，路径不能变成读取服务器配置或另一会话的捷径。元数据来自文件系统，不根据扩展名猜测。调用只读，不修改文件、运行程序或安装插件；失败保留实际错误。

This operation is useful before reading an uploaded document, especially when it may be binary or too large for a text observation. Metadata does not imply the file was interpreted. The registered executor supplies the workspace root and records the real Marqdo call, so a claimed filename in a model answer is not evidence of an existing artifact.

Return *[取得真实文件信息](result.ok(value=fs.stat(path=`path`)))*.

## patch_file

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 工作目录中的 UTF-8 文件 |
| find | text | required | 必须唯一匹配的原文 |
| replace | text | required | 实际替换内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 唯一原文匹配后的实际修改结果 |

Use `path`, `find` and `replace`。先用 read_file 阅读原文，再提供精确且唯一的匹配片段。零匹配或多匹配时原生补丁拒绝，不猜位置，也不覆盖整份文件来掩盖冲突。目标仍受当前任务文件根限制，实际写入由 Marqdo 原生 fs 完成。

Use this for a focused edit that should preserve surrounding work. A stale observation must fail visibly rather than replace unrelated occurrences. The tool cannot run a shell patcher, install dependencies or modify trusted application source. Its successful result and execution receipt establish that the intended native write completed; the model should still read or run the affected artifact when verification is needed.

We **_ = [唯一匹配才修改](fs.text_patch(path=`path`, find=`find`, replace=`replace`))**.
Return *[实际补丁完成](result.ok(value=`path`))*.

## check_marqdo

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 工作目录中的 .mq.md |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方契约与叙述比例检查的真实结果 |

Use `path`。开发 Marqdo 程序时先检查参数、返回契约和叙述比例，再考虑执行。这个入口只运行固定的 marqdo check，不接受命令、选项或可执行文件名。源码必须是工作目录内真实存在的 .mq.md，CLI 文件根继续约束路径。

The check can reject incomplete parameter documentation or insufficient narrative. It does not prove a function ran, its result is correct, or a network service is available. Preserve the actual exit code and diagnostics so the model can make a targeted correction. The registered tool grants process execution only to this trusted wrapper; generated Marqdo programs still receive their existing restricted effects.

1. not text.ends_with(text=`path`, suffix=".mq.md") or not fs.exists(path=`path`)
  Return *[需要真实源文件](result.error(code="qdagent.source", message="需要当前工作目录中的 .mq.md", operation="check_marqdo"))*.

`args` =

| argument |
|---|
| "check" |
| `path` |
| "--narrative-ratio" |

We **out = [固定检查命令](sys.exec(cmd="marqdo", args=`args`, capture=True))**.
1. access(`out`,"code") != 0
  Return *[真实检查失败](result.error(code="qdagent.check", message=json.stringify(value=`out`), operation="check_marqdo"))*.
Return *[官方检查通过](result.ok(value=`out`))*.
