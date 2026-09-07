/* MCP 接入页：复制配置 + 健康检查 */
(function () {
  function boot() {
    var pre = document.getElementById("qd-mcp-json");
    var copyBtn = document.getElementById("qd-mcp-copy");
    var status = document.getElementById("qd-mcp-status");
    var healthBtn = document.getElementById("qd-mcp-health");
    if (!pre) return;

    var rootHint = (window.QDAGENT_ROOT_HINT || "").trim();
    var scriptPath =
      rootHint ||
      "/home/cflmy/work/qdagent/scripts/qdagent_mcp.py";
    var dataPath =
      (window.QDAGENT_DATA_HINT || "").trim() ||
      "/home/cflmy/work/qdagent/data";

    var cfg = {
      mcpServers: {
        qdagent: {
          command: "python3",
          args: [scriptPath],
          env: {
            QDAGENT_DATA: dataPath,
          },
        },
      },
    };
    pre.textContent = JSON.stringify(cfg, null, 2);

    fetch(QdApi.proxyBase() + "/health")
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.data_root) {
          dataPath = j.data_root;
          var repo = dataPath.replace(/\/data\/?$/, "");
          scriptPath = repo + "/scripts/qdagent_mcp.py";
          cfg.mcpServers.qdagent.args = [scriptPath];
          cfg.mcpServers.qdagent.env.QDAGENT_DATA = dataPath;
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
        } else {
          if (status) status.textContent = "请手动全选复制";
        }
      });
    }

    if (healthBtn && window.QdApi) {
      healthBtn.addEventListener("click", function () {
        fetch(QdApi.proxyBase() + "/health")
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            if (status)
              status.textContent =
                "代理健康：" +
                JSON.stringify(j) +
                " · MCP 请在 Cursor 侧 Tools 列表确认 qd_*";
          })
          .catch(function (e) {
            if (status) status.textContent = "代理不可用：" + e.message;
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
