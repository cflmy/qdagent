---
markup: occlusion
title: 工作台设计稿的精确视觉标尺
---

本文保存设计图的静态视觉资源。参考画布为1586×991，左侧267像素，右侧496像素，顶部46像素。颜色、字体、留白、线框图标和面板边界统一在这里声明。业务逻辑仍位于客户端，原生文档语法由官方 View 负责。宽度变量只负责空间，不解释模型回答或执行文稿。

styles.build 通过原生文件读取和正则提取这一个明确的CSS资源围栏，在基础样式之后发布。不要直接修改生成CSS。窄屏覆盖桌面偏好，分隔条有焦点状态，图标是静态矢量遮罩。真实内容缺失时显示空态，不使用设计图中的示例冒充实际任务。

```css

/* Pixel baseline: reference 1586×991; 267 / flexible / 496. */
body.reader-page{--qd-sidebar:267px;--qd-inspector:496px;--qd-top:46px;--qd-bg:#fbf8f3;background:var(--qd-bg);color:#292a22;font-family:"Noto Sans CJK SC",system-ui,sans-serif}
body.reader-page .reader-content{margin-top:var(--qd-top)!important;padding:32px 36px 174px!important;min-height:calc(100dvh - var(--qd-top))}
body.reader-page.qd-inspector-open .reader-content{padding-inline:36px!important}
#qd-conversation{max-width:940px;font:16px/1.65 "Noto Sans CJK SC",system-ui,sans-serif}
.qd-sidebar{padding:14px 13px 28px;background:linear-gradient(110deg,#f4f0e9,#f0ece4);overflow:hidden;gap:12px}
.qd-sidebar-top{display:flex;flex-direction:column;min-height:0;flex:1}
.qd-brand-lockup{display:flex;gap:19px;align-items:center;height:54px;padding:0 8px;flex:none}
.qd-brand-mark{font:49px/1 Georgia,serif;color:#302e1d;letter-spacing:-5px;transform:translateY(-2px)}
.qd-brand-name{display:block}
.qd-brand{font:500 22px/1.25 "Noto Serif CJK SC",serif;letter-spacing:.12em;padding:0;color:#282719}
.qd-brand-caption{font:10px/1.5 system-ui;letter-spacing:.34em;padding:2px 0 0;color:#282719}
.qd-workspace-switch{height:42px;display:flex;align-items:center;gap:10px;flex:none;margin:14px 0 20px;width:100%;padding:0 14px;background:transparent;border:1px solid #ded8cd;border-radius:7px;color:#363528;text-align:left;font:16px "Noto Sans CJK SC",sans-serif;cursor:pointer}
.qd-workspace-switch:after{content:"⌄";font-size:16px;margin-left:auto}
.qd-new-task{height:46px;flex:none;font:500 17px "Noto Sans CJK SC",sans-serif;padding:0 16px;text-align:center;border-radius:7px;background:linear-gradient(105deg,#4f5b34,#5e6a40);box-shadow:inset 0 0 12px #28311115}
.qd-new-task:before{content:"＋";font:26px/1 system-ui;vertical-align:-2px;margin-right:10px}
.qd-nav-caption{font:14px/1.5 "Noto Sans CJK SC",sans-serif;margin:29px 7px 14px;color:#5b5849;flex:none;letter-spacing:0}
.qd-sidebar-tasks{overflow-y:auto;min-height:0;margin:0 -7px;padding:0 0 10px;scrollbar-width:thin}
.qd-sidebar-footer{border:0;padding:0;flex:none}
.qd-nav-item{display:flex;align-items:center;gap:14px;min-height:44px;padding:8px 14px;font:16px "Noto Sans CJK SC",sans-serif;color:#333423}
.qd-nav-item:after{content:"›";margin-left:auto;color:#756b55;font:20px Georgia}
[class*="qd-icon-"]:before{content:"";display:inline-block;width:22px;height:22px;flex:0 0 22px;background:currentColor;mask:var(--qd-line-icon) center/contain no-repeat;-webkit-mask:var(--qd-line-icon) center/contain no-repeat;vertical-align:middle}
.qd-sidebar .qd-session{position:relative;margin:0 0 8px;padding:0 8px 8px 52px;border-radius:7px;min-height:56px;box-sizing:border-box}
.qd-sidebar .qd-session:before{content:"";position:absolute;left:20px;top:12px;width:21px;height:23px;background:#6e674f;mask:var(--qd-file-icon) center/contain no-repeat;-webkit-mask:var(--qd-file-icon) center/contain no-repeat}
.qd-sidebar .qd-session:has(.is-active){background:#e8e7d8;border-left:2px solid #697642}
.qd-sidebar .qd-session-select{font:500 14px/1.55 "Noto Sans CJK SC",sans-serif;border:0!important;background:none!important;color:#292b20;padding:8px 0 2px;margin:0!important;line-height:1.6;min-height:32px;border-radius:0;box-shadow:none}
.qd-sidebar .qd-module-path{display:none}
.qd-session-meta{display:block;color:#837965;font:12px/1.6 "Noto Sans CJK SC",sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qd-workspace-header{height:var(--qd-top);padding:0 28px;gap:15px;background:#fbf8f3f5}
.qd-breadcrumb-scope{display:flex;align-items:center;gap:10px;font:16px "Noto Sans CJK SC",sans-serif;color:#3e3c2c;white-space:nowrap}
.qd-breadcrumb-scope:after{content:"›";font:24px Georgia;margin-left:7px;color:#78705e}
.qd-workspace-title{font:500 16px "Noto Sans CJK SC",sans-serif;color:#26271f}
.qd-header-files{position:relative;display:flex;align-items:center;gap:12px;border:0;padding:0;background:none;font:14px "Noto Sans CJK SC",sans-serif;color:#22251d}
.qd-header-files:before{content:"";display:block;width:40px;height:22px;border-radius:20px;background:#d6d2c8;box-shadow:inset 0 1px 3px #0002}
.qd-header-files:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;background:#fffdf8;border-radius:50%;box-shadow:0 1px 3px #0002;pointer-events:none}
.qd-inspector-open .qd-header-files:before{background:#5c6842}
.qd-inspector-open .qd-header-files:after{transform:translateX(18px)}
.qd-inspector{top:var(--qd-top);padding:0 17px 22px;background:#fbf8f3;overflow:auto;overscroll-behavior:contain}
.qd-inspector-tabs{height:50px;box-sizing:border-box;padding:0 17px;gap:12px;margin:0 -17px 0;background:#fbf8f3}
.qd-inspector-tab{height:50px;min-width:86px;padding:0 22px;font:600 17px "Noto Sans CJK SC",sans-serif;color:#29291f}
.qd-inspector-close{font-size:0;width:28px;height:28px;padding:0;border-radius:5px}
.qd-inspector-close:before{content:"×";font:22px/1 system-ui;color:#827860}
.qd-inspector-close:hover{background:#eee9df}
body:not(.qd-inspector-process) #inspector-files,body.qd-inspector-process #inspector-activity{border-bottom:3px solid #5d6d38}
.qd-preview-document{margin:0}
.qd-preview-file{display:flex!important;align-items:center;gap:13px;font:600 16px/1.5 "Noto Sans CJK SC",sans-serif!important;color:#25261f!important;padding:18px 18px!important;min-height:63px;box-sizing:border-box}
.qd-preview-file:empty{display:none!important}
.qd-reader-frame{border:1px solid #ddd7cc;border-radius:8px;background:#fcf9f4;overflow:hidden}
.qd-reader-toolbar{height:42px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2dcd1;padding:0 15px;background:#faf7f1}
.qd-reader-brand{font:600 14px Georgia,"Noto Serif CJK SC",serif;color:#353426;display:flex;align-items:center;gap:10px}
.qd-reader-brand:before{content:"M";font:18px Georgia;text-decoration:underline;text-decoration-color:#ac945b}
.qd-reader-actions{display:flex;gap:12px}
.qd-reader-tool{display:flex;align-items:center;justify-content:center;padding:4px;border:0;background:none;color:#716b5a;font-size:0;cursor:pointer;border-radius:4px}
.qd-reader-tool:before{width:19px;height:19px;flex-basis:19px}
.qd-reader-tool:hover{background:#eee8dc;color:#43532d}
#qd-preview{border:0;border-radius:0;background:transparent;padding:18px 17px!important;font-size:15px;overflow:auto}
#qd-preview .mq-document,#qd-preview .article-body{font-size:15px!important;line-height:1.65}
#qd-preview .document-surface{max-width:none!important;margin:0!important;padding:0!important}
#qd-preview h1{font-size:27px!important;line-height:1.3}
#qd-preview h2{font-size:19px!important;line-height:1.45}
#qd-preview .reader-syntax-guide{margin:0 0 18px!important;font-size:13px}
#qd-preview table{font-size:12px}
#qd-preview p{margin:0 0 12px}
.qd-preview-source{display:none;white-space:pre-wrap;overflow-wrap:anywhere;padding:18px;font:12px/1.75 ui-monospace,monospace;margin:0}
.qd-show-source .qd-preview-source{display:block}
.qd-show-source #qd-preview{display:none}
.qd-show-source #preview-source{background:#e7e8da;color:#4f6037}
.qd-reader-download{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;height:43px;margin-top:16px;border:1px solid #ded6c8;border-radius:7px;background:transparent;color:#282a20;font:14px "Noto Sans CJK SC",sans-serif;cursor:pointer}
.qd-preview-document:not(:has(#qd-preview:not(:empty))){display:none}
.qd-inspector-empty{display:block;padding:22vh 34px 8vh;text-align:center;color:#97907d}
.qd-inspector-empty:before{content:"";display:block;width:54px;height:60px;margin:0 auto 24px;background:#aaa38e;mask:var(--qd-file-icon) center/contain no-repeat;-webkit-mask:var(--qd-file-icon) center/contain no-repeat;opacity:.5}
.qd-inspector-empty-title{display:block;font:500 18px "Noto Serif CJK SC",serif;color:#72765d;margin-bottom:12px}
.qd-inspector-empty-copy{display:block;font:13px/1.85 "Noto Sans CJK SC",sans-serif}
.qd-inspector:has(#qd-preview:not(:empty)) .qd-inspector-empty,.qd-inspector:has(.qd-artifact-card) .qd-inspector-empty,body.qd-inspector-process .qd-inspector-empty{display:none}
.qd-workspace-files{padding-top:10px}
.qd-workspace-files:has(.qd-empty-note){padding:0}
.qd-workspace-files .qd-empty-note{font-size:12px;margin:0;padding:15px 10px;border-bottom:1px solid #eee7db}
.qd-workspace-preview{font:13px/1.5 "Noto Sans CJK SC",sans-serif;padding:10px 14px;border-bottom:1px solid #eee7dd;border-radius:0}
.qd-message{position:relative;margin:0 0 30px!important;padding:0 0 0 66px!important;border:0!important;background:none!important;border-radius:0!important;min-height:40px}
.qd-message-role{position:absolute;top:0;left:0;display:grid;place-items:center;width:40px;height:40px;padding:0;margin:0;border-radius:6px;background:#ece0cb;color:transparent!important;font-size:0!important}
.qd-message-role:before{content:"我";font:17px "Noto Serif CJK SC",serif;color:#3a3528}
.qd-message.is-assistant .qd-message-role{background:linear-gradient(110deg,#75834c,#58653d)}
.qd-message.is-assistant .qd-message-role:before{content:"Q";font:24px Georgia;color:#fffdf4}
.qd-message .article-body,#qd-reply .article-body{font:16px/1.65 "Noto Sans CJK SC",system-ui,sans-serif!important}
.qd-message .article-body p:first-child:first-letter,#qd-reply .article-body p:first-child:first-letter{float:none!important;font:inherit!important;margin:0!important;padding:0!important;color:inherit!important}
#qd-reply{position:relative;padding-left:66px;min-height:40px;margin-top:24px}
#qd-reply:empty{display:none}
#qd-reply:before{content:"Q";display:grid;place-items:center;position:absolute;top:0;left:0;width:40px;height:40px;margin:0;border-radius:6px;background:linear-gradient(110deg,#75834c,#58653d);color:#fffdf4;font:24px Georgia}
#qd-workbench{margin-left:24px}
body.reader-page .qd-execution{margin:24px 0 20px 24px!important;padding:0!important;border:0!important;font:13px/1.6 "Noto Sans CJK SC",sans-serif!important}
.qd-execution-title{font:600 16px/1.4 "Noto Sans CJK SC",sans-serif!important;letter-spacing:0!important;color:#292c21!important;margin-bottom:14px!important}
.qd-execution-title:before{content:"›";display:inline-block;margin-right:15px;font:25px/1 Georgia}
body.reader-page .qd-execution .qd-trace-card{border:1px solid #e0d9ce!important;border-radius:6px!important;margin:7px 0!important;background:#faf7f2!important;overflow:hidden}
body.reader-page .qd-execution .qd-trace-heading{padding:10px 14px!important;min-height:40px;box-sizing:border-box}
body.reader-page .qd-execution .qd-trace-toggle{font:500 13px/1.45 "Noto Sans CJK SC",sans-serif!important;color:#2e3125!important}
.qd-trace-toggle:before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:#90977d;margin-right:14px}
.is-succeeded .qd-trace-toggle:before{background:#62933e}.is-running .qd-trace-toggle:before{background:#d5aa26}.is-failed .qd-trace-toggle:before{background:#b36d57}
body.reader-page .qd-execution .qd-stage-status{font:11px/1.5 "Noto Sans CJK SC",sans-serif;color:#6c7654}
body.reader-page .qd-composer-dock{left:calc(var(--qd-sidebar) + 19px);right:19px;bottom:16px;max-width:940px;padding-top:10px;background:linear-gradient(0deg,var(--qd-bg) 85%,transparent)}
body.reader-page.qd-inspector-open .qd-composer-dock{right:calc(var(--qd-inspector) + 16px)}
body.reader-page #qd-chrome{min-height:118px!important;padding:8px 15px 11px!important;border-radius:11px!important;background:#fcfaf5!important;border-color:#9c987d!important;box-shadow:none!important}
body.reader-page #chat-input{height:52px;min-height:52px;font:16px/1.6 "Noto Sans CJK SC",sans-serif;resize:none;padding:0 0 5px}
#chat-input::placeholder{color:#8a8579}
.qd-composer-bottom{min-height:34px}
.qd-composer-tools{gap:16px;flex-wrap:nowrap}
body.reader-page .mq-tool-label{display:flex;align-items:center;gap:10px;padding:7px 11px;border:1px solid #e4ddcf;border-radius:6px;font:13px/1 "Noto Sans CJK SC",sans-serif;white-space:nowrap}
body.reader-page .mq-tool-label:before{content:"";display:block!important;width:18px;height:18px;background:currentColor;mask:var(--qd-attach-icon) center/contain no-repeat;-webkit-mask:var(--qd-attach-icon) center/contain no-repeat}
.qd-model-picker{display:flex;align-items:center;gap:9px;height:35px;max-width:280px;border:1px solid #e5dfd2;border-radius:6px;padding:6px 10px;background:transparent;font:13px "Noto Sans CJK SC",sans-serif;color:#2f3325}
.qd-model-picker:after{content:"⌄";margin-left:8px}
body.reader-page #chat-send{display:flex;align-items:center;justify-content:center;flex:0 0 38px!important;min-width:38px!important;width:38px;height:38px;border-radius:7px;background:#52613a;font-size:0!important}
body.reader-page #chat-send:before{display:block!important;width:22px;height:22px}
body.reader-page #chat-status{font:11px/1.4 "Noto Sans CJK SC",sans-serif!important;min-height:14px}
.qd-pane-separator{position:fixed;top:0;bottom:0;width:7px;z-index:50;cursor:col-resize;touch-action:none;outline:0}
.qd-pane-separator:before{content:"";position:absolute;inset:0 2px;background:transparent;transition:background .12s}
.qd-pane-separator:hover:before,.qd-pane-separator:focus-visible:before,body.qd-pane-dragging .qd-pane-separator:before{background:#7b8b534d}
.qd-pane-separator:focus-visible:after{content:"";position:absolute;top:45%;left:1px;width:5px;height:44px;background:#7b8b53;border-radius:5px}
.qd-resize-sidebar{left:calc(var(--qd-sidebar) - 4px)}
.qd-resize-inspector{right:calc(var(--qd-inspector) - 4px);display:none}
.qd-inspector-open .qd-resize-inspector{display:block}
body.qd-pane-dragging,body.qd-pane-dragging *{cursor:col-resize!important;user-select:none!important}
body.qd-reader-focus .qd-inspector{width:calc(100vw - var(--qd-sidebar))}
body.qd-reader-focus #resize-inspector{display:none}
.qd-mobile-menu{display:none}
@media(max-width:1180px){body.reader-page.qd-inspector-open .reader-content{margin-right:0!important}body.reader-page.qd-inspector-open .qd-composer-dock{right:19px}.qd-inspector{width:min(var(--qd-inspector),94vw);box-shadow:-18px 0 45px #292d1e20}.qd-pane-separator{display:none!important}}
@media(min-width:1181px){body.reader-page.qd-inspector-open .reader-content{margin-right:var(--qd-inspector)!important}}
@media(max-width:760px){body.reader-page{--qd-sidebar:0px!important;--qd-inspector:min(94vw,496px)!important}.qd-sidebar{width:267px}.qd-workspace-header{padding:0 14px;gap:10px}.qd-breadcrumb-scope{display:none}.qd-mobile-menu{display:flex;align-items:center;font-size:0;border:0;padding:5px}.qd-mobile-menu:before{width:20px;height:20px}.qd-nav-open .qd-workspace-header{left:267px}.qd-header-files{font-size:12px;gap:6px}.qd-header-files:after{display:none}.qd-header-files:before{width:28px;height:16px}.qd-workspace-title{font-size:14px}.qd-sidebar{z-index:55}body.reader-page .reader-content,body.reader-page.qd-inspector-open .reader-content{padding:26px 18px 174px!important}.qd-message{padding-left:44px!important}.qd-message-role{width:30px;height:30px}#qd-reply{padding-left:44px}.qd-message .article-body,#qd-reply .article-body{font-size:14px!important}#qd-workbench,body.reader-page .qd-execution{margin-left:0!important}body.reader-page .qd-composer-dock{left:12px!important;right:12px!important;bottom:8px}body.reader-page #qd-chrome{padding:8px 10px!important}.qd-composer-tools{gap:8px}.qd-model-picker{max-width:175px;font-size:11px}.mq-tool-label{font-size:11px!important;padding:7px!important}.qd-inspector{z-index:45}body.qd-reader-focus .qd-inspector{width:100vw}.qd-inspector-empty{padding-inline:25px}}
.qd-icon-workspace{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%203%209%205-9%205-9-5%209-5Zm-9%209%209%205%209-5M3%2016l9%205%209-5%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-folder{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M3%207V5h6l2%202h10v13H3V7Z%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-book{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M12%205C8%202%205%203%202%204v16c4-1%207-1%2010%201%203-2%206-2%2010-1V4c-3-1-6-2-10%201Zm0%200v16%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-plugin{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M9%203h6v4h3v3h3v6h-3v5h-6v-3H9v3H3v-6h3v-3H3V6h6V3Z%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-settings{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m9%203-1%203-3%201v4l2%202-1%204%203%202%203-1%203%201%203-3-1-3%202-3-2-4-3%201-2-3H9Z%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%223%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-file{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M5%202h9l5%205v15H5V2Zm9%200v6h5M8%2012h8M8%2016h6%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-code{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m8%206-6%206%206%206m8-12%206%206-6%206M14%203l-4%2018%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-expand{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M9%203H3v6m12-6h6v6M3%2015v6h6m12-6v6h-6M3%203l6%206m12-6-6%206M3%2021l6-6m12%206-6-6%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-download{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M12%202v13m-5-5%205%205%205-5M4%2016v5h16v-5%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-send{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3%2011%2018-8-8%2018-2-8-8-2Zm8%202L21%203%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-menu{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M3%205h18M3%2012h18M3%2019h18%22%2F%3E%3C%2Fsvg%3E")}
.qd-icon-attach{--qd-line-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m8%2013%208-8a4%204%200%200%201%206%206L10%2022a6%206%200%200%201-8-8L13%203%22%2F%3E%3C%2Fsvg%3E")}
body.reader-page{--qd-file-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M5%202h9l5%205v15H5V2Zm9%200v6h5M8%2012h8M8%2016h6%22%2F%3E%3C%2Fsvg%3E");--qd-attach-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m8%2013%208-8a4%204%200%200%201%206%206L10%2022a6%206%200%200%201-8-8L13%203%22%2F%3E%3C%2Fsvg%3E")}


/* Keep the minimum conversation space even after a viewport or stored preference change. */
body.reader-page{--qd-inspector-space:clamp(320px,var(--qd-inspector),calc(100vw - var(--qd-sidebar) - 480px))}
@media(min-width:1181px){
body.reader-page.qd-inspector-open .reader-content{margin-right:var(--qd-inspector-space)!important}
body.reader-page.qd-inspector-open .qd-composer-dock{right:calc(var(--qd-inspector-space) + 16px)}
body.reader-page:not(.qd-reader-focus) .qd-inspector{width:var(--qd-inspector-space)}
.qd-resize-inspector{right:calc(var(--qd-inspector-space) - 4px)}
}
body.reader-page .qd-composer-plus{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #ded7c9;border-radius:6px;font:25px system-ui;color:#464b34;cursor:pointer}
body.reader-page #chat-status{flex:1;text-align:right!important;padding:0!important;min-width:0;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qd-plan-card{border:1px solid #ddd6ca;border-radius:7px;padding:16px 20px;background:#fcf9f3}
.qd-plan-heading{display:flex;align-items:center;gap:16px;margin-bottom:10px}
.qd-plan-card .qd-workbench-title{font:600 17px/1.5 "Noto Sans CJK SC",sans-serif;color:#25291d}
.qd-plan-card .qd-workbench-title:before{content:"☑";display:inline-block;font:21px/1 system-ui;margin-right:16px;color:#63713d}
.qd-plan-count{font:16px/1.5 system-ui;color:#6f7557}
.qd-plan-toggle{margin-left:auto;padding:0;background:none;border:0;color:#86806f;font:12px "Noto Sans CJK SC",sans-serif;cursor:pointer}
.qd-plan-progress{display:block;width:calc(100% - 34px);margin:0 0 16px 34px;height:9px;border:0;border-radius:6px;background:#e2ddd3;appearance:none}
.qd-plan-progress::-webkit-progress-bar{background:#e2ddd3;border-radius:6px}
.qd-plan-progress::-webkit-progress-value{background:#7c8453;border-radius:6px}
.qd-plan-progress::-moz-progress-bar{background:#7c8453;border-radius:6px}
.qd-plan-step{position:relative;display:block;font:14px/1.6 "Noto Sans CJK SC",sans-serif;padding:6px 0 6px 45px!important;color:#25291e}
.qd-plan-step:before{content:"";position:absolute;left:14px;top:8px;width:18px;height:18px;border:1.5px solid #a19b82;border-radius:50%;box-sizing:border-box}
.qd-plan-step.is-completed:before,.qd-plan-step.is-succeeded:before,.qd-plan-step.is-done:before{content:"✓";display:grid;place-items:center;color:white;border:0;background:#5f7443;font:12px system-ui}
.qd-plan-step.is-running:before{border-color:#a48d47;background:#e5d995}
.qd-plan-goal,.qd-workbench-acceptance{font:11px/1.6 "Noto Sans CJK SC",sans-serif;color:#8d8573;margin:8px 0 0 45px;display:block}
.qd-plan-collapsed .qd-plan-steps{display:none}
.qd-workbench-content{display:block;padding:0!important;border:0!important;background:none!important}
.qd-plan-card{margin-bottom:20px}
.qd-deliverables{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:18px 0}
.qd-artifact-card{position:relative;border:1px solid #ded6ca;border-radius:8px;padding:12px 12px 10px 62px;background:#fcf9f4;min-width:0}
.qd-artifact-card:before{content:"MD";display:grid;place-items:center;position:absolute;left:20px;top:15px;width:29px;height:34px;background:#6a7853;color:white;border-radius:4px;font:600 12px system-ui;box-shadow:inset 0 0 0 1px #fff5}
.qd-artifact-card.is-docx:before{content:"W";background:#3c7bbd;font-size:20px}
.qd-artifact-card.is-pptx:before{content:"P";background:#ce7345;font-size:20px}
.qd-artifact-title{font:600 14px/1.5 "Noto Sans CJK SC",sans-serif;margin:0 0 3px;color:#2d3024;overflow-wrap:anywhere}
.qd-artifact-meta{display:block;font:11px/1.5 system-ui;color:#958b78;margin-bottom:4px}
.qd-artifact-link{font:11px "Noto Sans CJK SC",sans-serif;margin-right:10px;padding:0;border:0;background:none;color:#697447;cursor:pointer;text-decoration:none}
.qd-artifact-preview{max-width:none;margin:0;font-size:11px}
.qd-inspector .qd-plan-card,.qd-inspector .qd-child-task{display:none!important}
.qd-inspector .qd-deliverables{grid-template-columns:1fr}
.qd-inspector .qd-artifact-card{padding-left:62px}
@media(max-width:760px){.qd-composer-tools{gap:8px}.qd-composer-plus{display:none!important}body.reader-page #chat-status{display:none}.qd-deliverables{grid-template-columns:1fr}.qd-plan-card{padding:12px}.qd-plan-heading{gap:8px}.qd-plan-card .qd-workbench-title{font-size:15px}.qd-plan-toggle{font-size:10px}}


.qd-plan-progress{overflow:hidden}
.qd-plan-fill{display:block;height:100%;margin:0;background:#7c8453;border-radius:6px}
.qd-progress-0 .qd-plan-fill{width:0%}
.qd-progress-1 .qd-plan-fill{width:1%}
.qd-progress-2 .qd-plan-fill{width:2%}
.qd-progress-3 .qd-plan-fill{width:3%}
.qd-progress-4 .qd-plan-fill{width:4%}
.qd-progress-5 .qd-plan-fill{width:5%}
.qd-progress-6 .qd-plan-fill{width:6%}
.qd-progress-7 .qd-plan-fill{width:7%}
.qd-progress-8 .qd-plan-fill{width:8%}
.qd-progress-9 .qd-plan-fill{width:9%}
.qd-progress-10 .qd-plan-fill{width:10%}
.qd-progress-11 .qd-plan-fill{width:11%}
.qd-progress-12 .qd-plan-fill{width:12%}
.qd-progress-13 .qd-plan-fill{width:13%}
.qd-progress-14 .qd-plan-fill{width:14%}
.qd-progress-15 .qd-plan-fill{width:15%}
.qd-progress-16 .qd-plan-fill{width:16%}
.qd-progress-17 .qd-plan-fill{width:17%}
.qd-progress-18 .qd-plan-fill{width:18%}
.qd-progress-19 .qd-plan-fill{width:19%}
.qd-progress-20 .qd-plan-fill{width:20%}
.qd-progress-21 .qd-plan-fill{width:21%}
.qd-progress-22 .qd-plan-fill{width:22%}
.qd-progress-23 .qd-plan-fill{width:23%}
.qd-progress-24 .qd-plan-fill{width:24%}
.qd-progress-25 .qd-plan-fill{width:25%}
.qd-progress-26 .qd-plan-fill{width:26%}
.qd-progress-27 .qd-plan-fill{width:27%}
.qd-progress-28 .qd-plan-fill{width:28%}
.qd-progress-29 .qd-plan-fill{width:29%}
.qd-progress-30 .qd-plan-fill{width:30%}
.qd-progress-31 .qd-plan-fill{width:31%}
.qd-progress-32 .qd-plan-fill{width:32%}
.qd-progress-33 .qd-plan-fill{width:33%}
.qd-progress-34 .qd-plan-fill{width:34%}
.qd-progress-35 .qd-plan-fill{width:35%}
.qd-progress-36 .qd-plan-fill{width:36%}
.qd-progress-37 .qd-plan-fill{width:37%}
.qd-progress-38 .qd-plan-fill{width:38%}
.qd-progress-39 .qd-plan-fill{width:39%}
.qd-progress-40 .qd-plan-fill{width:40%}
.qd-progress-41 .qd-plan-fill{width:41%}
.qd-progress-42 .qd-plan-fill{width:42%}
.qd-progress-43 .qd-plan-fill{width:43%}
.qd-progress-44 .qd-plan-fill{width:44%}
.qd-progress-45 .qd-plan-fill{width:45%}
.qd-progress-46 .qd-plan-fill{width:46%}
.qd-progress-47 .qd-plan-fill{width:47%}
.qd-progress-48 .qd-plan-fill{width:48%}
.qd-progress-49 .qd-plan-fill{width:49%}
.qd-progress-50 .qd-plan-fill{width:50%}
.qd-progress-51 .qd-plan-fill{width:51%}
.qd-progress-52 .qd-plan-fill{width:52%}
.qd-progress-53 .qd-plan-fill{width:53%}
.qd-progress-54 .qd-plan-fill{width:54%}
.qd-progress-55 .qd-plan-fill{width:55%}
.qd-progress-56 .qd-plan-fill{width:56%}
.qd-progress-57 .qd-plan-fill{width:57%}
.qd-progress-58 .qd-plan-fill{width:58%}
.qd-progress-59 .qd-plan-fill{width:59%}
.qd-progress-60 .qd-plan-fill{width:60%}
.qd-progress-61 .qd-plan-fill{width:61%}
.qd-progress-62 .qd-plan-fill{width:62%}
.qd-progress-63 .qd-plan-fill{width:63%}
.qd-progress-64 .qd-plan-fill{width:64%}
.qd-progress-65 .qd-plan-fill{width:65%}
.qd-progress-66 .qd-plan-fill{width:66%}
.qd-progress-67 .qd-plan-fill{width:67%}
.qd-progress-68 .qd-plan-fill{width:68%}
.qd-progress-69 .qd-plan-fill{width:69%}
.qd-progress-70 .qd-plan-fill{width:70%}
.qd-progress-71 .qd-plan-fill{width:71%}
.qd-progress-72 .qd-plan-fill{width:72%}
.qd-progress-73 .qd-plan-fill{width:73%}
.qd-progress-74 .qd-plan-fill{width:74%}
.qd-progress-75 .qd-plan-fill{width:75%}
.qd-progress-76 .qd-plan-fill{width:76%}
.qd-progress-77 .qd-plan-fill{width:77%}
.qd-progress-78 .qd-plan-fill{width:78%}
.qd-progress-79 .qd-plan-fill{width:79%}
.qd-progress-80 .qd-plan-fill{width:80%}
.qd-progress-81 .qd-plan-fill{width:81%}
.qd-progress-82 .qd-plan-fill{width:82%}
.qd-progress-83 .qd-plan-fill{width:83%}
.qd-progress-84 .qd-plan-fill{width:84%}
.qd-progress-85 .qd-plan-fill{width:85%}
.qd-progress-86 .qd-plan-fill{width:86%}
.qd-progress-87 .qd-plan-fill{width:87%}
.qd-progress-88 .qd-plan-fill{width:88%}
.qd-progress-89 .qd-plan-fill{width:89%}
.qd-progress-90 .qd-plan-fill{width:90%}
.qd-progress-91 .qd-plan-fill{width:91%}
.qd-progress-92 .qd-plan-fill{width:92%}
.qd-progress-93 .qd-plan-fill{width:93%}
.qd-progress-94 .qd-plan-fill{width:94%}
.qd-progress-95 .qd-plan-fill{width:95%}
.qd-progress-96 .qd-plan-fill{width:96%}
.qd-progress-97 .qd-plan-fill{width:97%}
.qd-progress-98 .qd-plan-fill{width:98%}
.qd-progress-99 .qd-plan-fill{width:99%}
.qd-progress-100 .qd-plan-fill{width:100%}


/* Each working region scrolls independently; no outer-page scrollbar shifts the reference grid. */
body.reader-page{height:100dvh;overflow:hidden}
body.reader-page .reader-content,body.reader-page.qd-inspector-open .reader-content{position:fixed;top:var(--qd-top);bottom:0;left:var(--qd-sidebar);right:0;margin:0!important;min-height:0!important;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
@media(min-width:1181px){body.reader-page.qd-inspector-open .reader-content{right:var(--qd-inspector-space)}}
body.reader-page .qd-plan-step{border:0!important;border-radius:0!important;background:none!important}
@media(max-width:760px){body.reader-page .reader-content,body.reader-page.qd-inspector-open .reader-content{left:0;right:0}}


@media(max-width:1180px){
body.qd-inspector-initial:not(.qd-inspector-requested) .qd-inspector{display:none}
body.qd-inspector-initial:not(.qd-inspector-requested) .qd-header-files:before{background:#d6d2c8}
body.qd-inspector-initial:not(.qd-inspector-requested) .qd-header-files:after{transform:none}
}


/* Dialogs share the workbench's paper, typography and restrained olive accents. */
body.reader-page .mq-panel{background:#fbf8f3;border:1px solid #ddd6ca;border-radius:12px;box-shadow:0 24px 80px #29271d38;padding:30px 34px;color:#282a21;font:14px/1.65 "Noto Sans CJK SC",system-ui,sans-serif}
.mq-panel .article-body h2{font:600 23px/1.35 "Noto Serif CJK SC",serif;margin:0 0 8px;color:#303424}
.mq-panel .article-body p{font:13px/1.7 "Noto Sans CJK SC",sans-serif;color:#807a6d;margin:0 0 22px}
body.reader-page .mq-panel>button{border:1px solid #ddd5c7;border-radius:7px;padding:7px 14px;color:#625e50;background:#fbf8f3;font:13px system-ui;cursor:pointer}
body.reader-page .mq-panel>button:hover{background:#eeeadf}
.qd-capability,.qd-custom-model{border:1px solid #e0d9cc;border-radius:8px;background:#fffdf9;padding:14px 16px;margin:10px 0}
.qd-capability .qd-card-title{font-size:15px;color:#303826}
.qd-capability .qd-card-meta{font-size:12px;color:#88806d}
.qd-capability button,.qd-custom-model button,.qd-session-create button,.qd-kb-select{border:1px solid #dcd4c5;border-radius:7px;padding:8px 13px;background:#fbf8f3;color:#4d5d37;cursor:pointer}
.qd-custom-model .mq-model-opt{border:0!important;background:transparent!important;padding:8px!important;margin:0!important;text-align:left}
.qd-custom-model:has(.is-active){border-color:#87956b;background:#f2f4e9}
.qd-model-layout h2{font-size:21px!important}
.qd-model-library{border-color:#e4ded2}
.qd-model-field input,.qd-model-field select,.qd-session-input{border:1px solid #ded7ca;border-radius:7px;background:#fffdf9;padding:11px 12px;color:#2d3026}
.qd-session-create{gap:10px;margin:20px 0!important}
.qd-session-create button,#model-save{background:#566541!important;color:#fff!important;border-color:#566541!important}
.qd-logout{text-decoration:none;border-top:1px solid #ded8cc;margin-top:10px;padding-top:14px}
.qd-logout:before{content:"↪";display:inline-block;width:22px;font:22px system-ui}
.qd-logout:hover{color:#6b422f}
@media(max-width:700px){body.reader-page .mq-panel{padding:22px 18px;max-height:85dvh}.qd-model-layout{display:block!important}.qd-model-library{padding:0 0 18px;border-right:0;border-bottom:1px solid #e4ded2}.qd-model-editor{padding-top:20px}.qd-session-create{flex-wrap:wrap}.qd-session-input{flex-basis:100%}}


#panel-model.is-picker{max-width:680px!important;width:min(680px,calc(100vw - 32px))!important;padding:30px 34px!important}
#panel-model.is-picker .qd-model-layout{display:block!important}
#panel-model.is-picker .qd-model-library{border:0;padding:0}
#panel-model .qd-model-library h2{font:600 24px/1.4 "Noto Serif CJK SC",serif!important;color:#303a26}
.qd-model-group{display:block;margin:20px 0 8px;font:600 15px/1.4 "Noto Sans CJK SC",sans-serif;color:#303b27}
.qd-custom-model{position:relative;display:block!important;padding:8px 14px 12px 50px!important;margin:0!important;min-height:66px}
.qd-custom-model:before{content:"◇";position:absolute;top:14px;left:16px;color:#68784c;font:26px Georgia}
.qd-custom-model .qd-model-select{font:600 15px/1.5 "Noto Sans CJK SC",sans-serif!important;width:100%;padding:4px 0!important;color:#2b3324}
.qd-custom-model:has(.is-active){background:#edf0e3;border-color:#718252;box-shadow:0 0 0 1px #718252}
.qd-custom-model:has(.is-active):after{content:"✓";position:absolute;right:15px;top:15px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#566b38;color:white;font:13px system-ui}
.qd-model-description{display:block;font:12px/1.5 "Noto Sans CJK SC",sans-serif;color:#7c7869}
.qd-model-current{display:none}.qd-model-loading{display:block;padding:24px 2px;color:#8a8374;font:13px system-ui}
#panel-model #model-none{border:0;background:transparent;color:#8b8272;font:12px system-ui;padding:12px 0;margin:10px 0 0}


/* Reference model-picker-v1: a 820 × 734 paper dialog with one scrolling body. */
body.reader-page #panel-model.mq-panel.is-picker{left:50%;top:calc(50% + var(--qd-top)/2);bottom:auto;transform:translate(-50%,-50%);width:min(820px,calc(100vw - 32px))!important;max-width:none!important;height:min(734px,calc(100dvh - 40px));min-height:0;max-height:none;padding:24px 36px 0!important;border:1px solid #bcb398;border-radius:18px;background:#faf7ef url("/static/generated/view-assets/qd-model-ornament.png") center/100% 100% no-repeat;box-shadow:0 24px 65px #29251f45;overflow:hidden;box-sizing:border-box}
body.reader-page #panel-model.is-picker.is-open{display:flex;flex-direction:column}
#panel-model.is-picker>div:nth-of-type(1){display:none}
#panel-model.is-picker>button:first-child{position:absolute;right:20px;top:16px;width:32px;height:32px;padding:0!important;margin:0!important;float:none!important;border:0;background:transparent;font-size:0;z-index:2}
#panel-model.is-picker>button:first-child:after{content:"×";font:30px/1 Georgia;color:#302d22}
#panel-model.is-picker .qd-model-layout{display:block!important;flex:1;min-height:0;overflow:auto;scrollbar-width:thin}
#panel-model.is-picker .qd-model-library{border:0;padding:0}
#panel-model.is-picker .qd-model-editor{display:none}
#panel-model.is-picker .qd-model-library .article-body{padding:0;margin:0;max-width:none}
#panel-model.is-picker .qd-model-library .article-body h2{margin:0 40px 14px!important;text-align:center;font:600 34px/1.45 "Noto Serif CJK SC",serif!important;letter-spacing:.03em;color:#303b22}
#panel-model.is-picker .qd-model-library .article-body h2:after{content:"◇";display:block;height:15px;margin:0 auto;font:15px/1 Georgia;color:#aa8a50;background:linear-gradient(90deg,transparent,#c9b38a,transparent) center/52% 1px no-repeat}
#panel-model.is-picker .qd-model-library .article-body p{margin:0 0 26px!important;text-align:center;font:15px/1.6 "Noto Serif CJK SC",serif;color:#413c30}
#panel-model.is-picker #panel-model-body{display:block;margin:0;min-height:0;font:14px/1.6 "Noto Sans CJK SC",sans-serif;color:#807866}
#panel-model.is-picker .qd-model-group{display:flex;align-items:center;gap:10px;margin:0 0 20px;font:600 21px/1.35 "Noto Serif CJK SC",serif;color:#282e1e}
#panel-model.is-picker .qd-model-group:not(:first-child){margin-top:24px}
#panel-model.is-picker .qd-model-group:before{content:"♧";width:26px;color:#596c36;font:24px/1 Georgia}
#panel-model.is-picker #qd-model-group-local:before{content:"▱"}
#panel-model.is-picker #qd-model-group-personal:before{content:"♙"}
#panel-model.is-picker .qd-model-group:after{display:inline-block;padding:3px 12px;border:1px solid #ead9b6;border-radius:20px;background:#f7edd9;color:#76603b;font:13px/1.3 "Noto Serif CJK SC",serif}
#panel-model.is-picker #qd-model-group-shared:after{content:"平台提供 · 开箱即用"}
#panel-model.is-picker #qd-model-group-local:after{content:"使用本地算力 · 数据更可控"}
#panel-model.is-picker #qd-model-group-personal:after{content:"自定义与私有模型"}
#panel-model.is-picker .qd-custom-model{position:relative;display:block!important;box-sizing:border-box;min-height:102px;margin:0!important;padding:14px 52px 14px 106px!important;border:1px solid #dbd1c0;border-radius:12px;background:#fffdf8d9;box-shadow:0 2px 6px #3a30100a}
#panel-model.is-picker .qd-custom-model+.qd-custom-model{margin-top:10px!important}
#panel-model.is-picker .qd-custom-model:before{content:"✦";position:absolute;left:22px;top:18px;display:grid;place-items:center;width:64px;height:64px;border-radius:14px;background:#e9eadc;color:#5b7034;font:38px/1 Georgia}
#panel-model.is-picker .qd-custom-model:has(#model-builtin-local):before{content:"⬡";background:#f0ebdf}
#panel-model.is-picker .qd-custom-model:has(.is-active){border-color:#54672f;background:#e9ebdce8;box-shadow:0 0 0 1px #54672f}
#panel-model.is-picker .qd-custom-model:has(.is-active):after{content:"✓";position:absolute;right:23px;top:36px;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#566a34;color:#fff;font:16px/1 system-ui}
#panel-model.is-picker .qd-model-select{display:block!important;width:100%;padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important;text-align:left;color:#302e24;font:600 20px/1.5 "Noto Serif CJK SC",serif!important}
#panel-model.is-picker .qd-model-description{display:block;margin:2px 0 0;font:14px/1.55 "Noto Serif CJK SC",serif;color:#625e50}
#panel-model.is-picker .qd-model-remove{position:absolute;right:12px;bottom:5px;border:0;background:none;font-size:11px}
#panel-model.is-picker .qd-model-empty{position:relative;display:grid!important;grid-template-columns:minmax(0,1fr) 252px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;box-sizing:border-box;min-height:84px;margin:68px 0 12px;padding:13px 16px 13px 96px;border:1px solid #dbd1c0;border-radius:12px;background:#fffdf8d9}
#panel-model.is-picker .qd-model-empty:before{content:"◇";position:absolute;left:31px;top:23px;color:#566731;font:32px/1 Georgia}
#panel-model.is-picker .qd-model-empty-title{display:block;grid-column:1;grid-row:1;margin:0;font:600 17px/1.5 "Noto Serif CJK SC",serif}
#panel-model.is-picker .qd-model-empty .qd-model-description{grid-column:1;grid-row:2;font-size:12px}
#panel-model.is-picker .qd-model-manage-state{display:none}
#panel-model.is-picker .qd-model-empty-actions{grid-column:2;grid-row:1/3;display:flex!important;align-items:center;justify-content:flex-end;gap:10px;width:auto}
#panel-model.is-picker .qd-model-empty-actions button{box-sizing:border-box;display:inline-flex!important;align-items:center;justify-content:center;float:none!important;position:static!important;width:auto;min-width:116px;height:40px;margin:0!important;padding:0 12px!important;border:1px solid #697a43;border-radius:8px;background:#fdfbf6;color:#506131;white-space:nowrap;font:13px/1 "Noto Serif CJK SC",serif}
#panel-model.is-picker .qd-model-empty-actions #model-manage{border-color:#cbbfa9;color:#494b3b}
#panel-model.is-picker #panel-model-body:has(.qd-model-select:not(#model-builtin-smart):not(#model-builtin-local))~.qd-model-empty{margin-top:22px}
#panel-model.is-picker #panel-model-body:has(.qd-model-select:not(#model-builtin-smart):not(#model-builtin-local))~.qd-model-empty .qd-model-empty-state{display:none}
#panel-model.is-picker #panel-model-body:has(.qd-model-select:not(#model-builtin-smart):not(#model-builtin-local))~.qd-model-empty .qd-model-manage-state{display:block}
#panel-model.is-picker #model-none,#panel-model.is-loading .qd-model-empty{display:none!important}
#panel-model.is-picker .qd-model-actions{flex:none;display:flex!important;align-items:center;justify-content:flex-end;gap:20px;position:static;margin:10px -36px 0;padding:17px 31px 20px;border-top:1px solid #e4d9c6;background:#faf7efc9}
#panel-model.is-picker .qd-model-actions button{float:none!important;display:inline-flex;align-items:center;justify-content:center;min-width:124px;height:42px;margin:0!important;padding:0 18px!important;border:1px solid #baa77c;border-radius:8px;background:#fcfaf5;color:#59613d;font:16px/1 "Noto Serif CJK SC",serif}
#panel-model.is-picker .qd-model-actions #model-confirm{background:#53652f;border-color:#53652f;color:#fff}
.qd-model-actions{display:none}
@media(max-width:700px){body.reader-page #panel-model.mq-panel.is-picker{top:50%;width:calc(100vw - 24px)!important;height:min(734px,calc(100dvh - 24px));padding:24px 18px 0!important}#panel-model.is-picker .qd-model-library .article-body h2{font-size:27px!important}#panel-model.is-picker .qd-model-library .article-body p{font-size:13px}#panel-model.is-picker .qd-model-group{font-size:17px;flex-wrap:wrap}#panel-model.is-picker .qd-custom-model{padding-left:79px!important}#panel-model.is-picker .qd-custom-model:before{left:14px;width:48px;height:48px}#panel-model.is-picker .qd-model-empty{grid-template-columns:1fr;padding-left:64px;margin-top:28px}#panel-model.is-picker .qd-model-empty:before{left:16px}#panel-model.is-picker .qd-model-empty-actions{grid-column:1;grid-row:3;justify-content:flex-start;margin-top:8px}#panel-model.is-picker .qd-model-actions{margin-inline:-18px;padding:14px 18px}}

/* Home reference: the same grid is visible before WASM finishes mounting. */
.qd-brand-lockup{gap:28px;transform:translateY(-5px)}
.qd-sidebar-footer{padding-bottom:8px}
.qd-sidebar .qd-logout{position:absolute;top:26px;right:16px;min-height:0;width:22px;height:24px;border:0;margin:0;padding:0;font-size:0;gap:0;color:#807963}
.qd-sidebar .qd-logout:before{font-size:20px}
.qd-sidebar .qd-logout:after{display:none}
body.reader-page #chat-stop:disabled{display:none!important}
.qd-inspector:has(#qd-preview:not(:empty)) #qd-workspace-files,.qd-inspector:has(#qd-preview:not(:empty)) #qd-inspector-body{display:none}
body.reader-page .qd-model-picker:before{content:"";width:18px;height:18px;background:currentColor;mask:var(--qd-line-icon) center/contain no-repeat}
body.reader-page .qd-model-picker{--qd-line-icon:var(--qd-file-icon)}
#panel-model.is-picker .qd-model-personal-intro{display:flex;align-items:center;gap:12px;margin:24px 0 16px;color:#303723;font:600 21px/1.35 "Noto Serif CJK SC",serif}
#panel-model.is-picker .qd-model-personal-intro:before{content:"♙";color:#586b34}
#panel-model.is-picker .qd-model-personal-intro:after{content:"自定义与私有模型";border:1px solid #ead9b6;border-radius:20px;padding:3px 12px;background:#f7edd9;color:#76603b;font:13px/1.3 "Noto Serif CJK SC",serif}
#panel-model.is-picker .qd-model-empty{margin-top:0}
#panel-model.is-picker #panel-model-body:has(#qd-model-group-personal)~.qd-model-personal-intro,#panel-model.is-loading .qd-model-personal-intro{display:none}
#panel-model.is-catalog-error .qd-model-empty,#panel-model.is-catalog-error .qd-model-personal-intro{display:none!important}
#panel-model.is-catalog-error #panel-model-body{padding:22px;border:1px solid #dbc7b1;border-radius:10px;background:#fcf6eb;color:#8b5941}
#panel-model.is-picker #model-builtin-smart:after{content:"推荐";display:inline-block;margin-left:12px;padding:2px 7px;border-radius:4px;background:#586b36;color:#fff;font:12px/1.4 "Noto Serif CJK SC",serif}
/* Home v3: typography, native line icons and baseline alignment. */
body.reader-page{--qd-bg:#fbf9f5;--qd-ink:#282b23;--qd-muted:#827e73;--qd-line:#e2dcd1;--qd-accent:#55643b}
body.reader-page .reader-content{padding-top:32px!important}
.qd-sidebar{background:linear-gradient(105deg,#f4f1eb,#f0ede6);border-right-color:#e2dcd1}
.qd-brand{font-weight:600}.qd-brand-caption{font-size:10px;letter-spacing:.36em}
.qd-new-task{background:linear-gradient(100deg,#4d5d33,#5e6d40);border:1px solid #56643d;box-shadow:inset 0 1px 0 #ffffff14}
.qd-sidebar-footer{border-top:1px solid #ded8cc;padding-top:12px;padding-bottom:8px}
.qd-nav-item{height:44px;box-sizing:border-box;font-size:15px;transition:background .12s,color .12s;border-radius:6px}
.qd-nav-item:hover{background:#e8e6da;color:#45532f}
.qd-sidebar .qd-session{border:0;border-left:2px solid transparent;background:none;padding-right:12px;margin-bottom:10px}
.qd-sidebar .qd-session:has(.is-active){border-left-color:#697742;background:#e7e8d9}
.qd-sidebar .qd-session-select{font-size:14px!important;font-weight:550;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qd-session-meta{font-size:12px;color:#817b6b}
.qd-workspace-header{background:#fbf9f5;border-bottom-color:#e2dcd1}
.qd-breadcrumb-scope,.qd-workspace-title{font-size:15px}
.qd-inspector{background:#fbf9f5}
.qd-inspector-tabs{background:#fbf9f5}
.qd-inspector-tab{font-size:16px;font-weight:600}
.qd-preview-file{font-size:15px!important}
.qd-reader-toolbar{background:#f9f6f0;height:42px;padding-inline:16px}
.qd-reader-brand{font-size:14px}
.qd-reader-footer{display:flex!important;align-items:center;gap:0;box-sizing:border-box;min-height:44px;margin:16px 0 0;border:1px solid #ded6c8;border-radius:8px;background:#fcfaf6}
.qd-reader-footer .qd-reader-download{position:relative;flex:1;width:auto;min-height:42px;height:42px;margin:0;border:0;border-radius:0;background:none;font-size:14px;gap:12px}
.qd-reader-footer .qd-reader-download+.qd-reader-download:after{content:"";position:absolute;left:0;top:11px;bottom:11px;border-left:1px solid #ded6c8}
.qd-reader-footer .qd-reader-download:hover{background:#eeeade}
.qd-show-source #preview-source-bottom{background:#e8eadc;color:#4f6035}
.qd-reader-tool:focus-visible,.qd-reader-download:focus-visible,.qd-nav-item:focus-visible{outline:2px solid #8f9b70;outline-offset:3px}
.qd-message .article-body,#qd-reply .article-body{color:#272b24}
.qd-message .article-body p,#qd-reply .article-body p{margin:0 0 12px;line-height:1.65}
.qd-message-role{background:linear-gradient(140deg,#eddec5,#e4d0ac);box-shadow:inset 0 1px 0 #ffffff80}
.qd-message.is-assistant .qd-message-role,#qd-reply:before{background:linear-gradient(130deg,#78834e,#53613a);box-shadow:inset 0 1px 0 #ffffff35}
.qd-plan-card{padding:14px 20px;border-color:#dfd8cb;background:#fcfaf6;border-radius:8px}
.qd-plan-heading{margin-bottom:8px}
.qd-plan-card .qd-workbench-title:before{content:"";width:20px;height:20px;background:#586a38;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2011v9H4V4h11%22%2F%3E%3Cpath%20d%3D%22m9%209%203%203%209-9%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2011v9H4V4h11%22%2F%3E%3Cpath%20d%3D%22m9%209%203%203%209-9%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;vertical-align:-3px}
.qd-plan-step{padding-top:5px!important;padding-bottom:5px!important;font-size:14px}
.qd-plan-step:before{top:7px}
.qd-plan-step.is-running:before{background:transparent;border-color:#9a967d}
.qd-plan-progress{height:8px;background:#e3ddd4}
.qd-plan-fill{background:linear-gradient(90deg,#7f8754,#65723f)}
.qd-artifact-card{padding-top:10px;padding-bottom:10px;border-color:#ded7cb;background:#fcfaf6;border-radius:8px}
.qd-artifact-title{font-size:14px;font-weight:600}
.qd-artifact-meta{font:12px/1.6 "Noto Sans CJK SC",sans-serif;color:#8b8477}
.qd-artifact-link{display:inline-flex;align-items:center;min-height:24px;font-size:11px;margin-right:12px;outline-offset:2px}
body.reader-page #qd-chrome{background:#fcfaf6!important;border-color:#a49c84!important;border-radius:12px!important}
body.reader-page #chat-input{color:#282c23;font-size:15px}
.qd-composer-tools{gap:12px;align-items:center}
body.reader-page .mq-tool-label{height:35px;box-sizing:border-box;padding:0 11px;border-color:#e0d9cb;background:#fcfaf6}
body.reader-page .qd-model-picker{position:relative;height:35px;padding:0 11px;border-color:#ded7c9;max-width:265px;font:13px "Noto Sans CJK SC",sans-serif}
body.reader-page .qd-model-picker:before{content:"";display:block;width:18px;height:18px;flex:0 0 18px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%203%209%205v9l-9%205-9-5V8l9-5Z%22%2F%3E%3Cpath%20d%3D%22m3%208%209%205%209-5M12%2013v9M7.5%205.5l9%205%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%203%209%205v9l-9%205-9-5V8l9-5Z%22%2F%3E%3Cpath%20d%3D%22m3%208%209%205%209-5M12%2013v9M7.5%205.5l9%205%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat}
body.reader-page .qd-model-picker:after{content:"";width:12px;height:12px;flex:0 0 12px;margin-left:2px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat}
body.reader-page .qd-composer-plus{width:34px;height:35px;border-color:#ded7c9;background:#fcfaf6;font:25px/1 system-ui}
body.reader-page #chat-send{width:42px;height:42px;flex-basis:42px!important;border-radius:8px;background:#53633a}
body.reader-page #chat-send:before{width:22px;height:22px;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m4%203%2017%209-17%209%204-9-4-9Z%22%2F%3E%3Cpath%20d%3D%22M8%2012h13%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m4%203%2017%209-17%209%204-9-4-9Z%22%2F%3E%3Cpath%20d%3D%22M8%2012h13%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat}
body.reader-page #chat-send:disabled{display:none!important}
body.reader-page #chat-stop:disabled{display:none!important}
body.reader-page #chat-stop:not(:disabled){display:grid!important;place-items:center;box-sizing:border-box;width:42px;height:42px;padding:0;border:1px solid #819064;border-radius:8px;background:#edf0e3;color:#58683d;font-size:0}
body.reader-page #chat-stop:not(:disabled):before{content:"";display:block;width:13px;height:13px;border-radius:2px;background:currentColor}
body.reader-page .mq-action{width:42px!important;flex:0 0 42px!important}
@media(max-width:760px){.qd-reader-footer .qd-reader-download{font-size:12px}.qd-composer-tools{gap:8px}body.reader-page .qd-model-picker{max-width:170px;font-size:11px}body.reader-page #chat-input{font-size:14px}.qd-nav-item{font-size:15px}}

/* The plan, receipts and deliverables share one reading order without moving DOM nodes. */
#qd-conversation{display:grid;grid-template-columns:minmax(0,1fr)}
#qd-dialogue{order:0}
#qd-workbench,#qd-workbench>.mq-view,#qd-workbench .qd-workbench-content{display:contents!important}
#qd-workbench .qd-plan-card{order:1;margin-left:24px;margin-bottom:0}
#qd-workbench .qd-child-task{order:1;margin-left:24px}
#qd-execution{order:2}
#qd-workbench .qd-deliverables{order:3;margin:0 0 0 24px}
#qd-reply{order:4;margin-top:24px}
@media(max-width:760px){#qd-workbench .qd-plan-card,#qd-workbench .qd-child-task,#qd-workbench .qd-deliverables{margin-left:0}}

/* Reference pass 2: reduce weight and preserve evidence behind an explicit disclosure. */
.qd-message.is-assistant{margin-bottom:18px!important}
.qd-message .article-body,#qd-reply .article-body{font-size:15px!important;line-height:1.6!important}
.qd-plan-criteria{display:none!important}
.qd-plan-criteria-open .qd-plan-criteria{display:block!important}
.qd-plan-criteria-toggle{display:block;margin:7px 0 0 44px;padding:0;border:0;background:none;color:#7d7968;font:11px/1.5 "Noto Sans CJK SC",sans-serif;cursor:pointer}
.qd-plan-criteria-toggle:after{content:" ›";color:#92937a}
.qd-plan-criteria-open .qd-plan-criteria-toggle:after{content:" ⌄"}
.qd-plan-card{position:relative}
.qd-plan-step{padding-top:4px!important;padding-bottom:4px!important}
body.reader-page .qd-execution{margin-top:16px!important;margin-bottom:20px!important}
.qd-artifact-card{box-sizing:border-box;min-height:66px;padding:10px 90px 10px 62px}
.qd-artifact-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qd-artifact-meta{margin-bottom:0}
.qd-artifact-card .qd-artifact-link{position:absolute;top:24px;right:12px;display:grid;place-items:center;width:20px;height:22px;min-height:0;margin:0;padding:0;border:0;background:none;color:#7c755f;font-size:0}
.qd-artifact-card .qd-artifact-link:before{content:"";display:block;width:18px;height:18px;background:currentColor;mask:var(--qd-line-icon) center/contain no-repeat;-webkit-mask:var(--qd-line-icon) center/contain no-repeat}
.qd-artifact-card button.qd-artifact-preview{right:62px;--qd-line-icon:var(--qd-file-icon)}
.qd-artifact-card a.qd-artifact-link{right:37px;--qd-line-icon:var(--qd-download-icon)}
.qd-artifact-card a[href*="format=source"]{right:12px;--qd-line-icon:var(--qd-file-icon)}
.qd-artifact-card .qd-artifact-link:hover{color:#4c6330;background:#e9ecde;border-radius:3px}
.qd-artifact-card:before{top:16px}
@media(max-width:760px){.qd-message .article-body,#qd-reply .article-body{font-size:14px!important}.qd-artifact-card{padding-right:90px}}

/* Reference pass 3: optical gutters, compact criteria control and actual asset masks. */
body.reader-page{--qd-download-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M12%203v12m-5-5%205%205%205-5M4%2016v5h16v-5%22%2F%3E%3C%2Fsvg%3E");--qd-code-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m8%207-5%205%205%205m8-10%205%205-5%205M14%203l-4%2018%22%2F%3E%3C%2Fsvg%3E")}
body.reader-page .reader-content,body.reader-page.qd-inspector-open .reader-content{padding-right:28px!important;scrollbar-width:none}
.qd-inspector{scrollbar-width:none}
.reader-content::-webkit-scrollbar,.qd-inspector::-webkit-scrollbar{display:none}
.qd-plan-card{padding-bottom:18px}
.qd-plan-criteria-toggle{position:absolute;top:18px;right:108px;margin:0;font-size:11px}
#qd-workbench .qd-deliverables{margin-top:20px}
.qd-artifact-card a[href*="format=source"]{--qd-line-icon:var(--qd-code-icon)}
#qd-preview .qd-markdown .article-body{max-width:none!important;padding:0!important;margin:0!important}
#qd-preview .qd-markdown .article-body h1{margin:0 0 8px!important;font:600 27px/1.35 "Noto Serif CJK SC",serif!important}
#qd-preview .qd-markdown .article-body h2{margin:20px 0 9px!important;color:#826520;font:600 19px/1.45 "Noto Serif CJK SC",serif!important}
#qd-preview .qd-markdown .article-body p{font:15px/1.5 "Noto Serif CJK SC",serif!important;margin:0 0 12px!important}
#qd-preview .qd-markdown table{width:100%;font:12px/1.5 "Noto Serif CJK SC",serif}
#qd-preview .qd-markdown th{background:#f3ead7}
#qd-preview .qd-markdown th,#qd-preview .qd-markdown td{padding:4px 7px}
@media(max-width:760px){body.reader-page .reader-content,body.reader-page.qd-inspector-open .reader-content{padding-right:18px!important}.qd-plan-criteria-toggle{right:88px;font-size:10px}#qd-preview .qd-markdown .article-body h1{font-size:24px!important}}

/* The manuscript scrolls inside its frame; native reader actions remain reachable. */
.qd-inspector:has(#qd-preview:not(:empty)){display:flex;flex-direction:column;overflow:hidden}
.qd-inspector:has(#qd-preview:not(:empty)) .qd-inspector-tabs{flex:none}
.qd-inspector:has(#qd-preview:not(:empty)) .qd-preview-document{display:flex;flex-direction:column;flex:1;min-height:0}
.qd-preview-file{flex:none}
.qd-inspector:has(#qd-preview:not(:empty)) .qd-reader-frame{display:flex;flex-direction:column;flex:1;min-height:0}
.qd-reader-toolbar{flex:none}
.qd-inspector:has(#qd-preview:not(:empty)) #qd-preview{flex:1;min-height:0;overflow:auto;scrollbar-width:thin}
.qd-reader-footer{flex:none}
.qd-preview-source{flex:1;min-height:0;overflow:auto}

```
