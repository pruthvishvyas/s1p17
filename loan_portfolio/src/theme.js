// Runs before React mounts - prevents a flash of the wrong theme.
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
