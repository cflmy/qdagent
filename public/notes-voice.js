/* 记一笔：左栏实时语音转写 · 右栏自写 + 小助手协作 */
(function () {
  function field(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function slugify(s) {
    var t = String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return t || "note-" + Date.now().toString(36);
  }

  function extractJson(text) {
    var raw = String(text || "").trim();
    var fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) raw = fence[1].trim();
    var start = raw.indexOf("{");
    var end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
    return JSON.parse(raw);
  }

  function boot() {
    if (!window.QdApi || !window.QdVoice) return;
    if (location.pathname.indexOf("/notes/new") < 0) return;

    var form =
      document.querySelector('form[action*="manual-note"]') ||
      document.querySelector("form.site-form") ||
      document.querySelector("form");
    if (!form) return;

    var shell = document.getElementById("qd-note-split");
    var mainIntro = document.querySelector("main.main .main-intro") || form.parentNode;

    if (!shell) {
      shell = document.createElement("div");
      shell.id = "qd-note-split";
      shell.className = "qd-note-split";
      shell.innerHTML =
        '<section class="qd-note-col qd-note-voice-col" aria-label="语音转写">' +
        "<header><h2>语音转写</h2>" +
        '<p class="qd-muted">优先浏览器实时听写；国内常报 network，将自动改用录音→云端 ASR（复用大模型 Key 即可）。</p></header>' +
        '<div class="qd-notes-voice-row">' +
        '<button type="button" id="qd-note-mic" class="primary">开始听写</button>' +
        '<button type="button" id="qd-note-clear-tx">清空转写</button>' +
        '<label class="qd-dictation-lang-wrap">语言 <select id="qd-note-lang" class="qd-dictation-lang"></select></label>' +
        '<span id="qd-note-voice-status" class="qd-muted"></span></div>' +
        '<div id="qd-note-transcript" class="qd-note-transcript" contenteditable="true" role="textbox" aria-label="转写文本"></div>' +
        '<p id="qd-note-interim" class="qd-note-interim qd-muted" aria-live="polite"></p>' +
        "</section>" +
        '<section class="qd-note-col qd-note-write-col" aria-label="自己写">' +
        "<header><h2>自己写</h2>" +
        '<p class="qd-muted">可手写；小助手根据左侧转写与当前草稿协作改写右侧，不覆盖你未保存的编辑意图以外内容时会合并。</p></header>' +
        '<div class="qd-notes-voice-row">' +
        '<button type="button" id="qd-note-assist" class="primary">小助手协作</button>' +
        '<label class="qd-note-auto"><input type="checkbox" id="qd-note-auto-assist"/> 停说后自动协作</label>' +
        '<span id="qd-note-assist-status" class="qd-muted"></span></div>' +
        '<div id="qd-note-form-mount"></div>' +
        "</section>";
      if (mainIntro) {
        mainIntro.insertBefore(shell, form);
      } else {
        form.parentNode.insertBefore(shell, form);
      }
    }

    var mount = document.getElementById("qd-note-form-mount") || shell.querySelector(".qd-note-write-col");
    if (mount && form.parentNode !== mount) {
      mount.appendChild(form);
    }

    // Prefer body near bottom of write col — leave slug/title/summary above
    var bodyEl = field(form, "body");
    var titleEl = field(form, "title");
    var summaryEl = field(form, "summary");
    var slugEl = field(form, "slug");

    var micBtn = document.getElementById("qd-note-mic");
    var clearBtn = document.getElementById("qd-note-clear-tx");
    var langSel = document.getElementById("qd-note-lang");
    var assistBtn = document.getElementById("qd-note-assist");
    var autoAssist = document.getElementById("qd-note-auto-assist");
    var statusEl = document.getElementById("qd-note-voice-status");
    var assistStatus = document.getElementById("qd-note-assist-status");
    var transcriptEl = document.getElementById("qd-note-transcript");
    var interimEl = document.getElementById("qd-note-interim");
    var vuRoot = document.getElementById("qd-note-vu");
    if (!vuRoot && shell) {
      vuRoot = document.createElement("div");
      vuRoot.id = "qd-note-vu";
      vuRoot.className = "qd-vu";
      vuRoot.setAttribute("aria-live", "polite");
      vuRoot.innerHTML =
        '<div class="qd-vu-track"><div class="qd-vu-fill" id="qd-note-vu-fill"></div></div>' +
        '<span class="qd-vu-label" id="qd-note-vu-label">音量（听写时显示）</span>';
      var row = shell.querySelector(".qd-notes-voice-row");
      if (row && row.parentNode) row.parentNode.insertBefore(vuRoot, row.nextSibling);
      else shell.querySelector(".qd-note-voice-col").appendChild(vuRoot);
    }
    var onVu = QdVoice.attachVuUi(vuRoot || { fill: document.getElementById("qd-note-vu-fill"), label: document.getElementById("qd-note-vu-label"), root: vuRoot });

    var diag = QdVoice.diagnose();
    var dictation = null;
    var streamAsr = null;
    var preferStreamAsr = false;
    var fileBusy = false;
    var assistBusy = false;
    var assistTimer = null;
    var settingsRow = {};

    function currentLang() {
      return QdApi.resolveDictationLang(settingsRow);
    }

    async function ensureAsrReady() {
      var cfg = await QdApi.loadSettings();
      settingsRow = cfg || settingsRow;
      var asr = QdApi.resolveAsrConfig(cfg);
      if (!asr.ok) {
        throw new Error(
          "云端听写需要 API Key：请在「设置 → 大模型」填写，或在「语音」单独填 ASR。"
        );
      }
      if (!(asr.base_url || "").trim()) {
        throw new Error("缺少 ASR / 大模型 Base URL");
      }
      return { cfg: cfg, asr: asr };
    }

    function makeTranscribe(asr) {
      return async function (blob, meta) {
        meta = meta || {};
        return QdApi.transcribeAudio({
          blob: blob,
          filename: meta.filename || "audio.webm",
          api_key: asr.api_key,
          base_url: asr.base_url,
          model: asr.model,
          language: QdApi.asrLanguageCode(currentLang()) || undefined,
          via_proxy: !!meta.via_proxy,
        });
      };
    }

    async function startStreamingAsr(seedText) {
      if (fileBusy) return;
      var ready = await ensureAsrReady();
      preferStreamAsr = true;
      if (streamAsr && streamAsr.isListening()) streamAsr.stop();
      var base = seedText != null ? String(seedText) : transcriptText();
      streamAsr = QdVoice.createStreamingAsr({
        via_proxy: false,
        chunkMs: 2800,
        transcribe: makeTranscribe(ready.asr),
        onPartial: function (p) {
          var live = p.finalText || "";
          setTranscript(base ? base.replace(/\s+$/, "") + live : live);
        },
        onFinal: function () {
          scheduleAssist();
        },
        onLevel: function (level, meta) {
          onVu(level, meta);
        },
        onStatus: function (msg) {
          status(msg || "");
        },
        onError: function (err) {
          setMicUi(false);
          onVu(0, { silent: true, speaking: false });
          status("云端听写失败：" + (err.message || err));
        },
        onEnd: function () {
          setMicUi(false);
          onVu(0, { silent: true, speaking: false });
          status("云端听写已结束");
          scheduleAssist();
        },
      });
      setMicUi(true);
      status(
        "云端实时听写中（分段转写；失败会走 proxy.cflmy.top）…" +
          (ready.asr.reused_llm ? " · 复用大模型 Key" : "")
      );
      await streamAsr.start();
    }

    function rebuildDictation() {
      if (!diag.realtimeOk) {
        dictation = null;
        return;
      }
      dictation = QdVoice.createDictation({
        lang: currentLang(),
        onPartial: function (p) {
          setTranscript(p.finalText || "");
          if (interimEl) interimEl.textContent = p.interimText ? "… " + p.interimText : "";
        },
        onFinal: function () {
          scheduleAssist();
        },
        onLevel: function (level, meta) {
          onVu(level, meta);
        },
        onError: function (err) {
          setMicUi(false);
          onVu(0, { silent: true, speaking: false });
          if (err && err.fallbackAsr) {
            status(err.message || "浏览器听写失败，改用云端实时听写…");
            startStreamingAsr(transcriptText()).catch(function (e2) {
              status((err.message || "") + " · " + (e2.message || e2));
            });
            return;
          }
          status(err.message || String(err));
        },
        onEnd: function () {
          if (dictation && !dictation.isListening()) {
            setMicUi(false);
            if (interimEl) interimEl.textContent = "";
            if (!(streamAsr && streamAsr.isListening())) status("听写已结束");
            onVu(0, { silent: true, speaking: false });
            scheduleAssist();
          }
        },
      });
    }

    QdApi.loadSettings()
      .then(function (row) {
        settingsRow = row || {};
        var pref =
          QdApi.getStoredDictationLang() ||
          settingsRow.dictation_lang ||
          "zh-CN";
        QdApi.fillDictationLangSelect(langSel, pref);
        rebuildDictation();
      })
      .catch(function () {
        QdApi.fillDictationLangSelect(langSel, "zh-CN");
        rebuildDictation();
      });

    if (langSel) {
      langSel.addEventListener("change", function () {
        QdApi.setStoredDictationLang(langSel.value);
        var was = dictation && dictation.isListening();
        if (was) dictation.stop();
        rebuildDictation();
        status("听写语言：" + langSel.value + (was ? " · 请重新开始听写" : ""));
        setMicUi(false);
      });
    }

    function status(msg) {
      if (statusEl) statusEl.textContent = msg || "";
    }
    function aStatus(msg) {
      if (assistStatus) assistStatus.textContent = msg || "";
    }

    function setMicUi(on) {
      if (!micBtn) return;
      micBtn.classList.toggle("qd-recording", !!on);
      micBtn.textContent = on ? "停止听写" : "开始听写";
    }

    function transcriptText() {
      return (transcriptEl && (transcriptEl.innerText || transcriptEl.textContent) || "").trim();
    }

    function setTranscript(text) {
      if (transcriptEl) transcriptEl.textContent = text || "";
    }

    function scheduleAssist() {
      if (!autoAssist || !autoAssist.checked) return;
      if (assistTimer) clearTimeout(assistTimer);
      assistTimer = setTimeout(function () {
        assistTimer = null;
        runAssist();
      }, 1200);
    }

    async function runAssist() {
      if (assistBusy) return;
      var spoken = transcriptText();
      var draft = (bodyEl && bodyEl.value) || "";
      if (!spoken && !draft.trim()) {
        aStatus("左侧转写或右侧正文至少有一段文字");
        return;
      }
      assistBusy = true;
      if (assistBtn) assistBtn.disabled = true;
      aStatus("小助手撰写中…");
      try {
        var cfg = await QdApi.loadSettings();
        if (!(cfg.llm_api_key || "").trim()) throw new Error("请先配置大模型 API Key");
        var out = await QdApi.relay({
          mount: "llm",
          path: "/chat/completions",
          method: "POST",
          headers: { Authorization: "Bearer " + cfg.llm_api_key },
          body: {
            model: cfg.llm_model || "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "你是记笔记小助手，在「自己写」栏与用户协作。" +
                  "根据【语音转写】与【当前草稿】输出 JSON（不要 markdown）：" +
                  '{"title":"标题","summary":"一两句摘要","body":"整理后的笔记正文（Markdown）","slug":"短标识可选"}。' +
                  "保留用户草稿中明确写好的事实；用转写补充与理顺；不要虚构。",
              },
              {
                role: "user",
                content:
                  "【语音转写】\n" +
                  (spoken || "（空）") +
                  "\n\n【当前草稿】\n" +
                  (draft.slice(0, 6000) || "（空）"),
              },
            ],
          },
        });
        if (!out.ok) throw new Error("LLM HTTP " + out.status);
        var content =
          (out.data &&
            out.data.choices &&
            out.data.choices[0] &&
            out.data.choices[0].message &&
            out.data.choices[0].message.content) ||
          "";
        var parsed = extractJson(content);
        if (titleEl && parsed.title) titleEl.value = String(parsed.title).slice(0, 120);
        if (summaryEl && parsed.summary) summaryEl.value = String(parsed.summary).slice(0, 500);
        if (bodyEl && parsed.body) {
          bodyEl.value = String(parsed.body);
          bodyEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (slugEl && (!(slugEl.value || "").trim() || /^note/i.test(slugEl.value))) {
          slugEl.value = slugify(parsed.slug || parsed.title || "note");
        }
        aStatus("已更新右侧标题/摘要/正文");
      } catch (e) {
        aStatus("协作失败：" + (e.message || e));
      } finally {
        assistBusy = false;
        if (assistBtn) assistBtn.disabled = false;
      }
    }

    if (micBtn) {
      micBtn.addEventListener("click", async function () {
        try {
          if (fileBusy) return;
          if (streamAsr && streamAsr.isListening()) {
            streamAsr.stop();
            setMicUi(false);
            if (interimEl) interimEl.textContent = "";
            status("已停止");
            onVu(0, { silent: true, speaking: false });
            scheduleAssist();
            return;
          }
          if (dictation && dictation.isListening()) {
            dictation.stop();
            setMicUi(false);
            if (interimEl) interimEl.textContent = "";
            status("已停止");
            onVu(0, { silent: true, speaking: false });
            scheduleAssist();
            return;
          }
          // Always try browser realtime first when available
          if (diag.realtimeOk && dictation) {
            setMicUi(true);
            status("实时听写（" + currentLang() + "）…失败将改云端/港代理");
            await dictation.start();
            return;
          }
          if (!diag.fileAsrOk) {
            status(
              diag.reason ||
                "当前环境无法听写。请用 Chrome/Edge，并通过 https:// 或 http://127.0.0.1 打开。"
            );
            return;
          }
          await startStreamingAsr(transcriptText());
        } catch (e) {
          setMicUi(false);
          onVu(0, { silent: true, speaking: false });
          status(e.message || String(e));
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        setTranscript("");
        if (interimEl) interimEl.textContent = "";
        if (dictation) dictation.reset();
        if (streamAsr) streamAsr.reset();
        status("转写已清空");
      });
    }

    if (assistBtn) {
      assistBtn.addEventListener("click", function () {
        runAssist();
      });
    }

    if (!diag.realtimeOk && !diag.fileAsrOk) {
      status(diag.reason || "听写不可用");
    } else if (!diag.realtimeOk) {
      status("浏览器实时听写不可用，将使用云端分段听写（可走 proxy.cflmy.top）");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
