/**
 * โหมดทดลอง (Demo mode)
 * จำลอง API ของ Apps Script ด้วย localStorage ใช้เมื่อ APP_CONFIG.API_URL ว่าง
 * ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น ล้างได้ด้วย Mock.reset()
 * บัญชีทดลอง: admin@demo.local / admin1234, creator@demo.local / creator1234, user@demo.local / user1234
 */
const Mock = (() => {
  const KEY = 'tms_mock_db_v1';
  const now = () => new Date().toISOString();
  const addH = h => new Date(Date.now() + h * 3600e3).toISOString();
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const tok = () => (uid() + uid()).replace(/-/g, '');
  const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const ROLES = ['admin', 'creator', 'user'];
  const PROFILE = ['prefix', 'first_name', 'last_name', 'position', 'organization', 'phone'];
  const SETTING_KEYS = ['site_name', 'org_name', 'logo_url', 'theme_color', 'frontend_url'];

  function fyNow() { const d = new Date(); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0); }
  function fyRange(y) { return { start_date: (y - 544) + '-10-01', end_date: (y - 543) + '-09-30' }; }

  function seed() {
    const mk = (email, password, role, prefix, first, last, position, org, status, daysAgo) => ({
      user_id: uid(), email, password, prefix, first_name: first, last_name: last, position, organization: org, phone: '',
      role, status, verify_token: '', verify_expires: '', verify_sent_at: '', reset_token: '', reset_expires: '',
      created_at: new Date(Date.now() - daysAgo * 864e5).toISOString(), last_login: ''
    });
    const users = [
      mk('admin@demo.local', 'admin1234', 'admin', 'นาย', 'ผู้ดูแล', 'ระบบ', 'ผู้ดูแลระบบ', 'หน่วยงานตัวอย่าง', 'active', 300),
      mk('creator@demo.local', 'creator1234', 'creator', 'นางสาว', 'สมหญิง', 'ใจดี', 'ศึกษานิเทศก์', 'สำนักงานเขตพื้นที่การศึกษาตัวอย่าง', 'active', 200),
      mk('user@demo.local', 'user1234', 'user', 'นาย', 'สมชาย', 'รักเรียน', 'ครู', 'โรงเรียนบ้านตัวอย่าง', 'active', 45)
    ];
    [['นาง', 'มาลี', 'สุขใจ'], ['นาย', 'วิชัย', 'เก่งงาน'], ['นางสาว', 'ปวีณา', 'ศรีสุข'], ['นาย', 'ธนพล', 'มั่นคง'],
     ['นาง', 'กมลา', 'แสงทอง'], ['นาย', 'อนุชา', 'ทองดี'], ['นางสาว', 'ศิริพร', 'วงศ์ใหญ่']].forEach((n, i) => {
      users.push(mk(`teacher${i + 1}@demo.local`, 'demo1234', 'user', n[0], n[1], n[2], 'ครู',
        'โรงเรียนตัวอย่าง ' + (i + 1), i === 6 ? 'pending' : 'active', 5 + i * 40));
    });
    const y = fyNow();
    return {
      users, sessions: [], projects: [], enrollments: [], logs: [],
      fiscalYears: [
        { fy_id: uid(), year: String(y), ...fyRange(y), is_active: 'TRUE' },
        { fy_id: uid(), year: String(y - 1), ...fyRange(y - 1), is_active: 'FALSE' }
      ],
      settings: { site_name: 'ระบบฝึกอบรมออนไลน์', org_name: 'หน่วยงานตัวอย่าง (โหมดทดลอง)', logo_url: '', theme_color: '#4F46E5', frontend_url: '' }
    };
  }

  function load() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    if (!db) { db = seed(); save(db); }
    return db;
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }

  class MockError extends Error { constructor(msg, code) { super(msg); this.code = code || ''; } }
  const fail = (msg, code) => { throw new MockError(msg, code); };

  const pub = u => ({
    user_id: u.user_id, email: u.email, prefix: u.prefix, first_name: u.first_name, last_name: u.last_name,
    position: u.position, organization: u.organization, phone: u.phone, role: u.role, status: u.status,
    created_at: u.created_at, last_login: u.last_login
  });
  const norm = e => String(e || '').trim().toLowerCase();
  const clean = (s, max = 200) => String(s ?? '').trim().slice(0, max);
  const log = (db, user_id, action, detail = '') => db.logs.push({ timestamp: now(), user_id, action, detail });

  function requireUser(db, token, roles) {
    const s = db.sessions.find(x => x.session_token === token);
    if (!token || !s || new Date(s.expires_at) < new Date()) fail('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'AUTH');
    const u = db.users.find(x => x.user_id === s.user_id);
    if (!u || u.status !== 'active') fail('บัญชีนี้ไม่สามารถใช้งานได้', 'AUTH');
    if (roles && !roles.includes(u.role)) fail('คุณไม่มีสิทธิ์ใช้งานส่วนนี้', 'FORBIDDEN');
    return u;
  }

  const routes = {
    register(db, d) {
      const email = norm(d.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('รูปแบบอีเมลไม่ถูกต้อง');
      if (String(d.password || '').length < 8) fail('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      if (!clean(d.first_name) || !clean(d.last_name)) fail('กรุณากรอกชื่อและนามสกุล');
      const ex = db.users.find(u => u.email === email);
      if (ex) {
        if (ex.status === 'pending') fail('อีเมลนี้สมัครไว้แล้วแต่ยังไม่ได้ยืนยัน กรุณาตรวจสอบกล่องอีเมล หรือขอส่งอีเมลยืนยันอีกครั้ง', 'NOT_VERIFIED');
        fail('อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว');
      }
      const u = {
        user_id: uid(), email, password: d.password, role: 'user', status: 'pending',
        verify_token: tok(), verify_expires: addH(24), verify_sent_at: now(), reset_token: '', reset_expires: '',
        created_at: now(), last_login: ''
      };
      PROFILE.forEach(k => { u[k] = clean(d[k]); });
      db.users.push(u);
      log(db, u.user_id, 'register', email);
      return { email, demo_link: 'verify.html?token=' + u.verify_token };
    },
    verifyEmail(db, d) {
      const u = d.token && db.users.find(x => x.verify_token === d.token);
      if (!u) fail('ลิงก์ยืนยันไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
      if (new Date(u.verify_expires) < new Date()) fail('ลิงก์ยืนยันหมดอายุแล้ว กรุณาขอส่งอีเมลยืนยันใหม่', 'EXPIRED');
      Object.assign(u, { status: 'active', verify_token: '', verify_expires: '' });
      log(db, u.user_id, 'verify', u.email);
      return { email: u.email };
    },
    resendVerify(db, d) {
      const u = db.users.find(x => x.email === norm(d.email));
      if (!u) fail('ไม่พบอีเมลนี้ในระบบ');
      if (u.status !== 'pending') fail('บัญชีนี้ยืนยันอีเมลแล้ว สามารถเข้าสู่ระบบได้ทันที');
      Object.assign(u, { verify_token: tok(), verify_expires: addH(24), verify_sent_at: now() });
      return { email: u.email, demo_link: 'verify.html?token=' + u.verify_token };
    },
    login(db, d) {
      const u = db.users.find(x => x.email === norm(d.email));
      if (!u || u.password !== d.password) fail('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      if (u.status === 'pending') fail('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', 'NOT_VERIFIED');
      if (u.status !== 'active') fail('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      const token = tok();
      db.sessions.push({ session_token: token, user_id: u.user_id, created_at: now(), expires_at: addH(24 * 7) });
      u.last_login = now();
      log(db, u.user_id, 'login', u.email);
      return { token, user: pub(u) };
    },
    logout(db, d, token) {
      const s = db.sessions.find(x => x.session_token === token);
      db.sessions = db.sessions.filter(x => x.session_token !== token);
      if (s) log(db, s.user_id, 'logout');
      return true;
    },
    me(db, d, token) { return pub(requireUser(db, token)); },
    forgotPassword(db, d) {
      const u = db.users.find(x => x.email === norm(d.email));
      if (u && u.status === 'active') {
        Object.assign(u, { reset_token: tok(), reset_expires: addH(1) });
        log(db, u.user_id, 'forgot_password', u.email);
        return { sent: true, demo_link: 'reset-password.html?token=' + u.reset_token };
      }
      return { sent: true };
    },
    resetPassword(db, d) {
      if (String(d.password || '').length < 8) fail('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      const u = d.token && db.users.find(x => x.reset_token === d.token);
      if (!u) fail('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
      if (new Date(u.reset_expires) < new Date()) fail('ลิงก์หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่', 'EXPIRED');
      Object.assign(u, { password: d.password, reset_token: '', reset_expires: '' });
      db.sessions = db.sessions.filter(s => s.user_id !== u.user_id);
      log(db, u.user_id, 'reset_password', u.email);
      return true;
    },
    changePassword(db, d, token) {
      const u = requireUser(db, token);
      if (u.password !== d.old_password) fail('รหัสผ่านเดิมไม่ถูกต้อง');
      if (String(d.new_password || '').length < 8) fail('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      u.password = d.new_password;
      db.sessions = db.sessions.filter(s => s.user_id !== u.user_id || s.session_token === token);
      log(db, u.user_id, 'change_password');
      return true;
    },
    updateProfile(db, d, token) {
      const u = requireUser(db, token);
      const patch = {};
      PROFILE.forEach(k => { if (d[k] !== undefined) patch[k] = clean(d[k]); });
      if (patch.first_name === '' || patch.last_name === '') fail('กรุณากรอกชื่อและนามสกุล');
      Object.assign(u, patch);
      log(db, u.user_id, 'update_profile');
      return pub(u);
    },

    'fy.list'(db) { return db.fiscalYears.slice().sort((a, b) => b.year - a.year); },
    'fy.save'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      const year = parseInt(d.year, 10);
      if (!(year >= 2500 && year <= 2700)) fail('กรุณาระบุปีงบประมาณเป็น พ.ศ. เช่น 2569');
      if (!d.start_date || !d.end_date) fail('กรุณาระบุวันเริ่มต้นและวันสิ้นสุด');
      if (d.start_date >= d.end_date) fail('วันเริ่มต้นต้องมาก่อนวันสิ้นสุด');
      if (db.fiscalYears.some(f => Number(f.year) === year && f.fy_id !== d.fy_id)) fail('มีปีงบประมาณ ' + year + ' อยู่แล้ว');
      const active = d.is_active === true || d.is_active === 'TRUE';
      if (active) db.fiscalYears.forEach(f => { if (f.fy_id !== d.fy_id) f.is_active = 'FALSE'; });
      const rec = { year: String(year), start_date: d.start_date, end_date: d.end_date, is_active: active ? 'TRUE' : 'FALSE' };
      let saved;
      if (d.fy_id) {
        saved = db.fiscalYears.find(f => f.fy_id === d.fy_id);
        if (!saved) fail('ไม่พบปีงบประมาณที่ต้องการแก้ไข');
        Object.assign(saved, rec);
      } else {
        saved = { fy_id: uid(), ...rec };
        db.fiscalYears.push(saved);
      }
      log(db, a.user_id, 'fy_save', 'ปีงบประมาณ ' + year);
      return saved;
    },
    'fy.delete'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      const f = db.fiscalYears.find(x => x.fy_id === d.fy_id);
      if (!f) fail('ไม่พบปีงบประมาณ');
      if (db.projects.some(p => p.fy_id === d.fy_id)) fail('ไม่สามารถลบได้ เนื่องจากมีโครงการอยู่ในปีงบประมาณนี้');
      db.fiscalYears = db.fiscalYears.filter(x => x.fy_id !== d.fy_id);
      log(db, a.user_id, 'fy_delete', 'ปีงบประมาณ ' + f.year);
      return true;
    },

    'user.list'(db, d, token) {
      requireUser(db, token, ['admin']);
      return db.users.map(pub).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    'user.setRole'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      if (!ROLES.includes(d.role)) fail('บทบาทไม่ถูกต้อง');
      if (d.user_id === a.user_id) fail('ไม่สามารถเปลี่ยนบทบาทของตนเองได้');
      const u = db.users.find(x => x.user_id === d.user_id);
      if (!u) fail('ไม่พบผู้ใช้');
      u.role = d.role;
      log(db, a.user_id, 'user_role', u.email + ' → ' + d.role);
      return pub(u);
    },
    'user.setStatus'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      if (!['active', 'suspended'].includes(d.status)) fail('สถานะไม่ถูกต้อง');
      if (d.user_id === a.user_id) fail('ไม่สามารถเปลี่ยนสถานะของตนเองได้');
      const u = db.users.find(x => x.user_id === d.user_id);
      if (!u) fail('ไม่พบผู้ใช้');
      u.status = d.status;
      if (d.status === 'active') { u.verify_token = ''; u.verify_expires = ''; }
      if (d.status === 'suspended') db.sessions = db.sessions.filter(s => s.user_id !== u.user_id);
      log(db, a.user_id, 'user_status', u.email + ' → ' + d.status);
      return pub(u);
    },

    'settings.get'(db) { const o = {}; SETTING_KEYS.forEach(k => { o[k] = db.settings[k] || ''; }); return o; },
    'settings.save'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      if (d.frontend_url) {
        d.frontend_url = String(d.frontend_url).trim().replace(/\/+$/, '');
        if (!/^https?:\/\//.test(d.frontend_url)) fail('URL หน้าเว็บต้องขึ้นต้นด้วย http:// หรือ https://');
      }
      if (d.theme_color && !/^#[0-9a-fA-F]{6}$/.test(d.theme_color)) fail('รหัสสีไม่ถูกต้อง');
      SETTING_KEYS.forEach(k => { if (d[k] !== undefined) db.settings[k] = clean(d[k], 500); });
      log(db, a.user_id, 'settings_save');
      return routes['settings.get'](db);
    },
    'settings.testMail'(db, d, token) {
      const a = requireUser(db, token, ['admin']);
      return { to: a.email, quota: 100, demo: true };
    },

    'dash.admin'(db, d, token) {
      requireUser(db, token, ['admin']);
      const U = db.users;
      const c = f => U.filter(f).length;
      const active = db.fiscalYears.find(f => f.is_active === 'TRUE');
      const monthly = [];
      const base = new Date(); base.setDate(1);
      for (let i = 11; i >= 0; i--) {
        const m = new Date(base.getFullYear(), base.getMonth() - i, 1);
        monthly.push({ key: m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'),
          label: MONTHS[m.getMonth()] + ' ' + String(m.getFullYear() + 543).slice(-2), count: 0 });
      }
      U.forEach(u => {
        const dt = new Date(u.created_at);
        const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        const o = monthly.find(x => x.key === key);
        if (o) o.count++;
      });
      return {
        users: {
          total: U.length, active: c(u => u.status === 'active'), pending: c(u => u.status === 'pending'),
          suspended: c(u => u.status === 'suspended'), admin: c(u => u.role === 'admin'),
          creator: c(u => u.role === 'creator'), user: c(u => u.role === 'user')
        },
        fiscal_years: db.fiscalYears.length,
        active_fy: active ? active.year : null,
        projects: db.projects.length,
        enrollments: db.enrollments.length,
        monthly,
        recent: U.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6).map(pub),
        mail_quota: 100
      };
    },
    'logs.list'(db, d, token) {
      requireUser(db, token, ['admin']);
      const map = {};
      db.users.forEach(u => { map[u.user_id] = u; });
      return db.logs.slice(-300).reverse().map(l => {
        const u = map[l.user_id];
        return { ...l, user_name: u ? u.first_name + ' ' + u.last_name : '', user_email: u ? u.email : '' };
      });
    }
  };

  async function handle(action, data, token) {
    await new Promise(r => setTimeout(r, 220));
    const fn = routes[action];
    if (!fn) return { ok: false, error: 'ไม่พบคำสั่ง: ' + action };
    const db = load();
    try {
      const result = fn(db, JSON.parse(JSON.stringify(data || {})), token);
      save(db);
      return { ok: true, data: JSON.parse(JSON.stringify(result ?? null)) };
    } catch (e) {
      return { ok: false, error: e.message || String(e), code: e.code || '' };
    }
  }

  function reset() { localStorage.removeItem(KEY); }

  return { handle, reset };
})();
