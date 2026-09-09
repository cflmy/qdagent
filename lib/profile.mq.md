---
title: lib/profile
description: 用户画像 — 多维度可读模板与按章追加（权威 data/kb/用户画像.mq.md）。
import run:lib/run.mq.md
import fs:lib/fs.mq.md
import time:lib/time.mq.md
---

## 路径

*root = > run.确保目录*
**`root` + "/kb/用户画像.mq.md"**

## 默认正文

*u = > time.now_unix*
*day = > time.format unix=`u` pattern="%Y-%m-%d"*
**"---\ntitle: 用户画像\ndescription: 求道多维度习惯沉淀（权威在磁盘）\nupdated: " + `day` + "\n---\n\n# 身份与角色\n\n- 角色：（待补充，如开发者 / 研究者）\n- 场景：求道笔记驱动助手\n\n# 目标与动机\n\n- （待从对话中识别）\n\n# 沟通偏好\n\n- 风格：简洁、先结论后细节\n- 语言：中文优先\n- 引用：优先已有笔记证据（evidence only）\n\n# 工作习惯\n\n- （待补充，如先检索再回答、偏好 CLI / Web）\n\n# 常用工具与环境\n\n- 运行时：Marqdo · qdagent\n- 知识面：data/runs · data/kb\n\n# 近期焦点\n\n- （尚无记录）\n\n# 禁忌与边界\n\n- 不把检索片段当作最终权威\n- 不静默改写历史 runs\n\n# 变更日志\n\n- [" + `day` + "] 初始化画像模板\n"**

## 确保

*path = > 路径*
*exists = > fs.exists path=`path`*
1. not `exists`
  *body = > 默认正文*
  > fs.write_text path=`path` text=`body`
**path**

## 重建

用当前维度模板覆盖画像（保留路径）。

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
    + `max`=80

*s = `text`*
1. not `s`
  **""**
*parts = > split value=`s` sep="\n"*
*first = parts[^1]*
1. not `first`
  *first = `s`*
*n = > len value=`first`*
1. `n` > `max`
  **`first` + "…"**
**`first`**

## 轻量追加
    + `task`=""
    + `result`=""

只写入「近期焦点」与「变更日志」短句；不写入 JSON / 长回复。

*path = > 确保*
*body = > fs.read_text path=`path`*
*u = > time.now_unix*
*day = > time.format unix=`u` pattern="%Y-%m-%d"*
*focus = > 截断句 text=`task` max=80*
1. not `focus`
  *focus = "（空任务）"*
*line = "- [" + `day` + "] " + `focus`*
*note = > 截断句 text=`result` max=60*

*body = `body` + "\n" + `line`*
1. `note`
  *body = `body` + "\n- [" + `day` + "] 沉淀要点：" + `note`*

*parts = > split value=`body` sep="\n"*
*n = > len value=`parts`*
1. `n` > 180
  *fresh = > 默认正文*
  *body = `fresh` + "\n- [" + `day` + "] （截断后保留）" + `focus`*
  1. `note`
    *body = `body` + "\n- [" + `day` + "] 沉淀要点：" + `note`*

> fs.write_text path=`path` text=`body`
**path**
