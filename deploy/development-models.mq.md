---
markup: occlusion
title: 开发模型配置的加密迁移
import:
  fs: lib/fs.mq.md
  store: ../ext/qdagent/store.mq.md
  models: ../pages/control/models.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

这个开发管理入口不是智能体工具。它只为容器内的真实模型验收迁移加密配置，不创建共享付费模型或登录身份，也不改动其他用户的配置。

## export

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 密文迁移文件；不输出配置或密钥 |

此入口固定选择 agent-development 的模型配置，只复制 AES-GCM 密文及公开模型字段。它不解密，不迁移其他用户记录，也不进入 Docker 构建白名单。源机和容器必须挂载同一份既有模型加密主密钥；本任务的部署已经使用独立 secret 完成这件事。

The transfer is an explicit development operation, not a public API or a model tool. A ciphertext remains bound to its original owner and profile id. Copying it does not make the model available to an arbitrary logged-in user. The exported file stays under the ignored engineering directory and is removed after successful import. The function returns a count rather than the ciphertext records.

We **args = table.append(list=table.empty_list(),item="agent-development")**.
We **rows = store.query(sql="SELECT id,owner,label,protocol,model,endpoint,credential,thinking FROM qd_model_profiles WHERE owner=?",args=`args`)**.
We **_ = [只写加密迁移记录](fs.write_json(path=".marqdo/development-profile-transfer.json",value=`rows`))**.
Return *[不输出密文内容](result.ok(value=table.len(xs=`rows`)))*.

## import

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 加密配置解密检查通过后删除中转文件 |

迁移文件固定在 data/development-profile-transfer.json，不从 HTTP 参数选择。每条记录的身份必须仍是 agent-development，接口必须是本次授权的 USTC 地址。绑定 SQL 保留原始配置身份和密文；已有相同身份不覆盖。随后在可信服务内尝试解密，只返回数量，任何私有配置都不进入终端。

The temporary file contains encrypted records only. Keeping a transfer distinct from an image build prevents deployment layers from retaining a user's development configuration. An interrupted import can be inspected and retried deliberately: existing ids are retained, other owners are never selected, and the verification step still checks each imported record with the real resolver.

An import is successful only when the existing production resolver can decrypt the imported profile under the same owner and id. An incompatible secret fails visibly rather than replacing or rotating the production key. Other users' profiles and task data remain untouched. The temporary transfer file is removed only after all records pass. No plaintext API key appears in an argv, image layer, source file or returned test object.

We **rows = fs.read_json(path="data/development-profile-transfer.json")**.
- [只接受本次开发身份](for rows as row)
  1. access(`row`,"owner") != "agent-development" or access(`row`,"endpoint") != "https://api.llm.ustc.edu.cn/v1"
    Return *[拒绝不属于本次迁移的配置](result.error(code="model.transfer",message="unexpected owner or provider",operation="import"))*.

  `args` =

  | value |
  |---|
  | `row`[^id] |
  | `row`[^owner] |
  | `row`[^label] |
  | `row`[^protocol] |
  | `row`[^model] |
  | `row`[^endpoint] |
  | `row`[^credential] |
  | `row`[^thinking] |

  We **_ = store.execute(sql="INSERT OR IGNORE INTO qd_model_profiles(id,owner,label,protocol,model,endpoint,credential,thinking) VALUES(?,?,?,?,?,?,?,?)",args=`args`)**.
  We **private = models.resolve(selection=access(`row`,"id"),principal="agent-development")**.
  1. not access(`private`,"ok") or access(access(`private`,"value"),"api_key") == ""
    Return *[主密钥不匹配不能宣称可用](result.error(code="model.transfer",message="cannot verify imported credential",operation="import"))*.
We **_ = [迁移完成删除中转](fs.remove_file(path="data/development-profile-transfer.json"))**.
Return *[只返回数量](result.ok(value=table.len(xs=`rows`)))*.
