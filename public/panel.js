'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const gradeNames = { 7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
const STATUS = { draft: 'پیش‌نویس', published: 'منتشرشده', archived: 'بایگانی‌شده' };
let me = null, exams = [];

async function api(url, opt = {}) {
  const r = await fetch(url, { credentials: 'same-origin', ...opt, headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const d = await r.json().catch(() => ({ error: 'پاسخ سرور خوانده نشد.' }));
  if (!r.ok) throw Error(d.error || 'درخواست ناموفق بود');
  return d;
}
const body = o => JSON.stringify(o);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const msg = t => { $('#panelContent').innerHTML = `<p>${esc(t)}</p>`; };
const toLocalInput = iso => { const t = Date.parse(iso); if (!Number.isFinite(t)) return ''; return new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fromLocalInput = v => v ? new Date(v).toISOString() : '';
const field = (label, name, ph = '', type = 'text', value = '') => `<label>${label}<input name="${name}" type="${type}" placeholder="${esc(ph)}" value="${esc(value)}"></label>`;
const textArea = (label, name, ph = '', value = '') => `<label>${label}<textarea name="${name}" rows="3" placeholder="${esc(ph)}">${esc(value)}</textarea></label>`;
const gradeSelect = () => `<label>پایه<select name="grade">${[7, 8, 9, 10, 11, 12].map(g => `<option value="${g}">پایه ${gradeNames[g]}</option>`).join('')}</select></label>`;
const faDate = s => { const t = Date.parse(String(s).includes('T') ? s : String(s).replace(' ', 'T') + 'Z'); return Number.isFinite(t) ? new Date(t).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };

$('#panelLogin').onsubmit = async e => {
  e.preventDefault();
  try { await api('/api/auth/login', { method: 'POST', body: body(Object.fromEntries(new FormData(e.currentTarget))) }); await init(); } catch (err) { $('#gateError').textContent = err.message; }
};

async function init() {
  try {
    me = (await api('/api/auth/me')).user;
    if (!me) { $('#panelGate').hidden = false; $('#dashboard').hidden = true; return; }
    if (!['teacher', 'admin'].includes(me.role)) { $('#panelGate').hidden = false; $('#gateError').textContent = 'این حساب نقش معلم یا مدیر ندارد. از مدیر بخواهید نقش حساب را تغییر دهد.'; $('#dashboard').hidden = true; return; }
    $('#panelGate').hidden = true; $('#dashboard').hidden = false;
    const admin = me.role === 'admin';
    $('#panelRole').textContent = `${me.name} · ${admin ? 'مدیر' : 'معلم'}`;
    $('#panelTitle').textContent = admin ? 'پنل مدیریت ادبیار' : 'پنل معلم';
    $('#panelSubtitle').textContent = admin ? 'مدیریت محتوا، شعرها، کاربران و آزمون‌ها' : 'ساخت آزمون تستی، انتشار، آمار و بررسی نمره‌ها';
    await refreshStats();
    const tabs = [['exams', 'آزمون‌ها', showExams], ['submissions', 'نتایج و نمره‌ها', () => showSubmissions()]];
    if (admin) tabs.push(['lessons', 'مدیریت درس‌ها', showLessons], ['poems', 'شعرها و نکته‌ها', showPoems], ['users', 'مدیریت کاربران', showUsers]);
    $('#tabs').innerHTML = tabs.map((t, i) => `<button data-tab="${t[0]}" class="${i ? '' : 'active'}">${t[1]}</button>`).join('');
    $$('#tabs button').forEach((b, i) => b.onclick = () => { $$('#tabs button').forEach(x => x.classList.toggle('active', x === b)); tabs[i][2](); });
    await showExams();
  } catch (e) { $('#panelGate').hidden = false; $('#gateError').textContent = e.message; }
}
async function refreshStats() {
  const o = await api('/api/admin/overview');
  $('#stats').innerHTML = [['lessons', 'درس'], ['exams', 'آزمون'], ['attempts', 'پاسخ‌نامه'], ['users', 'کاربر']].filter(([k]) => o[k] !== undefined).map(([k, l]) => `<div class="panel-stat"><b>${o[k]}</b><span>${l}</span></div>`).join('');
}

// ───────── آزمون‌ها ─────────
async function showExams() {
  try {
    exams = (await api('/api/exams')).exams;
    $('#panelContent').innerHTML = `<div class="panel-welcome"><div><h2>مدیریت آزمون‌ها</h2><p>آزمون تا وقتی منتشر نشود پیش‌نویس است و فقط شما آن را می‌بینید. برای انتشار حداقل ۵ سؤال تستی لازم است. پس از شرکت دانش‌آموزان، سؤال‌ها قابل ویرایش نیستند.</p></div><button id="newExam" class="gold-btn">＋ ساخت آزمون</button></div><div id="examList">${exams.map(e => {
      const draft = e.status === 'draft', pub = e.status === 'published';
      return `<article class="panel-item"><h3>${esc(e.title)} <span class="result-pill">${STATUS[e.status] || e.status}</span></h3><p>پایه ${gradeNames[e.grade]} · ${e.duration_minutes} دقیقه · ${e.question_count ?? 0} سؤال · ${e.attempt_count ?? 0} شرکت‌کننده${e.ends_at ? ' · مهلت: ' + faDate(e.ends_at) : ''}</p><div class="item-actions">
        ${draft ? `<button class="outline-btn" data-edit="${e.id}">سؤال‌ها و ویرایش</button><button class="gold-btn" data-publish="${e.id}">انتشار</button>` : ''}
        ${pub ? `<button class="outline-btn" data-unpublish="${e.id}">بازگشت به پیش‌نویس</button><button class="outline-btn" data-archive="${e.id}">بایگانی</button>` : ''}
        <button class="outline-btn" data-stats="${e.id}">آمار</button><button class="outline-btn" data-submissions="${e.id}">نتایج</button><button class="danger-btn" data-delete="${e.id}">حذف</button></div></article>`;
    }).join('') || '<p>هنوز آزمونی ساخته نشده است.</p>'}</div>`;
    $('#newExam').onclick = () => examForm();
    const act = (sel, fn) => $$(sel).forEach(b => b.onclick = () => fn(Number(b.dataset[sel.slice(6, -1)])));
    act('[data-edit]', id => buildQuestions(exams.find(x => x.id === id)));
    act('[data-stats]', showStats); act('[data-submissions]', id => showSubmissions(id));
    const call = (path, ok) => async id => { try { await api(path(id), { method: 'POST', body: '{}' }); await showExams(); } catch (e) { alert(e.message); } };
    act('[data-publish]', call(id => `/api/exams/${id}/publish`)); act('[data-unpublish]', call(id => `/api/exams/${id}/unpublish`)); act('[data-archive]', call(id => `/api/exams/${id}/archive`));
    act('[data-delete]', async id => { if (!confirm('آزمون همراه با سؤال‌ها و همه‌ی نتایج دانش‌آموزان برای همیشه حذف شود؟')) return; try { await api(`/api/exams/${id}`, { method: 'DELETE' }); await refreshStats(); await showExams(); } catch (e) { alert(e.message); } });
  } catch (e) { msg(e.message); }
}
function examForm(exam) {
  const e = exam || { title: '', grade: 7, duration_minutes: 30, description: '', review_answers: 1, starts_at: '', ends_at: '' };
  $('#panelContent').innerHTML = `<button id="backExams" class="outline-btn">← بازگشت</button><h2>${exam ? 'ویرایش مشخصات آزمون' : 'ساخت آزمون جدید'}</h2><form id="examForm" class="app-form inline-form">${field('عنوان آزمون', 'title', 'مثلاً آزمون آرایه‌های ادبی', 'text', e.title)}${gradeSelect()}<label>مدت آزمون (دقیقه)<input name="duration_minutes" type="number" min="1" max="240" value="${e.duration_minutes}"></label>${field('توضیحات', 'description', 'موضوع و محدوده آزمون', 'text', e.description)}<label>شروع (اختیاری)<input name="starts_at" type="datetime-local" value="${toLocalInput(e.starts_at)}"></label><label>پایان مهلت (اختیاری)<input name="ends_at" type="datetime-local" value="${toLocalInput(e.ends_at)}"></label><label class="full"><input name="review_answers" type="checkbox" ${e.review_answers ? 'checked' : ''}> نمایش پاسخ و توضیح بعد از آزمون</label><div class="full"><button class="gold-btn">${exam ? 'ذخیره' : 'ساخت پیش‌نویس و افزودن سؤال'}</button> <span id="examMsg"></span></div></form>`;
  $('#examForm').elements.grade.value = e.grade; $('#backExams').onclick = () => exam ? buildQuestions(exam) : showExams();
  $('#examForm').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.currentTarget, d = Object.fromEntries(new FormData(f));
    d.review_answers = f.elements.review_answers.checked; d.starts_at = fromLocalInput(d.starts_at); d.ends_at = fromLocalInput(d.ends_at);
    try { const r = await api(exam ? `/api/exams/${exam.id}` : '/api/exams', { method: exam ? 'PUT' : 'POST', body: body(d) }); await refreshStats(); await buildQuestions(r.exam); } catch (err) { $('#examMsg').textContent = err.message; }
  };
}
async function buildQuestions(exam, editing = null) {
  let questions = [];
  try { const d = await api(`/api/exams/${exam.id}`); questions = d.questions || []; exam = { ...exam, ...d.exam }; } catch (e) { return msg(e.message); }
  const q = editing ? questions.find(x => x.id === editing) : null;
  const opts = q ? q.options : [];
  $('#panelContent').innerHTML = `<div class="panel-actions"><button id="finishQuestions" class="outline-btn">← بازگشت به آزمون‌ها</button><button id="editMeta" class="outline-btn">ویرایش مشخصات</button><button id="aiGenerate" class="outline-btn">ساخت سؤال با هوش مصنوعی</button><button id="publishNow" class="gold-btn">انتشار آزمون</button></div><h2>سؤال‌های «${esc(exam.title)}» (${questions.length})</h2><p class="muted-note">پاسخ صحیح باید دقیقاً با یکی از چهار گزینه یکسان باشد. سؤال‌هایی که با هوش مصنوعی ساخته می‌شوند فقط پیشنهادند؛ حتماً بازبینی کنید.</p>
    <form id="aiForm" class="app-form" hidden>${textArea('متن درس / محدوده آزمون (حداقل چند جمله)', 'context', 'متن درس یا نکته‌ها')}${field('تعداد سؤال', 'count', '', 'number', '5')}<button class="gold-btn">تولید سؤال پیشنهادی</button><p id="aiStatus"></p></form>
    <div id="questionsNow">${questions.map((x, i) => `<article class="panel-item"><b>${i + 1}. ${esc(x.prompt)}</b> <small>(${x.points} نمره)</small><p>${x.type === 'short' ? '<b>سؤال تشریحی</b> — تصحیح دستی' : ''}${x.options.map(o => o === x.correct_answer ? `<b class="success-text">✓ ${esc(o)}</b>` : esc(o)).join(' · ')}</p>${x.explanation ? `<p class="muted-note">${esc(x.explanation)}</p>` : ''}<div class="item-actions"><button class="outline-btn" data-qedit="${x.id}">ویرایش</button><button class="danger-btn" data-qdel="${x.id}">حذف</button></div></article>`).join('') || '<p>هنوز سؤالی اضافه نشده است.</p>'}</div>
    <form id="questionForm" class="app-form"><h3>${q ? 'ویرایش سؤال' : 'افزودن سؤال'}</h3><label>نوع سؤال<select name="type" id="qType"><option value="mcq"${q && q.type === 'short' ? '' : ' selected'}>تستی (چهارگزینه‌ای)</option><option value="short"${q && q.type === 'short' ? ' selected' : ''}>تشریحی</option></select></label>${textArea('صورت سؤال', 'prompt', 'سؤال واضح و بدون ابهام', q ? q.prompt : '')}<div id="mcqFields">${textArea('گزینه‌ها (هر گزینه در یک خط، دقیقاً چهار گزینه)', 'options', 'گزینه اول\nگزینه دوم\nگزینه سوم\nگزینه چهارم', opts.join('\n'))}${field('پاسخ صحیح (دقیقاً مطابق یک گزینه)', 'correct_answer', 'متن دقیق گزینه صحیح', 'text', q ? q.correct_answer : '')}</div><div id="essayFields" hidden>${textArea('پاسخ نمونه / راهنمای تصحیح (فقط برای معلم)', 'model_answer', 'نکات لازم برای نمره کامل', q && q.type === 'short' ? (q.correct_answer || '') : '')}</div>${field('بارم سؤال', 'points', '', 'number', q ? q.points : '1')}${textArea('توضیح پاسخ برای یادگیری', 'explanation', 'چرا این گزینه درست است؟', q ? q.explanation : '')}<div><button class="gold-btn">${q ? 'ذخیره تغییرات' : 'افزودن سؤال'}</button> ${q ? '<button type="button" class="outline-btn" id="cancelEdit">انصراف</button>' : ''} <span id="qStatus"></span></div></form>`;
  $('#finishQuestions').onclick = showExams; $('#editMeta').onclick = () => examForm(exam); $('#aiGenerate').onclick = () => { $('#aiForm').hidden = !$('#aiForm').hidden; };
  $('#publishNow').onclick = async () => { try { await api(`/api/exams/${exam.id}/publish`, { method: 'POST', body: '{}' }); await showExams(); } catch (e) { $('#qStatus').textContent = e.message; } };
  const togType = () => { const e = $('#qType').value === 'short'; $('#mcqFields').hidden = e; $('#essayFields').hidden = !e; }; $('#qType').onchange = togType; togType();
  $('#cancelEdit')?.addEventListener('click', () => buildQuestions(exam));
  $$('[data-qedit]').forEach(b => b.onclick = () => { buildQuestions(exam, Number(b.dataset.qedit)); scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
  $$('[data-qdel]').forEach(b => b.onclick = async () => { if (!confirm('این سؤال حذف شود؟')) return; try { await api(`/api/exams/${exam.id}/questions/${b.dataset.qdel}`, { method: 'DELETE' }); await buildQuestions(exam); } catch (e) { alert(e.message); } });
  $('#questionForm').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); d.options = lines(d.options);
    try { await api(q ? `/api/exams/${exam.id}/questions/${q.id}` : `/api/exams/${exam.id}/questions`, { method: q ? 'PUT' : 'POST', body: body(d) }); await buildQuestions(exam); } catch (err) { $('#qStatus').textContent = err.message; }
  };
  $('#aiForm').onsubmit = async e => {
    e.preventDefault(); const f = e.currentTarget; $('#aiStatus').textContent = 'در حال ساخت پیشنهادها… (روی مدل‌های محلی ممکن است کمی طول بکشد)';
    try {
      const d = await api('/api/ai/generate-questions', { method: 'POST', body: body({ context: f.context.value, count: Number(f.count.value) }) });
      $('#aiStatus').innerHTML = `پیشنهادها را بازبینی کنید؛ تا زمان تأیید شما ذخیره نمی‌شوند.<div>${d.questions.map((x, i) => `<article class="panel-item"><b>${esc(x.prompt)}</b><p>${x.options.map(o => o === x.correct_answer ? `<b class="success-text">✓ ${esc(o)}</b>` : esc(o)).join(' · ')}</p><button class="outline-btn" data-ai-add="${i}">افزودن این سؤال</button></article>`).join('')}</div>`;
      $$('[data-ai-add]').forEach(b => b.onclick = async () => { try { await api(`/api/exams/${exam.id}/questions`, { method: 'POST', body: body({ ...d.questions[Number(b.dataset.aiAdd)], points: 1 }) }); b.textContent = 'افزوده شد ✓'; b.disabled = true; } catch (er) { alert(er.message); } });
    } catch (err) { $('#aiStatus').textContent = err.message; }
  };
}
async function showStats(examId) {
  try {
    const [s, ex] = await Promise.all([api(`/api/exams/${examId}/stats`), api(`/api/exams/${examId}`)]);
    $('#panelContent').innerHTML = `<button id="backExams" class="outline-btn">← بازگشت</button><h2>آمار «${esc(ex.exam.title)}»</h2><div class="panel-stats"><div class="panel-stat"><b>${s.finished}</b><span>ثبت‌شده</span></div><div class="panel-stat"><b>${s.in_progress}</b><span>در حال انجام</span></div><div class="panel-stat"><b>${s.average ?? '—'}</b><span>میانگین از ${s.max_score}</span></div><div class="panel-stat"><b>${s.max ?? '—'}</b><span>بالاترین</span></div><div class="panel-stat"><b>${s.min ?? '—'}</b><span>کمترین</span></div></div><h3>درصد پاسخ صحیح به تفکیک سؤال</h3><p class="muted-note">سؤال‌های با درصد پایین یا نیاز به توضیح بیشتر دارند یا مبهم‌اند.</p>${s.questions.map((q, i) => `<div class="prog"><span>${i + 1}. ${esc(q.prompt.slice(0, 40))}</span><div class="bar"><i style="width:${q.percent ?? 0}%"></i></div><small>${q.percent === null ? '—' : q.percent + '٪'}</small></div>`).join('')}<div class="panel-actions"><a class="outline-btn" href="/api/teacher/submissions.csv?exam_id=${examId}">دانلود نتایج (CSV برای Excel)</a></div>`;
    $('#backExams').onclick = showExams;
  } catch (e) { msg(e.message); }
}
async function showSubmissions(examId = null) {
  try {
    const rows = (await api('/api/teacher/submissions')).submissions.filter(a => !examId || a.exam_id === examId);
    const st = { in_progress: 'در حال انجام', submitted: 'ارسال‌شده', graded: 'بررسی‌شده' };
    $('#panelContent').innerHTML = `<h2>نتایج و نمره‌های دانش‌آموزان</h2><p class="muted-note">آزمون‌های تستی خودکار تصحیح می‌شوند. آزمونی که زمانش تمام شود با پاسخ‌های ذخیره‌شده‌ی دانش‌آموز ثبت می‌شود.</p><div class="panel-actions"><a class="outline-btn" href="/api/teacher/submissions.csv${examId ? '?exam_id=' + examId : ''}">دانلود CSV</a></div><div class="table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>آزمون</th><th>پایه</th><th>نمره</th><th>وضعیت</th><th>زمان</th><th></th></tr></thead><tbody>${rows.map(a => `<tr><td>${esc(a.student_name)}</td><td>${esc(a.title)}</td><td>${gradeNames[a.grade]}</td><td>${a.score ?? '—'} / ${a.max_score}</td><td>${st[a.status] || a.status}</td><td>${a.submitted_at ? faDate(a.submitted_at) : '—'}</td><td>${a.status === 'in_progress' ? '' : `<button class="outline-btn" data-result="${a.id}">جزئیات</button>`}</td></tr>`).join('') || '<tr><td colspan="7">هنوز پاسخی ثبت نشده است.</td></tr>'}</tbody></table></div>`;
    $$('[data-result]').forEach(b => b.onclick = () => showResult(Number(b.dataset.result), examId));
  } catch (e) { msg(e.message); }
}
async function showResult(id, examId = null) {
  try {
    const d = await api(`/api/attempts/${id}/results`);
    $('#panelContent').innerHTML = `<button id="backResults" class="outline-btn">← بازگشت</button><h2>${esc(d.attempt.title)} · ${esc(d.attempt.student_name || '')}</h2><p>نمره: ${d.attempt.score ?? 0} از ${d.attempt.max_score}</p>${d.answers.map(a => `<article class="panel-item"><h3>${esc(a.prompt)}</h3><p>پاسخ دانش‌آموز: ${esc(a.answer_text || 'بدون پاسخ')} ${a.is_correct ? '<span class="success-text">✓</span>' : '✗'}</p><p>پاسخ صحیح: ${esc(a.correct_answer || '—')} · نمره: ${a.awarded_points}/${a.points}</p><p>${esc(a.explanation || '')}</p></article>`).join('')}`;
    $('#backResults').onclick = () => showSubmissions(examId);   // قبلاً event به‌جای شناسه آزمون پاس می‌شد و لیست خالی می‌شد
  } catch (e) { alert(e.message); }
}

// ───────── درس‌ها و شعرها (مدیر) ─────────
async function showLessons() {
  try {
    const d = await api('/api/lessons');
    $('#panelContent').innerHTML = `<div class="panel-welcome"><div><h2>مدیریت درس‌ها</h2><p>محتوای اولیه تکمیلی است؛ پیش از معرفی به‌عنوان محتوای رسمی، با کتاب درسی چاپ جاری تطبیق دهید و وضعیت را «تأییدشده» کنید.</p></div><button id="newLesson" class="gold-btn">＋ افزودن درس</button></div><div class="panel-grid">${d.lessons.map(l => `<article class="panel-item"><h3>پایه ${gradeNames[l.grade]} · ${esc(l.title)}</h3><p>${esc(l.summary)}</p><small>${esc(l.content_status)} · شناسه ${l.id}</small><div class="item-actions"><button class="outline-btn" data-edit-lesson="${l.id}">ویرایش</button><button class="danger-btn" data-delete-lesson="${l.id}">حذف</button></div></article>`).join('')}</div>`;
    $('#newLesson').onclick = () => lessonForm();
    $$('[data-edit-lesson]').forEach(b => b.onclick = () => lessonForm(d.lessons.find(l => l.id === Number(b.dataset.editLesson))));
    $$('[data-delete-lesson]').forEach(b => b.onclick = async () => { if (!confirm('این درس (با یادداشت‌ها و پیشرفت کاربران) حذف شود؟')) return; try { await api(`/api/admin/lessons/${b.dataset.deleteLesson}`, { method: 'DELETE' }); await refreshStats(); showLessons(); } catch (e) { alert(e.message); } });
  } catch (e) { msg(e.message); }
}
function lessonForm(l = { grade: 7, title: '', summary: '', important_points: [], vocabulary: [], content_status: 'needs_review', source_note: '' }) {
  $('#panelContent').innerHTML = `<button id="backLessons" class="outline-btn">← بازگشت</button><h2>${l.id ? 'ویرایش' : 'افزودن'} درس</h2><form id="lessonForm" class="app-form inline-form">${gradeSelect()}${field('عنوان درس', 'title', 'عنوان', 'text', l.title)}${textArea('خلاصه و محتوای درس', 'summary', 'محتوای آموزشی', l.summary)}${textArea('نکات مهم (هر مورد یک خط)', 'important_points', 'نکته‌ها', (l.important_points || []).join('\n'))}${textArea('واژگان (هر مورد یک خط)', 'vocabulary', 'واژه‌ها', (l.vocabulary || []).join('\n'))}<label>وضعیت محتوا<select name="content_status"><option value="needs_review">نیازمند بررسی</option><option value="demo">تکمیلی / نمونه</option><option value="verified">تأییدشده پس از بررسی</option></select></label>${field('منبع', 'source_note', 'کتاب، چاپ و صفحه', 'text', l.source_note)}<button class="gold-btn full">ذخیره</button><p id="lessonMsg" class="full"></p></form>`;
  const f = $('#lessonForm'); f.elements.grade.value = l.grade; f.elements.content_status.value = l.content_status; $('#backLessons').onclick = showLessons;
  f.onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f)); d.important_points = lines(d.important_points); d.vocabulary = lines(d.vocabulary);
    try { await api(l.id ? `/api/admin/lessons/${l.id}` : '/api/admin/lessons', { method: l.id ? 'PUT' : 'POST', body: body(d) }); await refreshStats(); showLessons(); } catch (err) { $('#lessonMsg').textContent = err.message; }
  };
}
async function showPoems() {
  try {
    const d = await api('/api/admin/poems');
    $('#panelContent').innerHTML = `<div class="panel-welcome"><div><h2>کتابخانه شعر و نکته‌ها</h2><p>${d.poems.length} شعر ثبت‌شده؛ انتساب و ضبط متن را پیش از استفاده رسمی بررسی کنید.</p></div><button id="newPoem" class="gold-btn">＋ افزودن شعر</button></div><div class="panel-grid">${d.poems.map(p => `<article class="panel-item"><h3>${esc(p.title)} · ${esc(p.poet)}</h3><p>${esc(p.text).replace(/\n/g, '<br>')}</p><small>پایه ${gradeNames[p.grade]} · ${p.literary_notes.length} نکته ادبی · ${p.grammar_notes.length} نکته دستوری</small><div class="item-actions"><button class="outline-btn" data-edit-poem="${p.id}">ویرایش</button><button class="danger-btn" data-delete-poem="${p.id}">حذف</button></div></article>`).join('')}</div>`;
    $('#newPoem').onclick = () => poemForm();
    $$('[data-edit-poem]').forEach(b => b.onclick = () => poemForm(d.poems.find(p => p.id === Number(b.dataset.editPoem))));
    $$('[data-delete-poem]').forEach(b => b.onclick = async () => { if (!confirm('شعر حذف شود؟')) return; try { await api(`/api/admin/poems/${b.dataset.deletePoem}`, { method: 'DELETE' }); showPoems(); } catch (e) { alert(e.message); } });
  } catch (e) { msg(e.message); }
}
function poemForm(p = { grade: 7, title: '', poet: '', text: '', literary_notes: [], grammar_notes: [], source_note: '' }) {
  $('#panelContent').innerHTML = `<button id="backPoems" class="outline-btn">← بازگشت</button><h2>${p.id ? 'ویرایش' : 'افزودن'} شعر</h2><form id="poemForm" class="app-form inline-form">${gradeSelect()}${field('عنوان/مطلع', 'title', 'عنوان شعر', 'text', p.title)}${field('شاعر', 'poet', 'نام شاعر', 'text', p.poet)}${textArea('متن شعر', 'text', 'متن شعر را وارد کنید', p.text)}${textArea('نکات ادبی (هر نکته یک خط)', 'literary_notes', 'تشبیه، استعاره، تلمیح...', (p.literary_notes || []).join('\n'))}${textArea('نکات دستوری (هر نکته یک خط)', 'grammar_notes', 'فعل، نهاد، ضمیر...', (p.grammar_notes || []).join('\n'))}${field('منبع/یادداشت', 'source_note', 'منبع معتبر', 'text', p.source_note)}<button class="gold-btn full">ذخیره شعر</button><p id="poemMsg" class="full"></p></form>`;
  const f = $('#poemForm'); f.elements.grade.value = p.grade; $('#backPoems').onclick = showPoems;
  f.onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f)); d.literary_notes = lines(d.literary_notes); d.grammar_notes = lines(d.grammar_notes);
    try { await api(p.id ? `/api/admin/poems/${p.id}` : '/api/admin/poems', { method: p.id ? 'PUT' : 'POST', body: body(d) }); showPoems(); } catch (err) { $('#poemMsg').textContent = err.message; }
  };
}

