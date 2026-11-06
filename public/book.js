(() => {
  const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const parseVocab = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.+?)\s*(?:[:：=]|\s[-–—]\s)\s*(.+)$/); return m ? [m[1].trim(), m[2].trim()] : [l, '']; });
  const paras = t => String(t || '').split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => x.startsWith('## ') ? `<h4>${esc(x.slice(3))}</h4>` : `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
  const mediaHtml = i => { const m = i.media || []; if (!m.length) return ''; return `<div class="mg">${m.map(x => x.kind === 'image' ? `<img loading="lazy" src="${esc(x.url)}" alt="${esc(x.name || i.title)}">` : `<video controls playsinline preload="metadata" src="${esc(x.url)}"></video>`).join('')}</div>`; };
  const KINDS = [['device', 'آرایه‌های ادبی'], ['vocab', 'معنی واژگان'], ['sample', 'نمونه سؤال'], ['test', 'آزمون تستی']];
  const sp = new URLSearchParams(location.search);
  let grade = Number(sp.get('grade')) || 7, kind = KINDS.some(k => k[0] === sp.get('kind')) ? sp.get('kind') : 'device', items = [], fs = Number(localStorage.getItem('fs') || 1);
  const setFs = v => { fs = Math.min(1.5, Math.max(.85, v)); document.documentElement.style.setProperty('--fs', fs); try { localStorage.setItem('fs', fs); } catch { } };
  const tabs = () => {
    $('#grades').innerHTML = [7, 8, 9, 10, 11, 12].map(g => `<button data-g="${g}" class="${g === grade ? 'on' : ''}">پایه ${fa(g)}</button>`).join('');
    $('#kinds').innerHTML = KINDS.map(k => `<button data-k="${k[0]}" class="${k[0] === kind ? 'on' : ''}">${k[1]}</button>`).join('');
  };
  const draw = () => {
    const t = $('#q').value.trim(), out = $('#out');
    if (kind === 'test') { out.innerHTML = `<div class="card"><h3>آزمون تستی پایه ${fa(grade)}</h3><p>آزمون‌های منتشرشده‌ی معلمان را از بخش آزمون‌ها بزنید. هر آزمون می‌تواند تستی، تشریحی یا ترکیبی باشد.</p><p><a href="/#exams">رفتن به آزمون‌ها ←</a></p></div>`; return; }
    const list = items.filter(i => !t || (i.title + ' ' + i.body + ' ' + i.answer + ' ' + (i.examples || '')).includes(t));
    if (!list.length) { out.innerHTML = `<p class="note">${items.length ? 'موردی با این جست‌وجو پیدا نشد.' : 'هنوز محتوایی برای این بخش ثبت نشده است.'}</p>`; return; }
    if (kind === 'vocab') {
      out.innerHTML = list.map(i => { const rows = parseVocab(i.body).filter(r => !t || (r[0] + ' ' + r[1] + ' ' + i.title).includes(t)); return `<div class="card"><h3>${esc(i.title)}</h3><small class="note">${fa(rows.length)} واژه</small><table class="vt"><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>`; }).join('');
      return;
    }
    out.innerHTML = list.map((i, n) => `<div class="card"><h3>${kind === 'sample' ? fa(n + 1) + '. ' : ''}${esc(i.title)}</h3>${i.photo ? `<img src="${esc(i.photo)}" alt="تصویر ${esc(i.title)}">` : ''}${i.body ? `<p>${esc(i.body)}</p>` : ''}${i.examples ? `<details open><summary>نمونه‌ها و توضیحات</summary><div class="ex">${paras(i.examples)}</div></details>` : ''}${mediaHtml(i)}${i.answer ? `<details><summary>نمایش پاسخ</summary><div class="ans"><p>${esc(i.answer)}</p></div></details>` : ''}</div>`).join('');
  };
  const load = async () => {
    tabs(); history.replaceState(null, '', `?grade=${grade}&kind=${kind}`);
    if (kind === 'test') { items = []; return draw(); }
    $('#out').innerHTML = '<p class="note">در حال بارگذاری…</p>';
    try { items = (await (await fetch(`/api/book?grade=${grade}&kind=${kind}`)).json()).items || []; } catch { items = []; $('#out').innerHTML = '<p class="note">اتصال به سرور برقرار نشد.</p>'; return; }
    draw();
  };
  $('#grades').onclick = e => { const b = e.target.closest('button'); if (b) { grade = Number(b.dataset.g); load(); } };
  $('#kinds').onclick = e => { const b = e.target.closest('button'); if (b) { kind = b.dataset.k; load(); } };
  $('#q').oninput = draw; $('#fm').onclick = () => setFs(fs - .1); $('#fp').onclick = () => setFs(fs + .1); $('#pr').onclick = () => print();
  $('#out').onclick = e => { const i = e.target.closest('img'); if (i) { $('#lb img').src = i.src; $('#lb').classList.add('on'); } };
  $('#lb').onclick = () => $('#lb').classList.remove('on'); addEventListener('keydown', e => { if (e.key === 'Escape') $('#lb').classList.remove('on'); });
  setFs(fs); load();
})();
