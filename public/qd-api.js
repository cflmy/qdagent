/* shared helpers — Marqdo 0.3.7 same-origin proxy + invoke (no :7432) */
(function (w) {
  function apiRoot() {
    return "";
  }

  function normalizeBase(url) {
    var u = (url || "").trim().replace(/\/+$/, "");
    return u || "https://api.openai.com/v1";
  }

  /** Same-origin LLM reverse proxy mount (/llm → settings llm_base_url). */
  function llmPath(path) {
    if (!path) path = "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    return "/llm" + path;
  }

  function asrPath(path) {
    if (!path) path = "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    return "/asr" + path;
  }

  async function relay(opts) {
    var path = opts.path || "/";
    var method = (opts.method || "POST").toUpperCase();
    var mount = opts.mount === "asr" ? asrPath : llmPath;
    var url = mount(path);
    var headers = Object.assign({ Accept: "application/json" }, opts.headers || {});
    var init = { method: method, headers: headers, credentials: "same-origin" };
    if (opts.body != null && method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = opts.content_type || "application/json";
      init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    }
    var res = await fetch(url, init);
    var ctype = res.headers.get("Content-Type") || "";
    var data;
    if (ctype.indexOf("application/json") >= 0) {
      data = await res.json().catch(function () {
        return null;
      });
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, url: url, data: data };
  }

  /**
   * Stream chat completions via same-origin /llm/chat/completions (app.proxy SSE).
   */
  async function relayStream(opts, onDelta, signal) {
    var body = Object.assign({}, opts.body || {}, { stream: true });
    var headers = Object.assign(
      { "Content-Type": "application/json", Accept: "text/event-stream" },
      opts.headers || {}
    );
    var res = await fetch(llmPath("/chat/completions"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      credentials: "same-origin",
      signal: signal,
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error("流式 LLM HTTP " + res.status + "：" + errText.slice(0, 240));
    }
    if (!res.body || !res.body.getReader) {
      throw new Error("浏览器不支持 ReadableStream");
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    var full = "";
    var sawDone = false;

    function handleData(payload) {
      var line = payload.trim();
      if (!line) return;
      if (line === "[DONE]") {
        sawDone = true;
        return;
      }
      var obj;
      try {
        obj = JSON.parse(line);
      } catch (e) {
        return;
      }
      if (obj.error) {
        var em =
          (obj.error && obj.error.message) ||
          (typeof obj.error === "string" ? obj.error : JSON.stringify(obj.error));
        throw new Error(em);
      }
      var delta =
        (obj.choices &&
          obj.choices[0] &&
          obj.choices[0].delta &&
          obj.choices[0].delta.content) ||
        "";
      if (delta) {
        full += delta;
        if (onDelta) onDelta(delta);
      }
    }

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var parts = buffer.split("\n");
      buffer = parts.pop();
      for (var i = 0; i < parts.length; i++) {
        var rawLine = parts[i].replace(/\r$/, "");
        if (!rawLine) continue;
        if (rawLine.indexOf("data:") === 0) {
          handleData(rawLine.slice(5).trim());
        }
      }
      if (sawDone) break;
    }
    if (buffer.trim()) {
      var rest = buffer.trim();
      if (rest.indexOf("data:") === 0) handleData(rest.slice(5).trim());
    }
    return full;
  }

  async function loadSettings() {
    var res = await fetch("/api/settings", { credentials: "same-origin" });
    if (!res.ok) throw new Error("settings HTTP " + res.status);
    var data = await res.json();
    var rows = Array.isArray(data) ? data : data.rows || [];
    if (rows[0]) return rows[0];
    if (data && data.llm_model) return data;
    return {};
  }

  async function testLlm(cfg) {
    var key = (cfg.llm_api_key || "").trim();
    if (!key) throw new Error("请填写大模型 API Key");
    var out = await relay({
      path: "/chat/completions",
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: {
        model: cfg.llm_model || "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      },
    });
    if (!out.ok) {
      var msg =
        typeof out.data === "string"
          ? out.data
          : (out.data && (out.data.error && (out.data.error.message || out.data.error))) ||
            out.error ||
            JSON.stringify(out.data || out).slice(0, 240);
      throw new Error("大模型测试失败 HTTP " + out.status + "：" + msg);
    }
    return out;
  }

  async function testVoice(cfg) {
    var key = (cfg.asr_api_key || cfg.tts_api_key || "").trim();
    if (!key) throw new Error("请至少填写 ASR 或 TTS 的 API Key");
    var out = await relay({
      mount: "asr",
      path: "/models",
      method: "GET",
      headers: { Authorization: "Bearer " + key },
      body: null,
    });
    if (!out.ok) {
      var msg =
        typeof out.data === "string"
          ? out.data
          : (out.data && (out.data.error && (out.data.error.message || out.data.error))) ||
            out.error ||
            JSON.stringify(out.data || out).slice(0, 240);
      throw new Error("语音接口测试失败 HTTP " + out.status + "：" + msg);
    }
    return out;
  }

  async function storeRun(payload) {
    var res = await fetch("/api/store/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    var json = await res.json().catch(function () {
      return { ok: false, error: "store non-JSON" };
    });
    if (!res.ok || !json.ok) throw new Error(json.error || "自动沉淀失败");
    return json;
  }

  async function storeSync() {
    var res = await fetch("/api/store/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}",
    });
    return res.json();
  }

  async function precipitateNote(fields) {
    var result =
      fields.result ||
      fields.body ||
      "";
    return storeRun({
      title: fields.title,
      task: fields.task || fields.summary || "",
      result: result,
      summary: fields.summary || "",
      slug: fields.slug || "",
      session_id: fields.session_id || "",
      surface: fields.surface || "web",
    });
  }

  async function storePost(path, payload) {
    var res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    });
    var json = await res.json().catch(function () {
      return { ok: false, error: "store non-JSON" };
    });
    if (!res.ok || json.ok === false) throw new Error(json.error || path + " failed");
    return json;
  }

  async function storeContext(payload) {
    return storePost("/api/store/context", payload || {});
  }

  async function storeProfile() {
    return storePost("/api/store/profile", {});
  }

  async function storeProfileUpdate(payload) {
    return storePost("/api/store/profile/update", payload || {});
  }

  async function storeOrganize(payload) {
    return storePost("/api/store/organize", payload || {});
  }

  /** Build system message from profile + corpus hits (evidence only). */
  function contextSystemMessage(ctx) {
    var profile = (ctx && ctx.profile) || "";
    if (profile.length > 2400) profile = profile.slice(0, 2400) + "\n…";
    var hits = (ctx && ctx.hits) || [];
    var lines = [
      "你是求道助手。回答前已加载用户画像与笔记库证据；证据仅供参考，权威在 data/runs 与用户画像 .mq.md。",
      "",
      "## 用户画像",
      profile || "（空）",
      "",
      "## 笔记证据（evidence only）",
    ];
    if (!hits.length) {
      lines.push("（无命中）");
    } else {
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i] || {};
        lines.push(
          (i + 1) +
            ". " +
            (h.path || h.slug || "?") +
            " score=" +
            (h.score != null ? h.score : "") +
            "\n" +
            String(h.excerpt || "").slice(0, 400)
        );
      }
    }
    return lines.join("\n");
  }

  w.QdApi = {
    proxyBase: function () {
      return apiRoot() || location.origin;
    },
    normalizeBase: normalizeBase,
    relay: relay,
    relayStream: relayStream,
    loadSettings: loadSettings,
    testLlm: testLlm,
    testVoice: testVoice,
    storeRun: storeRun,
    storeSync: storeSync,
    precipitateNote: precipitateNote,
    storeContext: storeContext,
    storeProfile: storeProfile,
    storeProfileUpdate: storeProfileUpdate,
    storeOrganize: storeOrganize,
    contextSystemMessage: contextSystemMessage,
  };
})(window);
