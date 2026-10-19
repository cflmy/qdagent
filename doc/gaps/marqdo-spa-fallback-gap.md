# Marqdo SPA Fallback 缺陷

## 缺陷描述

Marqdo 声明式网关 (`serve.mq.md`) 不支持 SPA (Single Page Application) fallback 路由。
当用户访问前端 SPA 路由（如 `/notes`、`/settings`）时，Marqdo 无法自动将未匹配的
路径回退到 `public/app/index.html`，导致浏览器收到 404 而非 SPA 入口文件。

## 影响范围

- React SPA 的客户端路由（react-router-dom）依赖服务端将所有非 API 路径返回 `index.html`
- 当前用户必须通过完整路径 `/static/app/index.html` 访问 SPA
- 刷新浏览器时，如果 URL 不是根路径，会丢失页面状态

## 临时绕过方案

1. 用户直接访问 `/static/app/index.html` 进入 SPA
2. SPA 内部路由通过 react-router-dom 的 BrowserRouter 处理（hash 模式可作为备选）
3. 或将 BrowserRouter 改为 HashRouter，使所有路由都在 URL hash 中，避免服务端 fallback 需求

## 建议修复方案

在 Marqdo web 能力中增加 `fallback` 路由配置：

```
**app = > `app`.fallback file="public/app/index.html" exclude="/api,/v1,/llm,/asr,/tts,/static,/account"**
```

当请求路径不匹配任何已注册路由且不属于排除前缀时，返回指定的 fallback 文件。

## 状态

- 发现时间: 2026-10-19
- 严重度: 中（影响用户体验，但不阻塞功能）
- 当前状态: 待修复
