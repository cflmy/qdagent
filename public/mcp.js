/* MCP 接入页：stdio + Streamable HTTP 配置 */
(function () {
  function boot() {
    var pre = document.getElementById("qd-mcp-json");
    var copyBtn = document.getElementById("qd-mcp-copy");
    var copyHttp = document.getElementById("qd-mcp-copy-http");
    var status = document.getElementById("qd-mcp-status");
    var healthBtn = document.getElementById("qd-mcp-health");
    if (!pre) return;

    var repo =
      (window.QDAGENT_ROOT_HINT || "").trim() || "/home/cflmy/work/qdagent";
    var dataPath =
      (window.QDAGENT_DATA_HINT || "").trim() || repo + "/data";
    var marqdoExt = (window.MARQDO_EXT_HINT || "/home/cflmy/.marqdo/ext").replace(
      /^~/,
      ""
    );

    var cfgStdio = {
      mcpServers: {
        qdagent: {
          command: "marqdo",
          args: ["run", repo + "/cli/求道-mcp.mq.md"],
          env: {
            MARQDO_EXT: marqdoExt,
            QDAGENT_DATA: dataPath,
          },
        },
      },
    };

    var cfgHttp = {
      mcpServers: {
        qdagent: {
          url: "http://127.0.0.1:7434/mcp",
        },
      },
      _qdagent_launch:
        "QDAGENT_MCP_TRANSPORT=http QDAGENT_MCP_PORT=7434 marqdo run cli/求道-mcp.mq.md",
    };

    pre.textContent = JSON.stringify(cfgStdio, null, 2);

    fetch("/api/health", { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.data_root) {
          cfgStdio.mcpServers.qdagent.env.QDAGENT_DATA = j.data_root;
          var root = j.data_root.replace(/\/data\/?$/, "");
          if (root) {
            cfgStdio.mcpServers.qdagent.args = [
              "run",
              root + "/cli/求道-mcp.mq.md",
            ];
          }
          pre.textContent = JSON.stringify(cfgStdio, null, 2);
        }
      })
      .catch(function () {});

    function copyText(text, okMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            if (status) status.textContent = okMsg || "已复制到剪贴板";
          },
          function () {
            if (status) status.textContent = "复制失败，请手动全选";
          }
        );
      } else if (status) status.textContent = "请手动全选复制";
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        pre.textContent = JSON.stringify(cfgStdio, null, 2);
        copyText(pre.textContent, "已复制 stdio mcp.json");
      });
    }
    if (copyHttp) {
      copyHttp.addEventListener("click", function () {
        pre.textContent = JSON.stringify(cfgHttp, null, 2);
        copyText(pre.textContent, "已复制 Streamable HTTP 配置（先启动 http 宿主）");
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
                "宿主健康：" +
                JSON.stringify(j) +
                " · stdio: marqdo run cli/求道-mcp.mq.md · http: QDAGENT_MCP_TRANSPORT=http";
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
