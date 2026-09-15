/* shared helpers — Marqdo 0.3.7 same-origin proxy + invoke (no :7432) */
(function (w) {
  function apiRoot() {
    return "";
  }

  function normalizeBase(url) {
    var u = (url || "").trim().replace(/\/+$/, "");
    return u || "https://api.openai.com/v1";
  }

  var DICTATION_LANG_KEY = "qdagent.dictation_lang";

  var DICTATION_LANGS = [
    { value: "zh-CN", label: "中文（普通话）" },
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "zh-TW", label: "中文（台湾）" },
    { value: "yue-HK", label: "粤语（香港）" },
    { value: "auto", label: "跟随浏览器" },
  ];

  function getStoredDictationLang() {
    try {
      return (localStorage.getItem(DICTATION_LANG_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setStoredDictationLang(code) {
    try {
      if (code) localStorage.setItem(DICTATION_LANG_KEY, code);
      else localStorage.removeItem(DICTATION_LANG_KEY);
    } catch (e) {}
  }

  /** Resolve BCP-47 tag for Web Speech. Prefer local override, then settings, default zh-CN. */
  function resolveDictationLang(cfg) {
    var raw = (getStoredDictationLang() || (cfg && cfg.dictation_lang) || "zh-CN").trim();
    if (!raw || raw === "auto") {
      return (navigator.language || "zh-CN").trim() || "zh-CN";
    }
    return raw;
  }

  function fillDictationLangSelect(sel, preferred) {
    if (!sel) return;
    var cur = preferred || getStoredDictationLang() || "zh-CN";
    sel.innerHTML = "";
    for (var i = 0; i < DICTATION_LANGS.length; i++) {
      var o = document.createElement("option");
      o.value = DICTATION_LANGS[i].value;
      o.textContent = DICTATION_LANGS[i].label;
      if (DICTATION_LANGS[i].value === cur) o.selected = true;
      sel.appendChild(o);
    }
    if (sel.value !== cur) {
      var custom = document.createElement("option");
      custom.value = cur;
      custom.textContent = cur;
      custom.selected = true;
      sel.appendChild(custom);
    }
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

  function ttsPath(path) {
    if (!path) path = "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    return "/tts" + path;
  }

  function mountFn(mount) {
    if (mount === "asr") return asrPath;
    if (mount === "tts") return ttsPath;
    return llmPath;
  }

  async function relay(opts) {
    var path = opts.path || "/";
    var method = (opts.method || "POST").toUpperCase();
    var url = mountFn(opts.mount)(path);
    var headers = Object.assign({ Accept: "application/json" }, opts.headers || {});
    var init = { method: method, headers: headers, credentials: "same-origin" };
    if (opts.signal) init.signal = opts.signal;
    if (opts.body != null && method !== "GET" && method !== "HEAD") {
      if (typeof FormData !== "undefined" && opts.body instanceof FormData) {
        // Let browser set multipart boundary — do not set Content-Type.
        delete headers["Content-Type"];
        init.body = opts.body;
      } else {
        headers["Content-Type"] = opts.content_type || "application/json";
        init.body =
          typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
      }
    }
    var res = await fetch(url, init);
    var ctype = res.headers.get("Content-Type") || "";
    var data;
    if (ctype.indexOf("application/json") >= 0) {
      data = await res.json().catch(function () {
        return null;
      });
    } else if (opts.as === "arrayBuffer" || ctype.indexOf("audio/") === 0) {
      data = await res.arrayBuffer();
    } else {
      data = await res.text();
    }
    return {
      ok: res.ok,
      status: res.status,
      url: url,
      data: data,
      content_type: ctype,
    };
  }

  async function blobToBase64(blob) {
    var buf = await blob.arrayBuffer();
    var bytes = new Uint8Array(buf);
    var chunk = 0x8000;
    var binary = "";
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, Math.min(i + chunk, bytes.length))
      );
    }
    return btoa(binary);
  }

  function wrapHkProxy(base, prefix) {
    prefix = (prefix || "https://proxy.cflmy.top").replace(/\/$/, "");
    base = String(base || "").trim().replace(/\/$/, "");
    if (!base) return base;
    try {
      var u = new URL(base);
      var p = new URL(prefix);
      if (u.hostname === p.hostname) return base;
      return prefix + "/" + u.host + (u.pathname.replace(/\/$/, "") || "");
    } catch (e) {
      return base;
    }
  }

  /**
   * Transcribe via host invoke (can retry through proxy.cflmy.top).
   * Falls back to same-origin /asr multipart if invoke unavailable.
   */
  async function transcribeAudio(opts) {
    var blob = opts.blob || opts.file;
    if (!blob) throw new Error("缺少音频文件");
    var key = (opts.api_key || "").trim();
    if (!key) throw new Error("请配置 ASR API Key");
    var model = opts.model || "whisper-1";
    var filename = opts.filename || "audio.webm";
    var base = (opts.base_url || "").trim();
    var language = opts.language || "";
    var preferProxy = !!opts.via_proxy;
    var proxyPrefix = opts.proxy_prefix || "https://proxy.cflmy.top";

    async function viaInvoke(viaProxy) {
      var b64 = await blobToBase64(blob);
      var json = await storePost("/api/store/asr_transcribe", {
        api_key: key,
        base_url: base,
        model: model,
        language: language || undefined,
        via_proxy: viaProxy,
        proxy_prefix: proxyPrefix,
        filename: filename,
        file_b64: b64,
      });
      if (!json || json.ok === false) {
        throw new Error((json && json.error) || "ASR 转写失败");
      }
      return {
        text: String(json.text || "").trim(),
        raw: json.raw || json,
        status: 200,
        via_proxy: !!json.via_proxy,
        url: json.url || "",
      };
    }

    async function viaRelay() {
      var fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("model", model);
      if (language) fd.append("language", language);
      var out = await relay({
        mount: "asr",
        path: "/audio/transcriptions",
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        body: fd,
        signal: opts.signal,
      });
      if (!out.ok) {
        var err =
          (out.data && (out.data.message || (out.data.error && out.data.error.message))) ||
          (typeof out.data === "string" ? out.data : JSON.stringify(out.data || {})).slice(
            0,
            240
          );
        throw new Error("ASR HTTP " + out.status + "：" + err);
      }
      var text =
        (out.data && (out.data.text || out.data.transcript || out.data.result)) ||
        (typeof out.data === "string" ? out.data : "");
      return { text: String(text || "").trim(), raw: out.data, status: out.status };
    }

    // Need base_url for invoke path; fall back to relay if missing.
    if (!base) {
      return viaRelay();
    }

    var order = preferProxy ? [true, false] : [false, true];
    var lastErr = null;
    for (var i = 0; i < order.length; i++) {
      try {
        return await viaInvoke(order[i]);
      } catch (e) {
        lastErr = e;
      }
    }
    try {
      return await viaRelay();
    } catch (e2) {
      throw lastErr || e2;
    }
  }

  /**
   * Stream chat completions via same-origin /llm/chat/completions (app.proxy SSE).
   * Industry pattern (vLLM / Qwen / DeepSeek): consume both delta.content and
   * delta.reasoning_content; answer channel may stay empty until reasoning ends.
   * onDelta(contentDelta, answerFull, meta) where meta =
   *   { reasoningDelta, reasoning, answer, phase: "reasoning"|"content" }
   * Returns answer text only (not reasoning).
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
    var answer = "";
    var reasoning = "";
    var sawDone = false;

    function emit(contentDelta, reasoningDelta, phase) {
      if (!onDelta) return;
      onDelta(contentDelta || "", answer, {
        reasoningDelta: reasoningDelta || "",
        reasoning: reasoning,
        answer: answer,
        phase: phase,
      });
    }

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
        (obj.choices && obj.choices[0] && obj.choices[0].delta) || {};
      var r =
        delta.reasoning_content ||
        delta.reasoning ||
        delta.thinking ||
        "";
      var c = delta.content || "";
      if (typeof r !== "string") r = "";
      if (typeof c !== "string") c = "";
      if (r) {
        reasoning += r;
        emit("", r, "reasoning");
      }
      if (c) {
        answer += c;
        emit(c, "", "content");
      }
    }

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      // SSE events are blank-line delimited; also split by \n for data: lines.
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
    // Some vendors put the whole answer in reasoning only — surface it,
    // but never promote tool-call / thinker JSON blobs as the user-visible answer.
    if (!answer && reasoning) {
      var looksTool =
        /^\s*\{[\s\S]*"tool_name"\s*:/.test(reasoning) ||
        /^\s*\{[\s\S]*"name"\s*:\s*"thinker"/.test(reasoning) ||
        /"arguments"\s*:\s*\{/.test(reasoning);
      if (!looksTool) {
        answer = reasoning;
        reasoning = "";
        emit(answer, "", "content");
      }
    }
    return answer;
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

  function resolveAsrConfig(cfg) {
    cfg = cfg || {};
    var key = (cfg.asr_api_key || cfg.llm_api_key || "").trim();
    var base = (cfg.asr_base_url || cfg.llm_base_url || "").trim();
    var model = (cfg.asr_model || "").trim() || "whisper-1";
    return {
      api_key: key,
      base_url: base,
      model: model,
      ok: !!key,
      reused_llm: !!(key && !(cfg.asr_api_key || "").trim()),
    };
  }

  /** Whisper / SenseVoice expect ISO-639-1 (zh), not BCP-47 (zh-CN). */
  function asrLanguageCode(dictationLang) {
    var l = String(dictationLang || "zh-CN").trim();
    if (!l || l === "auto") return "";
    var m = l.match(/^([a-z]{2})/i);
    return m ? m[1].toLowerCase() : "";
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
    var lang = (cfg.dictation_lang || "zh-CN").trim();
    if (!lang) throw new Error("请填写听写语言（如 zh-CN / en-US / auto）");
    var asr = resolveAsrConfig(cfg);
    var notes = [];
    if (asr.ok) {
      var asrOut = await relay({
        mount: "asr",
        path: "/models",
        method: "GET",
        headers: { Authorization: "Bearer " + asr.api_key },
        body: null,
      });
      if (!asrOut.ok) {
        var amsg =
          typeof asrOut.data === "string"
            ? asrOut.data
            : (asrOut.data &&
                (asrOut.data.error && (asrOut.data.error.message || asrOut.data.error))) ||
              asrOut.error ||
              JSON.stringify(asrOut.data || asrOut).slice(0, 240);
        throw new Error("ASR 测试失败 HTTP " + asrOut.status + "：" + amsg);
      }
      notes.push(
        "ASR OK" + (asr.reused_llm ? "（复用大模型 Key）" : "") + " · " + asr.model
      );
    } else {
      notes.push("未配 ASR：国内 Web Speech 常失败，建议填 ASR 或依赖大模型 Key");
    }
    var key = (cfg.tts_api_key || "").trim();
    if (!key) {
      return { ok: true, skipped: "tts", dictation_lang: lang, note: notes.join("；") };
    }
    var out = await relay({
      mount: "tts",
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
      throw new Error("TTS 测试失败 HTTP " + out.status + "：" + msg);
    }
    notes.push("TTS OK");
    return { ok: true, dictation_lang: lang, note: notes.join("；") };
  }

  /** OpenAI-compatible POST /audio/speech → ArrayBuffer. */
  async function synthesizeSpeech(opts) {
    var key = (opts.api_key || "").trim();
    if (!key) throw new Error("请配置 TTS API Key");
    var out = await relay({
      mount: "tts",
      path: "/audio/speech",
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: {
        model: opts.model || "tts-1",
        input: String(opts.input || "").slice(0, 4000),
        voice: opts.voice || "alloy",
      },
      as: "arrayBuffer",
    });
    if (!out.ok) {
      var err =
        (out.data && out.data.byteLength == null &&
          (out.data.message || (out.data.error && out.data.error.message))) ||
        (typeof out.data === "string" ? out.data : "").slice(0, 240) ||
        "TTS failed";
      throw new Error("TTS HTTP " + out.status + "：" + err);
    }
    return {
      buffer: out.data,
      content_type: out.content_type || "audio/mpeg",
      status: out.status,
    };
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

  async function storePost(path, payload, opts) {
    var init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    };
    if (opts && opts.signal) init.signal = opts.signal;
    var res = await fetch(path, init);
    var json = await res.json().catch(function () {
      return { ok: false, error: "store non-JSON" };
    });
    if (!res.ok || json.ok === false) throw new Error(json.error || path + " failed");
    return json;
  }

  async function storeContext(payload, opts) {
    return storePost("/api/store/context", payload || {}, opts);
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

  async function storeKbList(payload) {
    return storePost("/api/store/kb/list", payload || {});
  }

  async function storeKbGet(payload) {
    return storePost("/api/store/kb/get", payload || {});
  }

  async function storeWebSearch(payload, opts) {
    return storePost("/api/store/web_search", payload || {}, opts);
  }

  async function storeChangePropose(payload) {
    return storePost("/api/store/changes/propose", payload || {});
  }

  async function storeChangeList(payload) {
    return storePost("/api/store/changes/list", payload || {});
  }

  async function storeChangeGet(payload) {
    return storePost("/api/store/changes/get", payload || {});
  }

  async function storeChangeApply(payload) {
    return storePost("/api/store/changes/apply", payload || {});
  }

  async function storeChangeReject(payload) {
    return storePost("/api/store/changes/reject", payload || {});
  }

  async function storeGitLog(payload) {
    return storePost("/api/store/git/log", payload || {});
  }

  async function storeGitShow(payload) {
    return storePost("/api/store/git/show", payload || {});
  }

  async function storeGitRevert(payload) {
    return storePost("/api/store/git/revert", payload || {});
  }

  /** Build system message from profile + corpus hits (+ optional web) — evidence only. */
  function contextSystemMessage(ctx, web, opts) {
    var profile = (ctx && ctx.profile) || "";
    if (profile.length > 2400) profile = profile.slice(0, 2400) + "\n…";
    var hits = (ctx && ctx.hits) || [];
    var wantWeb = !!(opts && opts.wantWeb);
    var webHits = (web && web.hits) || [];
    var provider = (web && web.provider) || "";
    var lines = [
      "你是求道助手。",
      "系统会在本轮结束后自动沉淀新笔记到 data/runs（只追加，不改写历史 runs）。",
      "清理/改写用户画像或既有笔记时：先用自然语言说明结论，然后必须附带一个可执行的变更块（界面会显示「同意应用」按钮，用户一点即写入磁盘）。",
      "变更块格式（务必完整给出目标文件的新全文，不要只给 diff 片段）：",
      "```qd-change",
      "target: kb/用户画像.mq.md",
      "title: 简短标题",
      "reason: 一句话原因",
      "---",
      "（这里是改写后的完整 Markdown 正文）",
      "```",
      "在用户点击同意前，不得声称已经改写磁盘。用户说喜欢/偏好/记住时，同样用 qd-change 给出更新后的完整画像。",
      "回答简洁；检索与联网仅供参考（evidence only）。不要输出 tool_name / thinker JSON。",
    ];
    if (wantWeb) {
      lines.push(
        "【联网状态】本轮用户已开启联网检索。" +
          (webHits.length
            ? "已检索到 " +
              webHits.length +
              " 条网页证据（provider=" +
              (provider || "?") +
              "）。请基于下列「联网证据」回答，并明确告诉用户：当前可以联网检索。"
            : "检索已执行但无命中或失败" +
              (web && web.error ? "（" + String(web.error).slice(0, 160) + "）" : "") +
              "。仍要明确告诉用户：联网开关已开，只是本轮未拿到可用网页片段；不要说「不能联网」。")
      );
      lines.push(
        "若历史消息或笔记曾写「不能检索网络」，以本轮【联网状态】为准，那些是过时信息。"
      );
    } else {
      lines.push(
        "【联网状态】本轮未开启联网。若用户问能否联网，告知可勾选工具栏「联网」，或在问题里写「搜索一下」。"
      );
    }
    lines.push("", "## 用户画像", profile || "（空）", "", "## 笔记证据（evidence only）");
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
    if (wantWeb) {
      lines.push(
        "",
        "## 联网证据（" + (provider || "web") + " · evidence only）"
      );
      if (!webHits.length) {
        lines.push("（无命中）");
      } else {
        for (var j = 0; j < webHits.length; j++) {
          var w = webHits[j] || {};
          lines.push(
            j +
              1 +
              ". " +
              (w.title || "hit") +
              (w.url ? " · " + w.url : "") +
              "\n" +
              String(w.snippet || "").slice(0, 400)
          );
        }
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
    transcribeAudio: transcribeAudio,
    synthesizeSpeech: synthesizeSpeech,
    DICTATION_LANGS: DICTATION_LANGS,
    resolveDictationLang: resolveDictationLang,
    resolveAsrConfig: resolveAsrConfig,
    asrLanguageCode: asrLanguageCode,
    wrapHkProxy: wrapHkProxy,
    getStoredDictationLang: getStoredDictationLang,
    setStoredDictationLang: setStoredDictationLang,
    fillDictationLangSelect: fillDictationLangSelect,
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
    storeKbList: storeKbList,
    storeKbGet: storeKbGet,
    storeWebSearch: storeWebSearch,
    storeChangePropose: storeChangePropose,
    storeChangeList: storeChangeList,
    storeChangeGet: storeChangeGet,
    storeChangeApply: storeChangeApply,
    storeChangeReject: storeChangeReject,
    storeGitLog: storeGitLog,
    storeGitShow: storeGitShow,
    storeGitRevert: storeGitRevert,
    contextSystemMessage: contextSystemMessage,
  };
})(window);
