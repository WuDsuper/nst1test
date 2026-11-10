/* เรียก Google Apps Script API (หรือ Mock ในโหมดทดลอง) */
const API = {
  isDemo() { return !window.APP_CONFIG.API_URL; },

  async call(action, data = {}) {
    const token = Auth.getToken();
    let res;
    if (this.isDemo()) {
      res = await Mock.handle(action, data, token);
    } else {
      try {
        const r = await fetch(APP_CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain เพื่อไม่ให้เกิด CORS preflight
          body: JSON.stringify({ action, token, data }),
          redirect: 'follow'
        });
        res = await r.json();
      } catch (e) {
        throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
      }
    }
    if (!res || !res.ok) {
      const err = new Error((res && res.error) || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      err.code = res && res.code;
      if (err.code === 'AUTH' && token) {
        Auth.clear();
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = UI.root() + 'login.html?expired=1&next=' + next;
      }
      throw err;
    }
    return res.data;
  }
};
