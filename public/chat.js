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
    var stopBar = document.getElementById("qd-stop-bar");
    var status = document.getElementById("qd-status");
    var runbar = document.getElementById("qd-runbar");
    var runbarLabel = document.getElementById("qd-runbar-label");
    var runStepsEl = document.getElementById("qd-run-steps");
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
    var runSteps = [];

    function setStatus(t) {
      if (status) status.textContent = t;
    }

    function requestStop() {
      if (!busy) return;
      if (abortCtrl) abortCtrl.abort();
      setRunLabel("正在停止…");
      setStatus("正在停止…");
    }

    function setRunLabel(t) {
      if (runbarLabel) runbarLabel.textContent = t || "进行中";
    }

    function resetRunSteps(defs) {
      runSteps = (defs || []).map(function (d) {
        return {
          id: d.id,
          label: d.label,
          state: d.state || "pending",
          detail: d.detail || "",
        };
      });
      renderRunSteps();
    }

    function setStep(id, state, detail) {
      for (var i = 0; i < runSteps.length; i++) {
        if (runSteps[i].id === id) {
          runSteps[i].state = state;
          if (detail != null) runSteps[i].detail = detail;
          break;
        }
      }
      renderRunSteps();
      // Also mirror into streaming bubble if present
      var pending = log.querySelector(".qd-streaming");
      if (pending) syncBubbleSteps(pending);
    }

    function renderRunSteps() {
      if (!runStepsEl) return;
      runStepsEl.innerHTML = "";
      runSteps.forEach(function (s) {
        var li = document.createElement("li");
        li.className = "qd-run-step qd-run-" + s.state;
        li.innerHTML =
          '<span class="qd-run-dot" aria-hidden="true"></span>' +
          "<span>" +
          escapeHtml(s.label) +
          (s.detail
            ? ' <span class="qd-muted">' + escapeHtml(s.detail) + "</span>"
            : "") +
          "</span>";
        runStepsEl.appendChild(li);
      });
    }

    function syncBubbleSteps(el) {
      if (!el) return;
      var wrap = el.querySelector(".qd-run-inline");
      if (!wrap) {
        wrap = document.createElement("ol");
        wrap.className = "qd-run-steps qd-run-inline";
        var answer = el.querySelector(".qd-answer");
        if (answer) el.insertBefore(wrap, answer);
        else el.appendChild(wrap);
      }
      wrap.innerHTML = "";
      runSteps.forEach(function (s) {
        if (s.state === "skipped") return;
        var li = document.createElement("li");
        li.className = "qd-run-step qd-run-" + s.state;
        li.textContent =
          s.label + (s.detail ? " · " + s.detail : "");
        wrap.appendChild(li);
      });
    }

    function setBusy(on) {
      busy = on;
      if (send) {
        send.hidden = !!on;
        send.disabled = !!on;
      }
      if (stopBtn) {
        stopBtn.hidden = !on;
        stopBtn.disabled = !on;
      }
      if (runbar) runbar.hidden = !on;
      if (stopBar) stopBar.disabled = !on;
      if (newBtn) newBtn.disabled = on;
      if (input) input.setAttribute("aria-busy", on ? "true" : "false");
      document.documentElement.classList.toggle("qd-agent-busy", !!on);
    }

    /** Scroll only the message pane (not the document), stick-to-bottom. */
    function logNearBottom() {
      return log.scrollHeight - log.scrollTop - log.clientHeight < 96;
    }
    function scrollLog(force) {
      if (force || logNearBottom()) log.scrollTop = log.scrollHeight;
    }

    function autoSizeInput() {
      if (!input) return;
      input.style.height = "auto";
      var h = Math.min(input.scrollHeight, 144);
      input.style.height = Math.max(h, 44) + "px";
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

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    /** Lightweight Markdown → safe HTML (bold/italic/code/fences/breaks). */
    function formatMsgHtml(text) {
      var raw = String(text || "");
      var fences = [];
      raw = raw.replace(/```([\w-]*)\n?([\s\S]*?)```/g, function (_, lang, code) {
        var i = fences.length;
        fences.push(
          '<pre class="qd-code"><code>' + escapeHtml(code.replace(/\n$/, "")) + "</code></pre>"
        );
        return "\u0000FENCE" + i + "\u0000";
      });
      var html = escapeHtml(raw);
      html = html.replace(/`([^`\n]+)`/g, '<code class="qd-inline">$1</code>');
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
      html = html.replace(/^### (.+)$/gm, "<strong>$1</strong>");
      html = html.replace(/^## (.+)$/gm, "<strong>$1</strong>");
      html = html.replace(/^# (.+)$/gm, "<strong>$1</strong>");
      html = html.replace(/\n/g, "<br>");
      html = html.replace(/\u0000FENCE(\d+)\u0000/g, function (_, i) {
        return fences[Number(i)] || "";
      });
      return html;
    }

    function setMsgContent(el, text, role) {
      var t = text || "";
      el.dataset.raw = t;
      var answerEl = el.querySelector(".qd-answer");
      if (answerEl) {
        if (role === "assistant" || el.classList.contains("qd-assistant")) {
          answerEl.innerHTML = formatMsgHtml(t);
        } else {
          answerEl.textContent = t;
        }
        return;
      }
      if (role === "assistant" || el.classList.contains("qd-assistant")) {
        el.innerHTML = formatMsgHtml(t);
      } else {
        el.textContent = t;
      }
    }

    /** Parse ```qd-change ... ``` blocks from assistant text. */
    function parseQdChanges(text) {
      var out = [];
      var re = /```qd-change\s*([\s\S]*?)```/gi;
      var m;
      while ((m = re.exec(text || ""))) {
        var raw = m[1].trim();
        var sep = raw.indexOf("\n---\n");
        var head = sep >= 0 ? raw.slice(0, sep) : raw;
        var body = sep >= 0 ? raw.slice(sep + 5) : "";
        if (!body.trim()) continue;
        var meta = { target: "kb/用户画像.mq.md", title: "变更提案", reason: "" };
        head.split("\n").forEach(function (line) {
          var kv = line.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/);
          if (!kv) return;
          var k = kv[1].toLowerCase();
          var v = kv[2].trim();
          if (k === "target" || k === "path") meta.target = v;
          else if (k === "title") meta.title = v;
          else if (k === "reason" || k === "summary") meta.reason = v;
        });
        out.push({
          target: meta.target,
          title: meta.title,
          reason: meta.reason,
          body: body.replace(/^\n+/, ""),
          rawBlock: m[0],
        });
      }
      return out;
    }

    function stripQdChangeBlocks(text) {
      return String(text || "")
        .replace(/```qd-change\s*[\s\S]*?```/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    function attachChangeCard(hostEl, change, extras) {
      if (!hostEl || !change || !change.id) return;
      var existing = hostEl.querySelector('.qd-change-card[data-id="' + change.id + '"]');
      if (existing) return existing;
      var card = document.createElement("div");
      card.className = "qd-change-card";
      card.dataset.id = change.id;
      var preview = (extras && extras.patch_preview) || "";
      card.innerHTML =
        '<div class="qd-change-card-head"><strong>变更提案</strong> <code>' +
        escapeHtml(change.id) +
        "</code></div>" +
        '<div class="qd-change-card-meta">' +
        escapeHtml(change.title || "") +
        " · <code>" +
        escapeHtml(change.target || "") +
        "</code>" +
        (change.reason
          ? "<br/><span class=\"qd-muted\">" + escapeHtml(change.reason) + "</span>"
          : "") +
        "</div>" +
        (preview
          ? '<pre class="qd-change-card-diff">' + escapeHtml(preview.slice(0, 2500)) + "</pre>"
          : "") +
        '<div class="qd-change-card-actions">' +
        '<button type="button" class="primary qd-change-apply">同意应用</button> ' +
        '<button type="button" class="qd-change-reject">拒绝</button> ' +
        '<span class="qd-change-card-status qd-muted">待你确认后写入磁盘</span>' +
        "</div>";
      hostEl.appendChild(card);
      var statusEl = card.querySelector(".qd-change-card-status");
      var applyBtn = card.querySelector(".qd-change-apply");
      var rejectBtn = card.querySelector(".qd-change-reject");
      applyBtn.addEventListener("click", async function () {
        applyBtn.disabled = true;
        rejectBtn.disabled = true;
        statusEl.textContent = "应用中…";
        try {
          var j = await QdApi.storeChangeApply({ id: change.id });
          statusEl.textContent =
            "已写入磁盘 · " + (j.head ? j.head.slice(0, 8) : "ok");
          card.classList.add("qd-change-applied");
          setStatus("已应用变更 " + change.id);
        } catch (e) {
          applyBtn.disabled = false;
          rejectBtn.disabled = false;
          statusEl.textContent = "失败：" + (e.message || e);
        }
      });
      rejectBtn.addEventListener("click", async function () {
        applyBtn.disabled = true;
        rejectBtn.disabled = true;
        statusEl.textContent = "拒绝中…";
        try {
          await QdApi.storeChangeReject({ id: change.id });
          statusEl.textContent = "已拒绝";
          card.classList.add("qd-change-rejected");
          setStatus("已拒绝变更 " + change.id);
        } catch (e) {
          applyBtn.disabled = false;
          rejectBtn.disabled = false;
          statusEl.textContent = "失败：" + (e.message || e);
        }
      });
      scrollLog(true);
      return card;
    }

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    async function submitParsedChanges(hostEl, fullText) {
      var blocks = parseQdChanges(fullText);
      if (!blocks.length) return 0;
      var visible = stripQdChangeBlocks(fullText);
      if (visible) setMsgContent(hostEl, visible, "assistant");
      else setMsgContent(hostEl, "已生成变更提案，请点击下方「同意应用」。", "assistant");
      var n = 0;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        try {
          var j = await QdApi.storeChangePropose({
            target: b.target,
            title: b.title,
            reason: b.reason || "对话中提出的变更",
            body: b.body,
            source: "chat",
          });
          var ch = (j && j.change) || j;
          if (ch && ch.id) {
            attachChangeCard(hostEl, ch, { patch_preview: j.patch_preview || "" });
            n++;
          }
        } catch (e) {
          bubble("system", "提交变更提案失败：" + (e.message || e));
        }
      }
      return n;
    }

    function ensureStreamLayout(el) {
      if (el.querySelector(".qd-answer")) return el;
      el.innerHTML = "";
      var think = document.createElement("details");
      think.className = "qd-think";
      think.open = true;
      var sum = document.createElement("summary");
      sum.textContent = "思考中…";
      var body = document.createElement("div");
      body.className = "qd-think-body";
      think.appendChild(sum);
      think.appendChild(body);
      think.hidden = true;
      var steps = document.createElement("ol");
      steps.className = "qd-run-steps qd-run-inline";
      var answer = document.createElement("div");
      answer.className = "qd-answer";
      el.appendChild(think);
      el.appendChild(steps);
      el.appendChild(answer);
      return el;
    }

    function updateStreamBubble(el, meta) {
      ensureStreamLayout(el);
      var think = el.querySelector(".qd-think");
      var body = el.querySelector(".qd-think-body");
      var sum = think && think.querySelector("summary");
      var answer = el.querySelector(".qd-answer");
      var reasoning = (meta && meta.reasoning) || "";
      var text = (meta && meta.answer) || "";
      el.dataset.raw = text;
      if (reasoning) {
        think.hidden = false;
        body.textContent = reasoning;
        if (sum) {
          sum.textContent =
            meta.phase === "content" || text ? "思考过程" : "思考中…";
        }
        if (meta.phase === "content" && text) think.open = false;
      }
      answer.innerHTML = formatMsgHtml(text);
    }

    function bubble(role, text) {
      var el = document.createElement("div");
      el.className = "qd-msg qd-" + role;
      setMsgContent(el, text || "", role);
      log.appendChild(el);
      scrollLog(true);
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

    async function autoPrecipitate(s, userText, assistantText) {
      try {
        var title =
          (s && s.title) || titleFromMessages((s && s.messages) || []) || "对话沉淀";
        var slug =
          "chat-" +
          new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) +
          "-" +
          String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        var summary =
          ((userText || "").trim().slice(0, 40) || "对话") +
          " → " +
          ((assistantText || "").trim().slice(0, 80) || "（空回复）");
        var resultText =
          "## user\n\n" +
          (userText || "") +
          "\n\n## assistant\n\n" +
          (assistantText || "") +
          "\n";
        var out = await QdApi.precipitateNote({
          slug: slug,
          title: title,
          summary: summary,
          task: userText || "对话回合",
          result: resultText,
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

    function abortSignal() {
      return abortCtrl ? abortCtrl.signal : undefined;
    }

    function throwIfAborted() {
      if (abortCtrl && abortCtrl.signal.aborted) {
        var err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
    }

    function markRunStopped() {
      runSteps.forEach(function (s) {
        if (s.state === "active") s.state = "stopped";
        else if (s.state === "pending") s.state = "skipped";
      });
      renderRunSteps();
      var cur = log.querySelector(".qd-streaming");
      if (cur) syncBubbleSteps(cur);
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
        autoSizeInput();
        bubble("user", text);
        s.messages.push({ role: "user", content: text });
        persist();

        resetRunSteps([
          { id: "ctx", label: "检索笔记与画像" },
          { id: "web", label: "联网搜索" },
          { id: "gen", label: "生成回复" },
          { id: "save", label: "自动沉淀" },
          { id: "change", label: "变更提案" },
        ]);
        setRunLabel("进行中");

        var pending = bubble("assistant", "");
        pending.classList.add("qd-streaming");
        ensureStreamLayout(pending);
        syncBubbleSteps(pending);
        var apiMessages = buildApiMessages(s);
        var sig = { signal: abortSignal() };

        setStep("ctx", "active");
        setRunLabel("检索笔记与画像");
        setStatus("检索笔记…");
        var ctx = null;
        var web = null;
        var hitCount = 0;
        var webCount = 0;
        var wantWeb = true;
        try {
          ctx = await QdApi.storeContext({ query: text, top_k: 5 }, sig);
          hitCount = (ctx.hits && ctx.hits.length) || 0;
          setStep("ctx", "done", hitCount ? hitCount + " 条" : "无命中");
        } catch (ce) {
          if (ce && ce.name === "AbortError") throw ce;
          setStep("ctx", "done", "跳过");
          setStatus("检索跳过：" + (ce && ce.message ? ce.message : ce));
        }

        throwIfAborted();
        if (wantWeb) {
          setStep("web", "active");
          setRunLabel("联网搜索");
          setStatus("联网搜索…");
          var searchQ = text;
          if (
            /^(现在)?(可以|能)?(联网|检索网络|上网|搜索)(了|了吗|吗|么)?[？?！!\.。]*$/i.test(
              text.trim()
            ) ||
            /你现在可以检索网络/.test(text)
          ) {
            searchQ = "求道 Marqdo 智能体 联网检索";
          }
          try {
            web = await QdApi.storeWebSearch({ query: searchQ, limit: 5 }, sig);
            webCount = (web.hits && web.hits.length) || 0;
            if (web && web.ok === false && !webCount) {
              setStep("web", "done", web.error || "无结果");
              setStatus("联网无结果：" + (web.error || web.provider || ""));
            } else {
              setStep("web", "done", webCount ? webCount + " 条" : "无命中");
            }
          } catch (we) {
            if (we && we.name === "AbortError") throw we;
            web = { ok: false, hits: [], error: String(we && we.message ? we.message : we) };
            setStep("web", "done", "跳过");
            setStatus("联网跳过：" + web.error);
          }
        } else {
          setStep("web", "skipped");
        }

        apiMessages = [
          {
            role: "system",
            content: QdApi.contextSystemMessage(ctx, web, { wantWeb: wantWeb }),
          },
        ].concat(apiMessages);

        throwIfAborted();
        var base = QdApi.normalizeBase(cfg.llm_base_url);
        setStep("gen", "active");
        setRunLabel("生成回复");
        setStatus(
          (hitCount ? "笔记 " + hitCount : "无笔记") +
            (webCount ? " · 联网 " + webCount : wantWeb ? " · 联网无结果" : "") +
            " · 生成中…"
        );
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
          function (delta, all, meta) {
            updateStreamBubble(pending, meta || { answer: all || "", reasoning: "" });
            scrollLog(false);
          },
          abortSignal()
        );

        pending.classList.remove("qd-streaming");
        setStep("gen", "done");
        if (!full) {
          var fallback =
            "（模型未返回正文。若上方「思考过程」里出现 tool JSON，请再发一轮；联网已" +
            (wantWeb ? (webCount ? "命中 " + webCount + " 条" : "开启但无命中") : "关闭") +
            "。）";
          setMsgContent(pending, fallback, "assistant");
          setStep("save", "skipped");
          setStep("change", "skipped");
          setStatus("空回复");
          return;
        }
        setMsgContent(pending, full, "assistant");
        var thinkDone = pending.querySelector(".qd-think");
        if (thinkDone && thinkDone.querySelector(".qd-think-body") &&
            thinkDone.querySelector(".qd-think-body").textContent) {
          thinkDone.open = false;
          var sumDone = thinkDone.querySelector("summary");
          if (sumDone) sumDone.textContent = "思考过程";
        }
        lastAssistant = full;
        s.messages.push({ role: "assistant", content: full });
        persist();

        throwIfAborted();
        setStep("save", "active");
        setRunLabel("自动沉淀");
        await autoPrecipitate(s, text, full);
        var precipOk = !!(s && s.lastRunSlug);
        setStep("save", "done", precipOk ? s.lastRunSlug : "未确认");

        var statusLine =
          (precipOk ? "已自动沉淀 · " + s.lastRunSlug : "沉淀未确认") +
          (hitCount ? " · 引用 " + hitCount + " 条" : "") +
          (webCount ? " · 联网 " + webCount : "");

        throwIfAborted();
        setStep("change", "active");
        setRunLabel("变更提案");
        var proposed = await submitParsedChanges(pending, full);
        if (proposed) {
          setStep("change", "done", proposed + " 条待审");
          statusLine += " · " + proposed + " 条变更待你点「同意应用」";
        } else if (/记住|喜欢|偏好|不喜欢|整理|清理/.test(text || "")) {
          try {
            var prop = await QdApi.storeProfileUpdate({
              task: text.slice(0, 200),
              result: String(full).slice(0, 400),
            });
            var ch = (prop && prop.change) || null;
            if (ch && ch.id) {
              attachChangeCard(pending, ch, { patch_preview: prop.patch_preview || "" });
              setStep("change", "done", "待审");
              statusLine += " · 变更待你点「同意应用」";
            } else {
              setStep("change", "skipped");
            }
          } catch (pe) {
            setStep("change", "done", "失败");
            statusLine += " · 提案失败：" + (pe && pe.message ? pe.message : pe);
          }
        } else {
          setStep("change", "skipped");
        }
        setRunLabel("完成");
        setStatus(statusLine);
      } catch (e) {
        if (e && e.name === "AbortError") {
          markRunStopped();
          setRunLabel("已停止");
          setStatus("已停止");
          var cur = log.querySelector(".qd-streaming");
          if (cur) {
            cur.classList.remove("qd-streaming");
            cur.classList.add("qd-stopped");
            var partial = cur.dataset.raw || "";
            if (partial) {
              lastAssistant = partial;
              s.messages.push({ role: "assistant", content: partial });
              persist();
              await autoPrecipitate(s, text, partial);
            } else {
              setMsgContent(cur, "（已停止）", "assistant");
            }
            syncBubbleSteps(cur);
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
      if (e.key === "Escape" && busy) {
        e.preventDefault();
        requestStop();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    });

    if (stopBtn) stopBtn.addEventListener("click", requestStop);
    if (stopBar) stopBar.addEventListener("click", requestStop);

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

    var micBusy = false;
    var chatDictation = null;
    var chatVu = null;
    var onChatVu = null;
    var settingsRow = {};
    var chatLangSel = null;

    function ensureChatVu() {
      if (chatVu) return;
      var toolbar = document.querySelector(".qd-toolbar");
      if (!toolbar || !mic) return;
      chatVu = document.createElement("div");
      chatVu.id = "qd-chat-vu";
      chatVu.className = "qd-vu qd-vu-inline";
      chatVu.hidden = true;
      chatVu.innerHTML =
        '<div class="qd-vu-track"><div class="qd-vu-fill"></div></div>' +
        '<span class="qd-vu-label">音量</span>';
      toolbar.insertBefore(chatVu, mic.nextSibling);
      onChatVu = QdVoice.attachVuUi(chatVu);
    }

    function ensureChatLang() {
      if (chatLangSel || !mic) return;
      var toolbar = document.querySelector(".qd-toolbar");
      if (!toolbar) return;
      var wrap = document.createElement("label");
      wrap.className = "qd-dictation-lang-wrap qd-dictation-lang-wrap-inline";
      wrap.innerHTML =
        '听写 <select id="qd-chat-lang" class="qd-dictation-lang" title="听写语言"></select>';
      toolbar.insertBefore(wrap, mic);
      chatLangSel = wrap.querySelector("select");
      chatLangSel.addEventListener("change", function () {
        QdApi.setStoredDictationLang(chatLangSel.value);
        if (chatDictation && chatDictation.isListening()) {
          chatDictation.stop();
          setMicUi(false);
          setStatus("已切换语言，请重新点语音");
        }
      });
    }

    function setMicUi(recording) {
      if (!mic) return;
      mic.classList.toggle("qd-recording", !!recording);
      mic.textContent = recording ? "停止" : "语音";
      mic.setAttribute("aria-pressed", recording ? "true" : "false");
      if (chatVu) chatVu.hidden = !recording;
      if (!recording && onChatVu) onChatVu(0, { silent: true, speaking: false });
    }

    QdApi.loadSettings()
      .then(function (row) {
        settingsRow = row || {};
        ensureChatLang();
        QdApi.fillDictationLangSelect(
          chatLangSel,
          QdApi.getStoredDictationLang() || settingsRow.dictation_lang || "zh-CN"
        );
      })
      .catch(function () {
        ensureChatLang();
        QdApi.fillDictationLangSelect(chatLangSel, "zh-CN");
      });

    if (mic) {
      mic.addEventListener("click", async function () {
        if (micBusy) return;
        try {
          if (!window.QdVoice) {
            setStatus("语音脚本未加载，请强刷（Ctrl+F5）并确认服务已重启");
            return;
          }
          var diag = QdVoice.diagnose();

          if (chatDictation && chatDictation.isListening()) {
            chatDictation.stop();
            setMicUi(false);
            setStatus("听写结束");
            return;
          }

          if (!diag.realtimeOk) {
            setStatus(diag.reason || "当前环境无法实时听写");
            bubble(
              "system",
              "实时听写需要 Chrome/Edge，且页面为 HTTPS 或 localhost。" +
                "听写语言可在工具栏或「设置 → 语音」切换（中文 / 英文）。"
            );
            return;
          }

          ensureChatVu();
          ensureChatLang();
          var baseText = input.value || "";
          var lang = QdApi.resolveDictationLang(settingsRow);
          chatDictation = QdVoice.createDictation({
            lang: lang,
            onPartial: function (p) {
              var live = (p.finalText || "") + (p.interimText || "");
              input.value = baseText
                ? baseText.replace(/\s+$/, "") + (live ? " " + live : "")
                : live;
              setStatus("听写中（" + lang + "）");
            },
            onLevel: function (level, meta) {
              if (onChatVu) onChatVu(level, meta);
            },
            onError: function (err) {
              setMicUi(false);
              setStatus(err.message || String(err));
            },
            onEnd: function () {
              if (chatDictation && !chatDictation.isListening()) {
                setMicUi(false);
                setStatus("听写结束");
              }
            },
          });
          setMicUi(true);
          setStatus("实时听写（" + lang + "）…看音量条");
          await chatDictation.start();
        } catch (e) {
          setMicUi(false);
          micBusy = false;
          if (chatDictation && chatDictation.isListening()) chatDictation.abort();
          setStatus(e.message || String(e));
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
          var spoken = await QdApi.synthesizeSpeech({
            api_key: cfg.tts_api_key,
            model: cfg.tts_model || "tts-1",
            input: lastAssistant.slice(0, 4000),
            voice: "alloy",
          });
          var blob = new Blob([spoken.buffer], {
            type: spoken.content_type || "audio/mpeg",
          });
          new Audio(URL.createObjectURL(blob)).play();
          setStatus("播放中");
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
    autoSizeInput();
    if (input) {
      input.addEventListener("input", autoSizeInput);
    }
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
