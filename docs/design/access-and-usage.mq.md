---
markup: occlusion
title: 权限与用量界面的设计图与原始提示
---

设计图保存在同目录 access-and-usage.png，使用内置 imagegen 工具生成，未使用 CLI 生图后备。图像用于界面规格和对齐参考，不作为整个弹窗的背景，也不把其中的示例数据写入实际用户界面。

## design_prompt

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 生图原始提示的保存位置 |

以下是本次设计实际使用的完整提示。实现以真实用户的数据替换示例数值和姓名，并根据管理员、普通用户、审计员的实际权限显示操作。产品没有图中的高级用户身份，示例行的视觉徽标不构成新增权限规则。

Use case: ui-mockup. Create a high fidelity desktop web app design screenshot for 求道智能体, a refined Chinese AI agent application, 1536x1024 landscape. Show a centered 1120px wide account permissions and usage dialog above a dim, softly blurred cream AI conversation workspace. Existing brand style: warm ivory #faf8f3 background, olive #566638, muted gold #b99861, dark warm charcoal type, very thin beige borders, carefully designed generous whitespace, editorial Chinese serif main heading mixed with clean modern sans UI. No decorative scenic backgrounds, no gradients, no heavy shadows. Dialog radius 24. Header small olive shield icon, label 管理控制台, heading 权限与用量, subtitle 统一身份管理 · 额度实时生效, upper right circular close X. Below left avatar and 求道管理员 with compact 超级管理员 pill, right subtle 从身份站刷新身份 link. Three equal compact metric cards across row: 未归档任务 with 2 / 3 progress bar, 智能模型 · 今日 with 12 / 50 and progress bar, Qwen 3.5 · 4B with 不限额 and 本机模型 label. Beneath a very slim info strip 北京时间 00:00 重置 · 子智能体与重试计入实际请求. Then a white inset area header 普通用户默认额度 with brief explanatory sentence, two compact numeric input controls 任务上限 3 and 每日智能请求 50 aligned horizontally, olive 保存默认额度 button right. Then 用户与用量 table with columns 用户, 身份, 未归档任务, 今日智能请求, 操作; 3 realistic Chinese username rows with editable compact quota controls aligned to columns; right text 保存 buttons. Small footer -1 不限额，0 停止新增。已存内容始终保留。 Show impeccable alignment, realistic clear Chinese typography, precise functional interface, professional calm restrained elegance. Entire dialog fits vertically with 40px vertical margins. No mock illustration, no device frame, no watermark.

生成图实际弹窗约为一千零二十四像素宽，工程使用此图中的比例作为实现依据。米白、橄榄绿和浅金的现有设计语言保持统一；字体、边框与行高使用可维护的原生样式，不下载新的背景或外部脚本。移动端是一套适应窄屏的真实布局，不简单按比例缩小整张图。

Return *"原始提示与设计图同目录保存，真实实现由数据与权限驱动。"*.
