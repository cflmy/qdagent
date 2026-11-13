# 求道 · 让目标成为成果

求道是以 Marqdo 为工具语言的智能体工作台。当前运行架构采用 **React + TypeScript + Vite / Go / Python**，先提供稳定成品，再把经过实际验证的能力逐步迁回 Marqdo 插件。

公共首页为 `/`，工作台为 `/app`，登录成功后进入工作台。首页不请求用户模型、会话或插件 API，身份站临时不可用不会阻塞产品介绍。

界面继承纸色、橄榄绿和 Marqdo View 的阅读风格。对话是普通 Markdown，实际任务使用登记工具，最终执行形式是 `marqdo call`。模型文字不是执行证据，工具输入、退出和结果作为独立事件保留。

## 当前架构

| 层 | 实现 | 职责 |
|---|---|---|
| 前端 | React、TypeScript、Vite、Tailwind、Radix、Lucide | 会话、真实流式回答、可调面板、模型与插件、上传和文稿 |
| Web 服务 | Go `net/http` | OIDC、同源保护、JSON API、SQLite、SSE、静态资源、任务生命周期 |
| 智能体 | 独立 Python 进程 | OpenAI / Ollama 原生流、工具循环、协议转换、失败与完成 |
| 工具 | 既有 Marqdo 标准库、拓展与执行器 | 参数检查、权限、文件与办公产物、实际调用收据 |
| 文稿 | 普通 Markdown + 官方 Marqdo View | Markdown 安全渲染；`.mq.md` 继续使用官方只读渲染，不重新解释语言 |

Go 服务不嵌入 Marqdo VM。工具和读取器使用独立 CLI 子进程，编译或插件失败不能终止 Web 服务。每个运行有独立进程组，停止任务会终止该组；已经发生的写入不被回滚或伪装成没有发生。

子任务和 Office 能力本轮复用既有 Marqdo 适配器，没有重复开发第二套插件。后续可逐个替换其内部实现，稳定的调用合同和真实收据保持一致。原来的 `pages/public/client.mq.md`、Web 启动器和开发技能保留作迁移参考，**已经不是生产站点入口**。

## 根 SKILL：必须经过的四阶段工程流程

每个新目标先意图拆解，再基本方案、并行细化、方案落地。已注册的 `root-skill` 插件以 [ext/root-skill/index.mq.md](ext/root-skill/index.mq.md) 为入口；它是实际执行程序，按阶段加载 guides/ 中的工程文档。模型的工具参数来自该入口的官方 MLSP 契约，宿主只投影协议，不另写一套语言或阶段规则。

1. 模型调用 `skill_intent` 提问，用户可选择、自由输入、多轮澄清，确认意图才前进。
2. `skill_outline` 创建 `solution/plan.mq.md` 的真实函数骨架，右侧通过官方 View 阅读。用户确认这份确切源码，同时选择并发数和子模型。
3. 每个子智能体只处理一个登记单元，通过 `author_unit` 生成候选，再由 `trial_unit` 实际校验与运行案例。可以选 `literal` 写有来源的固定结构、`select` 通过键路径读取真实输入，或 `code` 写业务逻辑。不熟悉语法时也可先使用模板。失败保留实际诊断和可继续修复的进度。
4. `skill_integrate` 将已验证单元、叙述、用户交流合成 `solution/index.mq.md`，再次检查和冒烟执行。最终用户审阅并验收；未接通项必须可见、明确接受后仍标为部分完成。

主模型未能提供阶段调用时，宿主会明确提示并通过同一 Marqdo 函数创建基础提问、待确认框架或据实整合；不会生成业务假结果。整合阶段连续六轮没有成功的业务操作时也会执行这项有界整合，避免无限重复读取或验证，最终仍须用户审阅。

四个阶段不能用提示词或一个“已完成”跨过。用户确认接口不向模型注册；阶段门禁在实际执行器开启副作用之前再次校验。私有版本状态位于会话根，普通任务文件不能覆盖它。原子版本提交合并并发结果，旧确认、被修改的框架、失效源码摘要均会被拒绝。`solution/decisions.mq.md` 保留最终验收与后续补充，同时保持已审阅入口的摘要稳定。

框架当前允许最多八个单元，子任务并发一到八，可分别选择已有可用模型或继承主模型；不会静默换模型。服务全局按所选并发预留最多八份容量。子智能体不能再递归派生，单元依赖只能引用已声明的前置单元，最终入口按依赖顺序传递实际返回。并发是代码创作与独立案例验证，不能借此提前执行未获确认的外部副作用。

