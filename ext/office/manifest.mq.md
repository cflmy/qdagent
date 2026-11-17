---
markup: occlusion
title: 并行产物的登记事务
import:
  io: ext/root-skill/runtime/io.mq.md
  table: lib/table.mq.md
  sys: lib/sys.mq.md
---

## save

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| entry | map | required | 已由实际文件计算的完整记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

Use `entry`。

身份、标题、大小、摘要仍由 Marqdo 从真实文件计算。受限 ABI 在短文件锁内重读清单、按身份替换并原子提交，避免并行排版进程覆盖彼此的结果。损坏旧清单明确失败，不能当成空列表覆盖历史记录。

文件根来自当前调用进程，路径固定在任务私有目录，模型不能选择其他会话。锁只覆盖登记事务，不覆盖内容创作、打包和排版；不同风格因此真正同时生成。每个变体独立登记，失败不借另一变体的成功追认完成。这里没有提示词、版式规则或阶段路由，只补齐并发文件操作能力。

We **context = table.put(in=None,at="workspace",value=sys.cwd())**.
Return *io.native(context=`context`,operation="runtime_office_record",payload=table.put(in=None,at="entry",value=`entry`))*.
