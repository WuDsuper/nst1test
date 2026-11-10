/* ตัวช่วยแสดงผลโครงการ ใช้ร่วมกันหลายหน้า */
const PUI = (() => {
  const FORMAT = {
    online: { label: 'ออนไลน์', icon: 'laptop' },
    onsite: { label: 'ในสถานที่', icon: 'geo-alt' },
    hybrid: { label: 'ผสมผสาน (ออนไลน์ + ในสถานที่)', icon: 'shuffle' }
  };
  const ENROLL = {
    pending:   { label: 'รออนุมัติ',          cls: 'warning', icon: 'hourglass-split' },
    approved:  { label: 'ลงทะเบียนแล้ว',      cls: 'success', icon: 'check-circle' },
    rejected:  { label: 'ไม่ผ่านการพิจารณา',  cls: 'danger',  icon: 'x-circle' },
    completed: { label: 'ผ่านการอบรม',        cls: 'primary', icon: 'award' }
  };
  const STATUS = {
    draft:     { label: 'ฉบับร่าง',      cls: 'secondary', icon: 'pencil' },
    published: { label: 'เผยแพร่',       cls: 'success',   icon: 'globe2' },
    closed:    { label: 'สิ้นสุดโครงการ', cls: 'secondary', icon: 'archive' }
  };
  const GRADS = [['#4F46E5', '#7C3AED'], ['#0891B2', '#2563EB'], ['#059669', '#0D9488'], ['#DB2777', '#9333EA'], ['#EA580C', '#DB2777'], ['#7C3AED', '#2563EB']];
  const ICONS = ['mortarboard', 'lightbulb', 'journal-richtext', 'laptop', 'people', 'rocket-takeoff'];

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

  /** สถานะการรับสมัครที่ผู้ใช้เห็น */
  function state(p) {
    const t = today();
    if (p.status === 'draft') return { key: 'draft', label: 'ฉบับร่าง', cls: 'secondary', icon: 'pencil' };
    if (p.status === 'closed') return { key: 'closed', label: 'สิ้นสุดโครงการ', cls: 'secondary', icon: 'archive' };
    if (p.reg_open && t < p.reg_open) return { key: 'soon', label: 'เปิดรับ ' + UI.thaiDate(p.reg_open), cls: 'info', icon: 'clock' };
    if (p.reg_close && t > p.reg_close) return { key: 'regclosed', label: 'ปิดรับสมัคร', cls: 'warning', icon: 'lock' };
    const cap = parseInt(p.capacity, 10);
    if (cap > 0 && p.enrolled >= cap) return { key: 'full', label: 'ที่นั่งเต็ม', cls: 'danger', icon: 'people-fill' };
    return { key: 'open', label: 'เปิดรับสมัคร', cls: 'success', icon: 'door-open', canJoin: true };
  }
  const badge = x => `<span class="badge-soft ${x.cls}"><i class="bi bi-${x.icon}"></i>${UI.esc(x.label)}</span>`;
  const stateBadge = p => badge(state(p));
  const statusBadge = s => badge(STATUS[s] || STATUS.draft);
  const enrollBadge = s => s ? badge(ENROLL[s] || { label: s, cls: 'secondary', icon: 'circle' }) : '';
  const formatLabel = f => (FORMAT[f] || FORMAT.online).label;
  const formatIcon = f => (FORMAT[f] || FORMAT.online).icon;

  function cover(p, extra = '') {
    if (p.cover_url) return `<div class="pj-cover ${extra}"><img src="${UI.esc(p.cover_url)}" alt="" loading="lazy" onerror="this.remove()"></div>`;
    const h = hash(p.project_id || p.title);
    const g = GRADS[h % GRADS.length];
    return `<div class="pj-cover ${extra}" style="background:linear-gradient(135deg,${g[0]},${g[1]})"><i class="bi bi-${ICONS[h % ICONS.length]}"></i></div>`;
  }

  function dateRange(a, b) {
    if (!a && !b) return 'ยังไม่กำหนด';
    if (a && b) return a === b ? UI.thaiDate(a) : `${UI.thaiDate(a)} – ${UI.thaiDate(b)}`;
    return UI.thaiDate(a || b);
  }

  function seatBar(p) {
    const cap = parseInt(p.capacity, 10);
    if (!cap) return `<div class="small text-muted"><i class="bi bi-people me-1"></i>ลงทะเบียน ${p.enrolled} คน · ไม่จำกัดจำนวน</div>`;
    const pct = Math.min(100, Math.round(p.enrolled / cap * 100));
    const color = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : '';
    return `<div class="d-flex justify-content-between small text-muted mb-1"><span><i class="bi bi-people me-1"></i>ลงทะเบียน ${p.enrolled}/${cap} คน</span><span>${pct}%</span></div>
      <div class="progress seat-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${color}" style="width:${pct}%"></div></div>`;
  }

  function card(p, root = '') {
    const url = `${root}project.html?id=${encodeURIComponent(p.project_id)}`;
    return `<div class="col-sm-6 col-xl-4">
      <div class="card pj-card card-hover h-100">
        <a href="${url}" class="pj-cover-wrap" aria-label="${UI.esc(p.title)}">${cover(p)}<span class="pj-badge">${stateBadge(p)}</span></a>
        <div class="card-body d-flex flex-column">
          <div class="small text-muted mb-1">${UI.esc(p.code)}${p.fy_year ? ' · ปีงบ ' + UI.esc(p.fy_year) : ''}</div>
          <h5 class="pj-title mb-2"><a href="${url}">${UI.esc(p.title)}</a></h5>
          <p class="pj-desc text-muted small mb-3">${UI.esc(p.description || 'ไม่มีรายละเอียด')}</p>
          <div class="vstack gap-1 small text-muted mb-3">
            <div><i class="bi bi-calendar-event me-2"></i>${dateRange(p.start_date, p.end_date)}</div>
            <div><i class="bi bi-${formatIcon(p.format)} me-2"></i>${formatLabel(p.format)}${p.hours ? ` · ${UI.esc(p.hours)} ชั่วโมง` : ''}</div>
          </div>
          <div class="mb-3">${seatBar(p)}</div>
          <div class="mt-auto d-flex align-items-center gap-2">
            ${enrollBadge(p.my_status)}
            <a href="${url}" class="btn btn-sm btn-soft ms-auto">รายละเอียด <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </div>`;
  }

  /** ตัวเลือกปีงบประมาณ: เติม <select> แล้วคืนค่า fy ที่เลือก */
  async function fillFySelect(sel, { allOption = false, value = '' } = {}) {
    const list = await API.call('fy.list');
    const active = list.find(f => f.is_active === 'TRUE');
    sel.innerHTML = (allOption ? '<option value="">ทุกปีงบประมาณ</option>' : '') +
      list.map(f => `<option value="${f.fy_id}">ปีงบประมาณ ${UI.esc(f.year)}${f.is_active === 'TRUE' ? ' (ปัจจุบัน)' : ''}</option>`).join('');
    sel.value = value || (active ? active.fy_id : (list[0] ? list[0].fy_id : ''));
    return list;
  }

  function csvDownload(filename, rows) {
    const csv = '﻿' + rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  return { FORMAT, ENROLL, STATUS, today, state, stateBadge, statusBadge, enrollBadge, formatLabel, formatIcon, cover, dateRange, seatBar, card, fillFySelect, csvDownload };
})();
