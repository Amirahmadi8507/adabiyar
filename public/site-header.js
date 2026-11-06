'use strict';
// سربرگ یکپارچه‌ی ادبیار: منوی گروه‌بندی‌شده + منوی کاربر. هم در صفحه‌ی اصلی و هم در صفحه‌های دیگر استفاده می‌شود.
(() => {
  const home = !!document.getElementById('nav'), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = h => h.startsWith('#') && !home ? '/' + h : h;
  const GROUPS = [
    ['یادگیری', [['#grades', 'درس‌ها', 'پایه‌ی هفتم تا دوازدهم'], ['/book', 'کتاب‌های درسی', 'آرایه، معنی واژگان، نمونه سؤال'], ['#features', 'کتابخانه', 'مرور و جست‌وجوی محتوا'], ['#poems', 'شعرها', 'شعرهای منتخب و تحلیل'], ['#tutor', 'معلم هوشمند', 'پرسش و پاسخ با هوش مصنوعی']]],
    ['تمرین و رقابت', [['#exams', 'آزمون‌ها', 'آزمون تستی و تشریحی'], ['#daily', 'چالش روزانه', 'هر روز یک چالش ادبی'], ['/mistakes', 'دفترچه اشتباهات', 'مرور و تمرین اشتباهات'], ['/league', 'لیگ ادبیار', 'رقابت هفتگی و مدال'], ['/forum', 'تالار گفت‌وگو', 'پرسش و بحث با نظارت معلم']]],
    ['فرهنگ ایران', [['/poets', 'شاعران بزرگ', 'قرن به قرن، با زندگی‌نامه'], ['/verses', 'بیت‌های گزیده', 'هر بیت یک پس‌زمینه‌ی تازه'], ['/architecture', 'معماری ایران باستان', 'از چغازنبیل تا طاق کسری']]],
  ];
  const navHtml = () => `<a ${home ? 'class="active"' : ''} href="${home ? '#top' : '/'}">خانه</a>` +
    GROUPS.map(g => `<div class="nav-group"><button type="button" class="nav-btn" aria-haspopup="true" aria-expanded="false">${g[0]}<i aria-hidden="true">▾</i></button><div class="nav-panel">${g[1].map(i => `<a href="${esc(href(i[0]))}"><b>${i[1]}</b><small>${i[2]}</small></a>`).join('')}</div></div>`).join('') +
    `<a href="${href('#about')}">درباره‌ی ما</a>`;
  const userItems = role => role === 'admin' ? [['/admin', 'پنل مدیر'], ['/cms', 'مدیریت محتوا'], ['/calendar', 'تقویم'], ['/forum', 'تالار گفت‌وگو'], ['/league', 'لیگ ادبیار']]
    : role === 'teacher' ? [['/teacher', 'پنل معلم'], ['/calendar', 'تقویم'], ['/forum', 'تالار گفت‌وگو'], ['/league', 'لیگ ادبیار']]
      : [['/student', 'داشبورد من'], ['/student#assignments', 'تکالیف من'], ['/mistakes', 'دفترچه اشتباهات'], ['/calendar', 'تقویم'], ['/league', 'لیگ ادبیار'], ['/forum', 'تالار گفت‌وگو'], ['/book', 'کتاب‌های درسی']];
  window.SiteHeader = { userItems };
  if (home) document.getElementById('nav').innerHTML = navHtml();
  const mount = document.getElementById('siteHeader');
  if (mount) {
    mount.className = 'sitebar'; mount.setAttribute('role', 'banner');
    mount.innerHTML = `<a class="brand" href="/" aria-label="ادبیار"><img class="brand-logo" src="/assets/logo.svg" alt="" width="40" height="40"><span><strong>ادبیار</strong><small>یادگیری عمیق، آینده روشن</small></span></a>
      <button class="menu-toggle" id="menuToggle" aria-label="منو" aria-expanded="false">☰</button><nav class="nav" id="nav" aria-label="منوی اصلی">${navHtml()}</nav><div class="actions"><a class="login-btn" id="loginBtn" href="/?login=1">ورود / ثبت‌نام</a></div>`;
    mount.querySelector('#menuToggle').onclick = () => { const o = mount.querySelector('#nav').classList.toggle('open'); mount.querySelector('#menuToggle').setAttribute('aria-expanded', o); };
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json()).then(({ user }) => {
      if (!user) return; const b = mount.querySelector('#loginBtn'), act = mount.querySelector('.actions');
      b.outerHTML = `<button class="login-btn" id="loginBtn" aria-haspopup="true">${esc(user.name)} ▾</button>`;
      act.insertAdjacentHTML('beforeend', `<div class="user-panel" id="userPanel">${userItems(user.role).map(i => `<a href="${i[0]}">${i[1]}</a>`).join('')}<button type="button" id="logoutBtn">خروج از حساب</button></div>`);
      act.querySelector('#loginBtn').onclick = () => act.querySelector('#userPanel').classList.toggle('open');
      act.querySelector('#logoutBtn').onclick = async () => { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch { /* ignore */ } location.href = '/'; };
    }).catch(() => {});
  }
  const closeAll = except => document.querySelectorAll('.nav-group.open').forEach(g => { if (g !== except) { g.classList.remove('open'); g.firstElementChild.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn'); closeAll(btn && btn.parentElement);
    if (btn) { const g = btn.parentElement, o = g.classList.toggle('open'); btn.setAttribute('aria-expanded', o); }
    const up = document.getElementById('userPanel'); if (up && !e.target.closest('#userPanel,#loginBtn')) up.classList.remove('open');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); const up = document.getElementById('userPanel'); if (up) up.classList.remove('open'); } });
})();
