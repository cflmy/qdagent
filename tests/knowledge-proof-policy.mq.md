---
markup: occlusion
title: 知识证明证据路由纯函数金样
import:
  policy: ../skills/marqdo-dev/knowledge-evidence.mq.md
  test: capabilities.mq.md
---

# main

本用例不执行 Lean、不获取外部权限，仅运行开发示例的纯 Marqdo 函数，检查过期、抽象证明、运行时声明、外部假设及反例边界。

We **stale = policy.next(grade="model_proved",source_current=False,kernel_replayed=True)**.
We **unreplayed = policy.next(grade="model_proved",source_current=True,kernel_replayed=False)**.
We **model = policy.next(grade="model_proved",source_current=True,kernel_replayed=True)**.
We **runtime = policy.next(grade="model_proved",source_current=True,kernel_replayed=True,runtime_claim=True)**.
We **unknown = policy.next(grade="unknown",source_current=True)**.
We **assumed = policy.next(grade="assumed",source_current=True)**.
We **refuted = policy.next(grade="refuted",source_current=True)**.
We **_ = test.assert(condition=(`stale` == "reindex_source"),message="stale receipt must reindex")**.
We **_ = test.assert(condition=(`unreplayed` == "replay_proof"),message="missing replay")**.
We **_ = test.assert(condition=(`model` == "cite_model_scope_only"),message="abstract model cannot prove runtime")**.
We **_ = test.assert(condition=(`runtime` == "test_runtime_correspondence"),message="runtime claim must not be promoted")**.
We **_ = test.assert(condition=(`unknown` == "obtain_evidence"),message="unknown is not refutation")**.
We **_ = test.assert(condition=(`assumed` == "verify_external_assumption"),message="assumption is not proof")**.
We **_ = test.assert(condition=(`refuted` == "review_counterexample"),message="refutation must not be reused")**.
Return *"knowledge-proof-policy-ok"*.
