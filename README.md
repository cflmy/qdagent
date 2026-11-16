# 求道 · 让目标成为成果

求道由 **Marqdo 可执行文稿驱动**。根流程、角色规则、提示和任务函数由 `.mq.md` 执行；React + TypeScript + Vite 提供工作台，Go 提供认证、存储与服务，Python 仅承担无提示词的模型网络传输。

公共首页为 `/`，工作台为 `/app`，登录成功后进入工作台。首页不请求用户模型、会话或插件 API，身份站临时不可用不会阻塞产品介绍。

界面继承纸色、橄榄绿和 Marqdo View 的阅读风格。对话是普通 Markdown，实际任务调用普通 Marqdo 函数，最终执行形式是 `marqdo call`。模型文字不是执行证据，工具输入、退出和结果作为独立事件保留。

## 当前架构

| 层 | 实现 | 职责 |
|---|---|---|
| 前端 | React、TypeScript、Vite、Tailwind、Radix、Lucide | 会话、真实流式回答、可调面板、模型与插件、上传和文稿 |
| Web 服务 | Go `net/http` | OIDC、同源保护、JSON API、SQLite、SSE、静态资源、任务生命周期 |
| 智能体 | Marqdo 根文稿与受限子文稿 | 四阶段状态机、受限上下文、独立验证与依赖并行 |
| 能力 | 普通 Marqdo 函数、标准库与 ABI 插件 | 参数检查、受限效果、浏览、文件与办公产物及调用证据 |
| 文稿 | 普通 Markdown + 官方 Marqdo View | Markdown 安全渲染；`.mq.md` 继续使用官方只读渲染，不重新解释语言 |

Go 服务不嵌入 Marqdo VM。工具和读取器使用独立 CLI 子进程，编译或插件失败不能终止 Web 服务。每个运行有独立进程组，停止任务会终止该组；已经发生的写入不被回滚或伪装成没有发生。

子任务调度复用 Marqdo 标准库，Office 复用既有 Marqdo 插件。后续可逐个替换其内部实现，稳定的调用合同和真实收据保持一致。原来的 `pages/public/client.mq.md`、Web 启动器和开发技能保留作迁移参考，**已经不是生产站点入口**。

## 文稿驱动的根流程

架构与验收依据见 [docs/document-driven-agent.mq.md](docs/document-driven-agent.mq.md)，后续开发必须遵守仓库的 [AGENTS.md](AGENTS.md)。生产入口实际执行 `marqdo call ext/root-skill/index.mq.md run`。普通 `.mq.md` 的函数就是能力，不另设 SKILL 注册器、业务工具别名表或 JSON 动作路由。

意图拆解先向用户提问，确认后才形成可在官方 View 阅读的函数框架。框架确认后冻结无执行语义的公开规格，每个单元进入独立的测试与实现上下文；多个单元通过标准库 `subtask.run_many` 按用户设置并行。独立测试者只能看公开规格和自己的调用接口，不能读取实现、开发对话或调用实现来取得 expected。实现者可以修复代码，但不能提交或改变冻结的测试。真实执行器核对源码、规格和案例摘要后，才能整合入口并请求用户验收。

所有模型指令、角色要求、上下文排版与修复规则都位于 [ext/root-skill/runtime/instructions.mq.md](ext/root-skill/runtime/instructions.mq.md) 及相应阶段文稿。Go 直接启动根文稿并转发真实执行事件；Python 仅保留 `provider.py` 的无提示词网络适配，生产 Python 智能体入口已经删除。供应商请求没有业务工具 Schema；响应是普通 Marqdo 调用正文，经官方解析器校验后，在空的角色文件根内通过真实 `marqdo call` 执行。身份、阶段与权限不属于模型参数，未经授权的导入、宿主调用、控制流和函数目标会被拒绝。

调用接口由 [ext/root-skill/calls/](ext/root-skill/calls/) 的普通函数直接给出。新增公开能力应修改当前文稿的实现、参数与返回表，不往中央注册表增加记录。`pages/agent/catalog.mq.md` 与 `executor.mq.md` 已关闭旧路由；它们只返回明确的退役诊断。ABI 安装登记和插件开关仍保留，安装一个动态库不代表允许模型调用所有内部函数。

实现可用固定正文、原生结构值、输入取值模板或真实函数体，不需要先学会复杂转义。案例由测试者独立冻结，随私有根状态原子提交；实现者自检不再授予就绪。`solution/plan.mq.md` 保存框架，`solution/specifications/*.intent.md` 是经过官方 AST 检查、零执行语句的意图投影，`solution/index.mq.md` 保存可调用交付，`solution/decisions.mq.md` 保留最终用户决定。未接通功能明确披露，接受有限范围仍记录部分完成。

