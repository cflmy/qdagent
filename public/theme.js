/* 求道 · theme toggle + logo swap (aligned with qdqc brand assets) */
(function () {
  var KEY = "qd-theme";
  var LOGO_DARK = "/static/logo.png";
  var LOGO_LIGHT = "/static/logo-light.png";

  function apply(theme) {
    if (theme !== "light" && theme !== "dark") theme = "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    var src = theme === "light" ? LOGO_LIGHT : LOGO_DARK;
    document.querySelectorAll(".nav-brand-logo").forEach(function (img) {
      img.setAttribute("src", src);
    });
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "浅色" : "深色";
      btn.classList.toggle("on-dark", theme === "dark");
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "切换到浅色模式" : "切换到深色模式"
      );
      btn.title = theme === "dark" ? "切换主题" : "切换主题";
    }
  }

  function current() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) {}
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(current());
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        apply(current() === "dark" ? "light" : "dark");
      });
    }
  });
})();
