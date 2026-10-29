(() => {
  const $ = s => document.querySelector(s), root = document.documentElement, world = $('#world'), track = $('#track'), bgs = $('#bgs'), hint = $('#hint');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GAP = 760, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, DEF = ['assets/hero-library.jpg', 'assets/hero-modern.jpg'];
  const build = verses => {
    world.innerHTML = '<section class="st"><div class="v intro"><h1>بیت‌های گزیده</h1><p>با هر اسکرول، بیتی تازه و فضایی تازه.</p></div></section>' +
      verses.map(v => `<section class="st"><div class="v"><div class="l">${esc(v.text).split('\n').map(x => `<div>${x}</div>`).join('')}</div><div class="by">${esc(v.poet)}</div>${v.source ? `<div class="src">${esc(v.source)}</div>` : ''}</div></section>`).join('');
    const sts = [...world.querySelectorAll('.st')], N = sts.length;
    bgs.innerHTML = ['', ...verses.map(v => v.photo)].map((p, i) => `<div class="bg" style="background-image:url('${esc(p || DEF[i % DEF.length])}')"></div>`).join('');
    const layers = [...bgs.children]; track.style.height = (N + 1) * 100 + 'vh';
    if (reduce) { root.classList.add('flat'); layers[0].style.opacity = 1; return; }
    sts.forEach((s, i) => { s.style.transform = `translateZ(${-i * GAP}px)`; });
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 4; ty = (e.clientY / innerHeight - .5) * -3; }, { passive: true });
    (function frame() {
      const max = Math.max(1, track.offsetHeight - innerHeight), p = Math.min(1, Math.max(0, scrollY / max)), f = p * (N - 1), cam = f * GAP;
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      world.style.transform = `translateZ(${cam}px) rotateY(${cx}deg) rotateX(${cy}deg)`; root.style.setProperty('--p', p);
      layers.forEach((l, i) => { const d = Math.abs(f - i); l.style.opacity = Math.max(0, 1 - d * 1.15).toFixed(3); l.style.transform = `scale(${1.05 + (f - i) * .05}) translate(${cx * -4}px, ${cy * 3}px)`; });
      sts.forEach((s, i) => { const z = -i * GAP + cam, o = z < 0 ? 1 - Math.min(1, -z / (GAP * .62)) : 1 - Math.min(1, z / (GAP * .38)); s.style.opacity = Math.max(0, o).toFixed(3); });
      hint.style.opacity = p > .03 ? 0 : 1; requestAnimationFrame(frame);
    })();
  };
  fetch('/api/verses').then(r => r.json()).then(d => build(d.verses || [])).catch(() => { world.innerHTML = '<section class="st"><div class="v intro"><h1>اتصال به سرور برقرار نشد</h1></div></section>'; root.classList.add('flat'); });
  fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user && d.user.role === 'admin') $('#adm').innerHTML = '<a href="/cms">ویرایش بیت‌ها و پس‌زمینه‌ها</a>'; }).catch(() => {});
  // آهنگ: یک فایل برای کل صفحه. مرورگرها پخش خودکار را بدون کنش کاربر نمی‌پذیرند؛ پس با اولین کلیک/لمس/کلید شروع می‌شود.
  fetch('/api/music-info').then(r => r.json()).then(i => {
    if (!i.has) return; const au = $('#au'), mb = $('#mb'), mv = $('#mv'); au.src = '/api/music?v=' + i.v; au.volume = Number(mv.value); $('#mus').classList.add('on');
    let want = true; const sync = () => { mb.textContent = au.paused ? '🎵 پخش آهنگ' : '⏸ توقف آهنگ'; };
    const go = () => au.play().then(sync, sync);
    mb.onclick = () => { want = au.paused; au.paused ? go() : (au.pause(), sync()); }; mv.oninput = () => { au.volume = Number(mv.value); };
    const first = () => { if (want && au.paused) go(); ['pointerdown', 'keydown', 'touchend'].forEach(ev => removeEventListener(ev, first)); };
    ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, first)); au.addEventListener('play', sync); au.addEventListener('pause', sync); go(); sync();
  }).catch(() => {});
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
})();
