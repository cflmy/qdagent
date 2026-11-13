---
markup: occlusion
title: 对话、执行经过和输入栏的共同结构
import:
  ui_test: ../../tests/composer-ui.mq.md
  data_test: ../../tests/composer-data.mq.md
---

本轮产品布局仍由 Marqdo 最小组件生成，事件仍由官方 WASM 和桥接执行。没有修改 Marqdo 源码，没有加入第二套前端业务脚本。样式资源使用原来的纸色玻璃胶囊与线框图标。

## verify_data

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实工作目录、材料与 Markdown 投影验收 |

对话是普通 Markdown。dialogue.paint_chat 保留兼容调用使用的完整 html，同时独立提供 history_html 与 answer_html；runner 的 page_html 使用历史和最新问题，answer_html 使用本轮答文。shell.conversation 把紧凑执行经过放在二者之间。刷新回答不会重建 qd-trace，已有步骤只更新状态和结果叶节点，展开状态持续保留。

上传入口通过固有 browser.read_file 得到 Base64，认证后的同源 POST 进入工程服务，先检查 SQLite 会话归属，再用 marqdo call 在当前工作根执行 fs.write_bytes。单文件上限 50 MiB，每块 256 KiB，UUID 前缀避免覆盖；二进制保存不代表已有文本工具能理解其内容。知识选项来自 pages/kb 的实际目录，下一轮任务保存有界摘录和已上传相对路径，不能借材料改变工具权限。

验收使用独立的内部任务身份，不创建登录用户，也不伪造身份站 Cookie。真实模型曾返回合法 final 协议但 message 为空，runner 按既有规则保留失败并提供可见错误答文；界面不会把这一情况显示成工具执行成功。这个材料与显示验收不依赖模型质量。

Return *[原生文件和真实会话服务回归](data_test.run())*.

## verify_overlay

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已经安装的 Chromium 路径 |
| closed | bool | False | 观察打开或关闭终态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 正式组件与客户端的真实 WASM 回归 |

Use `chrome` and `closed`=False。插件、工作区、知识库和模型选择使用统一的居中浮层，遮罩压暗并轻微模糊背景。打开时更新 aria-hidden，锁定背景对话和输入栏的交互；关闭按钮、遮罩点击和 Esc 使用同一关闭效果，恢复滚动、属性和焦点。模型选择的外观更新必须保留关闭函数的 set_attr，不能只取 remove_class，否则会留下不可见的交互锁。

胶囊保留上传、模型、插件、知识库、工作区和发送停止。窄屏把输入框移到工具行上方，各个入口仍可使用。控件不是装饰：知识选择实际进入下一轮任务，文件保存成功后返回工作目录相对路径，上传未完成时阻止发送。背景面板刷新不能抹掉新建会话的标题输入。

浏览器回归从当前组件和当前客户端生成隔离页，网络仍是明确标注的确定性夹具。真实 DOM 同时检查遮罩、对话 inert、浮层可访问性、执行区域归属和关闭后的恢复；截图仅辅助观察字号与间距。closed=True 再运行一次用于验证退出状态，不能把打开成功当作关闭也成功。

Return *[保留步骤展开并检查浮层状态](ui_test.run(chrome=`chrome`, closed=`closed`))*.

当前模型配置和 50 MiB 分块上传的完整边界与验收见 [模型和大文件输入](models-upload.mq.md)。此前的整包小文件入口仅保留兼容用途，浏览器一律使用有界范围读取和逐块确认。
