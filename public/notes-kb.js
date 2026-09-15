/* OKF concept notes grid for /notes */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg) {
    var el = $("qd-kb-status");
    if (el) el.textContent = msg || "";
  }

  function renderGrid(notes) {
    var grid = $("qd-kb-grid");
    if (!grid) return;
    if (!notes || !notes.length) {
      grid.innerHTML =
        '<p class="qd-muted">尚无整理后的概念笔记。点「智能整理」从原始对话晋升，或先去对话几轮。</p>';
      return;
    }
    grid.innerHTML = notes
      .map(function (n) {
        return (
          '<button type="button" class="qd-kb-card" data-slug="' +
          escapeHtml(n.slug) +
          '"><span class="qd-kb-card-meta">' +
          escapeHtml(n.para || "notes") +
          "</span><strong>" +
          escapeHtml(n.title || n.slug) +
          "</strong><span class=\"qd-kb-card-desc\">" +
          escapeHtml(n.description || "") +
          "</span></button>"
        );
      })
      .join("");
  }

  async function refresh() {
    setStatus("加载知识库…");
    try {
      var j = await QdApi.storeKbList();
      renderGrid(j.notes || []);
      setStatus((j.count != null ? j.count : (j.notes || []).length) + " 条概念笔记");
    } catch (e) {
      setStatus("加载失败：" + (e && e.message ? e.message : e));
      renderGrid([]);
    }
  }

  async function openNote(slug) {
    var detail = $("qd-kb-detail");
    var title = $("qd-kb-detail-title");
    var body = $("qd-kb-detail-body");
    if (!detail || !body) return;
    setStatus("读取 " + slug + "…");
    try {
      var j = await QdApi.storeKbGet({ slug: slug });
      if (title) title.textContent = j.title || slug;
      body.textContent = j.body || "";
      detail.hidden = false;
      setStatus(j.path || slug);
    } catch (e) {
      setStatus("读取失败：" + (e && e.message ? e.message : e));
    }
  }

  async function organize() {
    var btn = $("qd-kb-organize");
    var q = ($("qd-kb-query") && $("qd-kb-query").value) || "";
    if (btn) btn.disabled = true;
    setStatus("智能整理中…");
    try {
      var j = await QdApi.storeOrganize({
        query: q || "求道",
        mode: "full",
        limit: 24,
      });
      var via = j.via || "";
      var n =
        (j.promote && j.promote.promoted) != null
          ? j.promote.promoted
          : "";
      if (via === "okf") {
        setStatus(j.summary || "已晋升 " + n + " 条");
      } else {
        setStatus(j.summary || j.warning || "已回退表格索引");
      }
      await refresh();
    } catch (e) {
      setStatus("整理失败：" + (e && e.message ? e.message : e));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bind() {
    if (!$("qd-kb-grid")) return;
    var btn = $("qd-kb-organize");
    if (btn) btn.addEventListener("click", organize);
    var grid = $("qd-kb-grid");
    grid.addEventListener("click", function (ev) {
      var t = ev.target;
      while (t && t !== grid) {
        if (t.classList && t.classList.contains("qd-kb-card")) {
          openNote(t.getAttribute("data-slug"));
          return;
        }
        t = t.parentNode;
      }
    });
    var close = $("qd-kb-detail-close");
    if (close) {
      close.addEventListener("click", function () {
        var d = $("qd-kb-detail");
        if (d) d.hidden = true;
      });
    }
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
