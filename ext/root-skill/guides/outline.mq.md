---
markup: occlusion
title: 基本方案：先定边界，再并行
import:
  json: lib/json.mq.md
---

本阶段调用 skill_outline 产生实际 solution/plan.mq.md。title 是工程名，goal 是已确认目标，acceptance 是可观察的验收条件。units 必须是一到八个记录：id 只用小写字母数字下划线，title 写职责名，purpose 说明输入、输出和边界，depends_on 列出前面已经声明的单元身份。

工程目录、参数表、源码检查、index 组装由根插件提供，不要把这些元操作再列为业务单元。每个单元必须描述可以独立调用和观察返回的业务职责；用户明确要求的函数数和边界需要尊重，不能为了并行机械增加不需要的工作。

以函数或类的职责为基本单位。先拆分稳定接口，使不同子智能体能各写一个文件；不要按“第一章”“第二章”机械分配有共享写入的工作。并行的是实现与试运行，不是无依赖地执行所有业务动作。框架中明确保留尚未接通的占位，不能把骨架当成真实交付。

```json
{"title":"报告工程","goal":"用户已确认的调研目标","acceptance":"来源可核验，文稿可阅读，入口能实际调用","units":[{"id":"research","title":"材料整理","purpose":"将已读材料整理为带来源的研究发现","depends_on":[]},{"id":"report","title":"报告组装","purpose":"根据研究发现形成可复用文稿","depends_on":["research"]}]}
```

提交后暂停，等待用户在右侧官方 View 阅读并确认。用户可配置并发和子模型，也可要求调整框架。不得直接调用 skill_refine 来越过这个确认；执行器会拒绝。需要修改则重新形成可审阅版本，不把上一个版本的确认转给新源码。

## rules

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 本阶段的工程约束，供自动化或开发者读取 |

这份规则是阶段手册的结构化入口，不执行用户业务，也不替用户确认。读取它不会改变阶段。
上方源码给出实际工具、参数、失败边界和下一步条件，读者无需从其他聊天记录拼凑操作。

Return *[返回当前阶段的真实规范](json.parse(text="{\"phase\":\"outline\",\"narrative_minimum\":0.5,\"human_confirmation_is_host_only\":true,\"execution\":\"marqdo call\"}"))*.
