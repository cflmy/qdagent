---
markup: occlusion
title: 同一内容的并行风格产物
import:
  office: index.mq.md
  appearance: themes/index.mq.md
  tasks: lib/subtask.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
  io: ext/root-skill/runtime/io.mq.md
---

## generate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信任务调用现场 |
| kind | text | required | docx 或 pptx |
| title | text | required | 同一份已确认标题 |
| sections | list | required | 同一份已验证内容 |
| themes | list | required | 一至四个不同的固定风格 |
| concurrency | number | 2 | 最多同时执行一至四个版本 |
| render_pdf | bool | True | 实际生成 PDF 预览 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

Use `context`, `kind`, `title`, `sections`, `themes`, `concurrency`=2, `render_pdf`=True。

一次批处理使用同一份已经确认并通过验证的正文，不向模型索取三个互相矛盾的重写版本。每种风格交给普通 Marqdo 函数，独立版本目录与排版配置保证并行不会争用同一个输出文件；登记使用短文件事务保留全部结果。用户设置的并发数限制同时执行数量，不因风格数量增加而暗中扩大资源。

任何变体失败都保留具体诊断与已经完成的文件，不能把另一种成功当成整批完成。失败后可以重新执行，旧文件始终可读。该函数只生成表现变体，不改变正文来源、冻结测试、用户批准或插件授权。浏览器选择哪个变体只改变阅读对象，不推进业务状态。所有风格与参数在启动之前检查，未知主题不启动任何子任务。

一次批处理使用同一份已经确认并通过验证的正文，不向模型索取三个互相矛盾的重写版本。每种风格交给普通 Marqdo 函数，独立版本目录与排版配置保证并行不会争用同一个输出文件；登记使用短文件事务保留全部结果。用户设置的并发数限制同时执行数量，不因风格数量增加而暗中扩大资源。

任何变体失败都保留具体诊断与已经完成的文件，不能把另一种成功当成整批完成。失败后可以重新执行，旧文件始终可读。该函数只生成表现变体，不改变正文来源、冻结测试、用户批准或插件授权。浏览器选择哪个变体只改变阅读对象，不推进业务状态。所有风格与参数在启动之前检查，未知主题不启动任何子任务。

1. len(`themes`) < 1 or len(`themes`) > 4 or `concurrency` < 1 or `concurrency` > 4
  Return *result.error(code="office.variants",message="选择一至四种风格，并发为一至四",operation="variants")*.
主题选择仅授权表现生成，不能增加正文来源、修改已确认规格或改变独立测试。真实文件和 PDF 分别有摘要，最终审阅重新核对所有变体，避免用户切换到另一个版本时实际内容已经改变。登记锁不会把长时间排版串行化，只有最后写清单时短暂互斥，三个版本可以同时处于生成中。

每个主题由实际参数函数与固定声明资源共同提供。创建时先拒绝未知名字，再按同一份布局契约检查全部内容；父进程只负责有界并发与收集结果，不在宿主另写布局或模型提示。源稿、可编辑文件和预览各自保留身份，用户选择与下载始终定位实际文件。只读切换不会触发再次创作或覆盖原来版本。

We **seen = table.empty_list()**.
- [全部风格检查后才启动](for themes as theme)
  We **spec = appearance.select(theme=`theme`)**.
  1. json.get(value=`spec`,key="ok") == False
    Return *spec*.
  1. table.contains(list=`seen`,item=`theme`)
    Return *result.error(code="office.variants",message="风格不得重复",operation="variants")*.
  We **seen = table.append(list=`seen`,item=`theme`)**.
并行任务只传入受信调用现场、格式、正文、固定主题和版本批次。每个线程调用同一创建函数，创建函数再在任务文件根运行，主题文件在只读源码根读取后作为数据交接。等待器保留输入顺序，所以较快完成的版本不会悄悄抢占默认风格。用户选择一个并发时按序执行，选择多个时同一波次中的版本先全部启动再等待。转场属于文件内容，界面中的执行中状态则来自真实事件，二者不能混淆。

资源限制与内容限制分别有效。Word 和 PPT 共用这份批处理，不能在其中再复制一套参数长度表。每个版本仍经过整份预检、原生打包、解包检查和可选真实排版。部分失败保留部分事实，下一轮模型需要看具体字段而不是盲目把同一参数再发送一次。批次身份仅用于前端归组，不构成文件路径或执行授权。

