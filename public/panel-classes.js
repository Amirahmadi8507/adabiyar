'use strict';
// تب «کلاس‌ها» در پنل معلم: ساخت کلاس، کد عضویت، فهرست دانش‌آموزان و عملکرد هر کدام
function lessonSelect(q) {
  const by = {}; lessonsList.forEach(l => { (by[l.grade] = by[l.grade] || []).push(l); });
  return `<label>درس / مبحث این سؤال (برای تحلیل پیشرفت)<select name="lesson_id"><option value="">— بدون درس —</option>${Object.keys(by).sort((a, b) => a - b).map(g => `<optgroup label="پایه ${g}">${by[g].map(l => `<option value="${l.id}" ${q && Number(q.lesson_id) === l.id ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
}
function classOptions(sel) {
  const pub = me && me.role === 'admin';
  return `<option value="">${pub ? 'عمومی (همه‌ی دانش‌آموزان)' : '— انتخاب کلاس —'}</option>` + myClasses.map(c => `<option value="${c.id}" ${Number(sel) === c.id ? 'selected' : ''}>${esc(c.name)} (پایه ${c.grade})</option>`).join('');
}
const classSelect = sel => `<label>کلاس این آزمون<select name="class_id">${classOptions(sel)}</select></label>`;
const classMini = e => `<label class="mini-cls">کلاس: <select data-setclass="${e.id}">${classOptions(e.class_id)}</select></label>`;
document.addEventListener('change', async ev => {
  const s = ev.target.closest && ev.target.closest('[data-setclass]'); if (!s) return;
  try { await api(`/api/exams/${s.dataset.setclass}/class`, { method: 'PATCH', body: body({ class_id: s.value }) }); } catch (x) { alert(x.message); }
  showExams();
});
async function loadMaterials(id) {
  const box = $('#matList'); if (!box) return;
  try {
    const { materials } = await api(`/api/classes/${id}/materials`);
    box.innerHTML = materials.map(m => `<article class="cls-card"><h3>${m.kind === 'video' ? '🎬 ' : '📝 '}${esc(m.title)}</h3>${m.kind === 'video' ? `<video controls preload="metadata" playsinline style="width:100%;max-height:300px;border-radius:12px;background:#000" src="${esc(m.url)}"></video>` : `<p style="white-space:pre-wrap">${esc(m.body)}</p>`}<button class="outline-btn" data-delmat="${m.id}">حذف</button></article>`).join('') || '<p>هنوز نکته یا ویدیویی برای این کلاس نگذاشته‌اید.</p>';
    box.onclick = async e => { const b = e.target.closest('[data-delmat]'); if (b && confirm('حذف شود؟')) { try { await api(`/api/classes/${id}/materials/${b.dataset.delmat}`, { method: 'DELETE' }); loadMaterials(id); } catch (x) { alert(x.message); } } };
  } catch (e) { box.innerHTML = `<p>${esc(e.message)}</p>`; }
}
async function showClasses(openId) {
  const box = $('#panelContent'); box.innerHTML = '<p>در حال بارگذاری…</p>';
  let list; try { list = (await api('/api/classes')).classes; } catch (e) { return msg(e.message); }
  box.innerHTML = `<h2>کلاس‌های مجازی</h2>
    <form id="clsForm" class="app-form"><div class="cls-row"><label>نام کلاس<input name="name" required maxlength="80" placeholder="مثلاً: هفتم الف"></label>
    <label>پایه<select name="grade">${[7, 8, 9, 10, 11, 12].map(g => `<option value="${g}">پایه ${g}</option>`).join('')}</select></label></div>
    <button class="gold-btn">ساخت کلاس و دریافت کد</button><p id="clsMsg" class="hint"></p></form>
    <div class="cls-grid">${list.map(c => `<article class="cls-card"><h3>${esc(c.name)}</h3><p>پایه ${c.grade} · ${c.members} دانش‌آموز${c.teacher_name && me.role === 'admin' ? ' · ' + esc(c.teacher_name) : ''}</p>
      <div class="cls-code" title="کد عضویت">${esc(c.code)}</div>
      <div class="cls-actions"><button class="outline-btn" data-copy="${esc(c.code)}">کپی کد</button><button class="outline-btn" data-open="${c.id}">دانش‌آموزان و عملکرد</button><button class="outline-btn" data-newcode="${c.id}">کد جدید</button><button class="outline-btn" data-del="${c.id}">حذف</button></div></article>`).join('') || '<p>هنوز کلاسی نساخته‌اید. بعد از ساخت، کد ۶ حرفی را به دانش‌آموزان بدهید تا در پنل خود وارد کنند.</p>'}</div>
    <div id="clsDetail"></div>`;
  const say = t => { $('#clsMsg').textContent = t; };
  $('#clsForm').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await api('/api/classes', { method: 'POST', body: body({ name: f.name.value, grade: Number(f.grade.value) }) }); showClasses(); } catch (x) { say(x.message); } };
  box.querySelector('.cls-grid').onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.copy) { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'کپی شد ✓'; }
      if (b.dataset.open) await classDetail(b.dataset.open);
      if (b.dataset.newcode && confirm('با ساخت کد جدید، کد قبلی دیگر کار نمی‌کند (اعضای فعلی می‌مانند). ادامه؟')) { await api(`/api/classes/${b.dataset.newcode}/code`, { method: 'POST', body: '{}' }); showClasses(); }
      if (b.dataset.del && confirm('کلاس حذف شود؟ عضویت‌ها پاک می‌شوند ولی نتیجه‌ی آزمون‌ها می‌ماند.')) { await api('/api/classes/' + b.dataset.del, { method: 'DELETE' }); showClasses(); }
    } catch (x) { alert(x.message); }
  };
  if (openId) classDetail(openId);
}
const fmtDT = iso => iso ? new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }) : '';
const faN = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const ASG_ST = { pending: ['در انتظار', 'none'], submitted: ['تحویل شد', 'mid'], late: ['با تأخیر', 'bad'], graded: ['نمره‌دار', 'good'], missed: ['تحویل نداده', 'bad'] };
async function loadAssignments(id) {
  const box = $('#asgList'); if (!box) return;
  try {
    const { assignments } = await api(`/api/classes/${id}/assignments`);
    box.innerHTML = assignments.map(a => `<article class="cls-card"><h3>${esc(a.title)}</h3><p>مهلت: ${fmtDT(a.due_at)}${a.allow_late ? '' : ' (بدون تحویل دیرهنگام)'}</p><p>تحویل: ${faN(a.submitted)} از ${faN(a.members)} · نمره‌دار: ${faN(a.graded)} · بارم ${faN(a.max_score)}</p><div class="cls-actions"><button class="outline-btn" data-asg="${a.id}">بررسی و نمره‌دهی</button><button class="outline-btn" data-delasg="${a.id}">حذف</button></div></article>`).join('') || '<p>هنوز تکلیفی نداده‌اید.</p>';
    box.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.delasg && confirm('تکلیف و همه‌ی تحویل‌هایش حذف شود؟')) { await api('/api/assignments/' + b.dataset.delasg, { method: 'DELETE' }); $('#asgDetail').innerHTML = ''; loadAssignments(id); }
        if (b.dataset.asg) await showSubmissions(b.dataset.asg, id);
      } catch (x) { alert(x.message); }
    };
  } catch (e) { box.innerHTML = `<p>${esc(e.message)}</p>`; }
}
async function showSubmissions(aid, classId) {
  const out = $('#asgDetail'); out.innerHTML = '<p>در حال بارگذاری…</p>';
  const d = await api(`/api/assignments/${aid}/submissions`);
  out.innerHTML = `<h4>تحویل‌های «${esc(d.assignment.title)}» — بارم ${faN(d.assignment.max_score)}</h4><div class="cls-table"><table><thead><tr><th>دانش‌آموز</th><th>وضعیت</th><th>پاسخ</th><th>فایل</th><th>نمره و بازخورد</th></tr></thead><tbody>${d.rows.map(r => { const st = ASG_ST[r.status] || ['', '']; return `<tr><td>${esc(r.name)}</td><td><span class="cls-badge ${st[1]}">${st[0]}</span>${r.submitted_at ? `<br><small>${fmtDT(r.submitted_at.replace(' ', 'T') + 'Z')}</small>` : ''}</td><td style="white-space:normal;min-width:180px">${r.body ? `<details><summary>دیدن پاسخ</summary><p style="white-space:pre-wrap">${esc(r.body)}</p></details>` : '—'}</td><td>${r.has_file ? `<a href="/api/submissions/${r.sub_id}/file" target="_blank" rel="noopener">${esc(r.file_name)}</a>` : '—'}</td><td>${r.sub_id ? `<input type="number" min="0" max="${d.assignment.max_score}" step="0.25" value="${r.score ?? ''}" style="width:80px" data-sc="${r.student_id}"> <input value="${esc(r.feedback || '')}" placeholder="بازخورد" style="width:150px" data-fb="${r.student_id}"> <button class="outline-btn" data-grade="${r.student_id}">ثبت</button>` : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  out.onclick = async e => { const b = e.target.closest('[data-grade]'); if (!b) return; const sid = b.dataset.grade; try { await api(`/api/assignments/${aid}/submissions/${sid}/grade`, { method: 'PATCH', body: body({ score: Number(out.querySelector(`[data-sc="${sid}"]`).value), feedback: out.querySelector(`[data-fb="${sid}"]`).value }) }); b.textContent = 'ثبت شد ✓'; loadAssignments(classId); } catch (x) { alert(x.message); } };
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function loadEvents(id) {
  const box = $('#evList'); if (!box) return;
  try {
    const { items } = await api('/api/calendar'); const ev = items.filter(i => i.type === 'event' && i.class_id === Number(id));
    box.innerHTML = ev.map(i => `<article class="cls-card"><h3>${esc(i.title)}</h3><p>${({ class: 'جلسه‌ی کلاس', exam: 'امتحان', reminder: 'یادآوری' })[i.kind] || ''} · ${fmtDT(i.at)}</p>${i.detail ? `<p>${esc(i.detail)}</p>` : ''}<button class="outline-btn" data-delev="${i.id}">حذف</button></article>`).join('') || '<p>رویدادی ثبت نشده است.</p>';
    box.onclick = async e => { const b = e.target.closest('[data-delev]'); if (b && confirm('رویداد حذف شود؟')) { try { await api('/api/events/' + b.dataset.delev, { method: 'DELETE' }); loadEvents(id); } catch (x) { alert(x.message); } } };
  } catch (e) { box.innerHTML = `<p>${esc(e.message)}</p>`; }
}
async function classDetail(id) {
  const out = $('#clsDetail'); out.innerHTML = '<p>در حال بارگذاری…</p>';
  let d; try { d = await api('/api/classes/' + id); } catch (e) { out.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const lvl = p => p === null ? ['بدون آزمون', 'none'] : p < 50 ? ['نیازمند توجه', 'bad'] : p < 70 ? ['متوسط', 'mid'] : ['خوب', 'good'];
  const done = d.members.filter(m => m.avg_pct !== null), avg = done.length ? Math.round(done.reduce((s, m) => s + m.avg_pct, 0) / done.length) : null;
  out.innerHTML = `<h3>${esc(d.class.name)} — پایه ${d.class.grade}</h3><p>${d.members.length} دانش‌آموز${avg === null ? '' : ` · میانگین کلاس ${avg}٪`} · کد عضویت: <b class="cls-code-inline">${esc(d.class.code)}</b></p>
    <div class="cls-table"><table><thead><tr><th>نام</th><th>ایمیل</th><th>آزمون‌های داده‌شده</th><th>میانگین</th><th>وضعیت</th><th></th></tr></thead><tbody>
    ${d.members.map(m => { const l = lvl(m.avg_pct); return `<tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${m.attempts}</td><td>${m.avg_pct === null ? '—' : m.avg_pct + '٪'}</td><td><span class="cls-badge ${l[1]}">${l[0]}</span></td><td><button class="outline-btn" data-rep="${m.id}">کارنامه</button> <button class="outline-btn" data-rm="${m.id}">حذف از کلاس</button></td></tr>`; }).join('') || '<tr><td colspan="6">هنوز دانش‌آموزی عضو نشده است.</td></tr>'}</tbody></table></div>
    <p class="hint">میانگین فقط از آزمون‌هایی حساب می‌شود که خودِ این معلم ساخته است. «نیازمند توجه» یعنی میانگین زیر ۵۰٪.</p>
    <h3>تحلیل عملکرد کلاس</h3><div id="clsAnalytics"><p>در حال تحلیل…</p></div><div id="clsStudent"></div>
    <h3>تکالیف کلاس</h3>
    <form id="asgForm" class="app-form"><label>عنوان تکلیف<input name="title" required maxlength="150"></label><label>توضیح تکلیف<textarea name="body" rows="3"></textarea></label>
      <div class="cls-row"><label>مهلت تحویل<input type="datetime-local" name="due" required></label><label>بارم<input type="number" name="max_score" value="20" min="1" max="1000" step="0.5"></label></div>
      <label><input type="checkbox" name="late" checked style="width:auto"> بعد از مهلت هم بشود تحویل داد (با برچسب «با تأخیر»)</label><button class="gold-btn">ثبت تکلیف</button></form>
    <div id="asgList" class="cls-grid"></div><div id="asgDetail"></div>
    <h3>برنامه‌ی کلاس و رویدادها</h3><p class="hint">در تقویم دانش‌آموزان همین کلاس دیده می‌شود (کنار مهلت تکلیف‌ها و آزمون‌ها).</p>
    <form id="evForm" class="app-form"><div class="cls-row"><label>عنوان<input name="title" required maxlength="150" placeholder="مثلاً: جلسه‌ی مرور درس ۳"></label><label>نوع<select name="kind"><option value="class">جلسه‌ی کلاس</option><option value="exam">امتحان</option><option value="reminder">یادآوری</option></select></label></div>
      <label>زمان<input type="datetime-local" name="start" required></label><label>توضیح (اختیاری)<input name="description" maxlength="500"></label><button class="gold-btn">افزودن به تقویم</button></form>
    <div id="evList" class="cls-grid"></div>
    <h3>نکته و ویدیوی اختصاصی این کلاس</h3><p class="hint">فقط دانش‌آموزان همین کلاس این‌ها را می‌بینند.</p>
    <form id="noteForm" class="app-form"><label>عنوان نکته<input name="title" maxlength="150" required></label><label>متن نکته<textarea name="body" rows="4" required></textarea></label><button class="gold-btn">افزودن نکته</button></form>
    <form id="vidForm" class="app-form"><label>عنوان ویدیو<input name="title" maxlength="150" required></label><label>فایل ویدیو (MP4 یا WEBM، تا ۱۵۰ مگابایت)<input type="file" name="file" accept="video/mp4,video/webm" required></label><button class="gold-btn">بارگذاری ویدیو</button><p id="vidMsg" class="hint"></p></form>
    <div id="matList" class="cls-grid"></div>`;
  loadMaterials(id); loadAssignments(id); loadEvents(id);
  const iso = v => new Date(v).toISOString();
  $('#asgForm').onsubmit = async ev => { ev.preventDefault(); const f = ev.target; try { await api(`/api/classes/${id}/assignments`, { method: 'POST', body: body({ title: f.title.value, body: f.body.value, due: iso(f.due.value), max_score: Number(f.max_score.value), allow_late: f.late.checked }) }); f.reset(); loadAssignments(id); } catch (x) { alert(x.message); } };
  $('#evForm').onsubmit = async ev => { ev.preventDefault(); const f = ev.target; try { await api(`/api/classes/${id}/events`, { method: 'POST', body: body({ title: f.title.value, kind: f.kind.value, start: iso(f.start.value), description: f.description.value }) }); f.reset(); loadEvents(id); } catch (x) { alert(x.message); } };
  api(`/api/classes/${id}/analytics`).then(a => { $('#clsAnalytics').innerHTML = renderAnalytics(a); }).catch(x => { $('#clsAnalytics').innerHTML = `<p>${esc(x.message)}</p>`; });
  $('#noteForm').onsubmit = async ev => { ev.preventDefault(); const f = ev.target; try { await api(`/api/classes/${id}/materials`, { method: 'POST', body: body({ title: f.title.value, body: f.body.value }) }); f.reset(); loadMaterials(id); } catch (x) { alert(x.message); } };
  $('#vidForm').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target, file = f.file.files[0], m = $('#vidMsg'); if (!file) return;
    if (file.size > 150 * 1024 * 1024) { m.textContent = 'حجم ویدیو بیش از ۱۵۰ مگابایت است؛ آن را فشرده کنید.'; return; }
    m.textContent = 'در حال بارگذاری… (ویدیوی حجیم کمی طول می‌کشد)';
    try { const r = await fetch(`/api/classes/${id}/materials/video`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'video/mp4', 'X-Title': encodeURIComponent(f.title.value) }, body: file }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'خطا'); f.reset(); m.textContent = 'ویدیو بارگذاری شد.'; loadMaterials(id); } catch (x) { m.textContent = x.message; }
  };
  out.onclick = async e => {
    const rb = e.target.closest('[data-rep]');
    if (rb) { const box = $('#clsStudent'); box.innerHTML = '<p>در حال ساخت کارنامه…</p>'; try { const r = await api(`/api/classes/${id}/students/${rb.dataset.rep}/report`); box.innerHTML = `<h3>کارنامه‌ی ${esc(r.student.name)} <small class="rp-note">(فقط آزمون‌های همین کلاس)</small></h3>${renderReport(r.report)}`; box.scrollIntoView({ behavior: 'smooth' }); } catch (x) { box.innerHTML = `<p>${esc(x.message)}</p>`; } return; }
    const b = e.target.closest('[data-rm]'); if (b && confirm('این دانش‌آموز از کلاس حذف شود؟')) { try { await api(`/api/classes/${id}/members/${b.dataset.rm}`, { method: 'DELETE' }); classDetail(id); } catch (x) { alert(x.message); } } };
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
