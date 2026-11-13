---
markup: occlusion
title: 会话、授权与真实工具验收
import:
  sessions: ../pages/control/sessions.mq.md
  plugins: ../pages/control/plugins.mq.md
  executor: ../pages/agent/executor.mq.md
  call: ../pages/control/call.mq.md
  transport: ../ext/qdagent/transport.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  sys: lib/sys.mq.md
  result: lib/result.mq.md
---

测试在专用工程副本中运行，不切换用户真实插件开关，不覆写真实档案。验证实际文件、真实 CLI 结果和过期请求拒绝，不把构造出一个调用表当作功能已经完成。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 隔离工程副本位置 |

原生目录复制会丢失执行位，因此 worker 使用 copy_file 单独安装。只复制程序与库，不复制用户数据、构建缓存和浏览器产物。该副本保留真实源码路径结构，控制器里的工程定位将指向隔离根。

The test root is a complete small engineering project, not just a renamed output folder. Session context stores its project location, so an incomplete copy could accidentally resolve control requests back to production. Copy actual library and application source into the same relative layout and install the native worker with its executable permissions.

Do not copy data, user knowledge, native build caches or public browser assets for this backend suite. They are unnecessary inputs and could leak a user's current state into deterministic assertions. A missing required ABI is an installation failure, not a reason to replace a tool with a simulated result. Repeating preparation updates source and binaries while retaining dedicated diagnostics for inspection.

The returned absolute root is passed to the actual test CLI. Trusted source is read from the application, while all stateful services see the isolated project root. Native file operations perform every copy and directory creation.

We **_ = [准备专用工程](fs.make_dirs(path=".marqdo/capabilities"))**.
We **_ = [标准库仍来自实际安装](fs.copy_tree(src="lib", dest=".marqdo/capabilities/lib", overwrite=True))**.

`exclude` =

| pattern |
|---|
| "native/**" |
| "qdagent/native/**" |

We **_ = [拓展源码仍是真实实现](fs.copy_tree(src="ext", dest=".marqdo/capabilities/ext", overwrite=True, exclude=`exclude`))**.
We **_ = [可调用手册也属于真实工程](fs.copy_tree(src="skills", dest=".marqdo/capabilities/skills", overwrite=True))**.
We **_ = [页面与后端保持正式结构](fs.copy_tree(src="pages", dest=".marqdo/capabilities/pages", overwrite=True, exclude=table.append(list=table.append(list=table.empty_list(), item="public/**"), item="data/**")))**.
We **_ = [建立安装目录](fs.make_dirs(path=".marqdo/capabilities/ext/native"))**.

`binaries` =

| name |
|---|
| "libagent.so" |
| "libweb.so" |
| "libllm.so" |
| "libqdagent_transport.so" |
| "qdagent-worker" |

- [安装同一版本产物](for binaries as name)
  We **_ = [保留可执行权限](fs.copy_file(src="ext/native/" + `name`, dest=".marqdo/capabilities/ext/native/" + `name`))**.
Return *[真实隔离根](result.ok(value=sys.cwd() + "/.marqdo/capabilities"))*.

## assert

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| condition | any | required | 真实断言 |
| message | text | required | 失败说明 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 失败立即结束当前测试 |

Use `condition` and `message`。只有实际状态满足断言才继续。失败不是一条可忽略的日志，也不能被后续最后一个成功 Result 覆盖。这里使用已有 sys.exit 保留真实测试退出。

1. not `condition`
  We **_ = [打印实际失败](print(text=`message`))**.
  We **_ = [失败立即退出](sys.exit(code=1))**.
Return *True*.

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际能力验收结论 |

在隔离工程根执行。先证明两任务文件和档案独立，再验证注册工具真正形成 CLI，读回实际内容。畸形参数、未知工具和停用拓展必须在工具启动之前拒绝；标准库不可关闭。最后通过 ABI 控制锁验证 begin、重复 begin、过期 poll 与停止，不启动真实模型。

The first two contexts have fixed acceptance identities so their paths are easy to inspect. Their readable titles do not select files. Write proof.md through the real registered write_file tool, then read it through read_file; the second workspace must still lack that artifact. Use a fresh operation identity on every run so an earlier committed receipt cannot make a later test pass without observing the intended call.

The schema rejection deliberately omits text from write_file. It must fail before a file process begins. The unknown-tool rejection uses an identity absent from the trusted registry, so there is no fallback to an arbitrary function. These are different boundaries and should retain their respective error evidence.

The network switch changes only the isolated project's settings. Once off, requesting http_get must fail without contacting the supplied address. Restore the switch in that same test environment for a later run. The standard-library switch must always reject, regardless of UI controls. Also call an actually registered Web entry to ensure the plugin panel represents usable extension operations, not merely directory labels.

The controlled begin uses model none, so the suite never depends on a network model or an installed model's quality. It still goes through the native control lock and real runner, writes ordinary Markdown and returns its rendered fragment. A stale poll then uses a different generation and must fail before changing this job. This test is not a browser test: DOM persistence and real keyboard callbacks are covered by task-ui.