// ───────── کاربران (مدیر) ─────────
async function showUsers(q = '') {
  try {
    const d = await api('/api/admin/users' + (q ? '?q=' + encodeURIComponent(q) : ''));
    $('#panelContent').innerHTML = `<h2>مدیریت کاربران</h2><p class="muted-note">برای ساخت حساب معلم، فرد ابتدا ثبت‌نام می‌کند و شما نقش را به «معلم» تغییر می‌دهید. حساب غیرفعال بلافاصله از سایت بیرون می‌رود.</p><div class="panel-actions"><form id="userSearch" class="app-form" style="flex-direction:row;flex:1"><input name="q" placeholder="جست‌وجوی نام یا ایمیل" value="${esc(q)}"><button class="outline-btn">جست‌وجو</button></form><a class="outline-btn" href="/api/admin/backup">دانلود نسخه پشتیبان پایگاه داده</a></div><div class="table-wrap"><table><thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>${d.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select id="role-${u.id}">${[['student', 'دانش‌آموز'], ['teacher', 'معلم'], ['admin', 'مدیر']].map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select> <button class="outline-btn" data-save-role="${u.id}">ذخیره</button></td><td>${u.active ? '<span class="success-text">فعال</span>' : 'غیرفعال'}</td><td><button class="outline-btn" data-toggle="${u.id}" data-active="${u.active}">${u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button> <button class="outline-btn" data-reset="${u.id}">گذرواژه جدید</button></td></tr>`).join('')}</tbody></table></div>`;
    $('#userSearch').onsubmit = e => { e.preventDefault(); showUsers(e.currentTarget.q.value.trim()); };
    $$('[data-save-role]').forEach(b => b.onclick = async () => { try { await api(`/api/admin/users/${b.dataset.saveRole}/role`, { method: 'PATCH', body: body({ role: $('#role-' + b.dataset.saveRole).value }) }); b.textContent = 'ذخیره شد ✓'; } catch (e) { alert(e.message); } });
    $$('[data-toggle]').forEach(b => b.onclick = async () => { try { await api(`/api/admin/users/${b.dataset.toggle}/active`, { method: 'PATCH', body: body({ active: b.dataset.active !== '1' }) }); showUsers(q); } catch (e) { alert(e.message); } });
    $$('[data-reset]').forEach(b => b.onclick = async () => { const pw = prompt('گذرواژه جدید (حداقل ۱۰ نویسه) را وارد کنید؛ آن را به‌صورت امن به کاربر بدهید:'); if (!pw) return; try { await api(`/api/admin/users/${b.dataset.reset}/reset-password`, { method: 'POST', body: body({ password: pw }) }); alert('گذرواژه تغییر کرد.'); } catch (e) { alert(e.message); } });
  } catch (e) { msg(e.message); }
}
init();
