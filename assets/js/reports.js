/* ตัวช่วยหน้ารายงาน: ส่งออก Excel, สถิติ, การแสดงผลคะแนน (ระยะที่ 4) */
const RPT = (() => {
  const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  let xlsxP = null;

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxP) {
      xlsxP = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = XLSX_SRC;
        s.onload = resolve;
        s.onerror = () => { xlsxP = null; reject(new Error('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')); };
        document.head.appendChild(s);
      });
    }
    return xlsxP;
  }

  const textLen = v => String(v ?? '').split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  function autoCols(rows) {
    const w = [];
    rows.forEach(r => r.forEach((v, i) => { w[i] = Math.max(w[i] || 0, textLen(v)); }));
    return w.map(n => ({ wch: Math.min(48, Math.max(8, n + 2)) }));
  }
  const safeSheet = n => String(n).replace(/[\[\]:*?/\\]/g, ' ').slice(0, 31);
  const safeFile = n => String(n).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

  /** sheets: [{ name, rows: [[...]], cols?, merges? }] */
  async function exportXlsx(filename, sheets) {
    await loadXLSX();
    const wb = XLSX.utils.book_new();
    sheets.forEach(sh => {
      const ws = XLSX.utils.aoa_to_sheet(sh.rows);
      ws['!cols'] = sh.cols || autoCols(sh.rows);
      if (sh.merges) ws['!merges'] = sh.merges;
      XLSX.utils.book_append_sheet(wb, ws, safeSheet(sh.name));
    });
    XLSX.writeFile(wb, safeFile(filename) + '.xlsx');
  }

  /* ---------- สถิติ ---------- */
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  function sd(a) {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  }
  function lgamma(z) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < 9; i++) x += c[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  /** ค่า p แบบสองทาง ของสถิติ t */
  function tTestP(t, df) {
    if (t === null || t === undefined || !isFinite(t) || !df) return null;
    return ibeta(df / (df + t * t), df / 2, 0.5);
  }
  const pText = p => p === null ? '-' : p < 0.001 ? 'p < .001' : 'p = ' + p.toFixed(3).replace(/^0/, '');

  /** เปรียบเทียบก่อน-หลัง จากแถวผลรายคน (Pre ใช้ครั้งแรก, Post ใช้ครั้งที่ดีที่สุด) */
  function prepost(rows, preId, postId) {
    const pairs = rows.map(r => {
      const a = r.cells[preId], b = r.cells[postId];
      const x = a && a.first ? a.first : null, y = b && b.best ? b.best : null;
      return { name: r.name, organization: r.organization, email: r.email, pre: x, post: y, gain: x && y ? Math.round((y.percent - x.percent) * 100) / 100 : null };
    });
    const full = pairs.filter(p => p.gain !== null);
    const pres = full.map(p => p.pre.percent), posts = full.map(p => p.post.percent), gains = full.map(p => p.gain);
    const n = full.length, md = mean(gains), sdd = sd(gains);
    const sumPre = pres.reduce((s, v) => s + v, 0), sumPost = posts.reduce((s, v) => s + v, 0);
    let t = null;
    if (n > 1 && sdd) t = md / (sdd / Math.sqrt(n));
    const df = n > 1 ? n - 1 : null;
    return {
      pairs, n,
      pre_taken: pairs.filter(p => p.pre).length, post_taken: pairs.filter(p => p.post).length,
      pre_mean: mean(pres), post_mean: mean(posts), pre_sd: sd(pres), post_sd: sd(posts),
      gain_mean: md, gain_sd: sdd, t, df, p: tTestP(t, df),
      ei: n && n * 100 - sumPre > 0 ? (sumPost - sumPre) / (n * 100 - sumPre) : null,
      improved: gains.filter(g => g > 0).length, same: gains.filter(g => g === 0).length, declined: gains.filter(g => g < 0).length
    };
  }

  /* ---------- แปลผล ---------- */
  function difficulty(p) {
    if (p === null || p === undefined) return { label: '-', cls: 'secondary' };
    if (p > 0.8) return { label: 'ง่ายมาก', cls: 'info' };
    if (p >= 0.6) return { label: 'ค่อนข้างง่าย', cls: 'success' };
    if (p >= 0.4) return { label: 'ปานกลาง', cls: 'success' };
    if (p >= 0.2) return { label: 'ค่อนข้างยาก', cls: 'warning' };
    return { label: 'ยากมาก', cls: 'danger' };
  }
  function discrimination(r) {
    if (r === null || r === undefined) return { label: '-', cls: 'secondary' };
    if (r >= 0.4) return { label: 'ดีมาก', cls: 'success' };
    if (r >= 0.3) return { label: 'ดี', cls: 'success' };
    if (r >= 0.2) return { label: 'พอใช้', cls: 'warning' };
    return { label: 'ควรปรับปรุง', cls: 'danger' };
  }
  /** ข้อสอบที่ใช้ได้: 0.20 ≤ p ≤ 0.80 และ r ≥ 0.20 */
  function itemVerdict(it) {
    if (it.p === null) return { label: 'ยังไม่มีผู้ทำ', cls: 'secondary' };
    if (it.r === null) return it.p >= 0.2 && it.p <= 0.8 ? { label: 'ความยากเหมาะสม', cls: 'success' } : { label: 'ควรพิจารณา', cls: 'warning' };
    return it.p >= 0.2 && it.p <= 0.8 && it.r >= 0.2 ? { label: 'ใช้ได้', cls: 'success' } : { label: 'ควรปรับปรุง', cls: 'danger' };
  }

  const num = (n, d = 2) => n === null || n === undefined || isNaN(n) ? '-' : Number(n).toLocaleString('th-TH', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const pct = (n, d = 1) => n === null || n === undefined || isNaN(n) ? '-' : num(n, d) + '%';
  const badge = (label, cls, icon) => `<span class="badge-soft ${cls}">${icon ? `<i class="bi bi-${icon}"></i>` : ''}${UI.esc(label)}</span>`;
  const gainBadge = g => g === null || g === undefined ? '<span class="text-muted">-</span>'
    : badge((g > 0 ? '+' : '') + num(g, 1) + '%', g > 0 ? 'success' : g < 0 ? 'danger' : 'secondary', g > 0 ? 'arrow-up-right' : g < 0 ? 'arrow-down-right' : 'dash');

  /* ---------- ผลรายกิจกรรม ---------- */
  const STATE_ICON = {
    done:       { icon: 'check-circle-fill', cls: 'text-success' },
    submitted:  { icon: 'send-check-fill', cls: 'text-success' },
    review:     { icon: 'hourglass-split', cls: 'text-warning' },
    inprogress: { icon: 'pencil-fill', cls: 'text-info' },
    failed:     { icon: 'x-circle-fill', cls: 'text-danger' },
    revise:     { icon: 'arrow-repeat', cls: 'text-warning' },
    todo:       { icon: 'dash-circle', cls: 'text-muted opacity-50' }
  };
  const scoreText = c => c.score !== undefined ? `${num(c.score)}/${num(c.max)}` : '';

  /** แสดงในตาราง (HTML) */
  function cellHtml(c, a) {
    if (!c) return '';
    const s = STATE_ICON[c.state] || STATE_ICON.todo;
    const label = (PUI.MY[c.state] || PUI.MY.todo).label;
    let sub = '';
    if (a.type === 'quiz' && c.best) sub = `${num(c.best.percent, 0)}%`;
    else if (a.type === 'assignment' && c.score !== undefined) sub = scoreText(c);
    const tip = [label, a.type === 'quiz' && c.best ? `คะแนน ${scoreText(c)} (ทำ ${c.attempts} ครั้ง)` : '', a.type === 'assignment' && c.score !== undefined ? `คะแนน ${scoreText(c)}` : '']
      .filter(Boolean).join(' · ');
    return `<span class="m-cell" title="${UI.esc(tip)}"><i class="bi bi-${s.icon} ${s.cls}"></i>${sub ? `<span class="m-sub">${sub}</span>` : ''}</span>`;
  }

  /** ค่าในไฟล์ Excel: ตัวเลขคะแนน หรือข้อความสถานะ */
  function cellValue(c, a) {
    if (!c) return '';
    if (a.type === 'content') return c.state === 'done' ? 'เรียนแล้ว' : '';
    if (a.type === 'quiz') {
      if (!c.best) return c.state === 'inprogress' ? 'กำลังทำ' : '';
      const v = a.quiz_kind === 'pre' ? c.first.score : c.best.score;
      return c.waiting && c.state === 'review' ? v + ' (รอตรวจ)' : v;
    }
    if (c.score !== undefined) return c.state === 'revise' ? c.score + ' (ให้แก้ไข)' : c.score;
    return c.state === 'todo' ? '' : (PUI.MY[c.state] || PUI.MY.todo).label;
  }
  /** คะแนนเต็มของกิจกรรมจากผลที่มี */
  function actMax(a, rows) {
    if (a.type === 'assignment') return a.max_score;
    if (a.type !== 'quiz') return null;
    const c = rows.map(r => r.cells[a.activity_id]).find(x => x && x.max !== undefined);
    return c ? c.max : null;
  }

  return { loadXLSX, exportXlsx, autoCols, mean, sd, tTestP, pText, prepost, difficulty, discrimination, itemVerdict,
    num, pct, badge, gainBadge, STATE_ICON, cellHtml, cellValue, actMax, scoreText };
})();
