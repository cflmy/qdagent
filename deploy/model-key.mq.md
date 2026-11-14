---
markup: occlusion
title: 模型凭据独立加密密钥
import:
  fs: lib/fs.mq.md
  secrets: lib/secrets.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---

API Key 使用独立随机密钥做 AES-256-GCM 加密，数据库只存密文。主密钥通过 Docker secret 挂载，不进镜像、对话、工作文件或日志。这里使用 Marqdo 固有随机和文件能力准备一次性安装材料。

本文件维护 AES-GCM 模型配置加密主密钥，不是供应商 API key。加密主密钥只能在可信宿主本地读写，禁止提交到任何模型接口；供应商凭据必须由现有配置解析器按账号和模型身份解密取得。

## ensure

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 仅返回秘密文件位置，不返回内容 |

已有密钥绝不重新生成，否则旧模型凭据将无法解密。宿主 secret 目录已有严格目录权限；文件只读挂入容器，由可信本地 ABI 读取。密钥不是 OIDC 客户端秘密，不复用登录凭据。备份数据库时需由管理员一并安全保管此文件，用户工作目录没有访问它的权限。

The function never returns the token or prints it. The build context has an explicit source allowlist and excludes the secret directory, while Compose mounts the key separately at runtime. Changing image versions does not rotate this key. The encryption ABI authenticates both the owner and model profile id as additional data, so copying a ciphertext to another owner's record cannot decrypt it.

1. not fs.exists(path=".marqdo/secrets/model_key")
  We **key = [固有密码学随机源](secrets.token_hex(n=32))**.
  We **_ = [只写私有 secret 目录](fs.atomic_write(path=".marqdo/secrets/model_key", text=`key`))**.

`argv` =

| argument |
|---|
| "chmod" |
| "0444" |
| ".marqdo/secrets/model_key" |

We **mode = engineering.checked(argv=`argv`, max_output=1000)**.
1. not access(`mode`,"ok")
  Return *mode*.
Return *[不输出加密密钥](result.ok(value=".marqdo/secrets/model_key"))*.
