(() => {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const TZ = 'Asia/Tehran', keyF = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }), jF = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' });
  const key = d => keyF.format(d), jp = d => { const p = Object.fromEntries(jF.formatToParts(d).map(x => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day }; }, noon = k => new Date(k + 'T12:00:00Z');
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'], WD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const time = iso => new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const LABEL = { assignment: '📝 مهلت تکلیف', exam: '📋 آزمون', event: '📅 رویداد' }, ST = { pending: ['در انتظار تحویل', 'mid'], submitted: ['تحویل شد', 'good'], late: ['با تأخیر', 'bad'], graded: ['نمره‌دار', 'good'], missed: ['تحویل نشده', 'bad'] };
  const api = async u => { const r = await fetch(u, { credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  let ref = key(new Date()), sel = ref, me;
  function monthOf(k) { let d = noon(k); while (jp(d).d > 1) d = new Date(d.getTime() - 86400000); const m = jp(d).m, y = jp(d).y, days = []; while (jp(d).m === m) { days.push(key(d)); d = new Date(d.getTime() + 86400000); } return { y, m, days }; }
  async function draw() {
    const M = monthOf(ref), from = new Date(noon(M.days[0]).getTime() - 86400000).toISOString(), to = new Date(noon(M.days[M.days.length - 1]).getTime() + 2 * 86400000).toISOString();
    let items = []; try { items = (await api(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).items; } catch (e) { app.innerHTML = `<h1>تقویم آموزشی</h1><p class="err">${esc(e.message)}</p>`; return; }
    const by = {}; items.forEach(i => { (by[key(new Date(i.at))] = by[key(new Date(i.at))] || []).push(i); });
    if (!M.days.includes(sel)) sel = M.days.includes(key(new Date())) ? key(new Date()) : M.days[0];
    const pad = (new Date(noon(M.days[0])).getUTCDay() + 1) % 7, today = key(new Date());
    const cells = [...Array(pad).fill('<div class="cell blank"></div>'), ...M.days.map(k => `<button class="cell ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-k="${k}" aria-label="${fa(jp(noon(k)).d)} ${MONTHS[M.m - 1]}"><b>${fa(jp(noon(k)).d)}</b><span class="dots">${(by[k] || []).slice(0, 6).map(i => `<i class="dot ${i.type}"></i>`).join('')}</span></button>`)].join('');
    const day = (by[sel] || []);
    app.innerHTML = `<h1>تقویم آموزشی</h1><div class="top"><button id="pv" aria-label="ماه قبل">›</button><h2>${MONTHS[M.m - 1]} ${fa(M.y)}</h2><button id="nx" aria-label="ماه بعد">‹</button><button id="td">امروز</button></div>
      <div class="legend"><span><i style="background:#d7ad69"></i>مهلت تکلیف</span><span><i style="background:#d9615e"></i>آزمون</span><span><i style="background:#33b3a6"></i>جلسه / رویداد</span></div>
      <div class="wk">${WD.map(w => `<div>${w}</div>`).join('')}</div><div class="grid" id="g">${cells}</div>
      <h3 style="color:var(--gold)">${fa(jp(noon(sel)).d)} ${MONTHS[jp(noon(sel)).m - 1]}</h3>${day.length ? day.map(i => `<div class="card"><h3>${LABEL[i.type]}${i.kind ? '' : ''} · ${esc(i.title)}${i.status ? ` <span class="pill ${ST[i.status][1]}">${ST[i.status][0]}</span>` : ''}</h3><small class="msg">${time(i.at)}${i.class_name ? ' · ' + esc(i.class_name) : ''}${i.detail ? ' · ' + esc(i.detail) : ''}</small></div>`).join('') : '<p class="msg">برای این روز برنامه‌ای نیست.</p>'}
      ${me.role === 'student' ? '<p><a href="/student#assignments">رفتن به تکالیف من ←</a></p>' : '<p class="msg">رویداد و تکلیف تازه را از تب «کلاس‌ها» در پنل خود اضافه کنید.</p>'}`;
    $('#g').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { sel = b.dataset.k; draw(); } };
    $('#nx').onclick = () => { ref = key(new Date(noon(M.days[M.days.length - 1]).getTime() + 86400000)); draw(); };
    $('#pv').onclick = () => { ref = key(new Date(noon(M.days[0]).getTime() - 86400000)); draw(); };
    $('#td').onclick = () => { ref = sel = key(new Date()); draw(); };
  }
  (async () => {
    try { me = (await api('/api/auth/me')).user; if (!me) { app.innerHTML = '<h1>تقویم آموزشی</h1><p class="msg">برای دیدن تقویم ابتدا از صفحه‌ی اصلی وارد شوید.</p><a href="/?login=1">ورود</a>'; return; } draw(); }
    catch { app.innerHTML = '<p class="err">اتصال به سرور برقرار نشد.</p>'; }
  })();
})();
