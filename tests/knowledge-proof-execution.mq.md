---
markup: occlusion
title: 知识证明执行金样
import:
  knowledge: ../ext/knowledge/index.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，也不要求安装 Lean 工具链。它通过生产 ext/knowledge/index.mq.md 的 compose_proof 与 replay_proof 驱动真实 ABI 边界，固定 K2 的"无 Lean"分支：缺失工具链是环境事实，必须如实上报官方诊断（proof.compose_lean_missing），绝不允许包装成成功或占位证书。由官方 Marqdo 编译器执行。

目标目录 tests/fixtures/proof-scope 是一个独立的最小语义根：compose 在有 Lean 的部署环境里会对它做统一模块证明组合；在本环境只验证执行链路、边界与诚实失败。compose 产物只写入私有缓存目录，本样不断言缓存内容（那是官方命令的职责），只断言我们的边界不伪造结果。证书路径限定在缓存目录内：缺失证书与越界路径都必须是明确失败，为 K4 的"篡改证书"场景保留可注入点——注入路径在本环境不可达（越界拒绝先于内容检查），这正是拒绝语义先于证据语义的体现：任何证书先证明自己来自受控边界，才有资格被重放。

诊断保真是断言核心：compose 的失败诊断逐字包含官方错误码 compose_lean_missing，而不是本仓改写的提示。这样做的理由是错误码是契约——部署环境的自动化与用户界面都按官方码分支处理；如果边界改写或吞掉错误码，缺 Lean 与其它失败就变得不可区分，"无 Lean"场景的验收也就失效了。这一保真由 ABI 的 stderr 捕获实现：子进程的标准错误被有界读取（8 KiB）后原样进入失败 Result，与本仓既有知识操作的错误通道一致。

本金样不验证 Lean 重放成功路径、compose 的真实证书内容与 1B/3B 模型决策——那些需要安装 Lean 的真实环境与受控模型评测，属于 K2 部署验收与 K4 对照；本样固定的是执行边界的拒绝语义与诚实性。执行方式：`marqdo run tests/knowledge-proof-execution.mq.md --emit-result`，返回值必须逐字为 knowledge-proof-execution-ok。

四个拒绝分支各有含义：compose 无 Lean 上报官方诊断原文；replay 缺失证书是明确失败；证书路径越出私有缓存被拒绝（等价于禁止任意文件读取的注入面）；compose 目标越出项目被拒绝。每个分支的错误文本都来自边界本身而不是进程崩溃，调用方据此向用户解释真实原因。

异步作业契约由本样与 Rust 单元测试共同固定：start 在私有作业目录派生脱离进程组的孩子并立即返回作业身份；status 依据真实进程状态与产物推导 running/failed/done/cancelled，失败携带官方诊断原样上浮；cancel 在核对 /proc 命令行确为本边界的官方 knowledge 子进程后才向整组 SIGKILL，外来 PID 一律拒绝。本环境无 Lean，因此 start 的 compose 作业必然快速到达 failed 并携带 compose_lean_missing——这正是确定性可断言的异步路径；取消成功路径与外来拒绝由 Rust 测试（受控同名脚本与独立进程组）固定，CLI 层的真实取消已在部署记录中人工验证。

轮询的组织方式本身是契约的一部分：金样用有界的 for-each（二十次）轮询 status，每次先判断当前态再决定是否继续——小模型按"一次一个动作"调用 proof_job，不存在自旋或内置等待；若作业在二十轮内未结束，最后的 status 断言会失败，暴露的是环境异常而不是静默通过。僵尸进程按内核状态字段判定，不再把已退出未收养的作业误报为运行。

本样不验证 Lean 重放成功路径、compose 的真实证书内容与 1B/3B 模型决策——那些需要安装 Lean 的真实环境与受控模型评测，属于 K2 部署验收与 K4 对照；本样固定的是执行边界的拒绝语义与诚实性。执行方式：`marqdo run tests/knowledge-proof-execution.mq.md --emit-result`，返回值必须逐字为 knowledge-proof-execution-ok。

