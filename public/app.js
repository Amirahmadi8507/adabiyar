'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const gradeNames = { '7': 'هفتم', '8': 'هشتم', '9': 'نهم', '10': 'دهم', '11': 'یازدهم', '12': 'دوازدهم' };
const STATUS_FA = { verified: 'تأییدشده با منبع', needs_review: 'نیازمند بررسی منبع رسمی', demo: 'محتوای نمونه — نیازمند بررسی منبع رسمی' };
const dialog = $('#infoDialog');
const state = { user: null, done: new Set(), bookmarks: { lesson: new Set(), poem: new Set() } };

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const faNum = n => Number(n).toLocaleString('fa-IR');
const faDate = s => { const t = Date.parse(s); return Number.isFinite(t) ? new Date(t).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : ''; };
const sqlDate = s => faDate(String(s).replace(' ', 'T') + 'Z');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

async function api(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({ error: 'پاسخ سرور قابل خواندن نیست.' }));
  if (!res.ok) { const e = new Error(data.error || 'درخواست ناموفق بود.'); e.status = res.status; throw e; }
  return data;
}
const body = o => JSON.stringify(o);

// ───────── پیام‌ها و پنجره‌ها ─────────
let toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
const closeHooks = [];
dialog.addEventListener('close', () => { while (closeHooks.length) { try { closeHooks.pop()(); } catch { /* ignore */ } } });
function customDialog(title, html, opts = {}) {
  $('#dialogTitle').textContent = title; $('#dialogText').innerHTML = html;
  dialog.classList.toggle('wide', !!opts.wide); $('#dialogOk').hidden = !!opts.hideOk;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function showDialog(title, text) {
  $('#dialogTitle').textContent = title; $('#dialogText').textContent = text;
  dialog.classList.remove('wide'); $('#dialogOk').hidden = false;
  if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); } else alert(title + '\n\n' + text);
}
$('#dialogClose').addEventListener('click', () => { if (dialog.classList.contains('locked') && !confirm('آزمون هنوز تمام نشده و زمان ادامه دارد. صفحه بسته شود؟ (می‌توانی از «آزمون‌های من» ادامه بدهی.)')) return; dialog.close(); });
dialog.addEventListener('cancel', e => { if (dialog.classList.contains('locked')) e.preventDefault(); });   // Esc نباید آزمون را بپوشاند
$('#dialogOk').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog && !dialog.classList.contains('locked')) dialog.close(); });

// ───────── ناوبری، پوسته، اسکرول ─────────
$('#menuToggle').addEventListener('click', () => { const open = $('#nav').classList.toggle('open'); $('#menuToggle').setAttribute('aria-expanded', open); });
$$('.nav a').forEach(a => a.addEventListener('click', () => $('#nav').classList.remove('open')));
function applyTheme(light) { document.body.classList.toggle('light', light); $('#themeToggle').textContent = light ? '☀' : '☾'; }
try { applyTheme(localStorage.getItem('adabiyar-theme') === 'light'); } catch { /* ignore */ }
$('#themeToggle').addEventListener('click', () => { const light = !document.body.classList.contains('light'); applyTheme(light); try { localStorage.setItem('adabiyar-theme', light ? 'light' : 'dark'); } catch { /* ignore */ } });

const spyMap = { hero: '#top', grades: '#grades', features: '#features', poems: '#poems', exams: '#exams', tutor: '#tutor', about: '#about' };
const spy = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { const href = spyMap[e.target.id]; $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === href)); } }), { rootMargin: '-40% 0px -55% 0px' });
Object.keys(spyMap).forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