编译通过、声明案例通过、整合冒烟、业务验收分别保留，前几项并不证明所有输入或外部事实正确。试运行只有隔离目录内的文件效果，不含网络、进程和插件执行；需要外部业务操作的任务须在方案落地阶段通过既有登记工具完成。停用根插件会阻止新运行，不能把它当作跳过工程流程的开关。运行中显示真实阶段、子模型、工具参数、实际诊断与提供方实际返回的解释。

## Docker 启动

保持唯一对外端口 **7964**。镜像内仍提供 Marqdo、Python、Node、SQLite、Git 和 Office 转换环境；以 UID 10001、只读代码目录、最小能力运行，不挂载 Docker socket 或宿主工作区。

准备已有的私有配置文件，不把内容提交到 Git：

- `.marqdo/secrets/oidc_client_secret`：身份站客户端密钥。
- `.marqdo/secrets/model_key`：原有 32 字节 AES 主密钥的十六进制文本；已有数据库必须保留原密钥。

```sh
# 构建入口需要宿主 Go、Rust、Docker Compose，以及已安装的 Marqdo 和本地 Rust 依赖缓存。
./deploy/build.sh
docker compose up -d --no-build qdagent
docker compose ps
curl http://127.0.0.1:7964/healthz
```

构建入口先离线编译本仓库的 ABI 适配器（SDK 读取相邻 Marqdo 安装，不改其源码），再将当前 CLI 和经过 `go.sum` 校验的 Go 依赖准备到专用目录，避免容器内下载依赖成为启动前提；React 在 Node 阶段构建，Go 在 Go 阶段编译。密钥与用户数据不进入构建上下文。

`qdagent-data` 数据卷和既有 SQLite 保留。新增表与旧 `qd_tasks / qd_messages / qd_model_profiles / qd_plugins` 共存；模型 AES-GCM 密文格式与主体验证范围兼容原实现。切换认证实现后需要重新登录一次，账号主体仍为 `issuer + 换行 + sub`，所以同一身份仍能读取原任务、文件与个人配置。

## 统一身份与入口回调

使用 `id.cflmy.cn`，保留既有 client ID，客户端密钥仅从 Docker secret 读取。回调根据登录入口决定：

- `https://agent.qdqc.com/oidc/callback`
- `http://127.0.0.1:7964/oidc/callback`
- `http://localhost:7964/oidc/callback`

`QDAGENT_OIDC_REDIRECT_ORIGINS` 是精确来源允许列表。Go 使用标准 OIDC 客户端验证签名、issuer、audience、过期时间和 nonce，并检查 userinfo 的主体一致。state 与 PKCE verifier 绑定一次登录并在回调时原子消费。代理来源只从本机或私网反向代理接受，最终仍须匹配允许列表；反向代理应覆盖转发头。

身份站发现、签名密钥与用户资料使用有连接、TLS、响应头和总请求时限的独立客户端；仅 GET 对连接故障或 502/503/504 重试一次。令牌交换明确采用身份站支持的 `client_secret_post`，不重试一次性授权码。失败返回首页的分阶段提示与重新登录入口，日志不记录授权码、凭据或令牌。

新会话 cookie 为 HttpOnly、SameSite=Lax，Secure 随入口 HTTPS 设置。API 从会话取得主体，不接受浏览器指定 owner。所有更改通过 POST、PATCH、DELETE，并校验真实同源 Origin。

## 模型、流与任务

共享智能模型与本机 Qwen 对登录用户提供，个人配置按账号隔离。当前共享服务在真实验收中返回预算已用尽，因此容器明确以 `builtin-local` 作为初次默认选择；可通过 `QDAGENT_DEFAULT_MODEL` 更改。已经手动选择或提交的任务不会静默换模型。共享服务恢复后仍可在面板手动选择。

模型配置只投影公开名称与模型标识，凭据以原有 AES-256-GCM 格式加密。明确的预算故障作为可读提示保留，故障配置仍能选择重试；模型成功返回后清除此诊断。清单中的“已配置”不等于服务一定在线。

本机 Ollama 明确使用 32768 上下文，避免默认 4096 将阶段手册、契约和真实工具诊断截掉；服务端需要为所选模型预留相应内存。Python 直接消费供应商 SSE 或 Ollama NDJSON；首段文本一到达就发出，其余增量小批合并以避免高频渲染。OpenAI 与 Ollama 的工具参数、`tool_name` 和数组 schema 分别转换，执行器的权限合同不会随供应商格式改变。

Go 将增量、工具阶段和终态写入 SQLite，SSE 支持 `Last-Event-ID` 与去重恢复。浏览器断开不停止任务，切换任务不会让旧响应覆盖新任务。重新打开可以读取已有结果；服务重启将未完成的新运行标记为 interrupted，不自动重做可能产生副作用的操作。

