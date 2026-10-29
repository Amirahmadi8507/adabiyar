(() => {
  const $ = s => document.querySelector(s), root = document.documentElement, world = $('#world'), track = $('#track'), bg = $('#bg'), hint = $('#hint'), dots = $('#dots');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const lab = n => 'سده‌ی ' + fa(n) + ' هجری قمری';
  const GAP = 760, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const av = p => p.photo ? `<img class="av" src="${esc(p.photo)}" alt="${esc(p.name)}">` : `<div class="av" aria-hidden="true">${esc(p.name.trim()[0] || '؟')}</div>`;
  let poets = [], sts = [];
  const open = p => {
    $('#sheet').innerHTML = `<div class="head">${av(p)}<div><h2>${esc(p.name)}</h2><div>${esc(lab(p.century))} · ${esc(p.years)}</div><div>${esc(p.title)}</div></div></div>
      <h3>زندگی‌نامه</h3><p>${esc(p.bio || 'هنوز زندگی‌نامه‌ای ثبت نشده است.').replace(/\n/g, '<br>')}</p>
      <h3>شعرها</h3>${(p.poems || []).map(m => `<b>${esc(m.title || 'شعر')}</b><div class="poem">${esc(m.text)}</div>`).join('') || '<p>هنوز شعری ثبت نشده است.</p>'}<button id="cl">بستن</button>`;
    $('#modal').classList.add('on'); $('#cl').focus(); $('#cl').onclick = close;
  };
  const close = () => $('#modal').classList.remove('on');
  $('#modal').onclick = e => { if (e.target.id === 'modal') close(); }; addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const build = () => {
    const cs = [...new Set(poets.map(p => p.century))].sort((a, b) => a - b);
    world.innerHTML = `<section class="st hero"><div class="box"><h1>شاعران بزرگ ایران</h1><p>سفری سه‌بعدی از سده‌ی چهارم تا امروز. ${fa(poets.length)} شاعر؛ روی هر کارت بزنید تا زندگی‌نامه و شعرهایش باز شود.</p></div></section>` +
      cs.map(c => `<section class="st"><div class="box"><h2>${lab(c)}</h2><p>${fa(poets.filter(p => p.century === c).length)} شاعر</p><div class="row">${poets.filter(p => p.century === c).map((p, i, a) => `<button class="pc" data-id="${p.id}" style="--r:${(i - (a.length - 1) / 2).toFixed(1)}">${av(p)}<b>${esc(p.name)}</b><small>${esc(p.years)}</small><small>${esc(p.title)}</small></button>`).join('')}</div></div></section>`).join('');
    sts = [...world.querySelectorAll('.st')]; const N = sts.length;
    track.style.height = (N + 1) * 100 + 'vh';
    dots.innerHTML = sts.map((_, i) => `<button data-i="${i}" aria-label="بخش ${fa(i + 1)}"></button>`).join('');
    dots.onclick = e => { const b = e.target.closest('button'); if (!b) return; const max = track.offsetHeight - innerHeight; scrollTo({ top: max * (b.dataset.i / (N - 1)), behavior: 'smooth' }); };
    let active = 0;
    document.addEventListener('click', e => {   // مستقل از hit-test سه‌بعدی: مختصات کلیک را با کادر کارت‌ها مقایسه می‌کنیم
      if ($('#modal').classList.contains('on') || e.target.closest('.dots,.top,.modal')) return;
      for (const c of sts[active].querySelectorAll('.pc')) { const r = c.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { open(poets.find(p => p.id == c.dataset.id)); return; } }
    });
    if (reduce) { root.classList.add('flat'); world.onclick = e => { const c = e.target.closest('.pc'); if (c) open(poets.find(p => p.id == c.dataset.id)); }; return; }
    sts.forEach((s, i) => { s.style.transform = `translateZ(${-i * GAP}px)`; });
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 4; ty = (e.clientY / innerHeight - .5) * -3; }, { passive: true });
    const dotEls = [...dots.children];
    (function frame() {
      const max = Math.max(1, track.offsetHeight - innerHeight), p = Math.min(1, Math.max(0, scrollY / max)), cam = p * (N - 1) * GAP;
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      world.style.transform = `translateZ(${cam}px) rotateY(${cx}deg) rotateX(${cy}deg)`;
      bg.style.transform = `scale(${1 + p * .18}) translate(${cx * -4}px, ${cy * 3}px)`; root.style.setProperty('--p', p);
      sts.forEach((s, i) => { const z = -i * GAP + cam, o = z < 0 ? 1 - Math.min(1, -z / (GAP * .62)) : 1 - Math.min(1, z / (GAP * .38)); s.style.opacity = Math.max(0, o).toFixed(3); s.style.pointerEvents = i === Math.round(p * (N - 1)) ? 'auto' : 'none'; });
      const cur = Math.round(p * (N - 1)); active = cur; dotEls.forEach((d, i) => d.classList.toggle('on', i === cur)); hint.style.opacity = p > .03 ? 0 : 1;
      requestAnimationFrame(frame);
    })();
  };
  fetch('/api/poets').then(r => r.json()).then(d => { poets = d.poets || []; build(); }).catch(() => { world.innerHTML = '<section class="st"><div class="box"><h2>اتصال به سرور برقرار نشد</h2></div></section>'; root.classList.add('flat'); });
  fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user && d.user.role === 'admin') $('#adm').innerHTML = '<a href="/cms">ویرایش صفحه و مدیریت محتوا</a>'; }).catch(() => {});
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
})();
