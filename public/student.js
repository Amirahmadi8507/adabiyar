(() => {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const api = async (u, o = {}) => { const r = await fetch(u, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...o }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  const when = iso => { const t = Date.parse(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z')); return Number.isFinite(t) ? new Date(t).toLocaleDateString('fa-IR') : ''; };
  const dt = iso => iso ? new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }) : '';
  const left = iso => { const h = (Date.parse(iso) - Date.now()) / 3600000; if (h < 0) return 'مهلت گذشته'; if (h < 24) return fa(Math.max(1, Math.round(h))) + ' ساعت مانده'; return fa(Math.round(h / 24)) + ' روز مانده'; };
  const ST = { pending: ['در انتظار تحویل', 'mid'], submitted: ['تحویل شد', 'good'], late: ['با تأخیر تحویل شد', 'bad'], graded: ['نمره‌دار', 'good'], missed: ['مهلت تمام شد', 'bad'] };
  const KIND = { assignment: '📝 تکلیف', exam: '📋 آزمون', event: '📅 رویداد' };
  const lvl = p => p >= 70 ? ['good', 'خوب'] : p >= 50 ? ['mid', 'متوسط'] : ['bad', 'نیازمند تمرین'];
  async function draw(me) {
    const [dash, att, cls, asg, cal] = await Promise.all([api('/api/me/dashboard').catch(() => ({})), api('/api/attempts/mine').catch(() => ({ attempts: [] })), api('/api/classes').catch(() => ({ classes: [] })), api('/api/assignments/mine').catch(() => ({ assignments: [] })), api('/api/calendar?from=' + encodeURIComponent(new Date().toISOString()) + '&to=' + encodeURIComponent(new Date(Date.now() + 14 * 86400000).toISOString())).catch(() => ({ items: [] }))]);
    const done = att.attempts.filter(a => ['submitted', 'graded'].includes(a.status) && a.max_score > 0 && a.score !== null);
    const avg = done.length ? Math.round(done.reduce((s, a) => s + 100 * a.score / a.max_score, 0) / done.length) : null;
    app.innerHTML = `<h1>سلام ${esc(me.name)} 👋</h1><p class="msg">این داشبورد مخصوص شماست؛ کلاس‌ها، نتیجه‌ی آزمون‌ها و پیشرفت درس‌هایتان اینجاست.</p>
      <div class="grid stats"><div class="card"><p>آزمون‌های داده‌شده</p><div class="stat">${fa(done.length)}</div></div>
      <div class="card"><p>میانگین نمره</p><div class="stat">${avg === null ? '—' : fa(avg) + '٪'}</div></div>
      <div class="card"><p>روزهای پیاپی مطالعه</p><div class="stat">${fa(dash.streak || 0)}</div></div>
      <div class="card"><p>کلاس‌های من</p><div class="stat">${fa(cls.classes.length)}</div></div></div>
      <h2>کلاس‌های من</h2>
      <div class="card"><p>کد ۶ حرفی کلاس را از معلمتان بگیرید و اینجا وارد کنید:</p><form class="join" id="jf"><input name="code" maxlength="8" placeholder="ABC123" required autocomplete="off"><button>عضویت در کلاس</button></form><p id="jm" class="msg"></p></div>
      <div class="grid" style="margin-top:14px">${cls.classes.map(c => `<div class="card"><h3>${esc(c.name)}</h3><p>پایه ${fa(c.grade)} · معلم: ${esc(c.teacher_name)}</p><p>${fa(c.members)} همکلاسی</p><button data-mat="${c.id}" data-name="${esc(c.name)}">نکته‌ها و ویدیوهای کلاس</button> <button class="o" data-leave="${c.id}">ترک کلاس</button></div>`).join('') || '<p class="msg">هنوز عضو کلاسی نیستید.</p>'}</div>
      <div id="mat"></div><h2 id="upcoming">برنامه‌ی دو هفته‌ی پیش رو</h2><div class="card">${cal.items.length ? cal.items.slice(0, 8).map(i => `<p>${KIND[i.type]} · <b>${esc(i.title)}</b> <span class="msg">— ${esc(i.class_name || '')} · ${dt(i.at)}</span></p>`).join('') : '<p class="msg">چیزی در برنامه نیست.</p>'}<p><a class="btn" href="/calendar">دیدن تقویم کامل</a></p></div>
      <h2 id="assignments">تکالیف من</h2><div id="asgBox">${asg.assignments.length ? asg.assignments.slice().sort((a, b) => (['pending', 'late', 'submitted', 'graded', 'missed'].indexOf(a.status) - ['pending', 'late', 'submitted', 'graded', 'missed'].indexOf(b.status)) || a.due_at.localeCompare(b.due_at)).map(a => { const sb = a.submission, st = ST[a.status], locked = a.status === 'graded' || (a.status === 'missed' && !a.allow_late); return `<div class="card" style="margin-bottom:12px"><h3>${esc(a.title)} <span class="pill ${st[1]}">${st[0]}</span></h3><p class="msg">${esc(a.class_name)} · مهلت: ${dt(a.due_at)} (${left(a.due_at)}) · بارم ${fa(a.max_score)}</p>${a.body ? `<p style="white-space:pre-wrap;color:var(--paper)">${esc(a.body)}</p>` : ''}${a.status === 'graded' ? `<p class="ok"><b>نمره: ${fa(sb.score)} از ${fa(a.max_score)}</b></p>${sb.feedback ? `<p>بازخورد معلم: ${esc(sb.feedback)}</p>` : ''}` : ''}${sb && sb.has_file ? `<p><a href="/api/submissions/${sb.id}/file" target="_blank" rel="noopener">فایل تحویل‌شده: ${esc(sb.file_name)}</a></p>` : ''}${locked ? (a.status === 'missed' ? '<p class="err">مهلت تحویل تمام شده است.</p>' : '') : `<form data-asg="${a.id}"><textarea name="body" rows="3" style="width:100%;border-radius:12px;border:1px solid var(--gold);background:#0b0e0d;color:var(--paper);padding:8px;font:inherit" placeholder="پاسخ تکلیف را اینجا بنویسید…">${esc(sb ? sb.body : '')}</textarea><p><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"> <button>${sb ? 'به‌روزرسانی تحویل' : 'ارسال تکلیف'}</button> <span class="msg"></span></p></form>`}</div>`; }).join('') : '<p class="msg">هنوز تکلیفی برایتان ثبت نشده است.</p>'}</div>
      <h2>کارنامه و تحلیل پیشرفت</h2><p><button class="o no-print" onclick="print()">چاپ کارنامه</button></p><div id="rep"><p class="msg">در حال ساخت کارنامه…</p></div><h2>نتیجه‌ی آزمون‌ها</h2><div class="card tw">${att.attempts.length ? `<table><thead><tr><th>آزمون</th><th>پایه</th><th>نمره</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>${att.attempts.map(a => { const ok = a.max_score > 0 && a.score !== null, p = ok ? Math.round(100 * a.score / a.max_score) : null, l = p === null ? ['', ''] : lvl(p); return `<tr><td>${esc(a.title)}</td><td>${fa(a.grade)}</td><td>${p === null ? '—' : fa(a.score) + ' از ' + fa(a.max_score) + ` (${fa(p)}٪)`}</td><td>${a.status === 'in_progress' ? 'در حال انجام' : a.status === 'submitted' ? 'در انتظار تصحیح' : `<span class="pill ${l[0]}">${l[1]}</span>`}</td><td>${when(a.submitted_at || a.started_at)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="msg">هنوز آزمونی نداده‌اید. از بخش «آزمون‌ها» در صفحه‌ی اصلی شروع کنید.</p>'}</div>
      <h2>پیشرفت درس‌ها</h2><div class="grid">${(dash.grades || []).map(g => `<div class="card"><h3>پایه ${fa(g.grade)}</h3><p>${fa(g.completed)} از ${fa(g.total)} درس</p><div class="bar"><i style="width:${g.total ? Math.round(100 * g.completed / g.total) : 0}%"></i></div></div>`).join('')}</div>
      <h2>میانبرها</h2><div class="quick"><a class="btn" href="/#grades">درس‌ها</a><a class="btn" href="/#exams">آزمون‌ها</a><a class="btn" href="/mistakes">دفترچه اشتباهات</a><a class="btn" href="/book">کتاب‌های درسی</a><a class="btn" href="/#tutor">معلم هوشمند</a></div>`;
    api('/api/me/report').then(r => { $('#rep').innerHTML = renderReport(r); }).catch(x => { $('#rep').innerHTML = `<p class="err">${esc(x.message)}</p>`; });
    $('#jf').onsubmit = async e => { e.preventDefault(); const m = $('#jm'); try { const r = await api('/api/classes/join', { method: 'POST', body: JSON.stringify({ code: e.target.code.value }) }); m.className = 'ok'; m.textContent = `به کلاس «${r.name}» پیوستید.`; setTimeout(() => draw(me), 700); } catch (x) { m.className = 'err'; m.textContent = x.message; } };
    $('#asgBox').onsubmit = async e => {
      e.preventDefault(); const f = e.target, id = f.dataset.asg, m = f.querySelector('.msg'), file = f.file.files[0], text = f.body.value.trim(); m.className = 'msg';
      if (!text && !file) { m.className = 'err'; m.textContent = 'متن بنویسید یا فایل انتخاب کنید.'; return; }
      try {
        if (text) await api(`/api/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify({ body: text }) });
        if (file) { const r = await fetch(`/api/assignments/${id}/submit-file`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'خطا'); }
        m.className = 'ok'; m.textContent = 'تحویل شد ✓'; setTimeout(() => draw(me), 800);
      } catch (x) { m.className = 'err'; m.textContent = x.message; }
    };
    app.onclick = async e => {
      const mb = e.target.closest('[data-mat]');
      if (mb) {
        const box = $('#mat'); box.innerHTML = '<p class="msg">در حال بارگذاری…</p>';
        try { const { materials } = await api(`/api/classes/${mb.dataset.mat}/materials`); box.innerHTML = `<h2>مطالب کلاس «${esc(mb.dataset.name)}»</h2><div class="grid">${materials.map(m => `<div class="card"><h3>${m.kind === 'video' ? '🎬 ' : '📝 '}${esc(m.title)}</h3>${m.kind === 'video' ? `<video controls preload="metadata" playsinline style="width:100%;border-radius:12px;background:#000" src="${esc(m.url)}"></video>` : `<p style="white-space:pre-wrap;color:var(--paper)">${esc(m.body)}</p>`}</div>`).join('') || '<p class="msg">معلم هنوز مطلبی نگذاشته است.</p>'}</div>`; box.scrollIntoView({ behavior: 'smooth' }); } catch (x) { box.innerHTML = `<p class="err">${esc(x.message)}</p>`; }
        return;
      } const b = e.target.closest('[data-leave]'); if (b && confirm('از این کلاس خارج می‌شوید؟')) { await api('/api/classes/' + b.dataset.leave + '/leave', { method: 'DELETE' }); draw(me); } };
  }
  (async () => {
    try {
      const me = (await api('/api/auth/me')).user;
      if (!me) { app.innerHTML = '<h1>ورود لازم است</h1><p class="msg">برای دیدن داشبورد ابتدا از صفحه‌ی اصلی وارد حساب خود شوید.</p><a class="btn" href="/">رفتن به صفحه‌ی اصلی</a>'; return; }
      if (me.role !== 'student') { app.innerHTML = `<h1>این صفحه مخصوص دانش‌آموزان است</h1><p class="msg">پنل شما جداست.</p><a class="btn" href="${me.role === 'admin' ? '/admin' : '/teacher'}">رفتن به پنل ${me.role === 'admin' ? 'مدیر' : 'معلم'}</a>`; return; }
      await draw(me);
    } catch { app.innerHTML = '<p class="err">اتصال به سرور برقرار نشد.</p>'; }
  })();
})();
