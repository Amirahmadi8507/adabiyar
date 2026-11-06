(() => {
  // جداکننده‌ی گره‌چینی بین بخش‌های صفحه‌ی اصلی
  document.querySelectorAll('main > section:not(.hero)').forEach((s, i) => { if (i && !s.classList.contains('depth-band')) { const d = document.createElement('div'); d.className = 'orn-divider'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<i></i>'; s.before(d); } });
  // درگاه ورود (یک بار در هر نشست)
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem('gate')) return;
    sessionStorage.setItem('gate', '1');
    const g = document.createElement('div'); g.className = 'gate'; g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<div class="d l"></div><div class="d r"></div><div class="mid"><img src="assets/logo.svg" alt=""><b>ادبیار</b><small>ایوان ادب پارسی</small></div>';
    document.body.append(g); requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('open'))); setTimeout(() => g.remove(), 2200);
  } catch { /* بدون درگاه ادامه می‌دهیم */ }
})();