We **group = uuid.v4()** and **handles = table.empty_list()** and **outputs = table.empty_list()**.
- [各风格通过普通函数并发排版](for themes as theme)
  We **args = table.put(in=None,at="context",value=`context`)**.
  We **args = table.put(in=`args`,at="kind",value=`kind`)**.
  We **args = table.put(in=`args`,at="title",value=`title`)**.
  We **args = table.put(in=`args`,at="sections",value=`sections`)**.
  We **args = table.put(in=`args`,at="theme",value=`theme`)**.
  We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
  We **args = table.put(in=`args`,at="group_id",value=`group`)**.
  We **handle = tasks.spawn(fn="worker",args=`args`)**.
  We **handles = table.append(list=`handles`,item=`handle`)**.
  1. len(`handles`) >= `concurrency`
    We **outputs = table.concat(a=`outputs`,b=collect(handles=`handles`))**.
    We **handles = table.empty_list()**.
We **outputs = table.concat(a=`outputs`,b=collect(handles=`handles`))**.
We **success = table.empty_list()** and **failed = table.empty_list()**.
- [逐一检查真实函数结果](for outputs as output)
  1. json.get(value=`output`,key="ok") == True
    We **success = table.append(list=`success`,item=access(`output`,"value"))**.
  2. else
    We **failed = table.append(list=`failed`,item=`output`)**.
1. len(`failed`) > 0
  Return *table.put(in=result.error(code="office.variant_failed",message=json.stringify(value=`failed`),operation="variants"),at="value",value=`success`)*.
We **primary = table.at(xs=`success`,i=0)**.
Return *result.ok(value=table.put(in=`primary`,at="variants",value=`success`))*.

## collect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| handles | list | required | 本波次的真实函数任务身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 真实结果；失败保留诊断 |

Use `handles`。

一次批处理使用同一份已经确认并通过验证的正文，不向模型索取三个互相矛盾的重写版本。每种风格交给普通 Marqdo 函数，独立版本目录与排版配置保证并行不会争用同一个输出文件；登记使用短文件事务保留全部结果。用户设置的并发数限制同时执行数量，不因风格数量增加而暗中扩大资源。

任何变体失败都保留具体诊断与已经完成的文件，不能把另一种成功当成整批完成。失败后可以重新执行，旧文件始终可读。该函数只生成表现变体，不改变正文来源、冻结测试、用户批准或插件授权。浏览器选择哪个变体只改变阅读对象，不推进业务状态。所有风格与参数在启动之前检查，未知主题不启动任何子任务。

We **outputs = table.empty_list()**.
- [等待本波次并保留调用结果](for handles as handle)
  We **value = tasks.wait(id=`handle`)**.
  We **outputs = table.append(list=`outputs`,item=`value`)**.
Return *outputs*.

## worker

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信任务调用现场 |
| kind | text | required | docx 或 pptx |
| title | text | required | 同一份已确认标题 |
| sections | list | required | 同一份已验证内容 |
| render_pdf | bool | True | 实际生成 PDF 预览 |
| theme | text | required | 单一固定风格 |
| group_id | text | required | 受信批次身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

Use `context`, `kind`, `title`, `sections`, `render_pdf`=True, `theme`, `group_id`。

一次批处理使用同一份已经确认并通过验证的正文，不向模型索取三个互相矛盾的重写版本。每种风格交给普通 Marqdo 函数，独立版本目录与排版配置保证并行不会争用同一个输出文件；登记使用短文件事务保留全部结果。用户设置的并发数限制同时执行数量，不因风格数量增加而暗中扩大资源。

任何变体失败都保留具体诊断与已经完成的文件，不能把另一种成功当成整批完成。失败后可以重新执行，旧文件始终可读。该函数只生成表现变体，不改变正文来源、冻结测试、用户批准或插件授权。浏览器选择哪个变体只改变阅读对象，不推进业务状态。所有风格与参数在启动之前检查，未知主题不启动任何子任务。

We **event = table.put(in=table.put(in=None,at="theme",value=`theme`),at="group_id",value=`group_id`)**.
We **_ = io.event(context=`context`,kind="artifact_variant_start",data=`event`)**.
We **created = office.create(kind=`kind`,title=`title`,sections=`sections`,context=`context`,theme=`theme`,group_id=`group_id`,render_pdf=`render_pdf`)**.
We **event = table.put(in=`event`,at="ok",value=access(`created`,"ok"))**.
We **_ = io.event(context=`context`,kind="artifact_variant_end",data=`event`)**.
Return *created*.
