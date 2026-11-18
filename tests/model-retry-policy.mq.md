---
markup: occlusion
title: 模型网络重试策略金样
import:
  io: ../ext/root-skill/runtime/io.mq.md
  json: ../lib/json.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，只调用生产 io.retryable 的纯函数，核对模型网络错误的重试分类：暂时传输失败（限流、网关、超时、连接中断、域名解析）至多再试一次；鉴权、未知模型、预算与普通程序错误不重试；显式连接拒绝不重试。由官方 Marqdo 编译器执行。

分类只服务模型生成阶段，发生在源码检查与实际执行之前，因此重试不会重新写文件、再次提交 OCR 或重复调用外部业务。工具副作用不套用这份策略——这是本仓"有副作用的操作不能自动重试"的边界。金样把文档里的类别词表逐一固定成断言：连续两次失败后保持未完成并保留每次尝试的独立事件，用户看到的模型身份始终与实际请求一致。

显式拒绝连接的排除是这条边界里最容易退化的一点：英文 refused 与中文"拒绝连接/被拒绝"都必须在通用 connection 匹配之前判为不可重试，否则本机服务未启动时会被误判为暂时波动并浪费一次请求。反向的误判同样被断言固定：把 503 或超时判为不可重试会让真实的短暂故障得不到恢复机会。

分类矩阵的设计对应文档里的四类来源：可恢复的传输层事实（限流/网关/超时/连接中断/域名解析）、明确不可恢复的鉴权与预算、普通程序错误（未知函数、参数不符）、以及本机服务拒绝连接。前两类走英文与中文两套诊断措辞，因为传输层会按用户语言返回事实；只测英文会让中文界面下的重试行为失去约束。第三类必须保持不重试，否则参数错误会被包装成"网络波动"而无限循环。

断言只读取布尔分类，不检查文案；实现可以在不改变语义的前提下改进匹配方式，但类别归属一旦变化就会失败。显式拒绝连接的三条断言（英文 refused、中文被拒绝、中文拒绝连接）是这次修复的回归锚点：通用 connection 判断必须先被拒绝语义短路，否则本机服务未启动时用户会看到一次无意义的重试。

金样不验证实际重试次数、间隔与事件字段——那属于 io.model 的实际发送路径，需要真实模型端点与失败注入，在部署环境验收。本样只固定"哪类错误值得再试一次"这一决策本身，让宿主与模型都不必猜测。

与宿主重试的区别同样重要：宿主层的任务启动重试只处理"当前任务较多"这类资源占用，绝不重新执行已经发出的工具；本函数只处理模型传输层，二者不能互相替代。模型重试使用相同授权模型与相同消息，新尝试拥有独立的事件身份与审计文件；前一次的半段输出仍然可核对，但不拼进新候选源码。这条身份隔离由 io.model 的事件记录实现，本样只固定输入分类这一半。

中文与英文措辞的覆盖也反映部署现实：供应商错误有时是英文原样透传，有时是传输层转写的中文事实。两类措辞必须落在同一类别，否则同一故障在不同语言环境下得到相反的处置。断言里没有任何"猜测"分支——所有类别都由明确字符串事实决定，无法判断时返回不可重试，保留真实错误等待用户或管理员处理。这种保守方向是刻意的：把可恢复错误误判为不可恢复，用户看到真实诊断后可以手动继续；把不可恢复错误误判为可恢复，则会重复发送同一请求，浪费额度并可能掩盖配置问题。

夹具使用 json.parse 构造 observed 结构，与真实传输层报告的形状一致（一个含 message 字段的 map），因此金样断言的输入路径与生产完全同形。没有引入任何新的错误码表或正则解析器：分类只读取官方诊断里已经存在的字符串事实，判断函数本身就是文档里公开的 io.retryable。

后续若供应商新增错误码（例如 500 或 507），必须先更新 io.mq.md 的叙述与类别表，再改实现与本金样；不得在宿主或前端另起一套判断。这条规则保证"重试"这个有成本的动作只有一个权威定义，也保证宿主、模型与前端看到的是同一套分类。

压缩后的用例仍覆盖每类边界的代表：可恢复一侧保留 503、超时、连接重置与域名解析，不可恢复一侧保留 401 与三种拒绝连接措辞（预算与程序错误由 401 同分支与叙述覆盖）。被省略的 502 与读取超时由同一条件覆盖（HTTP 5xx 与"超时"词表），叙述在此说明省略理由，避免读者误以为漏测。若将来要覆盖更细的分支，应先扩展 io.mq.md 的条件与叙述，再把这些用例加回，而不是让金样反过来定义实现。本样与 io.mq.md 的 retryable 共用同一份词表，二者不一致时以文档叙述为准并同步修正另一侧。

本金样不引入新的重试实现，也不在宿主侧复制判断：宿主只负责按本轮是否已用尽两次上限结束运行，具体"值不值得再试"始终由文稿函数回答，因此模型与用户看到的重试原因不会因为宿主实现变化而漂移；这条单一事实源也适用于后续新增的供应商，接入时只需扩展文稿词表。

**transient = > json.parse text="{\"message\":\"provider returned HTTP 503\"}"**.

**timeout = > json.parse text="{\"message\":\"request timed out after 30s\"}"**.

**reset = > json.parse text="{\"message\":\"read: connection reset by peer\"}"**.
**dns = > json.parse text="{\"message\":\"域名解析失败\"}"**.

**auth = > json.parse text="{\"message\":\"HTTP 401 unauthorized\"}"**.


**refused = > json.parse text="{\"message\":\"connect: connection refused\"}"**.
**chinese_refused = > json.parse text="{\"message\":\"连接被拒绝\"}"**.
**chinese_deny = > json.parse text="{\"message\":\"服务拒绝连接\"}"**.
We **retry_503 = io.retryable(observed=`transient`)**.

We **retry_timeout = io.retryable(observed=`timeout`)**.

We **retry_reset = io.retryable(observed=`reset`)**.
We **retry_dns = io.retryable(observed=`dns`)**.

We **retry_auth = io.retryable(observed=`auth`)**.


We **retry_refused = io.retryable(observed=`refused`)**.
We **retry_cn_refused = io.retryable(observed=`chinese_refused`)**.
We **retry_cn_deny = io.retryable(observed=`chinese_deny`)**.
We **_ = test.assert(condition=`retry_503`,message="HTTP 503 is transient")**.

We **_ = test.assert(condition=`retry_timeout`,message="timeout is transient")**.

We **_ = test.assert(condition=`retry_reset`,message="connection reset is transient")**.
We **_ = test.assert(condition=`retry_dns`,message="dns failure is transient")**.

We **_ = test.assert(condition=(not `retry_auth`),message="401 must never retry")**.


We **_ = test.assert(condition=(not `retry_refused`),message="explicit connection refusal must not retry")**.
We **_ = test.assert(condition=(not `retry_cn_refused`),message="chinese refusal must not retry")**.
We **_ = test.assert(condition=(not `retry_cn_deny`),message="chinese denial must not retry")**.
Return *"model-retry-policy-ok"*.
