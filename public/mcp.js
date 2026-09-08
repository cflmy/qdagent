/* MCP 接入页：复制 Marqdo mcp_server 配置 */
(function () {
  function boot() {
    var pre = document.getElementById("qd-mcp-json");
    var copyBtn = document.getElementById("qd-mcp-copy");
    var status = document.getElementById("qd-mcp-status");
    var healthBtn = document.getElementById("qd-mcp-health");
    if (!pre) return;

    var repo =
      (window.QDAGENT_ROOT_HINT || "").trim() || "/home/cflmy/work/qdagent";
    var dataPath =
      (window.QDAGENT_DATA_HINT || "").trim() || repo + "/data";

    var cfg = {
      mcpServers: {
        qdagent: {
          command: "marqdo",
          args: ["run", repo + "/求道-mcp.mq.md"],
          env: {
            MARQDO_EXT: (window.MARQDO_EXT_HINT || "~/.marqdo/ext").replace(
              /^~/,
              ""
            ),
            QDAGENT_DATA: dataPath,
          },
        },
      },
    };
    // Expand ~ for display if needed
    if (!window.MARQDO_EXT_HINT) {
      cfg.mcpServers.qdagent.env.MARQDO_EXT = "/home/cflmy/.marqdo/ext";
    }
    pre.textContent = JSON.stringify(cfg, null, 2);

    fetch("/api/health", { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.data_root) {
          cfg.mcpServers.qdagent.env.QDAGENT_DATA = j.data_root;
          var root = j.data_root.replace(/\/data\/?$/, "");
          if (root) {
            cfg.mcpServers.qdagent.args = ["run", root + "/求道-mcp.mq.md"];
          }
          pre.textContent = JSON.stringify(cfg, null, 2);
        }
      })
      .catch(function () {});

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = pre.textContent || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              if (status) status.textContent = "已复制到剪贴板";
            },
            function () {
              if (status) status.textContent = "复制失败，请手动全选";
            }
          );
        } else if (status) status.textContent = "请手动全选复制";
      });
    }

    if (healthBtn) {
      healthBtn.addEventListener("click", function () {
        fetch("/api/health", { credentials: "same-origin" })
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            if (status)
              status.textContent =
                "宿主健康：" + JSON.stringify(j) + " · MCP 用 marqdo run 求道-mcp.mq.md";
          })
          .catch(function (e) {
            if (status) status.textContent = "不可用：" + e.message;
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
