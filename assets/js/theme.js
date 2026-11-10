/* โหลดใน <head> เพื่อให้โหมดมืด/สีหลักแสดงทันทีโดยไม่กระพริบ */
(function () {
  try {
    var t = localStorage.getItem('tms_theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', t);
    var c = JSON.parse(localStorage.getItem('tms_settings') || 'null');
    var hex = c && c.v && c.v.theme_color;
    var m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (m) {
      var n = parseInt(m[1], 16);
      document.documentElement.style.setProperty('--tms-primary', hex);
      document.documentElement.style.setProperty('--tms-primary-rgb', ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255));
    }
  } catch (e) { /* ignore */ }
})();
