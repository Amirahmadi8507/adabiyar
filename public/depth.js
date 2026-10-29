(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const secs = [...document.querySelectorAll('main section, section.section, .quote-section, .tutor-section, .newsletter, .depth-band')].filter((s, i, a) => !s.classList.contains('hero') && a.indexOf(s) === i);
  secs.forEach(s => s.classList.add('depth-sec'));
  const hero = document.getElementById('hero'), bgs = [...document.querySelectorAll('.db-bg')], clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let ticking = false;
  const update = () => {
    ticking = false; const vh = innerHeight;
    if (hero) hero.style.backgroundPosition = `center calc(42% + ${(scrollY * .18).toFixed(1)}px)`;
    for (const s of secs) {
      const r = s.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 400) { s.style.transform = ''; continue; }
      const enter = clamp(r.top / vh, 0, 1), leave = clamp(1 - r.bottom / vh, 0, 1) * (r.height < vh * 1.4 ? 1 : .35);
      s.style.transformOrigin = enter > 0 ? 'center top' : 'center bottom';
      s.style.transform = `perspective(1500px) rotateX(${(enter * 7 - leave * 5).toFixed(2)}deg) translateZ(${(-enter * 70 - leave * 40).toFixed(1)}px) scale(${(1 - leave * .03).toFixed(3)})`;
    }
    for (const b of bgs) { const r = b.parentElement.getBoundingClientRect(); b.style.transform = `translateY(${((r.top + r.height / 2 - vh / 2) * -.12).toFixed(1)}px) scale(1.08)`; }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true }); addEventListener('resize', update); update();
  document.querySelectorAll('.tilt').forEach(t => {
    t.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * -14 + 'deg'); t.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * 12 + 'deg'); });
    t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  });
})();
