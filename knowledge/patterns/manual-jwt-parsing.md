---
title: Manual JWT parsing bypasses verification
type: AntiPattern
status: stable
capability: auth
---

# AntiPattern — Manual JWT Parsing

不要直接解析 JWT payload（如 `base64(payload).split(".")` / `json.loads(middle)`）
来判断用户身份或权限。

## Why forbidden

- issuer (`iss`) 未验证 → 可伪造来自其它系统的 token
- expiry (`exp`) 可能被忽略 → 过期 token 仍被接受
- signature 未校验 → 任何人都可签发
- key rotation 无法统一处理 → 换密钥时散落各处的解析会静默失效
- audit 信息缺失 → 无法追溯到统一鉴权点

## Use instead

```text
auth.verify_token   # 或网关层 gateway/auth.check（统一鉴权 + 追踪头）
```

Preflight 见到此模式时应在 Forbidden 区列出：

```text
existing failure: manual-jwt-parsing
```
