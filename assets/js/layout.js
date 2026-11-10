/* สร้าง Sidebar และ Topbar ตามบทบาทผู้ใช้ */
const Layout = (() => {
  const MENUS = {
    admin: [
      { section: 'ภาพรวม' },
      { key: 'dashboard', icon: 'grid-1x2', label: 'แดชบอร์ด', href: 'admin/dashboard.html' },
      { section: 'การฝึกอบรม' },
      { key: 'projects', icon: 'folder2-open', label: 'โครงการทั้งหมด', soon: true },
      { key: 'reports', icon: 'bar-chart-line', label: 'รายงานผล', soon: true },
      { section: 'จัดการระบบ' },
      { key: 'users', icon: 'people', label: 'ผู้ใช้งาน', href: 'admin/users.html' },
      { key: 'fy', icon: 'calendar3', label: 'ปีงบประมาณ', href: 'admin/fiscal-years.html' },
      { key: 'settings', icon: 'sliders', label: 'ตั้งค่าระบบ', href: 'admin/settings.html' },
      { key: 'logs', icon: 'clock-history', label: 'บันทึกการใช้งาน', href: 'admin/logs.html' }
    ],
    creator: [
      { section: 'ภาพรวม' },
      { key: 'dashboard', icon: 'grid-1x2', label: 'แดชบอร์ด', href: 'creator/dashboard.html' },
      { section: 'หลักสูตรของฉัน' },
      { key: 'projects', icon: 'folder2-open', label: 'โครงการของฉัน', soon: true },
      { key: 'participants', icon: 'person-check', label: 'ผู้เข้าร่วม', soon: true },
      { key: 'grading', icon: 'clipboard-check', label: 'ตรวจงาน', soon: true },
      { key: 'reports', icon: 'bar-chart-line', label: 'รายงานผล', soon: true }
    ],
    user: [
      { section: 'เมนูหลัก' },
      { key: 'dashboard', icon: 'grid-1x2', label: 'แดชบอร์ด', href: 'user/dashboard.html' },
      { key: 'explore', icon: 'search', label: 'ค้นหาโครงการ', soon: true },
      { key: 'results', icon: 'award', label: 'ผลการอบรม', soon: true }
    ]
  };
  const COMMON = [
    { section: 'บัญชีของฉัน' },
    { key: 'profile', icon: 'person-circle', label: 'ข้อมูลส่วนตัว', href: 'user/profile.html' }
  ];

  function sidebar(user, active) {
    const r = UI.root();
    const items = [...(MENUS[user.role] || MENUS.user), ...COMMON];
    const nav = items.map(it => {
      if (it.section) return `<div class="side-section">${it.section}</div>`;
      if (it.soon) return `<span class="side-link disabled" title="กำลังพัฒนา"><i class="bi bi-${it.icon}"></i>${it.label}<span class="soon">เร็ว ๆ นี้</span></span>`;
      return `<a class="side-link ${it.key === active ? 'active' : ''}" href="${r}${it.href}"><i class="bi bi-${it.icon}"></i>${it.label}</a>`;
    }).join('');
    return `
      <div class="sidebar-inner">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <a class="brand" href="${r}index.html">
            <span class="brand-logo" data-site-logo><i class="bi bi-mortarboard-fill"></i></span>
            <span class="min-w-0"><span class="brand-name d-block" data-site-name>${UI.esc(APP_CONFIG.APP_NAME)}</span><span class="brand-sub d-block text-truncate" data-org-name></span></span>
          </a>
          <button type="button" class="btn-close btn-close-white d-lg-none mt-2" data-bs-dismiss="offcanvas" data-bs-target="#sidebar" aria-label="ปิดเมนู"></button>
        </div>
        <nav>${nav}</nav>
        <div class="side-user">
          <span class="avatar">${UI.esc(UI.initials(user))}</span>
          <div class="min-w-0 lh-sm">
            <div class="fw-semibold text-white text-truncate small">${UI.esc(user.first_name)} ${UI.esc(user.last_name)}</div>
            <div class="small opacity-75">${UI.roleLabel(user.role)}</div>
          </div>
        </div>
      </div>`;
  }

  function topbar(user, title) {
    const r = UI.root();
    const dark = UI.getTheme() === 'dark';
    return `
      <button class="icon-btn d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-label="เปิดเมนู"><i class="bi bi-list fs-5"></i></button>
      <h1 class="topbar-title flex-grow-1">${UI.esc(title)}</h1>
      ${API.isDemo() ? '<span class="badge-soft warning d-none d-sm-inline-flex" title="ยังไม่ได้เชื่อม Google Sheets ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น"><i class="bi bi-lightning-charge"></i>โหมดทดลอง</span>' : ''}
      <button class="icon-btn" type="button" id="themeToggle" title="สลับโหมดสว่าง/มืด" aria-label="สลับโหมดสว่าง/มืด"><i class="bi bi-${dark ? 'sun' : 'moon-stars'}"></i></button>
      <div class="dropdown">
        <button class="btn p-0 border-0 d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="avatar">${UI.esc(UI.initials(user))}</span>
          <span class="d-none d-md-block text-start lh-sm">
            <span class="d-block fw-semibold small">${UI.esc(user.first_name)} ${UI.esc(user.last_name)}</span>
            <span class="text-muted" style="font-size:.75rem">${UI.roleLabel(user.role)}</span>
          </span>
          <i class="bi bi-chevron-down small text-muted d-none d-md-inline"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li class="px-3 py-2"><div class="fw-semibold small">${UI.esc(UI.fullName(user))}</div><div class="small text-muted">${UI.esc(user.email)}</div></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="${r}${Auth.homePath(user.role)}"><i class="bi bi-grid-1x2 me-2"></i>แดชบอร์ด</a></li>
          <li><a class="dropdown-item" href="${r}user/profile.html"><i class="bi bi-person-circle me-2"></i>ข้อมูลส่วนตัว</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" type="button" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>ออกจากระบบ</button></li>
        </ul>
      </div>`;
  }

  function init(user, { active = '', title = '' } = {}) {
    UI.$('#sidebar').innerHTML = sidebar(user, active);
    UI.$('#topbar').innerHTML = topbar(user, title);
    UI.$('#themeToggle').addEventListener('click', e => {
      const t = UI.toggleTheme();
      e.currentTarget.innerHTML = `<i class="bi bi-${t === 'dark' ? 'sun' : 'moon-stars'}"></i>`;
    });
    UI.$('#logoutBtn').addEventListener('click', async () => {
      if (await UI.confirm('ออกจากระบบ?', '', 'ออกจากระบบ', 'question')) Auth.logout();
    });
    UI.loadSettings().then(s => { document.title = `${title} | ${s.site_name || APP_CONFIG.APP_NAME}`; });
  }

  return { init };
})();