The suite stops on the first failed assertion. A normal CLI envelope can contain a failing Result, so callers must inspect both boundaries. Evidence remains under the dedicated root for diagnosis. No assertion reads or toggles production state, and no fixed success text substitutes for actual filesystem or protocol observations.


The registered extension assertion uses a pure Web layout-rules entry. Its returned table is a valid result even though it is not itself a Result envelope; the adapter wraps that value without inventing a success event before invocation. This catches an integration mistake where a real plugin call could complete yet the dispatcher misclassified every plain list as failure. The dedicated receipt identity keeps its evidence separate from earlier test attempts.

Reading a manual is a read-only capability. Its implementation may inspect plugin settings, but that inspection must not create a settings directory; otherwise a tool correctly granted fs.read would fail before reading any source. The regression invokes read_library under its registered effect set, which catches that hidden effect dependency. State-directory creation belongs to an explicit switch mutation. The isolated project includes callable development manuals so guide can also resolve without falling back to a production directory.

We **a = [独立任务甲](sessions.ensure(id="acceptance-a", title="验收甲"))**.
We **b = [独立任务乙](sessions.ensure(id="acceptance-b", title="验收乙"))**.
We **ctx = access(`a`, "value")**.
We **_ = [标准库禁止停用](assert(condition=not access(plugins.toggle(id="stdlib"), "ok"), message="builtin toggle accepted"))**.

`args` =

| path | text |
|---|---|
| "proof.md" | "普通 **Markdown**，真实文件由 marqdo call 写入。" |

We **run_id = [每次真实验收使用独立收据](fs.make_temp(prefix="receipt"))**.
We **written = [执行实际登记工具](executor.execute(name="write_file", arguments=`args`, context=`ctx`, run_id=`run_id`, step=1))**.
We **_ = [写入必须成功](assert(condition=access(`written`, "ok"), message=json.stringify(value=`written`)))**.
We **reader = table.put(in=None, at="path", value="proof.md")**.
We **read = [真实读取文件](executor.execute(name="read_file", arguments=`reader`, context=`ctx`, run_id=`run_id`, step=2))**.
We **_ = [读回实际内容](assert(condition=access(`read`, "ok"), message=json.stringify(value=`read`)))**.
We **_ = [其他任务不能看见文件](assert(condition=not fs.exists(path="data/workspaces/acceptance-b/proof.md"), message="workspace leaked"))**.
We **bad = [拒绝未知身份](executor.execute(name="not_registered", arguments=`reader`, context=`ctx`, run_id=`run_id`, step=3))**.
We **_ = [未知工具未执行](assert(condition=not access(`bad`, "ok"), message="unknown tool executed"))**.
We **bad = [拒绝错误 Schema](executor.execute(name="write_file", arguments=`reader`, context=`ctx`, run_id=`run_id`, step=4))**.
We **_ = [缺少正文不能写入](assert(condition=not access(`bad`, "ok"), message="bad arguments accepted"))**.
We **off = [关闭网络授权](plugins.toggle(id="net"))**.
We **bad = [关闭的拓展不能执行](executor.execute(name="http_get", arguments=table.put(in=None, at="url", value="http://127.0.0.1:1"), context=`ctx`, run_id=`run_id`, step=5))**.
We **_ = [停用工具必须拒绝](assert(condition=not access(`bad`, "ok"), message="disabled tool executed"))**.
We **on = [恢复隔离环境授权](plugins.toggle(id="net"))**.
We **extension = [登记拓展也能真正调用](executor.execute(name="call_plugin", arguments=table.put(in=table.put(in=None, at="plugin", value="web"), at="operation", value="layout_rules"), context=`ctx`, run_id=`run_id`, step=6))**.
We **_ = [拓展纯值也要保留真实成功](assert(condition=access(`extension`, "ok"), message=json.stringify(value=`extension`)))**.
We **manual = [只读权限可以阅读库源码](executor.execute(name="read_library", arguments=table.put(in=None, at="module", value="fs"), context=`ctx`, run_id=`run_id`, step=7))**.
We **_ = [能力目录的读取不能偷偷要求写权限](assert(condition=access(`manual`, "ok"), message=json.stringify(value=`manual`)))**.
We **entry = sys.cwd() + "/pages/agent/runner.mq.md"**.

`start` =

| q | model | gen |
|---|---|---|
| "普通 Markdown 展示测试" | "none" | 12 |

We **began = [真实受控调用](transport.control(root=access(`ctx`, "root"), entry=`entry`, member="begin", arguments=`start`))**.
We **_ = [真实 Markdown 已显示](assert(condition=access(`began`, "ok") and access(`began`, "done"), message=json.stringify(value=`began`)))**.
We **stale = [旧代数不能操作](transport.control(root=access(`ctx`, "root"), entry=`entry`, member="poll", arguments=table.put(in=None, at="gen", value=11)))**.
We **_ = [过期请求明确失败](assert(condition=not access(`stale`, "ok"), message="stale generation accepted"))**.
Return *[实际断言全部通过](result.ok(value="独立工作目录 / 真实 marqdo call 读写 / Schema 与白名单 / 固有能力 / 拓展开关 / Markdown / 过期请求"))*.
