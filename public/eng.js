/* qdagent 2.0 — Engineering Knowledge UI helpers */
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

  const pfBtn = $("qd-eng-preflight");
  if (pfBtn) {
    pfBtn.addEventListener("click", async () => {
      const task = ($("qd-eng-task") && $("qd-eng-task").value) || "";
      show($("qd-eng-out"), { status: "running…" });
      show($("qd-eng-out"), await post("/api/eng/preflight", { task: task }));
    });
  }

  const vBtn = $("qd-eng-verify");
  if (vBtn) {
    vBtn.addEventListener("click", async () => {
      show($("qd-eng-verify-out"), { status: "running…" });
      show($("qd-eng-verify-out"), await post("/api/eng/verify", {}));
    });
  }

  const fBtn = $("qd-eng-find");
  if (fBtn) {
    fBtn.addEventListener("click", async () => {
      const q = ($("qd-eng-query") && $("qd-eng-query").value) || "";
      show($("qd-eng-find-out"), { status: "running…" });
      show($("qd-eng-find-out"), await post("/api/eng/reuse", { task: q }));
    });
  }
})();
