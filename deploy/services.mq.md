---
markup: occlusion
title: 搜索与 OCR 的实际验收
import:
  engineering: ext/engineering/index.mq.md
---

这份文稿用于管理员验证已构建的镜像，不是模型可见的业务工具入口。

## probe

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实搜索、OCR 与 Marqdo 调用链的验收结果 |

在一次性只读容器的临时工作区中，通过普通 Marqdo 函数实际搜索公开资料，再提交无敏感内容的自制 PDF，恢复同一个 OCR 任务并验证识别文字。宿主脚本只搭建测试夹具，不向模型提供另一套工具协议或提示词。OCR 会使用已配置令牌产生一次真实 API 请求，不读取用户文件。

检查搜索摘要未变成已浏览来源、轮询未重复提交、识别文字真实落盘、测试角色拿不到观察。失败保留实际失败，不将缺少结果或排队超时当作成功。此检查不替换生产数据卷，不给测试容器挂载模型密钥或身份 Cookie；服务仍只有原来的公网入口。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/test-services.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=180000,max_output=8000)*.
