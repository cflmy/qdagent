# 全仓 Marqdo 硬约束

qdagent 仓库按「全仓 Marqdo」开发：源码一律写成 .mq.md，不得引入其他实现语言。

唯一例外是真实能力缺口：按官方插件 ABI（include/marqdo_abi.h，ABI v2，UTF-8 JSON 通道）写最小原生插件，经 lib/plugin.mq.md 的 load 接入，契约写进 .mq.md 并登记 doc/gaps/，Marqdo 侧补齐后删除。

Marqdo 源码只读，允许阅读、检索、运行，不得修改。文件读取、搜索、写入、修订必须通过 marqdo 原生任务（skills/marqdo-dev/files.mq.md 的 read/search/write/patch）完成。

部署声明（Dockerfile、docker-compose.yml、CI YAML）只调用 marqdo 子命令，不承载业务逻辑。根目录只保留 index.mq.md，历史实现整体归档在 old/ 并写入 .gitignore。
