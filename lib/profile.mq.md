---
title: lib/profile
description: 用户画像 — 多维度可读模板与追加试算（权威 data/kb/用户画像.mq.md；改写经变更提案）。
import run:lib/run.mq.md
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import json:lib/json.mq.md
---

## 路径

*root = > run.确保目录*
**`root` + "/kb/用户画像.mq.md"**

## 默认正文

*u = > time.now_unix*
*day = > time.format unix=`u` pattern="%Y-%m-%d"*
**"---\ntitle: 用户画像\ndescription: 求道多维度习惯沉淀（权威在磁盘）\nupdated: " + `day` + "\n---\n\n# 身份与角色\n\n- 角色：（待补充，如开发者 / 研究者）\n- 场景：求道笔记驱动助手\n\n# 目标与动机\n\n- （待从对话中识别）\n\n# 沟通偏好\n\n- 风格：简洁、先结论后细节\n- 语言：中文优先\n- 引用：优先已有笔记证据（evidence only）\n\n# 工作习惯\n\n- （待补充，如先检索再回答、偏好 CLI / Web）\n\n# 常用工具与环境\n\n- 运行时：Marqdo · qdagent\n- 知识面：data/runs · data/kb\n\n# 近期焦点\n\n- （尚无记录）\n\n# 禁忌与边界\n\n- 不把检索片段当作最终权威\n- 不静默改写历史 runs\n- 清理与大段改写须经变更提案审查\n\n# 变更日志\n\n- [" + `day` + "] 初始化画像模板\n"**

## 确保

*path = > 路径*
*exists = > fs.exists path=`path`*
1. not `exists`
  *body = > 默认正文*
  > fs.write_text path=`path` text=`body`
**path**

## 重建

*path = > 路径*
*body = > 默认正文*
> fs.write_text path=`path` text=`body`
**path**

## 读取

*path = > 确保*
*body = > fs.read_text path=`path`*
**body**

## 写出
    + `body`

*path = > 确保*
> fs.write_text path=`path` text=`body`
**path**

## 截断句
    + `text`=""

*s = `text`*
1. not `s`
  **""**
*parts = > split value=`s` sep="\n"*
*first = parts[^1]*
1. not `first`
  *first = `s`*
**`first`**

## 试算追加
    + `task`=""
    + `result`=""

计算追加后的画像正文，**不写盘**。超长时仍保留全文追加（禁止静默重置丢历史）。

*path = > 确保*
*body = > fs.read_text path=`path`*
*u = > time.now_unix*
*day = > time.format unix=`u` pattern="%Y-%m-%d"*
*focus = > 截断句 text=`task`*
1. not `focus`
  *focus = "（空任务）"*

*pref = ""*
*p1 = > split value=`focus` sep="喜欢"*
1. `p1`[^1]
  *pref = `focus`*
1. not `pref`
  *p2 = > split value=`focus` sep="偏好"*
  1. `p2`[^1]
    *pref = `focus`*
1. not `pref`
  *p3 = > split value=`focus` sep="不喜欢"*
  1. `p3`[^1]
    *pref = `focus`*
1. not `pref`
  *p4 = > split value=`focus` sep="记住"*
  1. `p4`[^1]
    *pref = `focus`*

*body = `body` + "\n- [" + `day` + "] 焦点：" + `focus`*
1. `pref`
  *body = `body` + "\n- [" + `day` + "] 偏好：" + `pref`*
*body = `body` + "\n- [" + `day` + "] 提案追加（待审查）\n"*

*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="body" value=`body`*
**out**

## 轻量追加
    + `task`=""
    + `result`=""

兼容旧调用：试算后写盘。新流程请用「试算追加」+ 变更提案。不做超长静默重置。

*draft = > 试算追加 task=`task` result=`result`*
*path = draft[^path]*
*body = draft[^body]*
> fs.write_text path=`path` text=`body`
**path**
