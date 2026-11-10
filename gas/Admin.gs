/**
 * ส่วนผู้ดูแลระบบ: ปีงบประมาณ ผู้ใช้ ตั้งค่า แดชบอร์ด และบันทึกการใช้งาน
 */

const SETTING_KEYS = ['site_name', 'org_name', 'logo_url', 'theme_color', 'frontend_url'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* ---------- ปีงบประมาณ ---------- */

function fyList_() {
  return readAll_('FiscalYears').map(strip_).sort(function (a, b) { return Number(b.year) - Number(a.year); });
}

function fySave_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  const d = ctx.data;
  const year = parseInt(d.year, 10);
  if (!(year >= 2500 && year <= 2700)) fail_('กรุณาระบุปีงบประมาณเป็น พ.ศ. เช่น 2569');
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(d.start_date) || !re.test(d.end_date)) fail_('กรุณาระบุวันเริ่มต้นและวันสิ้นสุด');
  if (d.start_date >= d.end_date) fail_('วันเริ่มต้นต้องมาก่อนวันสิ้นสุด');

  const all = readAll_('FiscalYears');
  if (all.some(function (f) { return Number(f.year) === year && f.fy_id !== d.fy_id; })) {
    fail_('มีปีงบประมาณ ' + year + ' อยู่แล้ว');
  }
  const active = d.is_active === true || d.is_active === 'TRUE';
  if (active) {
    all.forEach(function (f) {
      if (f.fy_id !== d.fy_id && f.is_active === 'TRUE') update_('FiscalYears', f, { is_active: 'FALSE' });
    });
  }
  const rec = { year: String(year), start_date: d.start_date, end_date: d.end_date, is_active: active ? 'TRUE' : 'FALSE' };
  let saved;
  if (d.fy_id) {
    const cur = all.find(function (f) { return f.fy_id === d.fy_id; });
    if (!cur) fail_('ไม่พบปีงบประมาณที่ต้องการแก้ไข');
    saved = strip_(update_('FiscalYears', cur, rec));
  } else {
    rec.fy_id = uuid_();
    saved = insert_('FiscalYears', rec);
  }
  log_(admin.user_id, 'fy_save', 'ปีงบประมาณ ' + year);
  return saved;
}

function fyDelete_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  const id = ctx.data.fy_id;
  const f = findBy_('FiscalYears', 'fy_id', id);
  if (!f) fail_('ไม่พบปีงบประมาณ');
  if (filterBy_('Projects', 'fy_id', id).length) fail_('ไม่สามารถลบได้ เนื่องจากมีโครงการอยู่ในปีงบประมาณนี้');
  removeWhere_('FiscalYears', function (r) { return r.fy_id === id; });
  log_(admin.user_id, 'fy_delete', 'ปีงบประมาณ ' + f.year);
  return true;
}

/* ---------- ผู้ใช้ ---------- */

function userList_(ctx) {
  requireUser_(ctx, ['admin']);
  return readAll_('Users').map(publicUser_).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
}

function userSetRole_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  const role = ctx.data.role;
  if (ROLES.indexOf(role) < 0) fail_('บทบาทไม่ถูกต้อง');
  if (ctx.data.user_id === admin.user_id) fail_('ไม่สามารถเปลี่ยนบทบาทของตนเองได้');
  const u = findBy_('Users', 'user_id', ctx.data.user_id);
  if (!u) fail_('ไม่พบผู้ใช้');
  const updated = update_('Users', u, { role: role });
  log_(admin.user_id, 'user_role', u.email + ' → ' + role);
  return publicUser_(updated);
}

function userSetStatus_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  const status = ctx.data.status;
  if (['active', 'suspended'].indexOf(status) < 0) fail_('สถานะไม่ถูกต้อง');
  if (ctx.data.user_id === admin.user_id) fail_('ไม่สามารถเปลี่ยนสถานะของตนเองได้');
  const u = findBy_('Users', 'user_id', ctx.data.user_id);
  if (!u) fail_('ไม่พบผู้ใช้');
  const patch = { status: status };
  if (status === 'active') { patch.verify_token = ''; patch.verify_expires = ''; }
  const updated = update_('Users', u, patch);
  if (status === 'suspended') removeWhere_('Sessions', function (s) { return s.user_id === u.user_id; });
  log_(admin.user_id, 'user_status', u.email + ' → ' + status);
  return publicUser_(updated);
}