作业目录的生命周期最后说明：jobs 位于工作区私有缓存之下，身份由时间、进程与证明类型共同派生，不进入已发布知识版本，也不跨用户共享；status/cancel 只接受本目录内真实存在 pid 文件的作业身份，越界或未知身份是明确失败。部署环境安装 Lean 后，同一套 start/status/cancel 驱动真实 compose/replay——成功时 done 态携带与同步路径同形的官方报告，失败时保持本样固定的诚实诊断。宿主层的作业可见性（用户在界面上看到进行中的证明并主动取消）属于 K2 部署验收的界面部分，金样不断言 UI。作业记录连同收据缓存都可以随时删除重建，删除不影响已发布知识或根状态。

与本仓其它证据面的分工：K1 的 projections 回答"符号是什么、义务有哪些"，本样的 compose/replay/proof_job 回答"这个语义根能否被 Lean 内核复核、进行到什么状态"，而 ext/root-skill 的 proof.mq.md 回答"调度门禁是否放行"。三层各持一个事实维度，等级词表与诊断码全部沿用官方命令输出，任何一层都不得发明等级或吞并另一层的职责；当某层失败时，错误必须原样上浮，调用方据实向用户报告——这一分工是防止"检索到即已验证"在异步路径上复现的同一道闸门。金样对每一层只断言自己的维度，跨层断言（例如证书内容如何影响调度门禁）属于 K4 的篡改与对照场景，需要真实的 Lean 环境才有意义；在此之前任何跨层结论都按未验证处理。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**composed = > knowledge.compose_proof(context=`ctx`,target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`composed`,"ok")),message="compose without Lean must fail honestly")**.
**error = > access(`composed`,"error")**.
**diagnostic = > access(`error`,"message")**.
We **lean_missing = text.contains(text=`diagnostic`,sub="compose_lean_missing")**.
We **_ = test.assert(condition=`lean_missing`,message="official lean diagnostic must surface verbatim")**.
**missing = > knowledge.replay_proof(context=`ctx`,certificate="absent/certificate.json",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`missing`,"ok")),message="replay of a missing certificate must fail clearly")**.
**escape = > knowledge.replay_proof(context=`ctx`,certificate="../../etc/passwd",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`escape`,"ok")),message="certificate paths must stay inside the private cache")**.
**unknown = > knowledge.compose_proof(context=`ctx`,target="../../outside")**.
We **_ = test.assert(condition=(not access(`unknown`,"ok")),message="compose target must not leave the project")**.
**started = > knowledge.proof_job(context=`ctx`,action="start",proof="compose",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=access(`started`,"ok"),message="async start must succeed")**.
**job = > access(access(`started`,"value"),"job")**.
We **state = "running"**.
**rounds = > json.parse text="[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]"**.
- [轮询直到作业离开运行态，上限二十次](for `rounds` as round)
  1. `state` == "running"
    **polled = > knowledge.proof_job(context=`ctx`,action="status",job=`job`)**.
    We **state = access(access(`polled`,"value"),"state")**.
**failed = > knowledge.proof_job(context=`ctx`,action="status",job=`job`)**.
We **job_error = access(access(`failed`,"value"),"error")**.
We **async_honest = text.contains(text=`job_error`,sub="compose_lean_missing")**.
We **_ = test.assert(condition=(`state` == "failed"),message="no-Lean async job must land in failed")**.
We **_ = test.assert(condition=`async_honest`,message="async failure must carry the official diagnostic")**.
**ghost = > knowledge.proof_job(context=`ctx`,action="status",job="job-ghost")**.
We **_ = test.assert(condition=(not access(`ghost`,"ok")),message="unknown job identity must fail clearly")**.
Return *"knowledge-proof-execution-ok"*.
