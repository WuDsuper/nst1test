/* จัดการการเข้าสู่ระบบฝั่งหน้าเว็บ */
const Auth = {
  KEY_TOKEN: 'tms_token',
  KEY_USER: 'tms_user',

  getToken() { try { return localStorage.getItem(this.KEY_TOKEN); } catch (e) { return null; } },
  getUser() { try { return JSON.parse(localStorage.getItem(this.KEY_USER) || 'null'); } catch (e) { return null; } },
  save(token, user) {
    try { localStorage.setItem(this.KEY_TOKEN, token); localStorage.setItem(this.KEY_USER, JSON.stringify(user)); } catch (e) { }
  },
  setUser(user) { try { localStorage.setItem(this.KEY_USER, JSON.stringify(user)); } catch (e) { } },
  clear() { try { localStorage.removeItem(this.KEY_TOKEN); localStorage.removeItem(this.KEY_USER); } catch (e) { } },

  /** หน้าแรกของแต่ละบทบาท (path จาก root) */
  homePath(role) {
    return { admin: 'admin/dashboard.html', creator: 'creator/dashboard.html' }[role] || 'user/dashboard.html';
  },
  home(role) { return UI.root() + this.homePath(role); },

  /** ใช้ต้นหน้าที่ต้อง login: คืนค่า user หรือ null (และ redirect) */
  require(roles) {
    const u = this.getUser();
    if (!this.getToken() || !u) {
      location.href = UI.root() + 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return null;
    }
    if (roles && !roles.includes(u.role)) {
      location.href = this.home(u.role);
      return null;
    }
    // ตรวจสอบกับเซิร์ฟเวอร์อีกครั้งเบื้องหลัง (กรณีถูกเปลี่ยนบทบาท/ระงับ)
    API.call('me').then(fresh => {
      this.setUser(fresh);
      if (roles && !roles.includes(fresh.role)) location.href = this.home(fresh.role);
    }).catch(() => { });
    return u;
  },

  redirectIfLoggedIn() {
    const u = this.getUser();
    if (this.getToken() && u) location.href = this.home(u.role);
  },

  async logout() {
    try { await API.call('logout'); } catch (e) { }
    this.clear();
    location.href = UI.root() + 'login.html';
  }
};