每次模型请求保存实际可见消息、指令源位置和源码摘要，前端展示真实模型、调用文稿、子任务与运行证据。每轮只保留当前角色材料和上一条必要诊断，不回放全局工具对话。默认最多八个单元，并发一到八，可分别选择实现与测试模型；测试模型继承配置时也不继承开发上下文。模型未给出有效调用、独立测试失败或源码变更时保留未完成，不生成兜底业务结果。

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

共享智能模型与本机 Qwen 对登录用户提供，个人配置按账号隔离。共享服务曾出现预算错误，本轮 smart/default 已实际完成研究与写作验收；容器仍明确以 `builtin-local` 作为初次默认选择，可通过 `QDAGENT_DEFAULT_MODEL` 更改。已经手动选择或提交的任务不会静默换模型。共享服务可在面板手动选择。

模型配置只投影公开名称与模型标识，凭据以原有 AES-256-GCM 格式加密。明确的预算故障作为可读提示保留，故障配置仍能选择重试；模型成功返回后清除此诊断。清单中的“已配置”不等于服务一定在线。

本机 Ollama 明确使用 32768 上下文，避免默认 4096 将阶段手册、契约和真实工具诊断截掉；服务端需要为所选模型预留相应内存。Python 直接消费供应商 SSE 或 Ollama NDJSON；首段文本一到达就发出，其余增量小批合并以避免高频渲染。供应商响应只提供普通 Marqdo 调用正文，不提交业务 tool schemas，也不转换 tool_name 或数组动作；JSON 仅用于网络与原生值传输。

Go 将增量、工具阶段和终态写入 SQLite，SSE 支持 `Last-Event-ID` 与去重恢复。浏览器断开不停止任务，切换任务不会让旧响应覆盖新任务。重新打开可以读取已有结果；服务重启将未完成的新运行标记为 interrupted，不自动重做可能产生副作用的操作。

前端提供普通 Markdown、参数详情、实际 Marqdo 调用证据和可展开模型说明；只展示供应商实际返回的说明，不制造思考过程。多步骤工作可以展示真实计划和子任务，完成需要相应文件或操作结果。

## 工作区与文件

并行开发以已确认方案的 `## unit_身份` 函数段为单位。`solution/plan.mq.md` 保留确认版本，`solution/index.mq.md` 从骨架开始承载真实实现；作者只提交自己的函数段，由官方解析器定位并在锁内保存。普通函数可按公开接口并行编写，运行时再按依赖传值；真正需要前置资料的研究正文仍等待真实材料。测试只执行本段快照，不读取其他实现。详见 [函数段并行规范](docs/function-section-concurrency.mq.md)。

新任务首次输入会生成简洁名称，手动命名和已有对话的名称保留。浏览失败地址会交接到下一轮，同一运行最多对同一失败地址发起两次实际请求；空页面、访问验证页和没有可读正文的旧记录不再作为有效来源。已有旧来源证明需要按当前规则重新验证，不能保留一个 passed 字段就继续沿用。

任务文件位于 `data/workspaces/<task-id>`，运行与收据位于 `data/sessions/<task-id>`。Go 使用任务所有权与 `os.Root` 限制文件读取，拒绝路径穿越和越界符号链接。上传最大 50 MB，使用 multipart 并写入任务自己的 uploads 子目录，不把整个文件的 Base64 放入页面 VM。

内部 `.agent/` 不能通过通用预览或下载访问。仅 `.agent/children/` 中被产物清单精确登记的交付文件可以通过专用检查后读取，仍由 `os.Root` 限制在当前工作区。

`.mq.md` 通过现有官方只读预览入口生成 sanitized HTML，前端在限制脚本执行的独立阅读框里展示；普通 Markdown 不允许原生 HTML 脚本。源码展开和下载只作用于当前文件，不运行文稿。

## 搜索、OCR 与多格式阅读

