/* qdagent 2.0 — Engineering Knowledge UI helpers (Wave A) */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function show(el, obj) {
    if (!el) return;
    el.textContent =
      typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  }
  async function post(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    const t = await r.text();
    try {
      return JSON.parse(t);
    } catch (_) {
      return { ok: false, raw: t, status: r.status };
    }
  }
  async function get(path) {
    const r = await fetch(path, { credentials: "same-origin" });
    const t = await r.text();
    try {
      return JSON.parse(t);
    } catch (_) {
      return { ok: false, raw: t, status: r.status };
    }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ENG_SESS_KEY = "qdagent.eng.session.v1";
  function engSessionId() {
    try {
      let id = localStorage.getItem(ENG_SESS_KEY);
      if (!id) {
        id =
          "s-eng-" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 8);
        localStorage.setItem(ENG_SESS_KEY, id);
      }
      return id;
    } catch (_) {
      return "";
    }
  }
  function rememberSession(id) {
    if (!id) return;
    try {
      localStorage.setItem(ENG_SESS_KEY, id);
    } catch (_) {}
  }

  const pfBtn = $("qd-eng-preflight");
  if (pfBtn) {
    pfBtn.addEventListener("click", async () => {
      const task = ($("qd-eng-task") && $("qd-eng-task").value) || "";
      show($("qd-eng-out"), { status: "running…" });
      show($("qd-eng-out"), await post("/api/eng/preflight", { task: task }));
    });
  }

  const buildBtn = $("qd-eng-build");
  if (buildBtn) {
    buildBtn.addEventListener("click", async () => {
      const task =
        ($("qd-eng-task") && $("qd-eng-task").value) ||
        "给 OpenAI /v1 网关增加工程预检再调上游";
      show($("qd-eng-out"), { status: "building…" });
      const links = $("qd-eng-build-links");
      if (links) {
        links.hidden = true;
        links.innerHTML = "";
      }
      const sid = engSessionId();
      const out = await post("/api/eng/build", {
        task: task,
        session_id: sid,
      });
      show($("qd-eng-out"), out);
      if (out && out.session_id) rememberSession(out.session_id);
      const slug = out && out.slug;
      if (links && slug) {
        links.hidden = false;
        const sess = out.session_id || sid;
        links.innerHTML =
          'Workbook：<a href="/eng/run?slug=' +
          encodeURIComponent(slug) +
          '">' +
          esc(slug) +
          "</a> · Session：" +
          esc(sess) +
          ' · <a href="/eng/candidates">知识候选</a>';
      }
      loadToday();
    });
  }

  const hubOut = $("qd-eng-hub-out");
  const hubVerify = $("qd-eng-hub-verify");
  if (hubVerify) {
    hubVerify.addEventListener("click", async () => {
      show(hubOut, { status: "verify…" });
      show(hubOut, await post("/api/eng/verify", {}));
    });
  }
  const hubConflicts = $("qd-eng-hub-conflicts");
  if (hubConflicts) {
    hubConflicts.addEventListener("click", async () => {
      show(hubOut, { status: "conflicts…" });
      show(hubOut, await post("/api/eng/conflicts", {}));
    });
  }
  const hubStale = $("qd-eng-hub-stale");
  if (hubStale) {
    hubStale.addEventListener("click", async () => {
      show(hubOut, { status: "stale…" });
      show(hubOut, await post("/api/eng/stale", {}));
    });
  }
  const hubDup = $("qd-eng-hub-duplicate");
  if (hubDup) {
    hubDup.addEventListener("click", async () => {
      show(hubOut, { status: "duplicate…" });
      show(hubOut, await post("/api/eng/duplicate", {}));
    });
  }

  const vBtn = $("qd-eng-verify");
  if (vBtn) {
    vBtn.addEventListener("click", async () => {
      show($("qd-eng-verify-out"), { status: "running…" });
      show($("qd-eng-verify-out"), await post("/api/eng/verify", {}));
    });
  }

  const mBtn = $("qd-eng-metrics");
  if (mBtn) {
    mBtn.addEventListener("click", async () => {
      show($("qd-eng-metrics-out"), { status: "running…" });
      show($("qd-eng-metrics-out"), await get("/api/eng/metrics"));
    });
  }

  function renderList(ul, items, emptyText) {
    if (!ul) return;
    ul.innerHTML = "";
    const rows = items || [];
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "qd-muted";
      li.textContent = emptyText || "（无）";
      ul.appendChild(li);
      return;
    }
    rows.forEach(function (item) {
      const li = document.createElement("li");
      if (typeof item === "string") {
        li.textContent = item;
      } else if (item && item.slug) {
        li.textContent = item.slug + (item.kind ? " · " + item.kind : "");
      } else {
        li.textContent = JSON.stringify(item);
      }
      ul.appendChild(li);
    });
  }

  async function openCapability(id) {
    const detail = $("qd-eng-cap-detail");
    const title = $("qd-eng-cap-title");
    const meta = $("qd-eng-cap-meta");
    if (!detail) return;
    detail.hidden = false;
    if (title) title.textContent = id;
    if (meta) meta.textContent = "加载中…";
    const out = await post("/api/eng/capability", { id: id });
    if (!out || out.ok === false) {
      if (meta) meta.textContent = (out && out.error) || "not_found";
      show($("qd-eng-cap-catalog"), out);
      return;
    }
    if (meta) meta.textContent = out.path || "";
    renderList($("qd-eng-cap-impl"), out.implemented_by, "（无 Implemented By）");
    renderList($("qd-eng-cap-dup"), out.possible_duplicates, "（无）");
    renderList($("qd-eng-cap-constraints"), out.constraints, "（无关联 Constraint）");
    renderList($("qd-eng-cap-failures"), out.failures, "（无关联 Failure）");
    show($("qd-eng-cap-catalog"), {
      id: out.id,
      path: out.path,
      catalog: out.catalog,
    });
    history.replaceState(
      null,
      "",
      "/eng/capability?id=" + encodeURIComponent(out.id || id)
    );
  }

  async function runFind() {
    const q = ($("qd-eng-query") && $("qd-eng-query").value) || "";
    show($("qd-eng-find-out"), { status: "running…" });
    const out = await post("/api/eng/find", { query: q });
    show($("qd-eng-find-out"), out);
    const ul = $("qd-eng-cap-hits");
    if (!ul) return;
    ul.innerHTML = "";
    const pack = (out && out.hits) || {};
    const hits = pack.hits || (Array.isArray(out && out.hits) ? out.hits : []) || [];
    const list = Array.isArray(hits) ? hits : [];
    if (!list.length) {
      ul.innerHTML = "<li class=\"qd-muted\">无命中</li>";
      return;
    }
    list.forEach(function (hit) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      const rawId = hit.id || "";
      const kind = hit.kind || "";
      a.textContent =
        rawId +
        (kind ? " · " + kind : "") +
        (hit.title ? " — " + hit.title : "") +
        (hit.score != null ? " (" + Number(hit.score).toFixed(2) + ")" : "");
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        let cid = rawId;
        if (cid.indexOf("capability:") === 0) cid = cid.slice("capability:".length);
        if (kind === "Capability" || rawId.indexOf("capability:") === 0) {
          openCapability(cid);
        } else {
          show($("qd-eng-find-out"), hit);
        }
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  const fBtn = $("qd-eng-find");
  if (fBtn) {
    fBtn.addEventListener("click", function () {
      runFind();
    });
  }
  if ($("qd-eng-cap-hits") || $("qd-eng-cap-detail")) {
    const qid = new URLSearchParams(location.search).get("id");
    if (qid) openCapability(qid);
  }

  const candOut = $("qd-eng-cand-out");
  const candList = $("qd-eng-cand-list");
  const candHint = $("qd-eng-cand-hint");
  if (candList) {
    candList.addEventListener("click", async () => {
      show(candOut, { status: "running…" });
      show(candOut, await post("/api/eng/candidates", {}));
    });
  }
  const candPromote = $("qd-eng-cand-promote");
  if (candPromote) {
    candPromote.addEventListener("click", async () => {
      const slug = ($("qd-eng-cand-slug") && $("qd-eng-cand-slug").value) || "";
      show(candOut, { status: "promoting…" });
      const out = await post("/api/eng/promote", { slug: slug });
      show(candOut, out);
      if (candHint) {
        candHint.hidden = false;
        candHint.textContent =
          "晋升后请跑：./scripts/qdagent knowledge  （刷新 EKC）";
      }
    });
  }
  const candReject = $("qd-eng-cand-reject");
  if (candReject) {
    candReject.addEventListener("click", async () => {
      const slug = ($("qd-eng-cand-slug") && $("qd-eng-cand-slug").value) || "";
      show(candOut, { status: "rejecting…" });
      show(candOut, await post("/api/eng/reject", { slug: slug }));
    });
  }

  async function openWorkbook(slug) {
    const detail = $("qd-eng-wb-detail");
    const title = $("qd-eng-wb-title");
    const meta = $("qd-eng-wb-meta");
    const body = $("qd-eng-wb-body");
    if (!detail || !body) return;
    detail.hidden = false;
    if (title) title.textContent = slug;
    show(body, { status: "loading…" });
    const out = await post("/api/eng/workbook", { slug: slug });
    const sec = (out && out.sections) || {};
    if (meta) {
      meta.textContent =
        "status=" +
        (sec.status || "") +
        " · decision=" +
        (sec.decision || "") +
        " · task=" +
        (sec.task || "");
    }
    const focus = {
      task: sec.task,
      decision: sec.decision,
      plan: sec.plan,
      evidence: sec.evidence,
      result: sec.result,
      metrics: sec.metrics,
      verification: sec.verification,
      status: sec.status,
    };
    show(body, { ok: out.ok, slug: slug, sections: focus, body: out.body });
    const link = $("qd-eng-wb-to-cand");
    if (link) link.href = "/eng/candidates";
  }

  async function refreshWorkbooks() {
    const ul = $("qd-eng-wb-list");
    if (!ul) return;
    ul.innerHTML = "<li class=\"qd-muted\">加载中…</li>";
    const out = await post("/api/eng/workbooks", { limit: 30 });
    const rows = (out && out.workbooks) || [];
    if (!rows.length) {
      ul.innerHTML = "<li class=\"qd-muted\">暂无 workbook（先在预检页执行 BUILD）</li>";
      return;
    }
    ul.innerHTML = "";
    rows.forEach(function (row) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent =
        (row.slug || "") +
        " — " +
        (row.status || "") +
        " — " +
        String(row.task || "").slice(0, 64);
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        openWorkbook(row.slug);
        history.replaceState(null, "", "/eng/run?slug=" + encodeURIComponent(row.slug));
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  const wbRefresh = $("qd-eng-wb-refresh");
  if (wbRefresh) {
    wbRefresh.addEventListener("click", function () {
      refreshWorkbooks();
    });
  }
  if ($("qd-eng-wb-list")) {
    refreshWorkbooks();
    const q = new URLSearchParams(location.search).get("slug");
    if (q) openWorkbook(q);
  }

  async function loadToday() {
    const el = $("qd-eng-today");
    if (!el) return;
    const out = await get("/api/eng/today");
    if (!out || out.ok === false) {
      el.textContent = JSON.stringify(out, null, 2);
      return;
    }
    const wbs = out.workbooks || [];
    const sessions = out.sessions || [];
    const kpi = out.metrics || {};
    let html =
      "<p><strong>工作簿</strong> " +
      esc(out.workbook_count) +
      " · <strong>候选</strong> " +
      esc(out.candidates) +
      " · <strong>Session</strong> " +
      esc(out.session_count) +
      " · <a href=\"/eng/run\">全部工作簿</a> · <a href=\"/eng/candidates\">知识候选</a></p>";
    if (wbs.length) {
      html += "<ul class=\"qd-eng-today-list\">";
      wbs.forEach(function (row) {
        html +=
          "<li><a href=\"/eng/run?slug=" +
          encodeURIComponent(row.slug || "") +
          "\">" +
          esc(row.slug) +
          "</a> · " +
          esc(row.status) +
          " · " +
          esc(String(row.task || "").slice(0, 48)) +
          "</li>";
      });
      html += "</ul>";
    } else {
      html += "<p class=\"qd-muted\">尚无 workbook — 下方执行 BUILD 开始 dogfood。</p>";
    }
    if (sessions.length) {
      html += "<p class=\"qd-muted\"><strong>最近 Session</strong></p><ul class=\"qd-eng-today-list\">";
      sessions.forEach(function (row) {
        html +=
          "<li>" +
          esc(row.id) +
          " · " +
          esc(row.surface) +
          " · " +
          esc(row.workbook_slug || row.run_id || "") +
          "</li>";
      });
      html += "</ul>";
    }
    const reuse = kpi.reuse_ratio != null ? kpi.reuse_ratio : kpi.reuse;
    if (reuse != null || kpi.adapt_ratio != null) {
      html +=
        "<p class=\"qd-muted\">KPI reuse=" +
        esc(reuse) +
        " adapt=" +
        esc(kpi.adapt_ratio) +
        " novel=" +
        esc(kpi.novel_ratio) +
        "</p>";
    }
    el.innerHTML = html;
  }

  if ($("qd-eng-today")) loadToday();
})();
