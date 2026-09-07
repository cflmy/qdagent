/* 设置页：从 /api/settings 回填表单 */
(function () {
  var form = document.querySelector("form.site-form") || document.querySelector("form");
  if (!form) return;

  function fill(row) {
    if (!row) return;
    Object.keys(row).forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el && row[k] != null && row[k] !== "") el.value = row[k];
    });
  }

  fetch("/api/settings", { credentials: "same-origin" })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var rows = Array.isArray(data) ? data : data.rows || [];
      if (rows[0]) fill(rows[0]);
      else if (data && data.llm_model) fill(data);
    })
    .catch(function () {});
})();
