# 求道 (QDAgent) 功能清单

> 基于 DSH Web 前端样式，真实接通 Marqdo 后端

## 已完成功能 ✅

### 核心框架
- [x] DSH 官方主题系统（design-platform.css）
- [x] 深色/浅色主题切换
- [x] 三栏布局（sidebar | center | rightbar）
- [x] 侧边栏折叠/展开
- [x] 列宽拖拽调整

### 对话功能
- [x] 会话列表管理
- [x] 新建/删除会话
- [x] 流式对话（SSE）
- [x] 消息历史持久化
- [x] 停止生成

### 笔记功能
- [x] 笔记列表
- [x] 搜索笔记
- [x] 新建笔记
- [x] 查看笔记详情

### 设置功能
- [x] 大模型配置（API Base URL, API Key, Model）
- [x] 语音配置（TTS, ASR）
- [x] 配置保存/重置
- [x] MCP 服务管理（界面）
- [x] OpenAI 网关配置（界面）
- [x] 记忆管理（界面）

### 工程功能
- [x] 预检仪表盘
- [x] 工作簿列表
- [x] 能力矩阵
- [x] 知识候选（晋升/拒绝）

## 开发中功能 🚧

### 工作区
- [ ] 文件浏览器
- [ ] 集成终端
- [ ] Git 状态管理
- [ ] 文件搜索

## 计划中功能 📋

### 高级功能
- [ ] Markdown 渲染（消息内容）
- [ ] 代码高亮
- [ ] 文件预览
- [ ] 多模型切换
- [ ] 会话导出

### 插件系统
- [ ] 插件市场
- [ ] 插件管理
- [ ] 自定义工具

### 协作功能
- [ ] 会话分享
- [ ] 团队协作
- [ ] 权限管理

## API 对接状态

### 已对接
- `GET /api/health` - 健康检查
- `GET /api/store/profile` - 获取配置
- `POST /api/store/profile` - 更新配置
- `POST /api/store/reset` - 重置配置
- `GET /api/store/runs` - 获取笔记列表
- `GET /api/store/run/:slug` - 获取笔记详情
- `POST /api/store/capture` - 创建笔记
- `GET /api/eng/metrics` - 工程指标
- `GET /api/eng/workbooks` - 工作簿列表
- `GET /api/eng/capability` - 能力矩阵
- `GET /api/eng/candidates` - 知识候选
- `POST /api/eng/promote` - 晋升知识
- `POST /api/eng/reject` - 拒绝知识
- `POST /v1/chat/completions` - 流式对话

### 待对接
- [ ] 文件上传/下载
- [ ] 终端命令执行
- [ ] Git 操作
- [ ] 插件管理 API

## 主题系统

使用 DSH 官方色彩变量：
- `--dsw-alias-bg-base` - 背景色
- `--dsw-alias-label-primary` - 主要文字
- `--dsw-alias-label-secondary` - 次要文字
- `--dsw-alias-border-l2` - 边框
- `--dsw-alias-button-primary-fill` - 主要按钮
- `--dsw-specific-bubble` - 用户消息气泡
- `--dsw-specific-sidebar-fill` - 侧边栏背景

## 开发规范

1. 所有新页面必须使用 DSH 色彩变量
2. 缺失功能必须添加 `DevBadge` 标记
3. API 调用必须真实连接，不允许 mock
4. 样式变更必须截图验证
