/* 求道对话 — 浏览器端调用用户配置的 OpenAI 兼容 API，并可选沉淀为笔记 */
(function () {
  var log = document.getElementById("qd-log");
  var input = document.getElementById("qd-input");
  var send = document.getElementById("qd-send");
  var status = document.getElementById("qd-status");
  var mic = document.getElementById("qd-mic");
  var speak = document.getElementById("qd-speak");
  var saveBtn = document.getElementById("qd-save");
  if (!log || !input || !send) return;

  var history = [];
  var cfg = null;
  var lastAssistant = "";

  function setStatus(t) {
    if (status) status.textContent = t;
  }

  function bubble(role, text) {
    var el = document.createElement("div");
    el.className = "qd-msg qd-" + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function normalizeBase(url) {
    var u = (url || "").trim().replace(/\/+$/, "");
    if (!u) u = "https://api.openai.com/v1";
    if (!/\/v1$/i.test(u) && !/\/chat\/completions$/i.test(u)) {
      /* keep as-is; user may use custom gateways */
    }
    return u;
  }

  async function loadCfg() {
    try {
      var res = await fetch("/api/settings", { credentials: "same-origin" });
      if (!res.ok) throw new Error("settings HTTP " + res.status);
      var data = await res.json();
      var rows = Array.isArray(data) ? data : data.rows || data;
      if (Array.isArray(rows) && rows.length) cfg = rows[0];
      else if (data && typeof data === "object") cfg = data;
      if (!cfg || !cfg.llm_api_key) {
        setStatus("请先在「设置」中填写大模型 API Key");
        return false;
      }
      setStatus("已连接配置 · " + (cfg.llm_model || "model"));
      return true;
    } catch (e) {
      setStatus("加载设置失败：" + e.message);
      return false;
    }
  }

  async function chatOnce(userText) {
    var base = normalizeBase(cfg.llm_base_url);
    var url = /\/chat\/completions$/i.test(base)
      ? base
      : base + "/chat/completions";
    var body = {
      model: cfg.llm_model || "gpt-4o-mini",
      messages: history.concat([{ role: "user", content: userText }]),
      stream: false,
    };
    var res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + cfg.llm_api_key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error("LLM " + res.status + ": " + errText.slice(0, 240));
    }
    var json = await res.json();
    var reply =
      (json.choices &&
        json.choices[0] &&
        json.choices[0].message &&
        json.choices[0].message.content) ||
      json.result ||
      JSON.stringify(json);
    return reply;
  }

  async function onSend() {
    var text = input.value.trim();
    if (!text) return;
    if (!(await loadCfg())) return;
    input.value = "";
    bubble("user", text);
    history.push({ role: "user", content: text });
    send.disabled = true;
    setStatus("思考中…");
    var pending = bubble("assistant", "…");
    try {
      var reply = await chatOnce(text);
      pending.textContent = reply;
      lastAssistant = reply;
      history.push({ role: "assistant", content: reply });
      setStatus("就绪");
    } catch (e) {
      pending.textContent = "错误：" + e.message;
      setStatus("失败");
      history.pop();
    }
    send.disabled = false;
    input.focus();
  }

  send.addEventListener("click", onSend);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  });

  if (mic) {
    mic.addEventListener("click", async function () {
      if (!(await loadCfg())) return;
      if (!cfg.asr_api_key) {
        setStatus("请先在设置中配置语音识别 ASR API");
        return;
      }
      setStatus("ASR：请用系统录音后上传（演示：粘贴识别结果到输入框）");
      var tip =
        "当前版本：在设置里填好 ASR 端点后，可用兼容 OpenAI /v1/audio/transcriptions 的服务。请先把识别文本贴进输入框发送。";
      bubble("system", tip);
    });
  }

  if (speak) {
    speak.addEventListener("click", async function () {
      if (!(await loadCfg())) return;
      if (!lastAssistant) {
        setStatus("还没有可朗读的回复");
        return;
      }
      if (!cfg.tts_api_key) {
        setStatus("请先在设置中配置语音合成 TTS API");
        return;
      }
      try {
        setStatus("TTS 生成中…");
        var base = normalizeBase(cfg.tts_base_url || cfg.llm_base_url);
        var url = base + "/audio/speech";
        var res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + (cfg.tts_api_key || cfg.llm_api_key),
          },
          body: JSON.stringify({
            model: cfg.tts_model || "tts-1",
            input: lastAssistant.slice(0, 4000),
            voice: "alloy",
          }),
        });
        if (!res.ok) throw new Error("TTS " + res.status);
        var blob = await res.blob();
        var audio = new Audio(URL.createObjectURL(blob));
        audio.play();
        setStatus("播放中");
      } catch (e) {
        setStatus("TTS 失败：" + e.message);
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var form =
        document.querySelector('form[action="/_form/note"]') ||
        document.querySelector("form.site-form");
      if (!form) {
        setStatus("页面缺少沉淀表单");
        return;
      }
      var transcript = history
        .map(function (m) {
          return "## " + m.role + "\n\n" + m.content;
        })
        .join("\n\n");
      if (!transcript) {
        setStatus("还没有对话可沉淀");
        return;
      }
      var slug =
        "chat-" +
        new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
      form.querySelector('[name="slug"]').value = slug;
      form.querySelector('[name="title"]').value = "对话 · " + slug;
      form.querySelector('[name="summary"]').value = (
        history[0] && history[0].content
      ).slice(0, 120);
      form.querySelector('[name="body"]').value =
        "---\ntitle: 对话沉淀\ndescription: qdagent chat\n---\n\n# 任务\n\n聊天会话沉淀\n\n# 结果\n\n" +
        transcript +
        "\n";
      form.submit();
    });
  }

  loadCfg();
  bubble("system", "你好，我是求道。先在「设置」里配置大模型 API，然后开始对话。重要结论可点「沉淀为本轮笔记」。");
})();
