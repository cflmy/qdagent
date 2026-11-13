---
markup: occlusion
title: 将授权模型交付给实际登录账号
import:
  models: ../pages/control/models.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---



## assign

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| owner | text | required | 已核实的实际登录主体 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 成功交付的模型名称；不返回密钥或私有配置 |

Use `owner`。这是人工授权后的本地管理入口，不是 HTTP 路由或智能体工具。只选择已经验证的开发模型，在可信服务内解密并使用目标账号重新加密保存；不能把密文直接更换拥有者。先检查目标已有模型，避免重复添加。输出只有模型名称，密钥不进入终端、镜像或任务记录。该入口不创建登录身份，不改变任何会话归属，不向其他用户共享额度。

The target owner must be established from the real authenticated task records before this administrator runs the operation. A display name is insufficient, because identity is the issuer and subject pair. This operation does not guess a user from a browser query. It reuses the existing model service so every credential remains bound to its new owner and newly generated profile id. The caller verifies the public target list afterwards, without printing decrypted values. Existing unrelated profiles are preserved.

We **entries = models.list(principal="agent-development")**.
We **existing = models.list(principal=`owner`)**.
We **out = table.empty_list()**.
- [只交付已经实测的模型](for entries as entry)
  1. access(`entry`,"model") == "smart/default" or access(`entry`,"model") == "qwen3.8-chat"
    We **found = False**.
    - [已有配置不重复添加](for existing as item)
      1. access(`item`,"model") == access(`entry`,"model")
        We **found = True**.
    1. not `found`
      We **resolved = models.resolve(selection=access(`entry`,"id"),principal="agent-development")**.
      We **private = access(`resolved`,"value")**.
      We **saved = models.save(label=access(`entry`,"model"),model=access(`entry`,"model"),endpoint=access(`private`,"endpoint"),protocol="openai",api_key=access(`private`,"api_key"),principal=`owner`)**.
      1. not access(`saved`,"ok")
        Return *saved*.
    We **out = table.append(list=`out`,item=access(`entry`,"model"))**.
Return *[只报告公开名称](result.ok(value=`out`))*.
