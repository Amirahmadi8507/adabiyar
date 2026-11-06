(() => {
  const box = document.getElementById('dailyBox'); if (!box) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const lines = t => esc(t).split('\n').join('<br>');
  async function load() {
    let d; try { d = await (await fetch('/api/challenge/today', { credentials: 'same-origin' })).json(); } catch { box.innerHTML = '<p class="note">اتصال به سرور برقرار نشد.</p>'; return; }
    const c = d.challenge; if (!c) { box.innerHTML = '<p class="note">امروز چالشی ثبت نشده است.</p>'; return; }
    const r = c.result;
    const note = r ? '' : d.canAnswer ? '' : d.role ? '<p class="note">چالش روزانه مخصوص دانش‌آموزان است.</p>' : '<p class="note">برای ثبت پاسخ و گرفتن امتیاز، وارد حساب دانش‌آموزی شوید.</p>';
    box.innerHTML = `<article class="daily-card"><span class="daily-kind">${esc(c.kindLabel)}</span><h3>${esc(c.title)}</h3><p class="daily-prompt">${lines(c.prompt)}</p>
      <div class="daily-opts">${c.options.map(o => `<button type="button" class="daily-opt ${r ? (o === r.answer ? 'right' : o === r.choice ? 'wrong' : '') : ''}" data-o="${esc(o)}" ${r || !d.canAnswer ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      <div id="dailyRes" aria-live="polite">${r ? resultHtml(r.correct, r.explanation, d.streak) : ''}</div>${note}</article>`;
    box.onclick = async e => {
      const b = e.target.closest('.daily-opt'); if (!b || b.disabled) return; box.querySelectorAll('.daily-opt').forEach(x => { x.disabled = true; });
      try {
        const res = await fetch('/api/challenge/answer', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice: b.dataset.o }) }); const j = await res.json();
        if (!res.ok) { document.getElementById('dailyRes').innerHTML = `<p class="note">${esc(j.error || 'خطا')}</p>`; return; }
        box.querySelectorAll('.daily-opt').forEach(x => { if (x.dataset.o === j.answer) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
        document.getElementById('dailyRes').innerHTML = resultHtml(j.correct, j.explanation, j.streak, j.points);
      } catch { document.getElementById('dailyRes').innerHTML = '<p class="note">اتصال برقرار نشد؛ دوباره تلاش کنید.</p>'; box.querySelectorAll('.daily-opt').forEach(x => { x.disabled = false; }); }
    };
  }
  const resultHtml = (ok, ex, streak, pts) => `<div class="daily-result ${ok ? 'ok' : 'no'}"><b>${ok ? 'آفرین! درست بود' : 'این بار نشد'}${pts ? ' · ' + fa(pts) + ' امتیاز' : ''}</b><p>${esc(ex)}</p><p class="note">روزهای پیاپی: ${fa(streak || 0)} · <a href="/league">دیدن جدول لیگ</a></p></div>`;
  load();
})();
