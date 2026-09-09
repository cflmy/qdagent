/**
 * Browser voice helpers.
 * Primary realtime path: Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * — same class of capability as OS dictation in Chrome/Edge; Win+H cannot be invoked from web.
 * Fallback: MediaRecorder → POST /audio/transcriptions (configured ASR).
 */
(function (w) {
  function speechRecognitionCtor() {
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  function isSecure() {
    return !!(w.isSecureContext || location.protocol === "https:" ||
      location.hostname === "localhost" || location.hostname === "127.0.0.1");
  }

  function diagnose() {
    var SR = speechRecognitionCtor();
    var hasMR = !!(w.MediaRecorder);
    var hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return {
      secure: isSecure(),
      speechRecognition: !!SR,
      mediaRecorder: hasMR,
      getUserMedia: hasMic,
      realtimeOk: !!SR && isSecure(),
      fileAsrOk: hasMR && hasMic && isSecure(),
      reason: !isSecure()
        ? "需 HTTPS 或 localhost 才能使用麦克风（当前为非安全上下文）"
        : !SR && !(hasMR && hasMic)
          ? "当前浏览器既无 Web Speech 听写，也无 MediaRecorder"
          : !SR
            ? "无实时听写（可用文件 ASR 兜底）；建议 Chrome / Edge"
            : "",
    };
  }

  function pickMime() {
    var candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    if (!w.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return "";
  }

  function extForMime(mime) {
    if (!mime) return "webm";
    if (mime.indexOf("mp4") >= 0 || mime.indexOf("m4a") >= 0) return "m4a";
    if (mime.indexOf("ogg") >= 0) return "ogg";
    return "webm";
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(function (t) {
      try {
        t.stop();
      } catch (e) {}
    });
  }

  /**
   * Live mic level via getUserMedia + AnalyserNode.
   * Needed because Web Speech API does not expose the capture stream —
   * without a VU meter users cannot tell "no speech / muted mic" from "ASR dead".
   * onLevel(level01, { silent, speaking, rms })
   */
  function createLevelMeter(opts) {
    opts = opts || {};
    var stream = null;
    var ctx = null;
    var analyser = null;
    var raf = 0;
    var running = false;
    var smoothed = 0;

    async function start() {
      if (running) return true;
      if (!isSecure()) throw new Error("需要安全上下文才能读麦克风音量");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("浏览器不支持 getUserMedia");
      }
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) throw new Error("浏览器不支持 AudioContext");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      ctx = new AC();
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch (e) {}
      }
      var src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      src.connect(analyser);
      // Do not connect to destination — silent metering only
      running = true;
      smoothed = 0;
      var data = new Uint8Array(analyser.fftSize);
      function tick() {
        if (!running || !analyser) return;
        analyser.getByteTimeDomainData(data);
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
          var v = (data[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / data.length);
        smoothed = smoothed * 0.72 + rms * 0.28;
        var level = Math.min(1, smoothed * 5.5);
        if (opts.onLevel) {
          opts.onLevel(level, {
            rms: rms,
            silent: level < 0.03,
            speaking: level >= 0.09,
          });
        }
        raf = w.requestAnimationFrame(tick);
      }
      tick();
      return true;
    }

    function stop() {
      running = false;
      if (raf) {
        try {
          w.cancelAnimationFrame(raf);
        } catch (e) {}
      }
      raf = 0;
      stopTracks(stream);
      stream = null;
      analyser = null;
      if (ctx) {
        try {
          ctx.close();
        } catch (e) {}
      }
      ctx = null;
      smoothed = 0;
      if (opts.onLevel) opts.onLevel(0, { rms: 0, silent: true, speaking: false });
    }

    return {
      start: start,
      stop: stop,
      isRunning: function () {
        return running;
      },
    };
  }

  /** Wire fill/label elements: { fill, label } or a root with .qd-vu-fill / .qd-vu-label */
  function attachVuUi(target) {
    var fill =
      (target && target.fill) ||
      (target && target.querySelector && target.querySelector(".qd-vu-fill"));
    var label =
      (target && target.label) ||
      (target && target.querySelector && target.querySelector(".qd-vu-label"));
    var root = (target && target.root) || (target && target.classList ? target : null);
    return function onLevel(level, meta) {
      if (fill) fill.style.width = Math.round(Math.max(0, Math.min(1, level)) * 100) + "%";
      if (root) {
        root.classList.toggle("qd-vu-silent", !!(meta && meta.silent));
        root.classList.toggle("qd-vu-speaking", !!(meta && meta.speaking));
        root.classList.toggle("qd-vu-active", level > 0.001);
      }
      if (label) {
        if (!meta) label.textContent = "音量";
        else if (meta.speaking) label.textContent = "有声音";
        else if (meta.silent) label.textContent = "几乎无声 · 检查麦/系统音量";
        else label.textContent = "音量偏低";
      }
    };
  }

  /**
   * Realtime dictation via Web Speech API.
   * onPartial({ finalText, interimText, committed })
   * onError(err), onStart(), onEnd(), onLevel(level, meta)
   */
  function createDictation(opts) {
    opts = opts || {};
    var Ctor = speechRecognitionCtor();
    var rec = null;
    var want = false;
    var finalText = "";
    var restartTimer = null;
    var meter = null;
    var lang = opts.lang || (navigator.language && /zh/i.test(navigator.language) ? "zh-CN" : navigator.language) || "zh-CN";

    function clearRestart() {
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
    }

    function stopMeter() {
      if (meter) {
        try {
          meter.stop();
        } catch (e) {}
        meter = null;
      }
    }

    function bind(recognition) {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onstart = function () {
        if (opts.onStart) opts.onStart();
      };

      recognition.onresult = function (event) {
        var interim = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var piece = event.results[i][0] && event.results[i][0].transcript;
          if (!piece) continue;
          if (event.results[i].isFinal) {
            finalText += piece;
            if (opts.onFinal) opts.onFinal(piece, finalText);
          } else {
            interim += piece;
          }
        }
        if (opts.onPartial) {
          opts.onPartial({
            finalText: finalText,
            interimText: interim,
            committed: finalText,
          });
        }
      };

      recognition.onerror = function (event) {
        var code = (event && event.error) || "unknown";
        if (code === "no-speech" || code === "aborted") return;
        if (code === "not-allowed") {
          want = false;
          stopMeter();
          if (opts.onError) {
            opts.onError(new Error("麦克风被拒绝，或页面非 HTTPS/localhost"));
          }
          return;
        }
        if (opts.onError) opts.onError(new Error("听写错误：" + code));
      };

      recognition.onend = function () {
        clearRestart();
        if (!want) {
          stopMeter();
          if (opts.onEnd) opts.onEnd({ finalText: finalText });
          return;
        }
        restartTimer = setTimeout(function () {
          restartTimer = null;
          if (!want || !rec) return;
          try {
            rec.start();
          } catch (e) {}
        }, 280);
      };
    }

    async function start() {
      var d = diagnose();
      if (!d.secure) throw new Error(d.reason || "需要安全上下文（HTTPS / localhost）");
      if (!Ctor) throw new Error("当前浏览器不支持实时听写（请用 Chrome / Edge）");
      want = true;
      // Always open a metering stream so VU moves even before first transcript.
      stopMeter();
      meter = createLevelMeter({
        onLevel: function (level, meta) {
          if (opts.onLevel) opts.onLevel(level, meta);
        },
      });
      try {
        await meter.start();
      } catch (e) {
        want = false;
        stopMeter();
        throw e;
      }
      if (!rec) {
        rec = new Ctor();
        bind(rec);
      }
      try {
        rec.start();
      } catch (e) {}
      return true;
    }

    function stop() {
      want = false;
      clearRestart();
      stopMeter();
      if (rec) {
        try {
          rec.stop();
        } catch (e) {}
      }
      return { finalText: finalText };
    }

    function abort() {
      want = false;
      clearRestart();
      stopMeter();
      if (rec) {
        try {
          rec.abort();
        } catch (e) {}
      }
    }

    function reset() {
      finalText = "";
      if (opts.onPartial) {
        opts.onPartial({ finalText: "", interimText: "", committed: "" });
      }
    }

    function setLang(l) {
      lang = l || lang;
      if (rec) rec.lang = lang;
    }

    return {
      start: start,
      stop: stop,
      abort: abort,
      reset: reset,
      setLang: setLang,
      isListening: function () {
        return want;
      },
      getFinal: function () {
        return finalText;
      },
      engine: "webspeech",
    };
  }

  /** File-based ASR fallback (one MediaRecorder session → one Blob). */
  function createRecorder(opts) {
    opts = opts || {};
    var mime = pickMime();
    var stream = null;
    var rec = null;
    var chunks = [];
    var startedAt = 0;
    var stopResolve = null;
    var stopReject = null;
    var active = false;

    function resetState() {
      active = false;
      rec = null;
      stopTracks(stream);
      stream = null;
      chunks = [];
      stopResolve = null;
      stopReject = null;
    }

    async function start() {
      if (active) throw new Error("已在录音");
      var d = diagnose();
      if (!d.secure) throw new Error(d.reason || "需要安全上下文");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("浏览器不支持麦克风");
      }
      if (!w.MediaRecorder) throw new Error("浏览器不支持 MediaRecorder");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      chunks = [];
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (e) {
        rec = new MediaRecorder(stream);
      }
      mime = rec.mimeType || mime || "audio/webm";
      rec.ondataavailable = function (ev) {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      rec.onerror = function (ev) {
        var err = (ev && ev.error) || new Error("录音失败");
        var reject = stopReject;
        resetState();
        if (reject) reject(err);
      };
      rec.onstop = function () {
        var resolve = stopResolve;
        var blob = new Blob(chunks, { type: mime || "audio/webm" });
        var result = {
          blob: blob,
          filename: "audio." + extForMime(mime),
          mime: mime,
          durationMs: Date.now() - startedAt,
        };
        resetState();
        if (opts.onStop) opts.onStop(result);
        if (resolve) resolve(result);
      };
      active = true;
      startedAt = Date.now();
      rec.start();
      if (opts.onStart) opts.onStart();
      return true;
    }

    function stop() {
      if (!active || !rec) return Promise.reject(new Error("未在录音"));
      return new Promise(function (resolve, reject) {
        stopResolve = resolve;
        stopReject = reject;
        try {
          if (rec.state === "recording" || rec.state === "paused") rec.stop();
          else {
            resetState();
            reject(new Error("录音器未就绪"));
          }
        } catch (e) {
          resetState();
          reject(e);
        }
      });
    }

    function cancel() {
      var r = rec;
      resetState();
      if (r && r.state !== "inactive") {
        try {
          r.onstop = null;
          r.stop();
        } catch (e) {}
      }
    }

    return {
      start: start,
      stop: stop,
      cancel: cancel,
      isRecording: function () {
        return active;
      },
      engine: "mediarecorder",
    };
  }

  w.QdVoice = {
    diagnose: diagnose,
    createDictation: createDictation,
    createRecorder: createRecorder,
    createLevelMeter: createLevelMeter,
    attachVuUi: attachVuUi,
    pickMime: pickMime,
    supported: function () {
      var d = diagnose();
      return d.realtimeOk || d.fileAsrOk;
    },
  };
})(window);
