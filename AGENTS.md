# 求道 CLI · Marqdo 文档原生编写规范

本仓库只有一个 `marqdo run index.mq.md` 入口、`chat` 和 `model` 两个 SKILL。
源码必须首先是一份能自然阅读的 Markdown 文档，然后才是可执行程序。

## 写法与可读性要求

参考上游 [Marqdo 编程规范](https://github.com/cflmy/marqdo/blob/main/doc/library-development.mq.md)
和 [文档原生开发指导](https://github.com/cflmy/marqdo/blob/main/doc/design/document-native-development-guide.md)。

- 先写清每篇文稿的目标、职责边界和真实调用示例；每个函数至少解释输入、行为、限制、失败与返回。
- 将**必要的赋值嵌入自然语言叙述**，例如“我们先**长期记忆 = [读取用户明确保存的记忆文稿](fs.read_text(path=\"memory.mq.md\"))**”，而不是整页重复 `We **x = ...**`。
- 遮蔽标签要解释领域动作的含义，不能机械照搬 `Call XXX`、`Compute X`、`执行操作`。
- 让 GFM 表格承载真正的数据、参数契约和模型消息；不用冗长字符串拼整份 Prompt。
- 只在有解释或复用价值时提取函数。循环和分支必须保留结构化排版，前后用叙述说明原因，避免为了表面上像文章把控制流藏到长句中。
- 每个函数应当有充分的有用叙述（上游编写指南以超过 50% 为阅读基线），不允许用空泛解释刷比例。
- 句中返回使用单斜体，赋值和语句使用粗体；描述只帮助阅读，必须与括号里的真实实现对应。

## 不得扩张的技术边界

- 唯一运行方式是 `marqdo run index.mq.md`；终端 `input`、循环与输出由 Marqdo 本身负责。
- `skills/chat/index.mq.md` 管理当前对话与记忆读取；`skills/model/index.mq.md` 只执行官方 `llm` 扩展。
- 禁止 Python、Go、JS、私有 Rust 服务、前端、后端、Docker、工具目录与外部 Agent Loop。
- 对话历史在根文稿的列表里保留最近四轮，记忆文稿只在用户显式 `/remember` 时修改。
- 不绕过 Marqdo 使用其他模型 SDK；不由额外框架拼接系统提示词和历史。
- 当前不增加第三个 SKILL，新增上下文能力也应通过明确的 Marqdo 函数读取。
- 不经测试不得把说明中的示例输出当作实际运行结果。

验收时不仅核对代码可调用，还要让人只读标准 Markdown 便能理解整个会话和模型的来源。
