---
markup: occlusion
title: 知识证明证据路由纯函数金样
import:
  policy: ../skills/marqdo-dev/knowledge-evidence.mq.md
  test: capabilities.mq.md
---

# main

本用例不执行 Lean、不获取外部权限，仅运行开发示例的纯 Marqdo 函数，检查过期、抽象证明、运行时声明、外部假设及反例边界。

We **stale = policy.advise(grade="model_proved",source_current=False,kernel_replayed=True)**.
We **unreplayed = policy.advise(grade="model_proved",source_current=True,kernel_replayed=False)**.
We **model = policy.advise(grade="model_proved",source_current=True,kernel_replayed=True)**.
We **runtime = policy.advise(grade="model_proved",source_current=True,kernel_replayed=True,runtime_claim=True)**.
We **unknown = policy.advise(grade="unknown",source_current=True)**.
We **assumed = policy.advise(grade="assumed",source_current=True)**.
We **refuted = policy.advise(grade="refuted",source_current=True)**.
We **open_obligations = policy.advise(grade="open_obligations",source_current=True,kernel_replayed=True)**.
We **unverified_premise = policy.advise(grade="unverified_premise",source_current=True)**.
We **opaque = policy.advise(grade="opaque",source_current=True)**.
We **plugin_unproved = policy.advise(grade="plugin_unproved",source_current=True,kernel_replayed=True)**.
We **_ = test.assert(condition=(`stale` == "reindex_source"),message="stale receipt must reindex")**.
We **_ = test.assert(condition=(`unreplayed` == "replay_proof"),message="missing replay")**.
We **_ = test.assert(condition=(`model` == "cite_model_scope_only"),message="abstract model cannot prove runtime")**.
We **_ = test.assert(condition=(`runtime` == "test_runtime_correspondence"),message="runtime claim must not be promoted")**.
We **_ = test.assert(condition=(`unknown` == "obtain_evidence"),message="unknown is not refutation")**.
We **_ = test.assert(condition=(`assumed` == "verify_external_assumption"),message="assumption is not proof")**.
We **_ = test.assert(condition=(`refuted` == "review_counterexample"),message="refutation must not be reused")**.
We **_ = test.assert(condition=(`open_obligations` == "verify_premises"),message="open obligations need premise verification, not a bigger context")**.
We **_ = test.assert(condition=(`unverified_premise` == "verify_premises"),message="unverified premise stays in premise verification")**.
We **_ = test.assert(condition=(`opaque` == "audit_deps"),message="opaque calls go to dependency audit")**.
We **_ = test.assert(condition=(`plugin_unproved` == "audit_deps"),message="unproved plugin means a dependency audit, not replay")**.
Return *"knowledge-proof-policy-ok"*.
