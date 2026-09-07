/* shared helpers for chat + settings */
(function (w) {
  function proxyBase() {
    var fromEnv = w.QDAGENT_PROXY;
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    var host = location.hostname || "127.0.0.1";
    var proto = location.protocol === "https:" ? "https:" : "http:";
    var port = w.QDAGENT_PROXY_PORT || "7432";
    return proto + "//" + host + ":" + port;
  }

  function normalizeBase(url) {
    var u = (url || "").trim().replace(/\/+$/, "");
    return u || "https://api.openai.com/v1";
  }

  async function relay(opts) {
    var res = await fetch(proxyBase() + "/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    var json = await res.json().catch(function () {
      return { ok: false, error: "proxy returned non-JSON (" + res.status + ")" };
    });
    if (!res.ok && !json.status) {
      throw new Error(json.error || "代理不可用：请先启动 scripts/llm_proxy.py（端口 7432）");
    }
    return json;
  }

  /**
   * Stream chat completions via /proxy/stream.
   * onDelta(textChunk) for each token; returns full assistant text.
   */
  async function relayStream(opts, onDelta, signal) {
    var body = Object.assign({}, opts.body || {}, { stream: true });
    var res = await fetch(proxyBase() + "/proxy/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({}, opts, { body: body })),
      signal: signal,
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error("流式代理 HTTP " + res.status + "：" + errText.slice(0, 240));
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
        (obj.choices &&
          obj.choices[0] &&
          obj.choices[0].message &&
          obj.choices[0].message.content) ||
        obj.content ||
        "";
      if (delta) {
        full += delta;
        if (onDelta) onDelta(delta, full);
      }
    }

    while (true) {
      var step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });
      var parts = buffer.split("\n");
      buffer = parts.pop() || "";
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
    var base = normalizeBase(cfg.llm_base_url);
    var out = await relay({
      base_url: base,
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
    var base = normalizeBase(cfg.asr_base_url || cfg.tts_base_url || cfg.llm_base_url);
    var out = await relay({
      base_url: base,
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
    /* Triggers marqdo run 求道-捕捉 via proxy (GAP-02). */
    var res = await fetch(proxyBase() + "/store/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var json = await res.json().catch(function () {
      return { ok: false, error: "store non-JSON" };
    });
    if (!res.ok || !json.ok) throw new Error(json.error || "自动沉淀失败");
    return json;
  }

  async function storeSync() {
    var res = await fetch(proxyBase() + "/store/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return res.json();
  }

  /**
   * Prefer Marqdo web form /_form/note (same-origin), then sync files via Marqdo.
   * Falls back to storeRun (求道-捕捉) if form missing.
   */
  async function precipitateNote(fields) {
    var form =
      document.querySelector('form[action="/_form/note"]') ||
      document.querySelector('form[action*="/_form/note"]');
    if (!form) {
      return storeRun({
        title: fields.title,
        task: fields.task || fields.summary || "",
        result: fields.body || fields.result || "",
        slug: fields.slug || "",
        session_id: fields.session_id || "",
        surface: fields.surface || "web",
      });
    }
    var fd = new FormData(form);
    if (fields.slug) fd.set("slug", fields.slug);
    if (fields.title) fd.set("title", fields.title);
    if (fields.summary != null) fd.set("summary", fields.summary);
    if (fields.body) fd.set("body", fields.body);
    var action = form.getAttribute("action") || "/_form/note";
    var res = await fetch(action, {
      method: "POST",
      body: fd,
      credentials: "same-origin",
      headers: { Accept: "application/json, text/html" },
      redirect: "follow",
    });
    if (!res.ok && res.status !== 303 && res.status !== 302) {
      throw new Error("Marqdo 表单沉淀失败 HTTP " + res.status);
    }
    try {
      await storeSync();
    } catch (e) {
      /* file sync best-effort */
    }
    return { ok: true, slug: fields.slug, path: "data/runs/" + fields.slug + ".mq.md", via: "form+sync" };
  }

  w.QdApi = {
    proxyBase: proxyBase,
    normalizeBase: normalizeBase,
    relay: relay,
    relayStream: relayStream,
    loadSettings: loadSettings,
    testLlm: testLlm,
    testVoice: testVoice,
    storeRun: storeRun,
    storeSync: storeSync,
    precipitateNote: precipitateNote,
  };
})(window);