/* ---------- ตั้งค่า ---------- */

function settingsGet_() {
  const s = getSettings_();
  const out = {};
  SETTING_KEYS.forEach(function (k) { out[k] = s[k] || ''; });
  return out;
}

function settingsSave_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  const d = ctx.data;
  if (d.frontend_url) {
    d.frontend_url = String(d.frontend_url).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(d.frontend_url)) fail_('URL หน้าเว็บต้องขึ้นต้นด้วย http:// หรือ https://');
  }
  if (d.theme_color && !/^#[0-9a-fA-F]{6}$/.test(d.theme_color)) fail_('รหัสสีไม่ถูกต้อง');
  const rows = readAll_('Settings');
  SETTING_KEYS.forEach(function (k) {
    if (d[k] === undefined) return;
    const val = clean_(d[k], 500);
    const r = rows.find(function (x) { return x.key === k; });
    if (r) update_('Settings', r, { value: val });
    else insert_('Settings', { key: k, value: val });
  });
  log_(admin.user_id, 'settings_save', '');
  return settingsGet_();
}

function settingsTestMail_(ctx) {
  const admin = requireUser_(ctx, ['admin']);
  sendMail_(admin.email, 'ทดสอบการส่งอีเมล - ' + siteName_(),
    mailLayout_('ทดสอบการส่งอีเมล', '<p>ระบบสามารถส่งอีเมลได้ตามปกติ</p>', '', '', 'ส่งเมื่อ ' + new Date().toLocaleString('th-TH')));
  return { to: admin.email, quota: MailApp.getRemainingDailyQuota() };
}

/* ---------- แดชบอร์ดผู้ดูแล ---------- */

function dashAdmin_(ctx) {
  requireUser_(ctx, ['admin']);
  const users = readAll_('Users');
  const count = function (f) { return users.filter(f).length; };
  const fys = readAll_('FiscalYears');
  const activeFy = fys.find(function (f) { return f.is_active === 'TRUE'; });
  const projects = readAll_('Projects');

  return {
    users: {
      total: users.length,
      active: count(function (u) { return u.status === 'active'; }),
      pending: count(function (u) { return u.status === 'pending'; }),
      suspended: count(function (u) { return u.status === 'suspended'; }),
      admin: count(function (u) { return u.role === 'admin'; }),
      creator: count(function (u) { return u.role === 'creator'; }),
      user: count(function (u) { return u.role === 'user'; })
    },
    fiscal_years: fys.length,
    active_fy: activeFy ? activeFy.year : null,
    projects: activeFy ? projects.filter(function (p) { return p.fy_id === activeFy.fy_id; }).length : projects.length,
    enrollments: readAll_('Enrollments').length,
    monthly: monthly12_(users),
    recent: users.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 6).map(publicUser_),
    mail_quota: MailApp.getRemainingDailyQuota()
  };
}

/** จำนวนผู้สมัครใหม่ย้อนหลัง 12 เดือน */
function monthly12_(users) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0');
    out.push({ key: key, label: THAI_MONTHS[m.getMonth()] + ' ' + String(m.getFullYear() + 543).slice(-2), count: 0 });
  }
  users.forEach(function (u) {
    const dt = new Date(u.created_at);
    if (isNaN(dt)) return;
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    const o = out.find(function (x) { return x.key === key; });
    if (o) o.count++;
  });
  return out;
}

/* ---------- บันทึกการใช้งาน ---------- */

function logsList_(ctx) {
  requireUser_(ctx, ['admin']);
  const users = {};
  readAll_('Users').forEach(function (u) { users[u.user_id] = u; });
  return readAll_('Logs').slice(-300).reverse().map(function (l) {
    const u = users[l.user_id];
    return {
      timestamp: l.timestamp, action: l.action, detail: l.detail,
      user_name: u ? (u.first_name + ' ' + u.last_name) : '', user_email: u ? u.email : ''
    };
  });
}
