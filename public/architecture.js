(() => {
  const $ = s => document.querySelector(s), root = document.documentElement, world = $('#world'), track = $('#track'), bg = $('#bg'), hint = $('#hint');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GAP = 760, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const station = x => `<section class="st"><div class="card">${x.photo ? `<img class="ph" src="${esc(x.photo)}" alt="${esc(x.name)}">` : (x.art || '<div class="emb" aria-hidden="true">◈</div>')}<div><h2>${esc(x.name)}</h2><small>${esc(x.subtitle)}</small><p>${esc(x.body)}</p><div class="facts">${x.facts.split(/[،,]/).map(f => f.trim()).filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('')}</div></div></div></section>`;
  const start = () => {
    const sts = [...world.querySelectorAll('.st')], N = sts.length;
    track.style.setProperty('--n', N + 1);
    if (reduce) { root.classList.add('flat'); return; }
    sts.forEach((s, i) => { s.style.transform = `translateZ(${-i * GAP}px)`; });
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 4; ty = (e.clientY / innerHeight - .5) * -3; }, { passive: true });
    (function frame() {
      const max = Math.max(1, track.offsetHeight - innerHeight), p = Math.min(1, Math.max(0, scrollY / max)), cam = p * (N - 1) * GAP;
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      world.style.transform = `translateZ(${cam}px) rotateY(${cx}deg) rotateX(${cy}deg)`;
      bg.style.transform = `scale(${1 + p * .18}) translate(${cx * -4}px, ${cy * 3}px)`; root.style.setProperty('--p', p);
      sts.forEach((s, i) => { const z = -i * GAP + cam, o = z < 0 ? 1 - Math.min(1, -z / (GAP * .62)) : 1 - Math.min(1, z / (GAP * .38)); s.style.opacity = Math.max(0, o).toFixed(3); s.style.pointerEvents = o > .6 ? 'auto' : 'none'; });
      if (hint) hint.style.opacity = p > .03 ? 0 : 1; requestAnimationFrame(frame);
    })();
  };
  fetch('/api/arch').then(r => r.json()).then(d => { world.insertAdjacentHTML('beforeend', (d.sites || []).map(station).join('')); start(); }).catch(() => { root.classList.add('flat'); start(); });
  fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user && d.user.role === 'admin') $('#adm').innerHTML = '<a href="/cms">ویرایش این صفحه</a>'; }).catch(() => {});
  const ask = $('#go');
  ask.onclick = async () => {
    const q = $('#q').value.trim(), out = $('#ans'); if (q.length < 2) return; out.textContent = 'در حال پاسخ…'; ask.disabled = true;
    try {
      const r = await fetch('/api/ai/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ question: q, context: 'موضوع: معماری ایران باستان.' }) });
      const d = await r.json(); out.textContent = r.ok ? d.answer : (r.status === 401 ? 'ابتدا از صفحه‌ی اصلی وارد حساب شوید.' : d.error || 'خطا');
    } catch { out.textContent = 'اتصال به سرور برقرار نشد.'; }
    ask.disabled = false;
  };
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
})();
