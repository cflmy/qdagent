---
markup: occlusion
title: 同构阅读与真实执行的样式资源
import:
  fs: lib/fs.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
---

样式声明是阅读面使用的数据，由本文件的 build 通过原生文件能力发布。业务仍由 Marqdo 函数负责，不把事件或模型内容写进样式。正文、面板与执行卡片共享纸色、细线与字体；只有真实运行状态带动画，系统要求减少动画时关闭。

```css
.qd-artifact-preview{max-width:900px;margin:3rem auto;padding:2rem;font-size:18px;line-height:1.85}
.qd-workbench:empty{display:none}
.qd-workbench{margin:1.1rem 0;font-size:.68em;line-height:1.65}
.qd-workbench-content{display:grid;gap:.55rem;border:1px solid #e1d7c5;border-radius:18px;background:#f8f4eb;padding:1.1rem}
.qd-workbench-title,.qd-artifact-title{display:block;font-weight:650;color:#45533b}
.qd-workbench-acceptance{display:block;color:#817866;font-size:.92em}
.qd-plan-step,.qd-child-task{display:block;padding:.4rem .7rem;border-left:3px solid #d7ccb8;background:#fcf9f3;border-radius:4px}
.qd-plan-step.is-completed{border-color:#66734c}
.qd-plan-step.is-blocked,.qd-child-task.is-failed,.qd-child-task.is-interrupted{border-color:#af7660}
.qd-plan-step.is-running,.qd-child-task.is-running{border-color:#b18d50;animation:qd-stage-pulse 1.4s ease-in-out infinite}
.qd-artifact-card{border:1px solid #e1d7c5;border-radius:12px;background:#fffdf9;padding:.8rem}
.qd-artifact-link{display:inline-block;margin:.45rem .6rem 0 0;border:1px solid #d6c8ac;border-radius:999px;padding:.25rem .7rem;color:#66734c;text-decoration:none}
.qd-artifact-link:hover{background:#eee6d7;color:#45533b}
@media(prefers-reduced-motion:reduce){.qd-plan-step.is-running,.qd-child-task.is-running{animation:none}}
body.reader-page{--qd-ink:#35372e;--qd-muted:#817866;--qd-line:#e1d7c5;--qd-accent:#66734c;--qd-paper:#fcf9f3}
body.reader-page .mq-view{font:inherit;color:inherit;max-width:none;margin:0;padding:0;background:none;min-height:0}
body.reader-page .mq-view>.mq-node{box-sizing:border-box}
body.reader-page .qd-chat{font:inherit;color:var(--qd-ink);line-height:1.9}
.qd-markdown .article-body{font:inherit;color:inherit;max-width:72ch;margin-inline:auto}
.qd-markdown pre,.qd-markdown code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.qd-markdown pre{overflow:auto;border:1px solid var(--qd-line);border-radius:12px;background:#f3eee4;padding:1em;font-size:.75em;line-height:1.6}
.qd-markdown blockquote{border-left:3px solid #b18d50;color:var(--qd-muted);padding:.4em 1em;margin-inline:0;background:#f5eee1;border-radius:0 10px 10px 0}
.qd-markdown table{border-collapse:collapse;width:100%;font-size:.85em}
.qd-markdown th,.qd-markdown td{border:1px solid var(--qd-line);padding:.45em .75em}
.qd-markdown a{color:var(--qd-accent);text-decoration-thickness:1px;text-underline-offset:3px}
.qd-markdown img{max-width:100%}
.mq-chrome{width:min(940px,calc(100vw - 28px));gap:14px}
.mq-chrome .mq-tool{font-size:13px;font-family:inherit;height:48px;width:48px}
.mq-chrome .mq-tool.is-active{background:#eee5d2}
.mq-composer{flex:1;min-width:0}.mq-input{box-sizing:border-box}
.mq-action{width:auto;gap:6px}.mq-send{font:12px/1 sans-serif;width:46px;height:38px;border-radius:20px}
.mq-halt{font:12px/1 sans-serif;width:46px;height:38px;border-radius:20px;background:#eee5d2}
#chat-status.qd-live-status{position:fixed;z-index:39;bottom:8px;left:50%;transform:translateX(-50%);clip:auto;width:min(90vw,850px);height:auto;margin:0;text-align:center;font:11px/1.4 sans-serif;color:var(--qd-muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;padding:0}
.mq-panel{display:none;font:14px/1.6 system-ui,sans-serif;width:min(540px,calc(100vw - 24px));max-height:65vh;background:var(--qd-paper);box-sizing:border-box}
.mq-panel.is-open{display:block}
.mq-panel .mq-markdown h2{font-size:20px;clear:none;margin:0 0 6px;font-family:inherit}
.mq-panel .mq-markdown p{font-size:12px;line-height:1.7;color:var(--qd-muted)}
.mq-panel .mq-btn{float:none}
.mq-panel>button{float:right!important}
.mq-panel section{display:block}
.qd-capability,.qd-session{border:1px solid var(--qd-line);background:#fffdf8;border-radius:14px;padding:14px;margin:10px 0}
.qd-card-title{display:block;font-weight:600;color:var(--qd-ink);margin-bottom:4px}
.qd-card-meta{display:block;color:var(--qd-muted);font-size:12px}
.qd-module-path{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.7 ui-monospace,monospace;color:var(--qd-muted);margin:8px 0}
.qd-session-create{display:flex!important;gap:8px;margin:12px 0}
.qd-session-input{min-width:0;flex:1;border:1px solid var(--qd-line);padding:8px 12px;border-radius:12px;background:#fffdf8;color:var(--qd-ink)}
.qd-trace-card{border:1px solid var(--qd-line);border-left:3px solid #b9b09d;border-radius:12px;margin:12px 0;background:#fffdf9;overflow:hidden;animation:qd-arrive .2s ease-out}
.qd-trace-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:12px}
.qd-trace-toggle{appearance:none;cursor:pointer;background:transparent;border:0;text-align:left;color:var(--qd-ink);font:500 12px/1.55 system-ui,sans-serif;overflow-wrap:anywhere;flex:1;padding:0}
.qd-trace-toggle:before{content:"▸ ";color:#9a865f}
.qd-trace-toggle[aria-expanded="true"]:before{content:"▾ "}
.qd-stage-status{font:11px/1.6 ui-monospace,monospace;color:var(--qd-muted);white-space:nowrap}
.qd-trace-details{display:none!important;padding:0 12px 12px;border-top:1px dashed var(--qd-line)}
.qd-trace-details.is-expanded{display:block!important}
.qd-detail-label{display:block;color:var(--qd-muted);font-size:11px;margin:12px 0 4px;letter-spacing:.06em}
.qd-code{margin:0;border:1px solid #e9e1d3;border-radius:8px;background:#f7f3eb;padding:10px;font:11px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto;color:#494b40}
.qd-trace-card.is-running{border-left-color:#b48d48}
.is-running>.qd-trace-heading .qd-stage-status:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#b48d48;margin-right:6px;animation:qd-pulse 1.5s ease-in-out infinite}
.qd-trace-card.is-succeeded{border-left-color:#66734c}.qd-trace-card.is-failed{border-left-color:#a95b4c}
.qd-trace-card.is-cancelled,.qd-trace-card.is-interrupted{border-left-color:#918776}
.mq-btn:focus-visible,.mq-tool:focus-visible,.qd-trace-toggle:focus-visible,.mq-model-opt:focus-visible{outline:2px solid #ac8a4b;outline-offset:3px}
@keyframes qd-arrive{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes qd-pulse{50%{opacity:.3}}
@media(max-width:600px){.mq-chrome{padding:8px 10px;gap:4px;bottom:26px}.mq-chrome .mq-tools{flex:0}.mq-chrome .mq-tool{width:36px;font-size:11px}.mq-composer{flex-basis:65%;height:44px}.mq-panel{bottom:120px;max-height:62vh}.qd-trace-heading{flex-direction:column}.qd-stage-status{align-self:flex-end}}
@media(prefers-reduced-motion:reduce){.qd-trace-card,.is-running>.qd-trace-heading .qd-stage-status:before{animation:none}}
/* Conversation and receipts share the reader; only selectors open as modals. */
body.reader-page #structure>.document-surface{display:none}
body.reader-page .qd-conversation{max-width:46rem;margin:0 auto;padding:0 0 8rem;color:var(--ink,var(--qd-ink));font:19px/1.8 var(--serif,serif)}
body.reader-page .qd-chat{font:inherit;line-height:1.8}
body.reader-page .qd-markdown .article-body{max-width:none}
body.reader-page .qd-markdown h1{font-size:1.55em}
body.reader-page .qd-markdown h2{font-size:1.15em;margin-top:2em}
body.reader-page .qd-markdown h3{font-size:.9em;color:var(--qd-muted);margin:1.5em 0 .6em}
body.reader-page #qd-reply .qd-markdown>:first-child{margin-top:0}
body.reader-page .qd-execution{font:12px/1.55 system-ui,sans-serif;color:var(--qd-muted);margin:0 0 20px;padding:2px 0 2px 14px;border-left:1px solid var(--qd-line)}
.qd-execution:not(:has(.qd-trace-card)){display:none}
.qd-execution-title{display:block;font:500 11px/1.5 system-ui,sans-serif;letter-spacing:.08em;margin:0 0 7px;color:var(--qd-muted)}
body.reader-page .qd-execution .qd-trace-card{font:12px/1.55 system-ui,sans-serif;background:color-mix(in srgb,var(--qd-paper) 85%,transparent);border:0;border-radius:7px;border-left:2px solid #b9b09d;margin:6px 0;box-shadow:none}
body.reader-page .qd-execution .qd-trace-heading{padding:6px 9px;gap:12px;align-items:center}
body.reader-page .qd-execution .qd-trace-toggle{font:500 12px/1.55 system-ui,sans-serif;color:#6d705f}
body.reader-page .qd-execution .qd-stage-status{font:10px/1.5 ui-monospace,monospace;color:#99907e}
body.reader-page .qd-execution .qd-code{font:11px/1.6 ui-monospace,monospace;max-height:240px}
body.reader-page .qd-execution .qd-trace-details{padding:0 9px 9px}
.qd-execution .qd-trace-card.is-running{border-left-color:#b48d48}
.qd-execution .qd-trace-card.is-succeeded{border-left-color:#66734c}
.qd-execution .qd-trace-card.is-failed{border-left-color:#a95b4c}
body.reader-page .mq-input:focus-visible{outline:0;box-shadow:none}
body.reader-page .mq-composer:focus-within{border-color:#bd9b62;box-shadow:0 0 0 3px #b88a4515}
/* Restore the original paper-glass capsule and line icons. */
body.reader-page .mq-chrome{width:min(940px,calc(100vw - 28px));height:80px;gap:12px;padding:0 18px;border-radius:999px}
body.reader-page .mq-chrome .mq-tool{box-sizing:border-box;width:52px;height:64px;gap:5px;font:500 11px/1.2 "PingFang SC","Noto Sans SC",system-ui,sans-serif;letter-spacing:.02em;flex-shrink:0}
body.reader-page .mq-chrome .mq-tool::before{content:"";display:block;flex-shrink:0;width:22px;height:22px;background:currentColor;mask:var(--qd-tool-icon) center/contain no-repeat;-webkit-mask:var(--qd-tool-icon) center/contain no-repeat}
body.reader-page .mq-chrome .mq-tool.is-active{background:#eee5d2;color:#a67b3a}
body.reader-page .mq-upload{position:relative;display:flex!important}
body.reader-page .mq-upload .mq-tool-label{font:inherit;color:inherit;margin:0}
body.reader-page .mq-upload:focus-within{outline:2px solid #ac8a4b;outline-offset:3px}
body.reader-page .mq-tool-native:disabled{cursor:wait}
body.reader-page .mq-chrome .mq-composer{height:50px;gap:8px;padding:0 6px 0 14px;min-width:0;flex:1 1 auto}
body.reader-page .mq-chrome .mq-input{display:block;width:100%;height:46px;min-height:0;max-height:110px;box-sizing:border-box;overflow:auto;scrollbar-width:thin;line-height:20px;padding:13px 0;border:0;border-radius:0;margin:0;font-size:14px;background:transparent;resize:none}
body.reader-page .mq-chrome .mq-action{display:flex;align-items:center;justify-content:center;width:40px;flex:0 0 40px;height:50px;gap:0}
body.reader-page .mq-chrome .mq-send{width:40px;height:40px;padding:0;font:12px/1 system-ui,sans-serif;border-radius:50%}
body.reader-page .mq-chrome .mq-halt{width:40px;height:40px;padding:0;font:11px/1 system-ui,sans-serif;border:1px solid #bfb29e;border-radius:50%}
body.reader-page .mq-panel{top:50%;left:50%;bottom:auto;transform:translate(-50%,-50%);z-index:101;width:min(600px,calc(100vw - 32px));max-height:min(78dvh,760px);padding:22px 24px;border-radius:24px;box-shadow:0 24px 80px #29251f38;background:var(--qd-paper);font:14px/1.6 system-ui,sans-serif;overscroll-behavior:contain}
body.reader-page .mq-panel .mq-model-opt{display:block;margin:8px 0}
body.reader-page .mq-panel>button{position:sticky;top:0;z-index:2;background:var(--qd-paper)}
body.reader-page .qd-backdrop{position:fixed;inset:0;z-index:100;display:none;width:100vw;height:100dvh;border:0;padding:0;margin:0;border-radius:0;background:#1e211c66;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-size:0;cursor:default}
body.reader-page .qd-backdrop.is-open{display:block}
body.reader-page.qd-modal-open{overflow:hidden}
@media(max-width:860px){body.reader-page .mq-chrome{height:auto;min-height:80px;padding:8px 12px;border-radius:28px;flex-wrap:wrap;gap:4px;bottom:26px}body.reader-page .mq-chrome .mq-composer{flex:1 1 100%;order:-1}body.reader-page .mq-chrome .mq-tools{flex:0 0 auto;justify-content:center;gap:8px}body.reader-page .mq-chrome .mq-tool{height:52px;width:48px}body.reader-page .mq-sep{display:none}body.reader-page .qd-conversation{padding-bottom:11rem}}
@media(max-width:600px){body.reader-page .qd-conversation{font-size:17px}body.reader-page .mq-panel{padding:18px;width:calc(100vw - 24px);top:50%;bottom:auto;max-height:78dvh}.qd-execution .qd-trace-heading{flex-direction:row;flex-wrap:wrap}.qd-execution .qd-stage-status{margin-left:auto}body.reader-page .mq-chrome .mq-tools{gap:4px}}
.mq-upload::before{--qd-tool-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.55%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M12%2016V7%22%2F%3E%3Cpath%20d%3D%22m8.2%2010.2%203.8-3.8%203.8%203.8%22%2F%3E%3Cpath%20d%3D%22M6.5%2018.5h11%22%2F%3E%3C%2Fsvg%3E")}
#tab-model::before{--qd-tool-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.55%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M12%203.6%204.8%207.5v9L12%2020.4l7.2-3.9v-9L12%203.6z%22%2F%3E%3Cpath%20d%3D%22M12%2012.2%204.8%207.5M12%2012.2l7.2-4.7M12%2012.2V20.4%22%2F%3E%3C%2Fsvg%3E")}
#tab-plugins::before{--qd-tool-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.55%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M10%204.5a2%202%200%200%201%204%200v1.2h2.3A1.7%201.7%200%200%201%2018%207.4v2.3h1.2a2%202%200%201%201%200%204H18v2.3a1.7%201.7%200%200%201-1.7%201.7H14V19a2%202%200%201%201-4%200v-1.3H7.7A1.7%201.7%200%200%201%206%2016v-2.3H4.8a2%202%200%201%201%200-4H6V7.4A1.7%201.7%200%200%201%207.7%205.7H10z%22%2F%3E%3C%2Fsvg%3E")}
#tab-kb::before{--qd-tool-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.55%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22m12%205%207%203.6-7%203.6L5%208.6%2012%205z%22%2F%3E%3Cpath%20d%3D%22m5%2012.2%207%203.6%207-3.6%22%2F%3E%3Cpath%20d%3D%22m5%2015.8%207%203.6%207-3.6%22%2F%3E%3C%2Fsvg%3E")}
#tab-workspace::before{--qd-tool-icon:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.55%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M3.8%208.2h6.1l1.6%201.7h8.7v8.4H3.8z%22%2F%3E%3Cpath%20d%3D%22M3.8%208.2V6.6c0-.7.5-1.2%201.2-1.2h4.1l1.3%201.4%22%2F%3E%3C%2Fsvg%3E")}

/* The conversation owns execution; the exported module has no live document run. */
body.reader-page #knowledge-section,body.reader-page #exec-block,body.reader-page .source-block{display:none}
.qd-thinking:empty{display:none}
body.reader-page .qd-thinking{padding:0 0 10px;border-bottom:1px dashed var(--qd-line)}
body.reader-page .qd-thinking-markdown{font:12px/1.8 system-ui,sans-serif;color:#747462;overflow-wrap:anywhere}
.qd-thinking-markdown p{font:inherit;margin:.6em 0}
.qd-thinking-markdown pre{font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;border-radius:8px;background:#f2eee5}
.qd-model-form{display:grid!important;gap:10px;padding-top:16px;margin-top:18px;border-top:1px solid var(--qd-line)}
.qd-model-field{display:grid!important;gap:4px}
.qd-model-field label{font:12px/1.5 system-ui,sans-serif;color:var(--qd-muted)}
.qd-model-field input,.qd-model-field select{box-sizing:border-box;width:100%;border:1px solid var(--qd-line);background:#fffdf8;color:var(--qd-ink);padding:9px 11px;border-radius:10px;font:13px/1.5 system-ui,sans-serif}
.qd-model-check{display:flex!important;align-items:center;gap:8px;font:12px/1.5 system-ui,sans-serif}
.qd-model-check input{width:auto}
.qd-custom-model{display:flex!important;gap:8px;align-items:center}
.qd-custom-model .mq-model-opt{flex:1;min-width:0}
#model-form-status{display:block;font:12px/1.6 system-ui,sans-serif;color:var(--qd-muted)}
body.reader-page #panel-model{width:min(980px,calc(100vw - 36px));padding:28px 30px}
#panel-model>.mq-node:has(>.article-body){display:none}
.qd-model-layout{display:grid!important;grid-template-columns:minmax(220px, .85fr) minmax(0,1.4fr);gap:32px;clear:both}
.qd-model-library{padding-right:28px;border-right:1px solid var(--qd-line)}
.qd-model-layout h2{font:600 25px/1.35 var(--serif,serif)!important;margin:0 0 8px}
.qd-model-layout p{font:13px/1.7 system-ui,sans-serif;color:var(--qd-muted)}
.qd-model-library .mq-model-opt{padding:16px;border-radius:14px;background:#fffdf8}
.qd-model-form{border:0;margin:12px 0 0;padding:0;gap:15px}
.qd-model-field input,.qd-model-field select{padding:11px 13px;border-radius:11px}
#model-save{background:#66734c!important;color:white!important;border-color:#66734c!important;text-align:center;padding:13px!important}
.qd-model-field input:focus,.qd-model-field select:focus{outline:2px solid #b88a4550;outline-offset:2px}
@media(max-width:700px){.qd-model-layout{grid-template-columns:1fr;gap:20px}.qd-model-library{border-right:0;border-bottom:1px solid var(--qd-line);padding:0 0 16px}body.reader-page #panel-model{padding:22px 18px}}
/* Agent workspace v2: navigation, conversation, inspector are independent. */
body.reader-page{--qd-sidebar:224px;--qd-inspector:380px;background:#fcf9f3;color:#30372c;font-size:16px;overflow-x:hidden}
body.reader-page>.reader-header,body.reader-page>.shell>.nav,.reader-ornament,.reader-hero,.reader-dock,body.reader-page>.backdrop{display:none!important}
body.reader-page>.shell{display:block!important;max-width:none!important;padding:0!important;margin:0!important}
body.reader-page .reader-content{box-sizing:border-box;max-width:none!important;width:auto!important;margin:60px 0 0 var(--qd-sidebar)!important;padding:36px max(28px,calc((100vw - var(--qd-sidebar) - 790px)/2)) 190px!important;min-height:calc(100vh - 60px)}
body.reader-page.qd-inspector-open .reader-content{margin-right:var(--qd-inspector)!important;padding-inline:28px!important}
.reader-content h1.page,.reader-content>.page-meta,.reader-content>.lede,.reader-content>.doc-header{display:none!important}
#qd-conversation{max-width:790px;margin:0 auto;font:16px/1.85 system-ui,-apple-system,"Noto Sans CJK SC",sans-serif}
#qd-dialogue:empty:before{content:"从一个明确的目标开始";display:block;padding:10vh 0 1rem;font:600 32px/1.4 Georgia,"Noto Serif CJK SC",serif;letter-spacing:.03em;color:#45533b}
#qd-dialogue:empty:after{content:"阅读材料、编写文档、制作演示，或完成你的工程任务。";display:block;color:#8a8274;margin-bottom:3rem;font-size:14px}
.qd-sidebar{position:fixed;inset:0 auto 0 0;width:var(--qd-sidebar);box-sizing:border-box;padding:26px 18px 16px;background:#f2eee6;border-right:1px solid #e4ddd0;z-index:35;display:flex;flex-direction:column;justify-content:space-between;overflow:auto;gap:24px}
.qd-brand{display:block;font:600 28px/1.2 Georgia,"Noto Serif CJK SC",serif;letter-spacing:.12em;padding-left:10px}
.qd-brand-caption{display:block;font:9px/2 system-ui;letter-spacing:.13em;color:#8c8270;padding:6px 0 24px 10px}
.qd-new-task{display:block;width:100%;border:0;border-radius:9px;background:#586544;color:#fff;padding:12px 14px;text-align:left;font:600 14px system-ui;cursor:pointer}
.qd-nav-caption{display:block;font:11px/1.5 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#8c8270;margin:28px 8px 12px}
.qd-sidebar-footer{border-top:1px solid #e1d9ca;padding-top:14px}
.qd-nav-item{display:block;width:100%;background:transparent;border:0;border-radius:8px;text-align:left;padding:10px 12px;color:#575c4d;font:13px system-ui;cursor:pointer}
.qd-nav-item:hover,.qd-nav-item.is-active{background:#e8e3d5;color:#45533b}
.qd-sidebar .qd-session{padding:0;border:0;margin:5px 0;background:transparent}
.qd-sidebar .qd-session-select{display:block;width:100%;text-align:left;padding:12px 10px;border:0;border-radius:8px;background:transparent;white-space:normal;font-size:13px}
.qd-sidebar .is-selected,.qd-sidebar .is-active{background:#e4e5d6;border-radius:8px}
.qd-sidebar .qd-card-meta,.qd-sidebar .qd-module-path{font-size:10px;line-height:1.5;color:#908777;padding-inline:10px}
.qd-workspace-header{position:fixed;top:0;left:var(--qd-sidebar);right:0;height:60px;z-index:32;border-bottom:1px solid #e5dfd3;display:flex;align-items:center;gap:12px;padding:0 28px;background:#fcf9f3ed;backdrop-filter:blur(12px);box-sizing:border-box}
.qd-workspace-title{flex:1;font:500 14px system-ui;color:#555b4b;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.qd-header-files,.qd-mobile-menu{border:1px solid #e1d9ca;background:transparent;border-radius:7px;padding:7px 10px;font:12px system-ui;color:#66734c;cursor:pointer}
.qd-mobile-menu{display:none}
body.reader-page .qd-composer-dock{position:fixed;left:calc(var(--qd-sidebar) + 28px);right:28px;bottom:14px;max-width:790px;margin-inline:auto;z-index:31;background:linear-gradient(0deg,#fcf9f3 85%,transparent);padding-top:12px}
body.reader-page.qd-inspector-open .qd-composer-dock{right:calc(var(--qd-inspector) + 28px)}
body.reader-page #qd-chrome{position:static!important;transform:none!important;width:100%!important;max-width:none!important;display:block!important;padding:12px 14px!important;border:1px solid #cfc6b4!important;border-radius:14px!important;box-shadow:0 6px 22px #4d402b08!important;background:#fffdf8!important;box-sizing:border-box;min-height:120px!important}
body.reader-page #chat-input{display:block;width:100%;resize:vertical;height:60px;min-height:52px;max-height:180px;border:0;background:transparent;outline:0;font:15px/1.7 system-ui;padding:4px 6px;box-sizing:border-box}
.qd-composer-bottom,.qd-composer-tools{display:flex;align-items:center;gap:12px;justify-content:space-between}
.qd-composer-tools{justify-content:flex-start;flex-wrap:wrap;gap:10px}
body.reader-page .mq-upload{display:flex;align-items:center;position:relative;padding:0;background:none;border:0}
body.reader-page .mq-tool-label{padding:6px 8px;display:block;cursor:pointer;font:12px system-ui;color:#6e725e}
body.reader-page .mq-tool-label:before,body.reader-page .mq-tool:before{display:none!important}
.qd-model-picker{background:#f5f2ea;border:1px solid #e2dbce;border-radius:7px;font:12px system-ui;padding:7px 10px;color:#545d48;max-width:260px;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
body.reader-page .mq-action{display:flex;align-items:center;gap:8px}
body.reader-page #chat-send{border:0;border-radius:9px;background:#586544;color:#fff;width:36px;height:36px;padding:0;font:22px system-ui;box-shadow:none}
body.reader-page #chat-stop{border:1px solid #c0aa83;background:#f6efe2;color:#805f2f;border-radius:8px;padding:8px 10px;font:12px system-ui}
body.reader-page #chat-stop:disabled{display:none!important}
body.reader-page #chat-send:disabled{opacity:.35}
body.reader-page #chat-status{position:static!important;display:block;text-align:center;padding-top:7px;font:11px/1.4 system-ui;color:#928672}
.qd-inspector{display:none;position:fixed;top:60px;right:0;bottom:0;width:var(--qd-inspector);background:#f7f4ed;border-left:1px solid #e1d9ca;z-index:34;overflow:auto;box-sizing:border-box;padding:0 18px 30px}
body.qd-inspector-open .qd-inspector{display:block}
.qd-inspector-tabs{position:sticky;top:0;display:flex;align-items:center;background:#f7f4ed;z-index:2;border-bottom:1px solid #ded6c6;margin:0 -18px 18px;padding:12px 14px;gap:8px}
.qd-inspector-tab,.qd-inspector-close{border:0;background:transparent;padding:8px 10px;color:#6d735d;font:13px system-ui;cursor:pointer}
.qd-inspector-close{margin-left:auto;font-size:11px}
body:not(.qd-inspector-process) #inspector-files,body.qd-inspector-process #inspector-activity{color:#45533b;font-weight:650;border-bottom:2px solid #66734c}
.qd-inspector #qd-workbench,.qd-inspector .qd-workbench-title,.qd-inspector .qd-workbench-acceptance,.qd-inspector .qd-plan-step,.qd-inspector .qd-child-task{display:none}
.qd-inspector .qd-workbench-content{border:0;background:none;padding:0;gap:9px}
.qd-inspector .qd-artifact-card{font-size:12px}
.qd-inspector .qd-artifact-title{font-size:12px}
.qd-workspace-preview{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:6px;padding:9px 7px;font:12px system-ui;color:#5b654c;overflow-wrap:anywhere;cursor:pointer}
.qd-workspace-preview:hover{background:#ede7d9}
.qd-preview-document{margin-top:22px}
#qd-preview-title{display:block;font:600 12px/1.5 system-ui;color:#66734c;overflow-wrap:anywhere;padding-bottom:10px}
#qd-preview:empty{display:none}
#qd-preview{font-size:14px;border:1px solid #e1d9ca;border-radius:9px;background:#fffdf9;padding:16px;overflow:auto}
#qd-preview .mq-document,#qd-preview .article-body{max-width:none;font-size:14px!important;line-height:1.85}
#qd-preview .document-surface{max-width:none!important;margin:0!important;padding:0!important}
#qd-preview h1,#qd-preview h2{font-family:Georgia,"Noto Serif CJK SC",serif}
#qd-preview pre{font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}
#qd-inspector-activity{display:none;font:12px/1.6 system-ui}
body.qd-inspector-process #qd-inspector-body,body.qd-inspector-process .qd-preview-document,body.qd-inspector-process #qd-workspace-files{display:none}
body.qd-inspector-process #qd-inspector-activity{display:block}
.qd-empty-note{display:block;color:#918878;font:12px/1.7 system-ui;padding:16px 2px}
.qd-execution{font-size:12px!important;margin-block:22px!important}
.qd-trace-card{border-radius:8px!important;background:transparent!important}
.qd-workbench{font-size:13px!important}
.qd-workbench-content{background:#f7f4ed;border-radius:10px}
.qd-artifact-link{font:11px system-ui;cursor:pointer;background:transparent}
body.reader-page .mq-panel{max-width:860px;width:min(860px,calc(100vw - 40px));max-height:80vh;overflow:auto;border-radius:18px;box-shadow:0 28px 90px #30251d28}
body.reader-page .mq-panel>.mq-node>h2{font:600 23px Georgia,serif}
body.reader-page .mq-panel>button{float:right}
@media(max-width:1200px){body.reader-page{--qd-inspector:350px}body.reader-page.qd-inspector-open .reader-content{margin-right:0!important;padding-inline:28px!important}body.reader-page.qd-inspector-open .qd-composer-dock{right:28px}.qd-inspector{box-shadow:-20px 0 60px #3d36261a}}
@media(max-width:760px){body.reader-page{--qd-sidebar:0px;--qd-inspector:min(94vw,420px)}.qd-sidebar{width:224px;transform:translateX(-100%);transition:transform .2s}.qd-nav-open .qd-sidebar{transform:translateX(0);box-shadow:12px 0 60px #30251d33}.qd-workspace-header{padding-inline:16px}.qd-mobile-menu{display:block}.qd-nav-open .qd-workspace-header{left:224px}.reader-content{padding-inline:18px!important}.qd-inspector{z-index:45}body.reader-page .qd-composer-dock{left:14px;right:14px;bottom:8px}body.reader-page #chat-input{font-size:16px}.qd-brand{font-size:26px}}
@media(prefers-reduced-motion:reduce){.qd-sidebar{transition:none}}

body.reader-page .mq-action{position:static!important;display:flex!important;flex-direction:row!important;flex:none!important;width:auto!important;min-width:0!important;margin:0!important;gap:8px!important;height:auto!important}
body.reader-page #chat-send{flex:0 0 36px!important;min-width:36px!important}
body.reader-page #chat-stop{white-space:nowrap!important;min-width:54px!important;flex:none!important}
body.reader-page #chat-status{transform:none!important;inset:auto!important;width:auto!important;margin:0!important;text-align:center!important}

.qd-message{margin:0 0 28px;line-height:1.85}
.qd-message-role{display:block;font:600 11px/1.4 system-ui;letter-spacing:.03em;color:#7b806a;margin-bottom:8px}
.qd-message.is-user{background:#f1eee5;padding:18px 22px;border-radius:12px;margin-left:38px;border:1px solid #e9e3d6}
.qd-message.is-assistant{padding-left:0}
.qd-message .article-body{font:15px/1.85 system-ui!important;max-width:none!important}
.qd-message .article-body>:first-child{margin-top:0}
#qd-reply:before{content:"求道";display:block;font:600 11px/1.4 system-ui;color:#7b806a;margin:20px 0 10px}
#qd-reply:has(.article-body:empty){display:none}
#qd-reply .article-body{font:15px/1.9 system-ui!important}
.qd-activity-item{border-left:2px solid #d5cbb7;padding:12px;margin:8px 0;background:#fcf9f3;border-radius:0 7px 7px 0}
.qd-activity-item.is-running{border-color:#b18d50;animation:qd-stage-pulse 1.4s ease-in-out infinite}
.qd-activity-item.is-succeeded{border-color:#66734c}
.qd-activity-title{display:block;font-weight:600}
.qd-activity-status{display:block;font:10px/1.5 ui-monospace,monospace;color:#958874;margin-top:5px}
#qd-inspector-body:empty:after{content:"任务产生的文档与产物会显示在这里。";display:block;color:#918878;font:12px/1.7 system-ui;padding:16px 2px}
@media(prefers-reduced-motion:reduce){.qd-activity-item.is-running{animation:none}}

#panel-model.is-picker{max-width:460px!important}
#panel-model.is-picker .qd-model-layout{grid-template-columns:1fr}
#panel-model.is-picker .qd-model-editor{display:none}
.qd-model-manage{display:block;margin-top:18px;background:transparent;border:0;border-top:1px solid #e1d9ca;padding:16px 0 4px;width:100%;text-align:left;font:12px system-ui;color:#66734c;cursor:pointer}
#panel-model:not(.is-picker) .qd-model-manage{display:none}

```

