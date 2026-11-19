# Capability Agent V3：清理决策记录

2026-11-19；只适用于实验分支，不能推断 master 已经迁移。

## 删除的架构分叉

- `ext/root-skill/`：原先的一整套“意图 → 框架 → 独立测试 → 实现 → 交付”根流程，被可选的 `workflows/software-development/` 代替。通用根从此不具有该业务阶段。
- `pages/agent/`、`pages/api/`、`pages/control/`、`pages/ext/` 等：早期基于 Marqdo 的第二个 Web/Agent 宿主；目前正式 HTTP 层由 Go 担任，不再需要同时维护两套独立 UI 及会话循环。
- `ext/browser/`、`ext/search/`、`ext/ocr/`：旧的根流程封装器删除；有权限的浏览、搜索及材料识别仍由实际 Rust ABI、隔离浏览器和服务适配器完成，由新领域 SKILL 组合。
- `ext/knowledge/index.mq.md`：删除已绑定旧工程根状态机的文稿编译控制器；官方知识投影、组合证明和重放接口在新知识工作流中保留。旧公共发布 Web 控制台因依赖旧状态机同步退出；本次不声称它已在新 UI 实现。
- `ext/qdagent/native/src/root_skill.rs`、Workbook 旧原生适配与 qdagent-worker：已不属于新 Agent；Go 直接执行 Marqdo 入口，Rust 只保留 OS/Parser/Model/Knowledge/Office 的受限边界。
- 旧四阶段前端、历史设计包、旧测试套件：与新 schema 不兼容，不能用更名来“兼容”；保留原始 Git 历史即可回溯。

## 仍需保留

- `agent/`：唯一根，状态与权限；`skills/`：领域安装单元；`workflows/`：按需可组合执行；
- `ext/ai/`、`ext/quantum/`、`ext/office/` 和 Marqdo 标准 `lib/`：真实函数和公开调用契约；
- `ext/qdagent/native/`：可信宿主缺口，不能把文件与进程访问塞进 LLM prompt；
- `server/`、`worker/provider.py`、`worker/services.py` 和 `frontend/`：Go 身份/进程、简单网络传输、可视化真实证据；
- `assets/reader/`：官方文稿阅读资源（从页面框架独立搬出）。

## 已知未验收区域

当前为大胆破坏兼容性的探索版本，尚未执行完整的 Marqdo、Rust、Go、TypeScript、真实模型或 Web 端到端回归，尚不具备发布保证。旧公共知识发布 UI 需要按知识制品状态和独立权限重新设计，不应重新复制旧 `ext/knowledge`。工作流目前是可调用的独立文稿骨架，尚非完整自动软件开发产品。阅读/运行任何旧用户任务需要考虑状态格式不兼容。

下一阶段优先建立基于新的能力、状态、效果和知识证据的独立验收，不恢复旧根流程。
