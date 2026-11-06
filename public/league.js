(() => {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const api = async (u, o = {}) => { const r = await fetch(u, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...o }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  const day = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : fa(r);
  let me, scopes = [{ id: 'global', name: 'همه‌ی دانش‌آموزان' }], scope = 'global';
  async function draw() {
    let d; try { d = await api('/api/league?scope=' + encodeURIComponent(scope)); } catch (e) { $('#res').innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
    const m = d.medals, mine = me.role === 'student';
    $('#res').innerHTML = `<p class="msg">هفته‌ی جاری: ${day(d.week_start)} تا ${day(d.week_end)} (شنبه تا جمعه) · ${fa(d.total)} شرکت‌کننده</p>
      ${mine ? `<div class="grid"><div class="card"><small class="msg">رتبه‌ی من در این جدول</small><div class="big">${d.me ? fa(d.me.rank) : '—'}</div></div><div class="card"><small class="msg">امتیاز این هفته</small><div class="big">${fa(d.me ? d.me.points : 0)}</div></div><div class="card"><small class="msg">مدال‌های من</small><div class="big sm">🥇${fa(m.gold)} 🥈${fa(m.silver)} 🥉${fa(m.bronze)}</div></div><div class="card"><small class="msg">روزهای پیاپی چالش</small><div class="big">${fa(d.streak)}</div></div></div>` : '<p class="msg">شما دانش‌آموز نیستید؛ جدول را فقط می‌بینید.</p>'}
      <h2>جدول این هفته</h2><div class="card tw">${d.rows.length ? `<table><thead><tr><th>رتبه</th><th>نام</th><th>امتیاز</th><th>آزمون</th><th>چالش</th><th>درس</th></tr></thead><tbody>${d.rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td class="rk">${medal(r.rank)}</td><td>${esc(r.name)}${r.me ? ' (من)' : ''}</td><td>${fa(r.points)}</td><td>${fa(r.exams)}</td><td>${fa(r.challenges)}</td><td>${fa(r.lessons)}</td></tr>`).join('')}</tbody></table>` : '<p class="msg">هنوز کسی امتیازی نگرفته؛ با چالش روزانه یا یک آزمون شروع کن!</p>'}</div>
      ${d.last_week.length ? `<h2>قهرمانان هفته‌ی گذشته</h2><div class="podium">${d.last_week.map(w => `<div class="card"><b>${medal(w.rank)}</b>${esc(w.name)}<br><small class="msg">${fa(w.points)} امتیاز</small></div>`).join('')}</div>` : ''}
      ${mine ? `<h2>جوایز مجازی من</h2><div>${d.badges.map(b => `<span class="badge ${b.earned ? 'on' : ''}" title="${esc(b.desc)}">${b.earned ? '⭐' : '🔒'} ${esc(b.name)}</span>`).join('')}</div>` : ''}
      <h2>امتیاز چطور به دست می‌آید؟</h2><div class="card"><ul class="how"><li>هر <b>آزمون کامل‌شده</b>: ۵ امتیاز شرکت + تا ۱۰ امتیاز بر پایه‌ی نمره (آزمون تشریحی بعد از تصحیح معلم حساب می‌شود).</li><li><b>چالش روزانه</b>: پاسخ درست ۱۰ امتیاز، پاسخ نادرست ۲ امتیاز.</li><li>هر <b>درس تمام‌شده</b>: ۳ امتیاز (تا ۱۰ درس در هفته).</li><li>جدول هر هفته از شنبه شروع می‌شود و سه نفر برتر، مدال می‌گیرند.</li></ul></div>`;
  }
  (async () => {
    try {
      me = (await api('/api/auth/me')).user; if (!me) { app.innerHTML = '<h1>لیگ ادبیار</h1><p class="msg">برای دیدن جدول ابتدا از صفحه‌ی اصلی وارد شوید.</p><a href="/">رفتن به صفحه‌ی اصلی</a>'; return; }
      const b = (await api('/api/forum/boards')).boards.filter(x => x.id !== 'general'); scopes = [...scopes, ...b.map(x => ({ id: 'class:' + x.id, name: x.name }))];
      app.innerHTML = `<h1>لیگ ادبیار 🏆</h1><p><label>جدول: <select id="sc">${scopes.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label></p><div id="res"></div>`;
      $('#sc').onchange = e => { scope = e.target.value; draw(); }; draw();
    } catch { app.innerHTML = '<p class="err">اتصال به سرور برقرار نشد.</p>'; }
  })();
})();
