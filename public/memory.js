/* 画像 / 变更提案审查 / git 历史 */
(function () {
  function boot() {
    var status = document.getElementById("qd-memory-status");
    var pre = document.getElementById("qd-profile-body");
    var refreshBtn = document.getElementById("qd-profile-refresh");
    var resetBtn = document.getElementById("qd-profile-reset");
    var organizeBtn = document.getElementById("qd-organize");
    var queryInput = document.getElementById("qd-organize-query");
    var changesList = document.getElementById("qd-changes-list");
    var changeDiff = document.getElementById("qd-change-diff");
    var applyBtn = document.getElementById("qd-change-apply");
    var rejectBtn = document.getElementById("qd-change-reject");
    var changesRefresh = document.getElementById("qd-changes-refresh");
    var gitLog = document.getElementById("qd-git-log");
    var gitRefresh = document.getElementById("qd-git-refresh");
    var gitRevert = document.getElementById("qd-git-revert");
    if (!window.QdApi) return;

    var selectedChangeId = null;
    var selectedGitRev = null;

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

    function setChangeButtons(on) {
      if (applyBtn) applyBtn.disabled = !on;
      if (rejectBtn) rejectBtn.disabled = !on;
    }

    function renderChanges(items) {
      if (!changesList) return;
      changesList.innerHTML = "";
      selectedChangeId = null;
      setChangeButtons(false);
      if (changeDiff) {
        changeDiff.hidden = true;
        changeDiff.textContent = "";
      }
      var open = (items || []).filter(function (c) {
        return c.status === "open";
      });
      if (!open.length) {
        changesList.innerHTML = '<p class="qd-muted">暂无待审提案。</p>';
        return;
      }
      open.forEach(function (c) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "qd-change-item";
        row.dataset.id = c.id;
        row.innerHTML =
          "<strong>" +
          escapeHtml(c.title || c.id) +
          "</strong> <span class=\"qd-muted\">" +
          escapeHtml(c.target || "") +
          "</span><br/><span class=\"qd-muted\">" +
          escapeHtml(c.id) +
          (c.reason ? " · " + escapeHtml(String(c.reason).slice(0, 80)) : "") +
          "</span>";
        row.addEventListener("click", function () {
          Array.prototype.forEach.call(
            changesList.querySelectorAll(".qd-change-item"),
            function (el) {
              el.classList.toggle("active", el === row);
            }
          );
          selectedChangeId = c.id;
          setChangeButtons(true);
          loadChangeDiff(c.id);
        });
        changesList.appendChild(row);
      });
    }

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function loadChangeDiff(id) {
      if (!changeDiff) return;
      changeDiff.hidden = false;
      changeDiff.textContent = "加载 diff…";
      QdApi.storeChangeGet({ id: id })
        .then(function (j) {
          changeDiff.textContent = j.patch || j.proposed || "（无 diff）";
        })
        .catch(function (e) {
          changeDiff.textContent = "加载失败：" + e.message;
        });
    }

    function loadChanges() {
      setStatus("加载变更提案…", true);
      return QdApi.storeChangeList({ status: "open" })
        .then(function (j) {
          renderChanges(j.changes || []);
          setStatus("待审 " + ((j.changes || []).length || 0) + " 条", true);
        })
        .catch(function (e) {
          setStatus("提案列表失败：" + e.message, false);
        });
    }

    function renderGit(commits) {
      if (!gitLog) return;
      gitLog.innerHTML = "";
      selectedGitRev = null;
      if (gitRevert) gitRevert.disabled = true;
      (commits || []).forEach(function (c) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "qd-git-item";
        row.dataset.rev = c.hash || c.short;
        row.innerHTML =
          "<code>" +
          escapeHtml(c.short || "") +
          "</code> " +
          escapeHtml(c.subject || "") +
          '<br/><span class="qd-muted">' +
          escapeHtml(c.date || "") +
          "</span>";
        row.addEventListener("click", function () {
          Array.prototype.forEach.call(
            gitLog.querySelectorAll(".qd-git-item"),
            function (el) {
              el.classList.toggle("active", el === row);
            }
          );
          selectedGitRev = c.hash;
          if (gitRevert) gitRevert.disabled = false;
          if (changeDiff) {
            changeDiff.hidden = false;
            changeDiff.textContent = "加载提交…";
            QdApi.storeGitShow({ rev: c.hash })
              .then(function (j) {
                changeDiff.textContent =
                  (j.stat || "") + "\n\n" + (j.patch || "");
              })
              .catch(function (e) {
                changeDiff.textContent = e.message;
              });
          }
        });
        gitLog.appendChild(row);
      });
      if (!(commits || []).length) {
        gitLog.innerHTML = '<p class="qd-muted">尚无提交。</p>';
      }
    }

    function loadGit() {
      return QdApi.storeGitLog({ limit: 30 })
        .then(function (j) {
          renderGit(j.commits || []);
        })
        .catch(function (e) {
          if (gitLog) gitLog.innerHTML = '<p class="qd-muted">' + escapeHtml(e.message) + "</p>";
        });
    }

    if (refreshBtn) refreshBtn.addEventListener("click", loadProfile);
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (
          !confirm(
            "将生成「重置画像模板」变更提案（不会立刻覆盖）。确认后请在待审列表中应用。"
          )
        )
          return;
        setStatus("生成重置提案…", true);
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
            if (!j.ok) throw new Error(j.error || "reset propose failed");
            var cid = (j.change && j.change.id) || "";
            setStatus("已创建重置提案 " + cid + "（待审查）", true);
            return loadChanges();
          })
          .catch(function (e) {
            setStatus("提案失败：" + e.message, false);
          });
      });
    }
    if (organizeBtn) {
      organizeBtn.addEventListener("click", function () {
        var q = (queryInput && queryInput.value.trim()) || "求道";
        setStatus("生成整理索引…", true);
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
            return loadGit();
          })
          .catch(function (e) {
            setStatus("整理失败：" + e.message, false);
          })
          .finally(function () {
            organizeBtn.disabled = false;
          });
      });
    }

    if (changesRefresh) changesRefresh.addEventListener("click", loadChanges);
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        if (!selectedChangeId) return;
        if (!confirm("应用提案 " + selectedChangeId + " 并写入 git？")) return;
        setStatus("应用中…", true);
        QdApi.storeChangeApply({ id: selectedChangeId })
          .then(function (j) {
            setStatus("已应用 · head " + (j.head || ""), true);
            return Promise.all([loadChanges(), loadProfile(), loadGit()]);
          })
          .catch(function (e) {
            setStatus("应用失败：" + e.message, false);
          });
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener("click", function () {
        if (!selectedChangeId) return;
        if (!confirm("拒绝提案 " + selectedChangeId + "？")) return;
        setStatus("拒绝中…", true);
        QdApi.storeChangeReject({ id: selectedChangeId })
          .then(function () {
            setStatus("已拒绝", true);
            return loadChanges();
          })
          .catch(function (e) {
            setStatus("拒绝失败：" + e.message, false);
          });
      });
    }
    if (gitRefresh) gitRefresh.addEventListener("click", loadGit);
    if (gitRevert) {
      gitRevert.addEventListener("click", function () {
        if (!selectedGitRev) return;
        if (
          !confirm(
            "git revert " +
              selectedGitRev.slice(0, 8) +
              "？将新增一次回滚提交。"
          )
        )
          return;
        setStatus("回滚中…", true);
        QdApi.storeGitRevert({ rev: selectedGitRev })
          .then(function (j) {
            setStatus("已回滚 · head " + (j.head || ""), true);
            return Promise.all([loadGit(), loadProfile(), loadChanges()]);
          })
          .catch(function (e) {
            setStatus("回滚失败：" + e.message, false);
          });
      });
    }

    loadProfile();
    loadChanges();
    loadGit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