// ───────── ورود، ثبت‌نام و وضعیت کاربر ─────────
function requireLogin(msg) {
  if (state.user) return true;
  authDialog(msg); return false;
}
function authDialog(msg) {
  customDialog('ورود یا ساخت حساب', `${msg ? `<p class="notice">${esc(msg)}</p>` : ''}<div class="auth-tabs"><button type="button" class="gold-btn" id="loginTab">ورود</button><button type="button" class="outline-btn" id="registerTab">ثبت‌نام</button></div><form id="authForm" class="app-form"><label id="nameWrap" hidden>نام نمایشی<input name="name" minlength="2" autocomplete="name"></label><label>ایمیل<input name="email" type="email" required autocomplete="email"></label><label>گذرواژه<input name="password" type="password" minlength="10" required autocomplete="current-password"></label><p class="notice">گذرواژه حداقل ۱۰ نویسه باشد. ورود با شماره موبایل تا زمان اتصال سرویس تأیید پیامکی فعال نیست.</p><button class="gold-btn" type="submit">ورود</button><p id="authMessage" role="status"></p></form>`);
  let mode = 'login'; const form = $('#authForm');
  const setMode = m => { mode = m; $('#nameWrap').hidden = m === 'login'; form.elements.password.autocomplete = m === 'login' ? 'current-password' : 'new-password'; form.querySelector('button[type=submit]').textContent = m === 'login' ? 'ورود' : 'ساخت حساب'; $('#loginTab').className = m === 'login' ? 'gold-btn' : 'outline-btn'; $('#registerTab').className = m === 'register' ? 'gold-btn' : 'outline-btn'; };
  $('#loginTab').onclick = () => setMode('login'); $('#registerTab').onclick = () => setMode('register');
  form.onsubmit = async e => {
    e.preventDefault(); const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const data = await api('/api/auth/' + mode, { method: 'POST', body: body(Object.fromEntries(new FormData(form))) });
      state.user = data.user; await afterAuth(); dialog.close(); toast(`سلام ${state.user.name}؛ خوش آمدی.`);
    } catch (err) { $('#authMessage').textContent = err.message; btn.disabled = false; }
  };
}
async function loadUserData() {
  state.done = new Set(); state.bookmarks = { lesson: new Set(), poem: new Set() };
  if (!state.user) return;
  try {
    const [p, b] = await Promise.all([api('/api/progress'), api('/api/bookmarks')]);
    p.progress.filter(x => x.completed).forEach(x => state.done.add(x.lesson_id));
    b.lessons.forEach(x => state.bookmarks.lesson.add(x.id)); b.poems.forEach(x => state.bookmarks.poem.add(x.id));
  } catch { /* ignore */ }
}
async function afterAuth() { updateAuthUI(); await loadUserData(); refreshLists(); }
function updateAuthUI() {
  const b = $('#loginBtn'); $('#rolePanel')?.remove(); $('#myBtn')?.remove();
  if (!state.user) { b.textContent = 'ورود / ثبت‌نام ↗'; b.onclick = () => authDialog(); return; }
  b.textContent = `${state.user.name} · خروج`;
  b.onclick = async () => { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch { /* ignore */ } state.user = null; await afterAuth(); toast('از حساب خارج شدی.'); };
  const my = document.createElement('button'); my.id = 'myBtn'; my.className = 'login-btn'; my.textContent = 'پیشرفت من'; my.onclick = openDashboard; b.before(my);
  if (['teacher', 'admin'].includes(state.user.role)) {
    const p = document.createElement('button'); p.id = 'rolePanel'; p.className = 'login-btn'; p.textContent = state.user.role === 'admin' ? 'پنل مدیر' : 'پنل معلم';
    p.onclick = () => { location.href = state.user.role === 'admin' ? '/admin' : '/teacher'; }; b.before(p);
  }
}

