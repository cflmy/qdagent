/* 设置页：分栏回填 + 保存前连通性测试 */
(function () {
  function boot() {
    var form = document.querySelector("form.site-form") || document.querySelector("form");
    if (!form || !window.QdApi) return;

    var action = form.getAttribute("action") || "";
    var kind = "llm";
    if (action.indexOf("settings-voice") >= 0) kind = "voice";
    if (action.indexOf("settings-llm") >= 0) kind = "llm";

    var panel = document.getElementById("qd-settings-status");
    function status(msg, ok) {
      if (!panel) {
        panel = document.createElement("p");
        panel.id = "qd-settings-status";
        form.parentNode.insertBefore(panel, form);
      }
      panel.textContent = msg;
      panel.className = "qd-settings-status " + (ok ? "ok" : "err");
    }

    function fill(row) {
      if (!row) return;
      Object.keys(row).forEach(function (k) {
        var el = form.querySelector('[name="' + k + '"]');
        if (el && row[k] != null && String(row[k]) !== "") el.value = row[k];
      });
    }

    function readCfg() {
      var cfg = {};
      Array.prototype.forEach.call(form.querySelectorAll("[name]"), function (el) {
        if (el.name && el.name !== "_csrf" && el.name !== "id") cfg[el.name] = el.value;
      });
      return cfg;
    }

    QdApi.loadSettings()
      .then(function (row) {
        fill(row);
      })
      .catch(function (e) {
        status("回填失败：" + e.message, false);
      });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var cfg = readCfg();
      status("正在测试配置（同域 /llm · /asr）…", true);
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      var test = kind === "voice" ? QdApi.testVoice(cfg) : QdApi.testLlm(cfg);

      test
        .then(function () {
          status("测试通过，正在保存…", true);
          HTMLFormElement.prototype.submit.call(form);
        })
        .catch(function (e) {
          status("未保存：" + e.message, false);
          if (btn) btn.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
