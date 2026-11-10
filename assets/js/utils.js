/* ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันทุกหน้า */
const UI = (() => {
  const ROLE = {
    admin:   { label: 'ผู้ดูแลระบบ',     cls: 'danger',  icon: 'shield-lock' },
    creator: { label: 'ผู้สร้างหลักสูตร', cls: 'purple',  icon: 'easel2' },
    user:    { label: 'ผู้ใช้ทั่วไป',      cls: 'primary', icon: 'person' }
  };
  const STATUS = {
    active:    { label: 'ใช้งาน',         cls: 'success',   icon: 'check-circle' },
    pending:   { label: 'รอยืนยันอีเมล',   cls: 'warning',   icon: 'hourglass-split' },
    suspended: { label: 'ระงับการใช้งาน',  cls: 'secondary', icon: 'slash-circle' }
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => (document.body && document.body.dataset.root) || '';
  const qs = name => new URLSearchParams(location.search).get(name);
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function swalReady() { return typeof Swal !== 'undefined'; }
  const SWAL_BASE = { confirmButtonColor: '#4F46E5', cancelButtonColor: '#9CA3AF', confirmButtonText: 'ตกลง', cancelButtonText: 'ยกเลิก' };

  function toast(msg, icon = 'success') {
    if (!swalReady()) return alert(msg);
    Swal.fire({ toast: true, position: 'top-end', icon, title: msg, showConfirmButton: false, timer: 2600, timerProgressBar: true });
  }
  function error(err, title = 'เกิดข้อผิดพลาด') {
    const text = (err && err.message) || String(err);
    if (!swalReady()) return alert(text);
    return Swal.fire({ ...SWAL_BASE, icon: 'error', title, text });
  }
  function success(title, text = '') {
    if (!swalReady()) return alert(title);
    return Swal.fire({ ...SWAL_BASE, icon: 'success', title, text });
  }
  async function confirm(title, text = '', confirmText = 'ยืนยัน', icon = 'warning') {
    if (!swalReady()) return window.confirm(title);
    const r = await Swal.fire({ ...SWAL_BASE, icon, title, text, showCancelButton: true, confirmButtonText: confirmText, reverseButtons: true });
    return r.isConfirmed;
  }

  function btnLoading(btn, on, text = 'กำลังดำเนินการ...') {
    if (!btn) return;
    if (on) {
      btn.dataset.html = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${esc(text)}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  }

  function formData(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  }

  function fillForm(form, data) {
    Object.entries(data || {}).forEach(([k, v]) => {
      const el = form.elements[k];
      if (!el) return;
      if (el.type === 'checkbox') el.checked = v === true || v === 'TRUE';
      else el.value = v ?? '';
    });
  }

  function thaiDate(iso, withTime = false) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    const opt = { year: 'numeric', month: 'short', day: 'numeric' };
    if (withTime) { opt.hour = '2-digit'; opt.minute = '2-digit'; }
    return d.toLocaleString('th-TH', opt);
  }
  function thaiDateLong(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return isNaN(d) ? esc(iso) : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function timeAgo(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return 'เมื่อสักครู่';
    if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
    if (s < 86400) return Math.floor(s / 3600) + ' ชั่วโมงที่แล้ว';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' วันที่แล้ว';
    return thaiDate(iso);
  }

  /** ปีงบประมาณ (พ.ศ.) ปัจจุบัน: เริ่ม 1 ต.ค. */
  function currentFY() { const d = new Date(); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0); }
  function fyRange(beYear) { return { start_date: (beYear - 544) + '-10-01', end_date: (beYear - 543) + '-09-30' }; }

  const fullName = u => u ? `${u.prefix || ''}${u.first_name || ''} ${u.last_name || ''}`.trim() : '';
  const initials = u => u ? ((u.first_name || '?').charAt(0) + (u.last_name || '').charAt(0)) : '?';
  const roleLabel = r => (ROLE[r] || ROLE.user).label;
  const roleBadge = r => { const x = ROLE[r] || ROLE.user; return `<span class="badge-soft ${x.cls}"><i class="bi bi-${x.icon}"></i>${x.label}</span>`; };
  const statusBadge = s => { const x = STATUS[s] || { label: s, cls: 'secondary', icon: 'circle' }; return `<span class="badge-soft ${x.cls}"><i class="bi bi-${x.icon}"></i>${x.label}</span>`; };

  /* ---- password helpers ---- */
  function pwScore(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
    return pw.length < 8 ? Math.min(s, 1) : s;
  }
  function bindPasswordMeter(input, meter, label) {
    const colors = ['#EF4444', '#F59E0B', '#EAB308', '#10B981'];
    const texts = ['สั้นเกินไป', 'พอใช้', 'ดี', 'แข็งแรงมาก'];
    const bars = meter.querySelectorAll('span');
    input.addEventListener('input', () => {
      const v = input.value;
      const s = v ? Math.max(pwScore(v), 1) : 0;
      bars.forEach((b, i) => { b.style.background = i < s ? colors[s - 1] : ''; });
      if (label) label.textContent = v ? texts[s - 1] : 'อย่างน้อย 8 ตัวอักษร ผสมตัวพิมพ์ใหญ่ เล็ก และตัวเลข';
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-toggle-password]');
    if (!b) return;
    const inp = document.getElementById(b.dataset.togglePassword);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.innerHTML = `<i class="bi bi-eye${show ? '-slash' : ''}"></i>`;
  });

  /* ---- theme ---- */
  function getTheme() { return document.documentElement.getAttribute('data-bs-theme') || 'light'; }
  function toggleTheme() {
    const t = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', t);
    try { localStorage.setItem('tms_theme', t); } catch (e) { }
    document.dispatchEvent(new CustomEvent('tms:theme', { detail: t }));
    return t;
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }
  function applySettings(s) {
    if (!s) return;
    const rgb = hexToRgb(s.theme_color);
    if (rgb) {
      document.documentElement.style.setProperty('--tms-primary', s.theme_color);
      document.documentElement.style.setProperty('--tms-primary-rgb', rgb);
    }
    const name = s.site_name || APP_CONFIG.APP_NAME;
    $$('[data-site-name]').forEach(el => { el.textContent = name; });
    $$('[data-org-name]').forEach(el => { el.textContent = s.org_name || ''; });
    $$('[data-site-logo]').forEach(el => {
      if (s.logo_url) el.innerHTML = `<img src="${esc(s.logo_url)}" alt="">`;
    });
  }
  /** โหลดตั้งค่าระบบ (cache 10 นาที) */
  async function loadSettings(force = false) {
    let s = null;
    try {
      const c = JSON.parse(localStorage.getItem('tms_settings') || 'null');
      if (c && !force && Date.now() - c.t < 10 * 60 * 1000) s = c.v;
    } catch (e) { }
    if (!s) {
      try {
        s = await API.call('settings.get');
        try { localStorage.setItem('tms_settings', JSON.stringify({ t: Date.now(), v: s })); } catch (e) { }
      } catch (e) { s = {}; }
    }
    applySettings(s);
    return s;
  }

  return {
    esc, root, qs, $, $$, toast, error, success, confirm, btnLoading, formData, fillForm,
    thaiDate, thaiDateLong, timeAgo, currentFY, fyRange, fullName, initials, roleLabel, roleBadge, statusBadge,
    ROLE, STATUS, bindPasswordMeter, getTheme, toggleTheme, applySettings, loadSettings
  };
})();