普通 `ext/search/index.mq.md query` 和 `ext/ocr/index.mq.md recognize` 函数就是智能体工具，调用现场直接提供给意图、规划和普通实现角色；独立测试者无法使用。搜索服务采用固定版本自部署 [SearXNG](https://docs.searxng.org/dev/search_api.html)，仅 Docker 内网可见，仍由 7964 统一对外。当前使用 Bing、百度、搜狗和 Wikipedia；引擎封禁或超时会保留在实际结果中，搜索摘要不会增加已阅读来源。

OCR 按 [官方异步任务协议](https://ai.baidu.com/ai-doc/AISTUDIO/Mml7n69e7) 上传当前任务的 PDF 或图片；令牌单独放在 `.marqdo/secrets/paddleocr_token`，通过 Docker secret 注入，不能提交到仓库。`deploy/prepare-services.sh` 准备只读权限与搜索配置。首次识别提交任务，再次使用同一路径恢复查询，done 后保存文字和原始 JSONL。输入上限 50 MiB，单次结果上限 1 MiB；长任务可能需要继续调用。这里只将指定材料发给已配置 OCR 服务，不接收任意远程文件地址。

右侧通过 [Open File Viewer](https://github.com/xushanpei/open-file-viewer) 预览 PDF、Office、图片及音视频。它也是 [AnyFileViewer](https://github.com/wpf008/AnyFileViewer) 使用的 MIT 预览引擎；未复制未授权的桌面应用源码。浏览器读取当前账号已认证的 File 后交给无账号权限的隔离 iframe，不使用外部 Office 转换站；Marqdo 文件仍保持官方 View。复杂排版和未支持格式可能需要下载原件。输入上限 50 MiB，预览依赖本地静态资源，首次打开对应格式时才加载解析器。

工程边界与验收记录见 [search-ocr-preview.mq.md](docs/search-ocr-preview.mq.md)。

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

Go 检查覆盖账号隔离、同源限制、加密范围、越界路径与符号链接、真实首段 SSE、持久化和登记交付边界。Python 检查覆盖消息原样传输、增量协议，以及真实 Marqdo 根流程的隔离与修复。浏览器检查直接操作真实 Go API，包含任务、模型、插件、上传、文稿、调宽和手机布局。

迁移说明与下一步见 [技术栈渐进迁移](doc/next/技术栈渐进迁移.md)。Marqdo 工具开发仍可阅读原有 `.mq.md` 手册；新增库继续遵循代码即文档、文档即可调用能力的规范。


首页设计稿、实现截图和测量基准见 [首页对齐记录](doc/design/landing-v1-alignment.md)。QD 标识由 Marqdo 折面标识延伸为 SVG，中文字体按首页文案子集化并随前端部署，减少跨设备字体替换引起的偏移。修改文案后可以用 `deploy/subset-fonts.py` 更新字体子集；字体许可在 `frontend/public/fonts/LICENSE-Noto.txt`。


## 根流程验证

```sh
bash deploy/check-document-runtime.sh
python3 -m unittest discover -s tests -p test_root_skill.py
python3 -m unittest discover -s tests -p test_runtime_io.py
python3 -m unittest discover -s tests -p test_architecture.py
python3 -m unittest discover -s worker -p 'test*.py'
(cd server && go test -race ./...)
cargo test --offline --locked --manifest-path ext/qdagent/native/Cargo.toml --target-dir .marqdo/native-target
npm run build --prefix frontend
```

协议测试使用实际 CLI 和 ABI，验证不能跳步、旧确认、源码变更、无效代码、独立案例、并发合并和部分验收。网络替身的模型响应也定义在可执行 `.mq.md` 中，只替代供应商生成内容；测试实际经过网络传输、根状态机、官方解析、子任务和冻结案例，故意植入的错误必须失败，修复后使用原案例通过。浏览器用例另行调用本机 Qwen，覆盖真实交互与官方 View。不能把受控网络测试当成真实模型验收，也不能把编译通过当作业务事实正确。


研究与文章采用专门的 `research_unit` / `document_unit` 文稿接口，先确认框架，再按依赖波次执行；没有就绪的研究材料就不启动下游作者。正文直接使用绑定的 Markdown 围栏，保存原文后生成可调用、校验正文摘要的 Marqdo 函数。精确返回仍用独立输入预期；研究与文章使用测试者事先冻结的长度、实际来源和引用契约。所有试运行复用官方 CoW 沙盒，文件变化不会提交到宿主。

浏览器插件通过独立 Chromium 容器只读访问公开页面，逐跳检查重定向与子资源，保留快照与 PNG。它没有工作区、模型密钥或身份 Cookie；站点脚本、写请求、内网访问与 WebSocket 关闭。只对外开放原来的 7964，内部浏览服务不发布端口。构建前运行 `bash deploy/prepare-browser.sh` 准备匹配的 Chromium、Playwright 与只读服务凭据，随后执行 `bash deploy/build.sh`；也可通过 `QDAGENT_CHROMIUM_SOURCE` 提供已安装的匹配浏览器目录。

工作台默认展示实际调用文稿、定位到行的诊断、来源摘录及可打开的截图，协议细节只在调试折叠项中出现。详见 [原生文稿框架审查](docs/native-workbook-framework.mq.md)。历史失败任务不会自动改写已批准规则，需要通过“调整框架”重新确认研究/写作职责。结构契约证明来源可追溯，不能代替科学事实和文章质量审核；用户验收仍是独立步骤。

插件安装元数据统一维护在 `ext/plugins.mq.md`；Go 插件页面与 Marqdo 权限检查共读该表，不在 Go 中重复列举扩展。仅登记身份、入口和 ABI 依赖，不增加模型工具名称路由。

浏览器与原生文稿链路可通过 `marqdo call deploy/manage.mq.md probe_browser --effects plugin,fs.read,fs.write,process.exec,environment.read --fs-root . --json` 重跑，验收只创建临时容器，不更新生产服务。
