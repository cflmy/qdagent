---
markup: occlusion
title: 求道当前部署入口
import:
  manage: manage.mq.md
  result: lib/result.mq.md
---

当前站点由 Go 提供服务，业务根流程由 Marqdo 文稿执行。部署复用同一个 manage 手册，不读取或返回身份与模型密钥，也不启动旧 Web 宿主。

## build

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | build 的真实结果，失败保留诊断 |

Use 。

构建经过检查的主服务和隔离浏览器镜像。具体操作、前置条件和失败界限都在 manage 的同名函数中，调用者应先阅读再执行。构建、启动、检查和业务验收分别记录，不能相互替代；密钥轮换不属于普通启动，不允许借更新服务的名义执行未经批准的生产凭据修改。

Return *manage.build()*.

## up

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | up 的真实结果，失败保留诊断 |

Use 。

执行已经获得授权的容器更新，保持 7964 与数据卷。具体操作、前置条件和失败界限都在 manage 的同名函数中，调用者应先阅读再执行。构建、启动、检查和业务验收分别记录，不能相互替代；密钥轮换不属于普通启动，不允许借更新服务的名义执行未经批准的生产凭据修改。

Return *manage.up()*.

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | status 的真实结果，失败保留诊断 |

Use 。

读取当前实际服务状态。具体操作、前置条件和失败界限都在 manage 的同名函数中，调用者应先阅读再执行。构建、启动、检查和业务验收分别记录，不能相互替代；密钥轮换不属于普通启动，不允许借更新服务的名义执行未经批准的生产凭据修改。

Return *manage.status()*.

## serve

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | serve 的真实结果，失败保留诊断 |

Use 。

旧 Web 启动器不再提供生产网络服务。这个入口保留明确停用诊断，便于发现过时调用；它不会重新读取身份密钥，也不会监听同一个端口覆盖 Go 服务。当前服务由已经构建并获准部署的镜像启动，状态和数据通过现有 HTTP 与 SQLite 路径继续管理。

Return *result.error(code="deploy.legacy_server",message="旧 Web 宿主已停用，请使用 build、up、status",operation="serve")*.
