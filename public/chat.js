/* 求道对话 — 会话列表 + 流式输出 */
(function () {
  var STORE_KEY = "qdagent.sessions.v1";

  function uid() {
    return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { currentId: null, sessions: [] };
      var data = JSON.parse(raw);
      if (!data.sessions) data.sessions = [];
      return data;
    } catch (e) {
      return { currentId: null, sessions: [] };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function titleFromMessages(messages) {
    var first = (messages || []).find(function (m) {
      return m.role === "user" && m.content;
    });
    if (!first) return "新会话";
    var t = String(first.content).replace(/\s+/g, " ").trim();
    return t.length > 28 ? t.slice(0, 28) + "…" : t;
  }

  function boot() {
    var log = document.getElementById("qd-log");
    var input = document.getElementById("qd-input");
    var send = document.getElementById("qd-send");
    var stopBtn = document.getElementById("qd-stop");
    var status = document.getElementById("qd-status");
    var mic = document.getElementById("qd-mic");
    var speak = document.getElementById("qd-speak");
    var saveBtn = document.getElementById("qd-save");
    var sessionList = document.getElementById("qd-session-list");
    var newBtn = document.getElementById("qd-new-session");
    var titleEl = document.getElementById("qd-session-title");
    if (!log || !input || !send || !window.QdApi) return;

    var store = loadStore();
    var cfg = null;
    var busy = false;
    var abortCtrl = null;
    var lastAssistant = "";

    function setStatus(t) {
      if (status) status.textContent = t;
    }

    function current() {
      return store.sessions.find(function (s) {
        return s.id === store.currentId;
      });
    }

    function ensureSession() {
      if (current()) return current();
      var s = {
        id: uid(),
        title: "新会话",
        updatedAt: Date.now(),
        messages: [],
      };
      store.sessions.unshift(s);
      store.currentId = s.id;
      saveStore(store);
      return s;
    }

    function persist() {
      var s = current();
      if (s) {
        s.updatedAt = Date.now();
        if (s.messages && s.messages.length) s.title = titleFromMessages(s.messages);
      }
      saveStore(store);
      renderSessions();
      if (titleEl && s) titleEl.textContent = s.title;
    }

    function renderSessions() {
      if (!sessionList) return;
      sessionList.innerHTML = "";
      var sorted = store.sessions.slice().sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      sorted.forEach(function (s) {
        var li = document.createElement("li");
        li.className = "qd-session-item" + (s.id === store.currentId ? " active" : "");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "qd-session-open";
        btn.textContent = s.title || "新会话";
        btn.title = s.title || "新会话";
        btn.addEventListener("click", function () {
          if (busy) return;
          store.currentId = s.id;
          saveStore(store);
          renderSessions();
          renderMessages();
        });
        var del = document.createElement("button");
        del.type = "button";
        del.className = "qd-session-del";
        del.textContent = "×";
        del.title = "删除会话";
        del.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (busy) return;
          if (!confirm("删除该会话？")) return;
          store.sessions = store.sessions.filter(function (x) {
            return x.id !== s.id;
          });
          if (store.currentId === s.id) {
            store.currentId = store.sessions[0] ? store.sessions[0].id : null;
          }
          saveStore(store);
          if (!store.currentId) ensureSession();
          renderSessions();
          renderMessages();
        });
        li.appendChild(btn);
        li.appendChild(del);
        sessionList.appendChild(li);
      });
    }

    function bubble(role, text) {
      var el = document.createElement("div");
      el.className = "qd-msg qd-" + role;
      el.textContent = text || "";
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    function renderMessages() {
      var s = ensureSession();
      log.innerHTML = "";
      lastAssistant = "";
      if (!s.messages.length) {
        bubble(
          "system",
          "新会话已创建。每轮回复结束后会自动沉淀为 .mq.md 笔记。"
        );
      } else {
        s.messages.forEach(function (m) {
          if (m.role === "system") return;
          bubble(m.role, m.content);
          if (m.role === "assistant") lastAssistant = m.content;
        });
      }
      if (titleEl) titleEl.textContent = s.title || "新会话";
      setStatus("会话 · " + (s.title || "新会话"));
    }

    async function ensureCfg() {
      cfg = await QdApi.loadSettings();
      if (!cfg || !(cfg.llm_api_key || "").trim()) {
        setStatus("请先在「设置 → 大模型」填写 API Key");
        return false;
      }
      return true;
    }

    function setBusy(on) {
      busy = on;
      send.disabled = on;
      if (stopBtn) stopBtn.hidden = !on;
      if (newBtn) newBtn.disabled = on;
    }

    async function autoPrecipitate(s, userText, assistantText) {
      try {
        var title =
          (s && s.title) || titleFromMessages((s && s.messages) || []) || "对话沉淀";
        var slug =
          "chat-" +
          new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) +
          "-" +
          String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        var body =
          "---\ntitle: " +
          title.replace(/\n/g, " ") +
          "\ndescription: qdagent run " +
          slug +
          "\nsurface: web\n---\n\n# 任务\n\n" +
          (userText || "对话回合") +
          "\n\n# 结果\n\n## user\n\n" +
          (userText || "") +
          "\n\n## assistant\n\n" +
          (assistantText || "") +
          "\n";
        var out = await QdApi.precipitateNote({
          slug: slug,
          title: title,
          summary: (assistantText || userText || "").slice(0, 200),
          body: body,
          task: userText || "对话回合",
          session_id: s && s.id,
          surface: "web",
        });
        if (s) {
          s.lastRunSlug = out.slug || slug;
          persist();
        }
        setStatus("已自动沉淀 · " + (out.slug || slug) + (out.via ? " (" + out.via + ")" : ""));
        return out;
      } catch (e) {
        setStatus("沉淀失败：" + e.message);
        return null;
      }
    }

    function buildApiMessages(s) {
      return (s.messages || [])
        .filter(function (m) {
          return m.role === "user" || m.role === "assistant";
        })
        .map(function (m) {
          return { role: m.role, content: m.content };
        });
    }

    async function onSend() {
      if (busy) return;
      var text = input.value.trim();
      if (!text) return;
      var s = ensureSession();
      setBusy(true);
      abortCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      try {
        if (!(await ensureCfg())) return;
        input.value = "";
        bubble("user", text);
        s.messages.push({ role: "user", content: text });
        persist();

        var pending = bubble("assistant", "");
        pending.classList.add("qd-streaming");
        var apiMessages = buildApiMessages(s);

        var base = QdApi.normalizeBase(cfg.llm_base_url);
        setStatus("生成中…");
        var full = await QdApi.relayStream(
          {
            base_url: base,
            path: "/chat/completions",
            method: "POST",
            headers: { Authorization: "Bearer " + cfg.llm_api_key },
            body: {
              model: cfg.llm_model || "gpt-4o-mini",
              messages: apiMessages,
              stream: true,
            },
          },
          function (delta, all) {
            pending.textContent = all;
            log.scrollTop = log.scrollHeight;
          },
          abortCtrl ? abortCtrl.signal : undefined
        );

        pending.classList.remove("qd-streaming");
        if (!full) {
          pending.textContent = "（模型未返回内容）";
          setStatus("空回复");
          return;
        }
        pending.textContent = full;
        lastAssistant = full;
        s.messages.push({ role: "assistant", content: full });
        persist();
        await autoPrecipitate(s, text, full);
      } catch (e) {
        if (e && e.name === "AbortError") {
          setStatus("已停止");
          var cur = log.querySelector(".qd-streaming");
          if (cur) {
            cur.classList.remove("qd-streaming");
            var partial = cur.textContent || "";
            if (partial) {
              lastAssistant = partial;
              s.messages.push({ role: "assistant", content: partial });
              persist();
              await autoPrecipitate(s, text, partial);
            } else {
              cur.textContent = "（已停止）";
            }
          }
        } else {
          setStatus("失败");
          bubble("system", "发送失败：" + (e && e.message ? e.message : e));
        }
      } finally {
        abortCtrl = null;
        setBusy(false);
        input.focus();
      }
    }

    send.addEventListener("click", onSend);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    });

    if (stopBtn) {
      stopBtn.addEventListener("click", function () {
        if (abortCtrl) abortCtrl.abort();
      });
    }

    if (newBtn) {
      newBtn.addEventListener("click", function () {
        if (busy) return;
        var s = {
          id: uid(),
          title: "新会话",
          updatedAt: Date.now(),
          messages: [],
        };
        store.sessions.unshift(s);
        store.currentId = s.id;
        saveStore(store);
        renderSessions();
        renderMessages();
        input.focus();
      });
    }

    if (mic) {
      mic.addEventListener("click", async function () {
        try {
          cfg = await QdApi.loadSettings();
          if (!(cfg.asr_api_key || "").trim()) {
            setStatus("请先在「设置 → 语音」配置 ASR");
            bubble("system", "语音识别未配置。请打开「语音设置」。");
            return;
          }
          setStatus("ASR：请选择音频文件（演示提示）");
          bubble(
            "system",
            "ASR 已配置（" +
              (cfg.asr_model || "whisper-1") +
              "）。请将识别文本贴入输入框发送。"
          );
        } catch (e) {
          setStatus(e.message);
        }
      });
    }

    if (speak) {
      speak.addEventListener("click", async function () {
        if (!lastAssistant) {
          setStatus("还没有可朗读的回复");
          return;
        }
        try {
          cfg = await QdApi.loadSettings();
          if (!(cfg.tts_api_key || "").trim()) {
            setStatus("请先在「设置 → 语音」配置 TTS");
            return;
          }
          setStatus("TTS 生成中…");
          var base = QdApi.normalizeBase(cfg.tts_base_url || cfg.llm_base_url);
          var out = await QdApi.relay({
            base_url: base,
            path: "/audio/speech",
            method: "POST",
            headers: { Authorization: "Bearer " + cfg.tts_api_key },
            body: {
              model: cfg.tts_model || "tts-1",
              input: lastAssistant.slice(0, 4000),
              voice: "alloy",
            },
          });
          if (!out.ok) throw new Error("TTS HTTP " + out.status);
          if (out.data_base64) {
            var bin = atob(out.data_base64);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            var blob = new Blob([bytes], { type: out.content_type || "audio/mpeg" });
            new Audio(URL.createObjectURL(blob)).play();
            setStatus("播放中");
          } else {
            throw new Error("未返回音频数据");
          }
        } catch (e) {
          setStatus("TTS 失败：" + e.message);
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async function () {
        var s = ensureSession();
        var msgs = s.messages || [];
        if (!msgs.length) {
          setStatus("还没有对话可沉淀");
          return;
        }
        var lastUser = "";
        var lastAsst = "";
        for (var i = msgs.length - 1; i >= 0; i--) {
          if (!lastAsst && msgs[i].role === "assistant") lastAsst = msgs[i].content;
          if (!lastUser && msgs[i].role === "user") lastUser = msgs[i].content;
          if (lastUser && lastAsst) break;
        }
        if (!(await ensureCfg())) return;
        setStatus("手动沉淀中…");
        await autoPrecipitate(s, lastUser, lastAsst || lastAssistant);
      });
    }

    ensureSession();
    renderSessions();
    renderMessages();
    ensureCfg().catch(function (e) {
      setStatus("加载设置失败：" + e.message);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
