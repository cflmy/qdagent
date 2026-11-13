---
markup: occlusion
title: 知识库
description: 知识根的真实发现与检索：清单来自文件系统，回答带出处。
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
---

知识根就住在站点目录里：kb/ 下每个子目录是一个知识库，里面的 .md 文档是知识节点；serve 的渲染
期文件沙盒正是站点目录，知识根放站点内，端点与页面天然可读。roots 与 plugins 都在装配期对文件
系统做真实发现，目录变了重启 serve 即见，不在本文档里写死清单。search 按段落匹配查询，返回片段
与出处文件，回答据此拼装——引用即出处。ext 下每个条目都是一份已注册拓展，站点内的 ext 是仓库拓
展根的镜像（native 二进制除外），拓展加减后重跑镜像同步并重启 serve 即见，清单与工作区插件组共用一个函数，避免两处数据分叉。


## roots

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | kb/ 下真实存在的知识库名列表 |

知识根来自文件系统的实际列举，kb 目录只放知识库——模块文档在站点根 pages/kb.mq.md，不占知识根的位置：新建子目录即新建知识库，删除即下线，无需改动本文档。清单在装配期求值一次，运行期不再变化。

Effects: fs.read.

We **names = [列举知识根目录](fs.list_dir(path="kb"))**.
Return *names*.

## plugins

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | ext/ 下已安装拓展名列表 |

插件清单同样来自真实列举。ext 下每个条目都是一份已注册拓展，这正是"插件即拓展"：自带拓展与自定义拓展在清单里没有区别，工作区插件组的数据源就是这里。

Effects: fs.read.

ext 根下的 VERSION 是版本文件不是拓展，逐项过滤后只返回拓展目录；后续 fs 提供目录判定后，这里的硬编码换成真实判定。

We **names = [列举已安装拓展](fs.list_dir(path="ext"))** and **exts = [拓展从空开始](table.empty_list())**.
- [逐项筛选拓展目录](for names as name)
  1. `name` == "VERSION"
    **_ = 1**
  2. *
    We **exts = [收入拓展](table.append(list=`exts`, item=`name`))**.
Return *exts*.

## search

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 知识库名，kb/ 下的子目录 |
| q | text | required | 查询词或短语 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 命中片段记录（file 与 text），按文档顺序排列 |

检索按段落做包含匹配：逐篇读取知识文档，按空行分段，段落含查询词即收入命中，出处就是文档路径。中文按短语整体匹配，英文暂按原样大小写匹配，先保证回答带真实出处，排序与分词留给后续迭代。

Use `root` and `q` as the inputs for this operation. 检索只读知识根，不写任何文件；查询词不做分词，包含即命中，因此查询越具体命中越准。文档遍历用深度优先的 walk，文件过滤只保留 .md 知识节点。

Effects: fs.read.

We **files = [列出知识文档](fs.walk(path="kb/" + `root`))** and **hits = [命中从空开始](table.empty_list())**.
- [逐篇扫描知识文档](for files as file)
  1. [只读 markdown 知识节点](text.ends_with(text=`file`, suffix=".md"))
    We **raw = [读取知识文档](fs.read_text(path="kb/" + `root` + "/" + `file`))** and **paras = [按空行分段](text.str_split(s=`raw`, sep="\\n\\n"))**.
    - [逐段匹配查询](for paras as para)
      1. [段落包含查询词](text.contains(text=`para`, sub=`q`))
        We **rec = [片段记录](table.put(in=None, at="file", value="kb/" + `root` + "/" + `file`))** and **rec = [附上片段原文](table.put(in=`rec`, at="text", value=`para`))** and **hits = [收入命中](table.append(list=`hits`, item=`rec`))**.
Return *hits*.