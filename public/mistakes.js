(() => {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const api = async (u, o = {}) => { const r = await fetch(u, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...o }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  const post = (u, b = {}) => api(u, { method: 'POST', body: JSON.stringify(b) });
  const when = iso => { const t = Date.parse(String(iso).replace(' ', 'T') + 'Z'); return Number.isFinite(t) ? new Date(t).toLocaleDateString('fa-IR') : ''; };
  let status = 'open', lesson = '', data, topics = [];
  async function load() {
    const q = new URLSearchParams({ status }); if (lesson) q.set('lesson', lesson);
    data = await api('/api/me/mistakes?' + q); draw();
  }
  function itemHtml(i) {
    const mcq = i.type === 'mcq', L = data.summary.reason_labels;
    return `<div class="card" data-q="${i.qid}"><small class="msg">${esc(i.lesson_title || 'بدون درس')} · ${esc(i.exam_title)} · ${when(i.date)}${i.status === 'mastered' ? ' · <span class="ok">مسلط شدی ✓</span>' : ''}</small><h3>${esc(i.prompt)}</h3>
      ${mcq ? i.options.map(o => `<div class="opt ${o === i.correct_answer ? 'right' : o === i.student_answer ? 'wrong' : ''}">${esc(o)}${o === i.correct_answer ? '<span class="tag ok">پاسخ درست</span>' : o === i.student_answer ? '<span class="tag err">پاسخ شما</span>' : ''}</div>`).join('') + (i.student_answer ? '' : '<p class="err">بدون پاسخ ماند.</p>')
        : `<div class="opt wrong"><b>پاسخ شما:</b> ${esc(i.student_answer || '(بدون پاسخ)')}</div>${i.correct_answer ? `<div class="opt right"><b>پاسخ نمونه:</b> ${esc(i.correct_answer)}</div>` : ''}<p class="msg">نمره: ${fa(i.awarded_points ?? 0)} از ${fa(i.points)}${i.teacher_feedback ? ' · بازخورد معلم: ' + esc(i.teacher_feedback) : ''}</p>`}
      ${i.explanation ? `<div class="ex"><b>توضیح معلم:</b> ${esc(i.explanation)}</div>` : ''}
      <div class="ai-box">${i.ai_explanation ? `<div class="ai"><b>توضیح هوشمند:</b>\n${esc(i.ai_explanation)}</div>` : ''}</div>
      <div class="chips"><span class="msg">چرا اشتباه کردم؟</span>${Object.entries(L).map(([k, v]) => `<button class="chip ${i.reason === k ? 'on' : ''}" data-reason="${k}">${esc(v)}</button>`).join('')}</div>
      <div class="chips"><button class="s" data-explain="${i.qid}">${i.ai_explanation ? 'توضیح هوشمند را دوباره ببین' : '🤖 توضیح هوشمند: چرا اشتباه شد؟'}</button>${i.status === 'open' ? `<button class="s" data-master="1">یاد گرفتم ✓</button>` : `<button class="s" data-master="0">برگرداندن به «باز»</button>`}</div></div>`;
  }
  function draw() {
    const s = data.summary, bl = s.by_lesson.filter(x => x.lesson_id);
    const tmap = Object.fromEntries(topics.map(t => [t.lesson_id, t]));
    app.innerHTML = `<h1>دفترچه اشتباهات من</h1><p class="msg">همه‌ی پاسخ‌های اشتباه آزمون‌ها اینجا جمع می‌شود. بفهم چرا اشتباه شد، دوباره تمرین کن و وقتی دو بار پشت‌سرهم درست جواب دادی، «مسلط» می‌شود.</p>
      <div class="rp-grid"><div class="rp-card"><small>اشتباهات باز</small><b>${fa(s.open)}</b></div><div class="rp-card"><small>مسلط‌شده</small><b>${fa(s.mastered)}</b></div><div class="rp-card"><small>دلیل پرتکرار شما</small><b style="font-size:1.1rem">${s.top_reason ? esc(s.reason_labels[s.top_reason]) : '—'}</b></div></div>
      ${s.hidden ? `<p class="msg">${fa(s.hidden)} اشتباه از آزمون‌هایی که معلم نمایش پاسخ را بسته یا هنوز مهلتشان تمام نشده، بعداً در دفترچه ظاهر می‌شود.</p>` : ''}
      <h2>تحلیل نقاط ضعف</h2><div class="card">${bl.some(x => x.open) ? bl.filter(x => x.open).slice(0, 6).map(x => { const t = tmap[x.lesson_id]; return `<div class="rp-topic"><span>${esc(x.title)}<br><small class="rp-note">${fa(x.open)} اشتباه باز${t ? ' · تسلط در آزمون‌ها ' + fa(Math.round(t.pct)) + '٪' : ''}</small></span><div class="rp-bar rp-${t ? (t.pct >= 70 ? 'good' : t.pct >= 50 ? 'mid' : 'bad') : 'bad'}"><i style="width:${t ? Math.max(4, t.pct) : Math.min(100, x.open / x.total * 100)}%"></i></div><button class="s" data-focus="${x.lesson_id}">تمرین</button></div>`; }).join('') : '<p class="msg">اشتباه بازی که به یک درس وصل باشد نداری؛ آفرین!</p>'}
        ${s.advice ? `<p class="ex"><b>پیشنهاد برای «${esc(s.reason_labels[s.top_reason])}»:</b> ${esc(s.advice)}</p>` : '<p class="msg">اگر برای هر اشتباه دلیلش را انتخاب کنی، پیشنهاد شخصی‌تری می‌گیری.</p>'}
        <p><button class="p" id="coach">🤖 تحلیل هوشمند و برنامه‌ی این هفته</button> <button class="p" id="practice">🎯 تمرین ۱۰ سؤال از اشتباهاتم</button></p><div id="coachOut"></div></div>
      <h2>اشتباهات من</h2><div class="bar"><select id="st"><option value="open" ${status === 'open' ? 'selected' : ''}>باز</option><option value="mastered" ${status === 'mastered' ? 'selected' : ''}>مسلط‌شده</option><option value="all" ${status === 'all' ? 'selected' : ''}>همه</option></select>
      <select id="ls"><option value="">همه‌ی درس‌ها</option>${bl.map(x => `<option value="${x.lesson_id}" ${String(x.lesson_id) === lesson ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>
      <div id="list">${data.items.map(itemHtml).join('') || '<p class="msg">موردی برای نمایش نیست.</p>'}</div>`;
    $('#st').onchange = e => { status = e.target.value; load(); }; $('#ls').onchange = e => { lesson = e.target.value; load(); };
    $('#practice').onclick = () => practice(lesson);
    $('#coach').onclick = async e => { const b = e.target, o = $('#coachOut'); b.disabled = true; o.innerHTML = '<p class="msg">در حال تحلیل…</p>'; try { const r = await post('/api/me/weakness/coach'); o.innerHTML = `<div class="ai">${esc(r.coach)}</div>`; } catch (x) { o.innerHTML = `<p class="err">${esc(x.message)}</p>`; } b.disabled = false; };
    app.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return; const card = b.closest('[data-q]');
      try {
        if (b.dataset.focus) { lesson = b.dataset.focus; status = 'open'; await load(); return; }
        if (!card) return; const qid = card.dataset.q;
        if (b.dataset.reason) { const cur = b.classList.contains('on'); await post(`/api/me/mistakes/${qid}/reason`, { reason: cur ? '' : b.dataset.reason }); card.querySelectorAll('[data-reason]').forEach(x => x.classList.remove('on')); if (!cur) b.classList.add('on'); }
        if (b.dataset.master) { await post(`/api/me/mistakes/${qid}/status`, { status: b.dataset.master === '1' ? 'mastered' : 'open' }); await load(); }
        if (b.dataset.explain) { const box = card.querySelector('.ai-box'); b.disabled = true; box.innerHTML = '<p class="msg">در حال نوشتن توضیح…</p>'; try { const r = await post(`/api/me/mistakes/${qid}/explain`, { refresh: !!card.querySelector('.ai') }); box.innerHTML = `<div class="ai"><b>توضیح هوشمند:</b>\n${esc(r.explanation)}</div>`; } catch (x) { box.innerHTML = `<p class="err">${esc(x.message)}</p>`; } b.disabled = false; }
      } catch (x) { alert(x.message); }
    };
  }
  async function practice(les) {
    const box = $('#prBox'), ov = $('#pr'); ov.classList.add('on'); box.innerHTML = '<p class="msg">در حال آماده‌سازی…</p>';
    let r; try { r = await api('/api/me/mistakes/practice' + (les ? '?lesson=' + les : '')); } catch (x) { box.innerHTML = `<p class="err">${esc(x.message)}</p><button id="x">بستن</button>`; $('#x').onclick = () => ov.classList.remove('on'); return; }
    const qs = r.questions; let i = 0, right = 0, mastered = 0;
    if (!qs.length) { box.innerHTML = '<h3>سؤال تستی باز برای تمرین نداری 🎉</h3><p class="msg">اشتباهات تشریحی یا مسلط‌شده در تمرین نمی‌آیند.</p><button id="x" class="p">بستن</button>'; $('#x').onclick = () => ov.classList.remove('on'); return; }
    const show = () => {
      if (i >= qs.length) { box.innerHTML = `<h3>تمرین تمام شد</h3><p>${fa(right)} پاسخ درست از ${fa(qs.length)}${mastered ? ` · ${fa(mastered)} سؤال مسلط شد 🎉` : ''}</p><button id="x" class="p">بستن و به‌روزرسانی</button>`; $('#x').onclick = () => { ov.classList.remove('on'); load(); }; return; }
      const q = qs[i]; box.innerHTML = `<small class="msg">سؤال ${fa(i + 1)} از ${fa(qs.length)} · ${esc(q.lesson_title || '')}</small><h3>${esc(q.prompt)}</h3>${q.options.map(o => `<button class="pb" data-o="${esc(o)}">${esc(o)}</button>`).join('')}<div id="fb"></div>`;
      box.onclick = async e => { const b = e.target.closest('.pb'); if (!b || b.disabled) return; box.querySelectorAll('.pb').forEach(x => { x.disabled = true; }); try { const a = await post('/api/me/mistakes/practice/answer', { question_id: q.qid, choice: b.dataset.o }); if (a.correct) right++; if (a.mastered) mastered++; box.querySelectorAll('.pb').forEach(x => { if (x.dataset.o === a.answer) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); x.style.borderColor = x.dataset.o === a.answer ? '#33b3a6' : x === b && !a.correct ? '#d9615e' : ''; }); $('#fb').innerHTML = `<p class="${a.correct ? 'ok' : 'err'}"><b>${a.correct ? 'درست!' : 'نادرست؛ پاسخ درست مشخص شد.'}</b>${a.mastered ? ' این سؤال را یاد گرفتی ✓' : a.correct ? ` (${fa(a.streak)} از ۲ پاسخ درست پیاپی)` : ''}</p>${a.explanation ? `<div class="ex">${esc(a.explanation)}</div>` : ''}<button class="p" id="nx">${i + 1 >= qs.length ? 'پایان' : 'بعدی'}</button>`; $('#nx').onclick = () => { i++; show(); }; } catch (x) { $('#fb').innerHTML = `<p class="err">${esc(x.message)}</p>`; } };
    };
    show();
  }
  (async () => {
    try {
      const me = (await api('/api/auth/me')).user;
      if (!me) { app.innerHTML = '<h1>دفترچه اشتباهات من</h1><p class="msg">برای دیدن دفترچه ابتدا وارد شوید.</p><a href="/?login=1">ورود</a>'; return; }
      if (me.role !== 'student') { app.innerHTML = '<h1>دفترچه اشتباهات</h1><p class="msg">این بخش مخصوص دانش‌آموزان است. معلم‌ها تحلیل کلاس را در پنل خود می‌بینند.</p>'; return; }
      topics = (await api('/api/me/report').catch(() => ({ topics: [] }))).topics; await load();
    } catch { app.innerHTML = '<p class="err">اتصال به سرور برقرار نشد.</p>'; }
  })();
})();