前端提供普通 Markdown、参数详情、实际 Marqdo 调用证据和可展开模型说明；只展示供应商实际返回的说明，不制造思考过程。多步骤工作可以展示真实计划和子任务，完成需要相应文件或操作结果。

## 工作区与文件

任务文件位于 `data/workspaces/<task-id>`，运行与收据位于 `data/sessions/<task-id>`。Go 使用任务所有权与 `os.Root` 限制文件读取，拒绝路径穿越和越界符号链接。上传最大 50 MB，使用 multipart 并写入任务自己的 uploads 子目录，不把整个文件的 Base64 放入页面 VM。

内部 `.agent/` 不能通过通用预览或下载访问。仅 `.agent/children/` 中被产物清单精确登记的交付文件可以通过专用检查后读取，仍由 `os.Root` 限制在当前工作区。

`.mq.md` 通过现有官方只读预览入口生成 sanitized HTML，前端在限制脚本执行的独立阅读框里展示；普通 Markdown 不允许原生 HTML 脚本。源码展开和下载只作用于当前文件，不运行文稿。

## 本地开发

```sh
# 终端一：仅在本机显式开启开发身份，生产禁止此配置。
cd server
QDAGENT_ROOT=.. go run -buildvcs=false ./cmd/qdagent

# 终端二：前端热更新，可将 API 代理到同一 Go 服务。
cd frontend
npm ci
npm run dev
```

通常使用 OIDC 登录。无身份站的离线联调可显式设置 `QDAGENT_DEV_OWNER`，**必须同时将 `QDAGENT_ADDR` 指定为 loopback 地址**，例如 `127.0.0.1:17964`；服务只对 loopback 请求采用该专用身份。`QDAGENT_ROOT` 指向工程根，`QDAGENT_FRONTEND` 指向构建产物，`QDAGENT_OIDC_REDIRECT_ORIGINS` 包含实际联调来源。生产 Compose 不设置开发身份。

前端 Vite 开发端口与后端不同源时，应经开发代理并将前端来源精确加入 Go 允许列表；正式部署由 Go 同源提供前端和 API。浏览器控制台的 LanguageDetector 提示来自 Edge；本站提供 `/favicon.svg` 与 `/favicon.ico`。

## 检查

```sh
(cd server && go test -buildvcs=false ./...)
python3 -m unittest discover -s worker -p 'test_*.py' -v
npm run build --prefix frontend
# 先构建 Go 二进制，测试框架自动管理专用 loopback 服务；指定 Chromium 路径。
(cd server && go build -buildvcs=false -o ../.marqdo/qdagent-go ./cmd/qdagent)
QDAGENT_START_TEST_SERVER=1 QDAGENT_BROWSER=/path/to/chrome npm exec --prefix frontend playwright test -- --config frontend/playwright.config.ts
```

Go 检查覆盖账号隔离、同源限制、加密范围、越界路径与符号链接、真实首段 SSE、持久化和登记交付边界。Python 检查覆盖参数、原生增量协议与供应商 schema 转换。浏览器检查直接操作真实 Go API，包含任务、模型、插件、上传、文稿、调宽和手机布局。

迁移说明与下一步见 [技术栈渐进迁移](doc/next/技术栈渐进迁移.md)。Marqdo 工具开发仍可阅读原有 `.mq.md` 手册；新增库继续遵循代码即文档、文档即可调用能力的规范。


首页设计稿、实现截图和测量基准见 [首页对齐记录](doc/design/landing-v1-alignment.md)。QD 标识由 Marqdo 折面标识延伸为 SVG，中文字体按首页文案子集化并随前端部署，减少跨设备字体替换引起的偏移。修改文案后可以用 `deploy/subset-fonts.py` 更新字体子集；字体许可在 `frontend/public/fonts/LICENSE-Noto.txt`。


## 根流程验证

```sh
python3 -m unittest discover -s tests -p test_root_skill.py
python3 -m unittest discover -s worker -p 'test*.py'
(cd server && go test -race ./...)
cargo test --offline --locked --manifest-path ext/qdagent/native/Cargo.toml --target-dir .marqdo/native-target
npm run build --prefix frontend
```

协议测试使用实际 CLI 和 ABI，验证不能跳步、旧确认、源码变更、无效代码、错误案例、并发合并和部分验收。受控模型测试只替代供应商响应，单元发表与试运行仍真实执行。浏览器测试中的 `real local model follows the mandatory root skill and human gates` 另行调用实际本机 Qwen，经过真实界面确认、并发和最终验收；需要已安装浏览器和在线 Ollama，不把受控供应商测试当成真实模型验收。开发身份只允许隔离的本机测试，生产仍使用统一身份认证。