## build

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 写入可重新生成的视觉资源 |

声明与发布放在同一份可阅读的源码里。先阅读上面的选择器，就能知道每个最小布局块如何显示；调用 build 则使用现有文件与正则库提取自己的样式数据。这里不解释模型输出，不读取会话，也不安装另一套前端框架。只有 compose 会发布这份资源，generated 目录中的 CSS 不是手工维护入口。

The stylesheet is a static resource, not an event program. Running cards use a gentle pulse; completed, failed and interrupted cards have distinct edges. Detail visibility depends on the stable class returned by the Marqdo click handler. Normal polling never changes that class. Narrow screens keep code readable through wrapping and bounded scrolling. Focus rings and reduced-motion support belong to this resource too. Rebuilding the resource preserves user data because it writes only the generated stylesheet.

We **source = [读取同一份样式文档](fs.read_text(path="pages/views/styles.mq.md"))**.
We **css = [只取明确的资源围栏](re.find(text=`source`, pattern="(?s)\x60{3}css\\n.*?\\n\x60{3}"))**.
We **css = [去掉资源声明边界](re.replace(text=`css`, pattern="^\x60{3}css\\n|\\n\x60{3}$", with=""))**.
We **precision = fs.read_text(path="pages/views/precision.mq.md")**.
We **precision = re.find(text=`precision`,pattern="(?s)\x60{3}css\\n.*?\\n\x60{3}")**.
1. not `precision`
  Return *[缺失精确资源就停止](result.error(code="ui.styles",message="missing precision CSS fence",operation="build"))*.
We **precision = re.replace(text=`precision`,pattern="^\x60{3}css\\n|\\n\x60{3}$",with="")**.
Return *[原生发布可重建资源](fs.atomic_write(path="pages/public/generated/qd-task.css",text=(`css` + "\n" + `precision`)))*.
