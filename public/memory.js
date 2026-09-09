/* 画像 / 整理 */
(function () {
  function boot() {
    var status = document.getElementById("qd-memory-status");
    var pre = document.getElementById("qd-profile-body");
    var refreshBtn = document.getElementById("qd-profile-refresh");
    var resetBtn = document.getElementById("qd-profile-reset");
    var organizeBtn = document.getElementById("qd-organize");
    var queryInput = document.getElementById("qd-organize-query");
    if (!window.QdApi) return;

    function setStatus(t, ok) {
      if (!status) return;
      status.textContent = t || "";
      status.className =
        "qd-settings-status" + (ok === false ? " err" : ok ? " ok" : "");
    }

    function loadProfile() {
      setStatus("加载用户画像…", true);
      return QdApi.storeProfile()
        .then(function (j) {
          if (pre) pre.textContent = j.body || "";
          setStatus("画像：" + (j.path || ""), true);
        })
        .catch(function (e) {
          setStatus("加载失败：" + e.message, false);
        });
    }

    if (refreshBtn) refreshBtn.addEventListener("click", loadProfile);
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!confirm("重置画像为多维度模板？当前内容会被覆盖。")) return;
        setStatus("重置中…", true);
        fetch("/api/store/profile/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: "{}",
        })
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            if (!j.ok) throw new Error(j.error || "reset failed");
            if (pre) pre.textContent = j.body || "";
            setStatus("已重置：" + (j.path || ""), true);
          })
          .catch(function (e) {
            setStatus("重置失败：" + e.message, false);
          });
      });
    }
    if (organizeBtn) {
      organizeBtn.addEventListener("click", function () {
        var q = (queryInput && queryInput.value.trim()) || "求道";
        setStatus("整理中…", true);
        organizeBtn.disabled = true;
        QdApi.storeOrganize({ query: q, limit: 12 })
          .then(function (j) {
            setStatus(
              (j.summary || "已整理") +
                " · " +
                (j.kb_path || "") +
                " · 审计 " +
                (j.slug || ""),
              true
            );
          })
          .catch(function (e) {
            setStatus("整理失败：" + e.message, false);
          })
          .finally(function () {
            organizeBtn.disabled = false;
          });
      });
    }

    loadProfile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