// ───────── درس‌ها ─────────
const gradeCards = $$('.grade-card'), resultsText = $('#resultsText'), clearFilter = $('#clearFilter');
const resultList = document.createElement('div'); resultList.className = 'lesson-results'; resultList.id = 'lessonResults'; $('#resultsBar').after(resultList);
let lastLessons = [];
function selectGrade(g) {
  gradeCards.forEach(c => c.classList.toggle('selected', c.dataset.grade === String(g)));
  $('#gradeFilter').value = String(g); loadLessons(g, $('#searchInput').value.trim()).then(() => resultList.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); clearFilter.hidden = false;
}
gradeCards.forEach(c => c.addEventListener('click', () => selectGrade(c.dataset.grade)));
clearFilter.addEventListener('click', () => { gradeCards.forEach(c => c.classList.remove('selected')); $('#gradeFilter').value = 'all'; $('#searchInput').value = ''; resultsText.textContent = 'برای شروع، یکی از پایه‌ها را انتخاب کن.'; resultList.replaceChildren(); lastLessons = []; clearFilter.hidden = true; });
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault(); const q = $('#searchInput').value.trim(), g = $('#gradeFilter').value;
  loadLessons(g, q); clearFilter.hidden = false; if (q) { $('#poemQ').value = q; $('#poemGrade').value = g === 'all' ? '' : g; loadPoems(); }
  $('#grades').scrollIntoView({ behavior: 'smooth' });
});
function bookmarkBtn(kind, id) {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'icon-chip';
  const paint = () => { const on = state.bookmarks[kind].has(id); btn.textContent = on ? '★' : '☆'; btn.title = on ? 'حذف از نشان‌شده‌ها' : 'نشان‌کردن'; btn.setAttribute('aria-pressed', on); btn.classList.toggle('on', on); };
  btn.onclick = async () => {
    if (!requireLogin('برای نشان‌کردن، ابتدا وارد حساب شو.')) return;
    const on = !state.bookmarks[kind].has(id);
    try { await api(`/api/bookmarks/${kind}/${id}`, { method: 'PUT', body: body({ on }) }); on ? state.bookmarks[kind].add(id) : state.bookmarks[kind].delete(id); paint(); toast(on ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.'); } catch (e) { toast(e.message); }
  };
  btn.paint = paint; paint(); return btn;
}
function lessonCard(l) {
  const card = document.createElement('article'); card.className = 'lesson-result';
  const h = document.createElement('h3'); h.textContent = `پایه ${gradeNames[l.grade]} · ${l.title}`;
  if (state.done.has(l.id)) { const c = document.createElement('span'); c.className = 'chip done'; c.textContent = '✓ خوانده‌شده'; h.append(' ', c); }
  const p = document.createElement('p'); p.textContent = l.summary;
  const tag = document.createElement('small'); tag.textContent = STATUS_FA[l.content_status] || STATUS_FA.demo;
  const row = document.createElement('div'); row.className = 'card-actions';
  const btn = document.createElement('button'); btn.className = 'outline-btn'; btn.textContent = 'مطالعه نکات'; btn.onclick = () => openLesson(l);
  row.append(btn, bookmarkBtn('lesson', l.id)); card.append(h, p, tag, row); return card;
}
function renderLessons() { resultList.replaceChildren(...lastLessons.map(lessonCard)); }
async function loadLessons(grade = 'all', q = '') {
  resultsText.textContent = 'در حال جست‌وجوی درس‌ها…'; resultList.replaceChildren();
  try {
    const params = new URLSearchParams(); if (grade !== 'all') params.set('grade', grade); if (q) params.set('q', q);
    lastLessons = (await api('/api/lessons?' + params)).lessons;
    const unverified = lastLessons.some(l => l.content_status !== 'verified');
    resultsText.textContent = lastLessons.length ? `${faNum(lastLessons.length)} درس پیدا شد.${unverified ? ' بخشی از محتوا هنوز با کتاب رسمی تطبیق داده نشده است.' : ''}` : 'در این جست‌وجو درسی پیدا نشد.';
    renderLessons();
  } catch (err) { resultsText.textContent = err.message; }
}
function refreshLists() { if (lastLessons.length) renderLessons(); loadPoems(); }

function openLesson(l) {
  const points = Array.isArray(l.important_points) ? l.important_points : [], vocab = Array.isArray(l.vocabulary) ? l.vocabulary : [];
  const done = state.done.has(l.id);
  customDialog(l.title, `<p>${esc(l.summary || '')}</p><h3>نکات مهم</h3><ul>${points.map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul><h3>واژگان</h3><p>${vocab.map(esc).join('، ') || '—'}</p><p class="notice">${esc(STATUS_FA[l.content_status] || STATUS_FA.demo)}${l.source_note ? ' · ' + esc(l.source_note) : ''}</p><div class="dialog-actions"><button class="gold-btn" id="markDone">${done ? 'علامت «خوانده‌شده» را بردار' : 'علامت‌گذاری به‌عنوان خوانده‌شده'}</button><button class="outline-btn" id="saveNote">یادداشت من</button><button class="outline-btn" id="askAbout">بپرس از معلم هوشمند</button></div>`);
  $('#markDone').onclick = async () => {
    if (!requireLogin('برای ثبت پیشرفت، ابتدا وارد حساب شو.')) return;
    try { await api(`/api/progress/${l.id}`, { method: 'PUT', body: body({ completed: !done }) }); done ? state.done.delete(l.id) : state.done.add(l.id); renderLessons(); toast(done ? 'علامت برداشته شد.' : 'این درس به‌عنوان مطالعه‌شده ثبت شد.'); openLesson(l); } catch (e) { toast(e.message); }
  };
  $('#saveNote').onclick = () => { if (requireLogin('برای نوشتن یادداشت، ابتدا وارد حساب شو.')) noteDialog(l); };
  $('#askAbout').onclick = () => openTutor({ context: `درس «${l.title}» (پایه ${gradeNames[l.grade]}): ${l.summary}\nنکات: ${points.join('؛ ')}` });
}
async function noteDialog(l) {
  let existing = ''; try { existing = (await api(`/api/notes/${l.id}`)).note?.body || ''; } catch { /* ignore */ }
  customDialog('یادداشت درس', `<p>یادداشت شخصی برای «${esc(l.title)}»</p><form id="noteForm" class="app-form"><textarea name="body" rows="6" maxlength="5000" placeholder="نکته‌هایی که می‌خواهی به خاطر بسپاری...">${esc(existing)}</textarea><button class="gold-btn">ذخیره یادداشت</button></form><button class="outline-btn" id="backLesson">← بازگشت به درس</button>`);
  $('#backLesson').onclick = () => openLesson(l);
  $('#noteForm').onsubmit = async e => { e.preventDefault(); try { await api(`/api/notes/${l.id}`, { method: 'PUT', body: body({ body: e.currentTarget.body.value }) }); toast('یادداشت ذخیره شد.'); openLesson(l); } catch (err) { toast(err.message); } };
}

// ───────── معلم هوشمند (گفت‌وگوی چندمرحله‌ای) ─────────
let chatHistory = [];
function openTutor({ context = '' } = {}) {
  if (!requireLogin('برای گفت‌وگو با معلم هوشمند، ابتدا وارد حساب شو.')) return;
  customDialog('معلم هوشمند', `<p>سؤالت را درباره معنی شعر، واژه‌ها یا آرایه‌های ادبی بنویس. گفت‌وگو تا بستن این صفحه ادامه پیدا می‌کند.</p><div id="chatLog" class="chat-log" aria-live="polite"></div><form id="aiForm" class="app-form"><label>متن یا زمینه درس (اختیاری)<textarea name="context" rows="2" maxlength="4000" placeholder="متن شعر یا درس...">${esc(context)}</textarea></label><label>پرسش تو<textarea name="question" rows="2" required maxlength="3000" placeholder="مثلاً مفهوم این بیت چیست؟"></textarea></label><div class="dialog-actions"><button class="gold-btn" id="aiSend">پرسیدن</button><button type="button" class="outline-btn" id="aiReset">گفت‌وگوی جدید</button></div></form>`, { wide: true });
  const log = $('#chatLog'), form = $('#aiForm');
  const add = (role, text) => { const d = document.createElement('div'); d.className = 'chat-msg ' + role; d.textContent = text; log.append(d); log.scrollTop = log.scrollHeight; return d; };
  chatHistory.forEach(m => add(m.role, m.content));
  $('#aiReset').onclick = () => { chatHistory = []; log.replaceChildren(); };
  form.onsubmit = async e => {
    e.preventDefault(); const question = form.question.value.trim(); if (!question) return;
    const btn = $('#aiSend'); btn.disabled = true; add('user', question); const wait = add('assistant pending', 'در حال فکر کردن…'); form.question.value = '';
    try {
      const d = await api('/api/ai/ask', { method: 'POST', body: body({ question, context: form.context.value, history: chatHistory }) });
      wait.className = 'chat-msg assistant'; wait.textContent = d.answer; chatHistory.push({ role: 'user', content: question }, { role: 'assistant', content: d.answer }); chatHistory = chatHistory.slice(-6);
    } catch (err) { wait.className = 'chat-msg error'; wait.textContent = err.message; }
    btn.disabled = false; log.scrollTop = log.scrollHeight;
  };
}
$('#askTutor').addEventListener('click', () => openTutor());

// ───────── آزمون‌ها ─────────
let activeExam = null;
function cleanupExam() { if (!activeExam) return; clearInterval(activeExam.timer); clearTimeout(activeExam.saveTimer); if (!activeExam.finished) activeExam.save(); dialog.classList.remove('locked'); activeExam = null; }
$('#examInfo').addEventListener('click', openExams);
async function openExams() {
  if (!requireLogin('برای دیدن آزمون‌ها، ابتدا وارد حساب دانش‌آموزی شو.')) return;
  if (state.user.role !== 'student') return showDialog('آزمون‌ها', 'ساخت و مدیریت آزمون از «پنل معلم/مدیر» انجام می‌شود. شرکت در آزمون با حساب دانش‌آموزی ممکن است.');
  try {
    const { exams } = await api('/api/exams'); const now = Date.now();
    if (!exams.length) return showDialog('آزمون‌های من', 'فعلاً آزمون منتشرشده‌ای وجود ندارد. وقتی معلم آزمونی منتشر کند اینجا می‌بینی.');
    customDialog('آزمون‌های من', `<div class="exam-list">${exams.map(x => {
      const st = Date.parse(x.starts_at), en = Date.parse(x.ends_at); let info, action;
      if (x.attempt_status === 'in_progress') { info = 'در حال انجام'; action = `<button class="gold-btn" data-start="${x.id}">ادامه آزمون</button>`; }
      else if (x.attempt_status) { info = `نمره: ${faNum(x.score ?? 0)} از ${faNum(x.max_score)}`; action = `<button class="outline-btn" data-result="${x.attempt_id}">مرور نتیجه</button>`; }
      else if (Number.isFinite(st) && now < st) { info = 'شروع: ' + faDate(x.starts_at); action = '<button class="outline-btn" disabled>هنوز شروع نشده</button>'; }
      else if (Number.isFinite(en) && now > en) { info = 'مهلت تمام شده'; action = '<button class="outline-btn" disabled>پایان یافته</button>'; }
      else { info = Number.isFinite(en) ? 'مهلت: ' + faDate(x.ends_at) : 'بدون محدودیت تاریخ'; action = `<button class="gold-btn" data-start="${x.id}">شروع آزمون</button>`; }
      return `<article><h3>${esc(x.title)}</h3><p>پایه ${gradeNames[x.grade]} · ${faNum(x.duration_minutes)} دقیقه · ${faNum(x.question_count)} سؤال · ${esc(x.teacher_name)}</p><p>${info}</p>${x.description ? `<p>${esc(x.description)}</p>` : ''}${action}</article>`;
    }).join('')}</div>`, { wide: true });
    $$('[data-start]').forEach(b => b.onclick = () => { if (confirm('پس از شروع، زمان آزمون شروع به شمارش می‌کند. ادامه می‌دهی؟')) startExam(Number(b.dataset.start)); });
    $$('[data-result]').forEach(b => b.onclick = () => viewResult(Number(b.dataset.result)));
  } catch (e) { showDialog('آزمون‌های من', e.message); }
}
async function startExam(id) {
  let data; try { data = await api(`/api/exams/${id}/start`, { method: 'POST', body: '{}' }); } catch (e) { return showDialog('شروع آزمون', e.message); }
  cleanupExam();
  const questions = [...data.questions].sort(() => Math.random() - .5).map(q => ({ ...q, options: [...q.options].sort(() => Math.random() - .5) }));
  customDialog('آزمون', `<p id="examTimer" class="notice timer">…</p><p class="muted-small">پاسخ‌هایت خودکار ذخیره می‌شوند؛ اگر صفحه را ببندی می‌توانی از «آزمون‌های من» ادامه بدهی، اما زمان متوقف نمی‌شود.</p><form id="takeExam" class="app-form">${questions.map((q, i) => `<fieldset><legend>${faNum(i + 1)}. ${esc(q.prompt)} (${faNum(q.points)} نمره)</legend>${q.type === 'short' ? `<textarea name="q${q.id}" rows="6" maxlength="3000" placeholder="پاسخ تشریحی خود را اینجا بنویس…">${esc(data.saved[q.id] || '')}</textarea>` : q.options.map(o => `<label class="option"><input type="radio" name="q${q.id}" value="${esc(o)}"${data.saved[q.id] === o ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}<button class="gold-btn">ارسال نهایی پاسخ‌ها</button></form>`, { wide: true, hideOk: true });
  dialog.classList.add('locked');
  const form = $('#takeExam'), endAt = Date.now() + data.remaining_seconds * 1000;
  const collect = () => questions.map(q => ({ question_id: q.id, answer: (new FormData(form).get('q' + q.id) || '').toString() })).filter(a => a.answer);
  const ex = activeExam = { finished: false, timer: null, saveTimer: null, save: () => { api(`/api/attempts/${data.attempt.id}/answers`, { method: 'PUT', body: body({ answers: collect() }), keepalive: true }).catch(() => {}); } };
  closeHooks.push(cleanupExam);
  ['change', 'input'].forEach(ev => form.addEventListener(ev, () => { clearTimeout(ex.saveTimer); ex.saveTimer = setTimeout(ex.save, 700); }));
  const paint = () => { const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)), el = $('#examTimer'); if (el) { el.textContent = `زمان باقی‌مانده: ${faNum(String(Math.floor(left / 60)).padStart(2, '0'))}:${faNum(String(left % 60).padStart(2, '0'))}`; el.classList.toggle('warn', left <= 60); } return left; };
  const submit = async auto => {
    if (ex.finished) return; ex.finished = true; clearInterval(ex.timer); clearTimeout(ex.saveTimer); form.querySelector('button').disabled = true;
    try {
      const r = await api(`/api/attempts/${data.attempt.id}/submit`, { method: 'POST', body: body({ answers: collect() }) });
      dialog.classList.remove('locked'); customDialog('آزمون ثبت شد', `<p>${auto ? 'زمان آزمون تمام شد و پاسخ‌هایت ثبت شد.' : 'پاسخ‌هایت ثبت شد.'}${r.late ? ' (ارسال با تأخیر؛ فقط پاسخ‌های ذخیره‌شده حساب شد.)' : ''}</p><div class="score-big">${faNum(r.score)} <small>از ${faNum(r.max_score)}</small></div>${r.review_allowed ? '<button class="gold-btn" id="seeRes">مرور پاسخ‌ها</button>' : '<p class="notice">معلم نمایش پاسخ‌ها را غیرفعال کرده است.</p>'}`);
      $('#seeRes')?.addEventListener('click', () => viewResult(r.attempt_id));
    } catch (err) { dialog.classList.remove('locked'); showDialog('ارسال آزمون', err.message); }
  };
  ex.timer = setInterval(() => { if (paint() <= 0) submit(true); }, 1000);
  if (paint() <= 0) submit(true);
  form.onsubmit = e => { e.preventDefault(); if (confirm('پاسخ‌ها نهایی ارسال شوند؟')) submit(false); };
}
async function viewResult(attemptId) {
  try {
    const d = await api(`/api/attempts/${attemptId}/results`);
    customDialog(d.attempt.title, `<div class="score-big">${faNum(d.attempt.score ?? 0)} <small>از ${faNum(d.attempt.max_score)}</small></div>${d.review_allowed ? d.answers.map((a, i) => `<article class="review ${a.is_correct ? 'ok' : 'bad'}"><b>${faNum(i + 1)}. ${esc(a.prompt)}</b><p>پاسخ تو: ${esc(a.answer_text || 'بدون پاسخ')} ${a.is_correct ? '✓' : '✗'}</p>${a.is_correct ? '' : `<p>پاسخ صحیح: ${esc(a.correct_answer || '—')}</p>`}${a.explanation ? `<p class="muted-small">${esc(a.explanation)}</p>` : ''}</article>`).join('') : '<p class="notice">معلم نمایش پاسخ‌ها را غیرفعال کرده است.</p>'}<button class="outline-btn" id="backExams">← آزمون‌های من</button>`, { wide: true });
    $('#backExams').onclick = openExams;
  } catch (e) { showDialog('نتیجه آزمون', e.message); }
}

// ───────── داشبورد و حساب ─────────
async function openDashboard() {
  if (!requireLogin()) return;
  try {
    const [d, b] = await Promise.all([api('/api/me/dashboard'), api('/api/bookmarks')]);
    const st = { in_progress: 'در حال انجام', submitted: 'ثبت‌شده', graded: 'بررسی‌شده' };
    customDialog('پیشرفت من', `<div class="stats-grid"><div><b>${faNum(d.streak)}</b><span>روز متوالی مطالعه 🔥</span></div><div><b>${faNum(d.active_days)}</b><span>روز فعال</span></div><div><b>${faNum(d.notes)}</b><span>یادداشت</span></div><div><b>${faNum(d.bookmarks)}</b><span>نشان‌شده</span></div></div><h3>پیشرفت درس‌ها</h3>${d.grades.map(g => `<div class="prog"><span>پایه ${gradeNames[g.grade]}</span><div class="bar"><i style="width:${g.total ? Math.round(g.completed / g.total * 100) : 0}%"></i></div><small>${faNum(g.completed)} از ${faNum(g.total)}</small></div>`).join('')}<h3>آزمون‌های اخیر</h3>${d.attempts.length ? `<div class="exam-list">${d.attempts.map(a => `<article><h3>${esc(a.title)}</h3><p>${st[a.status] || a.status} · ${a.status === 'in_progress' ? '—' : `${faNum(a.score ?? 0)} از ${faNum(a.max_score)}`}</p>${a.status !== 'in_progress' ? `<button class="outline-btn" data-result="${a.id}">مرور</button>` : ''}</article>`).join('')}</div>` : '<p>هنوز در آزمونی شرکت نکرده‌ای.</p>'}<h3>نشان‌شده‌ها</h3>${b.lessons.length + b.poems.length ? `<div class="chips">${b.lessons.map(x => `<button class="chip" data-bm-lesson="${x.id}">📘 ${esc(x.title)}</button>`).join('')}${b.poems.map(x => `<button class="chip" data-bm-poem="${esc(x.title)}">📜 ${esc(x.title)}</button>`).join('')}</div>` : '<p>با ستاره روی درس‌ها و شعرها، آن‌ها را اینجا نگه دار.</p>'}<details class="account"><summary>حساب کاربری</summary><form id="profileForm" class="app-form"><label>نام نمایشی<input name="name" value="${esc(state.user.name)}" minlength="2" required></label><button class="outline-btn">ذخیره نام</button></form><form id="pwForm" class="app-form"><label>گذرواژه فعلی<input name="current" type="password" autocomplete="current-password" required></label><label>گذرواژه جدید (حداقل ۱۰ نویسه)<input name="next" type="password" minlength="10" autocomplete="new-password" required></label><button class="outline-btn">تغییر گذرواژه</button></form></details>`, { wide: true });
    $$('[data-result]').forEach(x => x.onclick = () => viewResult(Number(x.dataset.result)));
    $$('[data-bm-lesson]').forEach(x => x.onclick = async () => { try { openLesson((await api('/api/lessons/' + x.dataset.bmLesson)).lesson); } catch (e) { toast(e.message); } });
    $$('[data-bm-poem]').forEach(x => x.onclick = () => { dialog.close(); $('#poemQ').value = x.dataset.bmPoem; $('#poemGrade').value = ''; loadPoems().then(() => $('#poems').scrollIntoView({ behavior: 'smooth' })); });
    $('#profileForm').onsubmit = async e => { e.preventDefault(); try { const r = await api('/api/auth/profile', { method: 'PATCH', body: body({ name: e.currentTarget.name.value }) }); state.user.name = r.user.name; updateAuthUI(); toast('نام ذخیره شد.'); } catch (err) { toast(err.message); } };
    $('#pwForm').onsubmit = async e => { e.preventDefault(); const f = e.currentTarget; try { await api('/api/auth/password', { method: 'POST', body: body({ current: f.current.value, next: f.next.value }) }); f.reset(); toast('گذرواژه تغییر کرد.'); } catch (err) { toast(err.message); } };
  } catch (e) { showDialog('پیشرفت من', e.message); }
}

// ───────── شعرها ─────────
let poemSeq = 0;
async function loadPoems() {
  const host = $('#poemResults'); if (!host) return; const seq = ++poemSeq;
  const params = new URLSearchParams(); const q = $('#poemQ').value.trim(), g = $('#poemGrade').value; if (q) params.set('q', q); if (g) params.set('grade', g);
  try {
    const d = await api('/api/poems?' + params); if (seq !== poemSeq) return; host.replaceChildren();
    if (!d.poems.length) { host.innerHTML = '<p>شعری با این مشخصات پیدا نشد.</p>'; return; }
    d.poems.forEach(p => {
      const card = document.createElement('article'); card.className = 'lesson-result';
      const title = document.createElement('h3'); title.textContent = p.title + ' · ' + p.poet;
      const verse = document.createElement('p'); verse.className = 'verse'; verse.textContent = p.text;
      const lit = document.createElement('p'); lit.textContent = 'نکات ادبی: ' + p.literary_notes.join('؛ ');
      const gram = document.createElement('p'); gram.textContent = 'نکات دستوری: ' + p.grammar_notes.join('؛ ');
      const tag = document.createElement('small'); tag.textContent = 'پایه ' + gradeNames[p.grade] + ' · محتوای آموزشی نیازمند بررسی منبع';
      const row = document.createElement('div'); row.className = 'card-actions';
      const ask = document.createElement('button'); ask.className = 'outline-btn'; ask.textContent = 'تحلیل با معلم هوشمند';
      ask.onclick = () => openTutor({ context: `${p.title} — ${p.poet}\n${p.text}` });
      row.append(ask, bookmarkBtn('poem', p.id)); card.append(title, verse, lit, gram, tag, row); host.append(card);
    });
  } catch (e) { if (seq === poemSeq) host.textContent = e.message; }
}
$('#poemQ').addEventListener('input', debounce(loadPoems, 250)); $('#poemGrade').addEventListener('change', loadPoems);
$('#poemFilter').addEventListener('submit', e => { e.preventDefault(); loadPoems(); });
async function loadDailyVerse() {
  try {
    const { poem } = await api('/api/poems/daily'); if (!poem) return;
    const paper = $('.quote-paper'), p = $('p', paper), small = $('small', paper);
    p.replaceChildren(...poem.verse.split('\n').flatMap((line, i) => i ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
    small.textContent = `بیت امروز · ${poem.poet} · ${poem.title}`;
  } catch { /* همان بیت پیش‌فرض می‌ماند */ }
}

// ───────── راه‌اندازی ─────────
async function init() {
  try { state.user = (await api('/api/auth/me')).user; } catch { /* ignore */ }
  updateAuthUI(); await loadUserData(); loadPoems(); loadDailyVerse();
  try {
    const s = await api('/api/ai/status'); const note = document.createElement('small'); note.className = 'system-status';
    note.textContent = s.provider === 'off' ? 'معلم هوشمند در تنظیمات سرور غیرفعال است.' : s.provider === 'gemini' && s.configured ? (s.locationBlocked ? 'Gemini از موقعیت فعلی شما پشتیبانی نمی‌کند.' : s.keyInvalid ? 'گوگل کلید Gemini را نامعتبر می‌داند؛ .env را بررسی کنید.' : s.forbidden ? 'گوگل دسترسی به این مدل/کلید را نمی‌دهد' + (s.detail ? ' — ' + s.detail : '') + '.' : !s.reachable ? 'اتصال سرور به Gemini برقرار نیست.' : s.modelInstalled === false ? `مدل ${s.model} در دسترس نیست؛ GEMINI_MODEL را در .env به gemini-3.8-flash تغییر دهید.` : 'معلم هوشمند آماده است.') : s.provider === 'ollama' ? (!s.reachable ? 'Ollama در حال اجرا نیست؛ برنامه را باز کنید تا معلم هوشمند فعال شود.' : !s.modelInstalled ? `مدل ${s.model} هنوز دانلود نشده است (ollama pull ${s.model}).` : 'معلم هوشمند آماده است.') : (s.configured ? 'معلم هوشمند آماده است.' : 'کلید API در فایل .env تنظیم نشده است.');
    $('#tutor .tutor-copy').append(note);
  } catch { /* ignore */ }
}
const revealObserver = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach(el => revealObserver.observe(el));
let ticking = false;
function scrollDepth() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY, hero = $('#hero');
    if (hero && y < hero.offsetHeight) { const pr = y / hero.offsetHeight; $('.hero-content').style.transform = `translate3d(0,${pr * 28}px,${-pr * 35}px) rotateX(${pr * 1.2}deg)`; hero.style.backgroundPosition = `center ${42 + pr * 9}%`; }
    $$('.quote-paper').forEach(el => { const r = el.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2); el.style.transform = `rotateX(${Math.max(-4, Math.min(8, c * -4))}deg) translateY(${Math.max(-5, Math.min(5, c * -3))}px)`; });
    ticking = false;
  });
}
window.addEventListener('scroll', scrollDepth, { passive: true });
init();
