---
markup: occlusion
title: 站点到工程能力的单一入口
import:
  call: ../control/call.mq.md
  fs: lib/fs.mq.md
  result: lib/result.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

站点文件根只负责 HTTP 和静态资源。启动器写入可信工程定位；浏览器不会提供工程路径。每个控制能力继续使用 marqdo call，任务工作目录由独立会话管理。

## invoke

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| member | text | required | 可信服务函数 |
| arguments | map | required | 命名参数 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实服务函数返回 |

Use `member` and `arguments` and `principal`="local"。入口来自源码中的固定调用，不从模型内容拼接。缺少启动配置时明确失败，不能退到站点根创建另一套会话。这个边界不会把工具权限交给查询参数。

The launcher owns runtime.json. For example, a request for session A reaches the engineering root first, resolves A through the session manager, and only then enters A's locked runner. A query cannot substitute a different project directory. If the launch configuration is missing, start the site through the callable serve entry instead of creating a second default history under pages. The returned error remains a protocol failure.

1. not fs.exists(path="data/runtime.json")
  Return *[启动配置缺失](result.error(code="qdagent.runtime", message="请通过 pages/index.mq.md 的 serve 启动", operation="gateway"))*.
We **config = [读取可信启动配置](fs.read_json(path="data/runtime.json"))**.
1. json.get(value=`config`, key="authentication_required") and (`principal` == "local" or `principal` == "")
  Return *[认证入口必须提供真实身份](result.error(code="qdagent.authentication_required", message="需要统一身份登录", operation="gateway"))*.
We **arguments = [身份不由浏览器选择](table.put(in=`arguments`, at="principal", value=`principal`))**.
We **project = access(`config`, "project")**.
Return *[唯一调用形式进入工程服务](call.invoke(file=`project` + "/pages/control/service.mq.md", function=`member`, arguments=`arguments`, root=`project`, effects="plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read"))*.
