(() => {
  const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const api = async (u, o = {}) => { const r = await fetch(u, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...o }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  const shrink = (file, S, q, max) => new Promise((ok, bad) => {
    // توجه: CSP سایت فقط data: را برای عکس مجاز می‌داند؛ پس به‌جای blob: از FileReader (data URL) استفاده می‌کنیم.
    if (file.size > 25 * 1024 * 1024) return bad(new Error('حجم فایل بیش از حد است.'));
    const rd = new FileReader();
    rd.onerror = () => bad(new Error('خواندن فایل ممکن نشد.'));
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => bad(new Error('مرورگر این فرمت عکس را نمی‌شناسد (مثلاً HEIC آیفون). عکس را به JPG یا PNG تبدیل کنید یا از اسکرین‌شات بگیرید.'));
      img.onload = () => {
        let size = S, out = '';
        for (let t = 0; t < 8; t++) {
          const k = Math.min(1, size / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q); if (out.length <= max) break; q = Math.max(.4, q - .08); size = Math.round(size * .85);
        }
        out.length <= max ? ok(out) : bad(new Error('عکس هنوز بزرگ است؛ عکس کوچک‌تری انتخاب کنید.'));
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });

  const parseVocab = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.+?)\s*(?:[:：=]|\s[-–—]\s)\s*(.+)$/); return m ? [m[1].trim(), m[2].trim()] : [l, '']; });
  function bookSetup(box, f) {
    const T = { device: ['نام آرایه (مثلاً: تشبیه)', 'تعریف آرایه'], vocab: ['نام درس (مثلاً: درس ۱ ـ ستایش)', 'واژه‌ها و معنی‌ها: هر خط یک واژه، به شکل «واژه: معنی»'], sample: ['صورت سؤال', 'توضیح سؤال (اختیاری)'] };
    const lab = k => f.elements[k].closest('label'), pv = document.createElement('div'); pv.className = 'vprev'; lab('body').after(pv);
    f.elements.body.placeholder = 'مثال:\nستایش: ستودن، ثنا گفتن\nپاینده: ماندگار\nفروزنده: روشن‌کننده';
    return () => {
      const k = f.elements.kind.value; lab('title').childNodes[0].nodeValue = T[k][0]; lab('body').childNodes[0].nodeValue = T[k][1];
      lab('examples').classList.toggle('hide', k === 'vocab'); lab('answer').classList.toggle('hide', k !== 'sample');
      const rows = k === 'vocab' ? parseVocab(f.elements.body.value) : [];
      pv.innerHTML = k === 'vocab' ? (rows.length ? `<small>پیش‌نمایش: ${rows.length} واژه‌ی شناسایی‌شده</small><table>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1]) || '<small class="err">معنی ندارد (بعد از : بنویسید)</small>'}</td></tr>`).join('')}</table>` : '<small>هنوز واژه‌ای نوشته نشده است.</small>') : '';
    };
  }
  // سازنده‌ی عمومی برای فهرست‌هایی که ایجاد/ویرایش/حذف/عکس دارند
  function entity(box, cfg) {
    let items = [], editing = null, photo = '', refresh = () => {};
    box.innerHTML = `<div class="wrap"><form class="box"><h2 class="ft"></h2>${cfg.fields.map(f => `<label>${f.label}${f.sel ? `<select name="${f.k}">${f.sel.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>` : f.area ? `<textarea name="${f.k}" style="min-height:${f.h || 90}px"></textarea>` : `<input name="${f.k}" ${f.num ? 'type="number" step="any"' : ''} ${f.req ? 'required' : ''}>`}</label>`).join('')}
      <div ${cfg.noPhoto ? 'hidden' : ''}><label>${cfg.photoLabel || 'عکس'} (اختیاری؛ خودکار کوچک می‌شود)<input type="file" class="ph" accept="image/*"></label><p><img class="pv" alt=""> <button type="button" class="b d phx hide">حذف عکس</button></p></div>
      ${cfg.poems ? '<h3>شعرها</h3><div class="poems"></div><button type="button" class="b o addp">+ افزودن شعر</button>' : ''}
      <p><button class="b">ذخیره</button> <button type="button" class="b o cancel hide">انصراف / مورد جدید</button></p><p class="msg"></p></form>
      <div class="box"><h2>${cfg.title}</h2>${cfg.media ? '<div class="mm"></div>' : ''}<div class="rows"></div></div></div>`;
    const f = box.querySelector('form'), say = (t, bad) => { const m = box.querySelector('.msg'); m.textContent = t; m.className = 'msg' + (bad ? ' err' : ''); };
    const showPh = () => { const pv = box.querySelector('.pv'); if (photo) pv.src = photo; else pv.removeAttribute('src'); pv.style.display = photo ? 'inline-block' : 'none'; box.querySelector('.phx').classList.toggle('hide', !photo); };
    const poemBox = (p = {}) => { const d = document.createElement('div'); d.className = 'poem'; d.innerHTML = `<label>عنوان شعر<input class="pt" value="${esc(p.title)}"></label><label>متن شعر<textarea class="px">${esc(p.text)}</textarea></label><button type="button" class="b d">حذف این شعر</button>`; d.querySelector('button').onclick = () => d.remove(); box.querySelector('.poems').append(d); };
    const reset = () => { editing = null; f.reset(); photo = ''; showPh(); if (cfg.poems) box.querySelector('.poems').innerHTML = ''; f.querySelector('.ft').textContent = cfg.add; box.querySelector('.cancel').classList.add('hide'); };
    const draw = () => { box.querySelector('.rows').innerHTML = items.map(p => `<div class="row">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : ''}<span><b>${esc(cfg.label ? cfg.label(p) : p.name)}</b><br><small>${esc(cfg.sub(p))}</small></span>${cfg.media ? `<button class="b o" data-m="${p.id}">عکس/ویدیو (${(p.media || []).length})</button>` : ''}<button class="b o" data-e="${p.id}">ویرایش</button><button class="b d" data-d="${p.id}">حذف</button></div>`).join('') || '<p>موردی ثبت نشده است.</p>'; };
    const load = async () => { items = (await api(cfg.list))[cfg.key]; draw(); };
    box.querySelector('.ph').onchange = async e => { const x = e.target.files[0]; if (!x) return; try { photo = await shrink(x, cfg.size, cfg.q, cfg.max); showPh(); say('عکس آماده است؛ برای ثبت، «ذخیره» را بزنید.'); } catch (err) { say(err.message, true); } };
    box.querySelector('.phx').onclick = () => { photo = ''; box.querySelector('.ph').value = ''; showPh(); };
    const renderMedia = id => {
      const p = items.find(x => x.id === id), mm = box.querySelector('.mm'); if (!p) { mm.innerHTML = ''; return; }
      mm.innerHTML = `<div class="poem"><b>عکس و ویدیوی «${esc(p.title)}»</b><div class="mlist">${(p.media || []).map(m => `<div class="row">${m.kind === 'image' ? `<img src="${esc(m.url)}" alt="">` : '🎬'}<span>${esc(m.name || (m.kind === 'image' ? 'عکس' : 'ویدیو'))}</span><button class="b d" data-x="${m.id}">حذف</button></div>`).join('') || '<small>هنوز فایلی ندارد.</small>'}</div><label>افزودن عکس (JPG/PNG/WEBP/GIF) یا ویدیو (MP4/WEBM) — چند فایل را می‌توانید با هم انتخاب کنید<input type="file" multiple accept="image/*,video/mp4,video/webm"></label><p class="msg"></p><button type="button" class="b o cm">بستن</button></div>`;
      const msg = mm.querySelector('.msg'), say2 = (t, bad) => { msg.textContent = t; msg.className = 'msg' + (bad ? ' err' : ''); };
      mm.querySelector('.cm').onclick = () => { mm.innerHTML = ''; };
      mm.querySelector('.mlist').onclick = async e => { const b = e.target.closest('[data-x]'); if (!b || !confirm('این فایل حذف شود؟')) return; try { await api('/api/admin/book-media/' + b.dataset.x, { method: 'DELETE' }); await load(); renderMedia(id); } catch (x) { say2(x.message, true); } };
      mm.querySelector('input[type=file]').onchange = async e => {
        const files = [...e.target.files]; let n = 0;
        for (const f of files) {
          say2(`در حال بارگذاری ${++n} از ${files.length}: ${f.name} …`);
          try { const r = await fetch(`/api/admin/book/${id}/media`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(f.name) }, body: f }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'خطا'); } catch (x) { say2(`«${f.name}»: ${x.message}`, true); alert(`«${f.name}»: ${x.message}`); await load(); return renderMedia(id); }
        }
        await load(); renderMedia(id); box.querySelector('.mm .msg').textContent = 'فایل‌ها بارگذاری شدند.';
      };
    };
    box.querySelector('.cancel').onclick = reset; if (cfg.poems) box.querySelector('.addp').onclick = () => poemBox();
    box.querySelector('.rows').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m) { renderMedia(Number(b.dataset.m)); box.querySelector('.mm').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (b.dataset.d) { if (!confirm('حذف شود؟')) return; try { await api(cfg.url + '/' + b.dataset.d, { method: 'DELETE' }); if (editing == b.dataset.d) reset(); await load(); } catch (x) { alert(x.message); } }
      if (b.dataset.e) { const p = items.find(x => x.id == b.dataset.e); editing = p.id; cfg.fields.forEach(x => { f.elements[x.k].value = p[x.k] ?? ''; }); photo = p.photo || ''; showPh(); refresh(); if (cfg.poems) { box.querySelector('.poems').innerHTML = ''; (p.poems || []).forEach(poemBox); } f.querySelector('.ft').textContent = 'ویرایش: ' + (cfg.label ? cfg.label(p) : p.name); box.querySelector('.cancel').classList.remove('hide'); scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    f.onsubmit = async e => {
      e.preventDefault(); const d = {}; cfg.fields.forEach(x => { d[x.k] = x.num ? Number(f.elements[x.k].value) : f.elements[x.k].value; }); d.photo = photo;
      if (cfg.poems) d.poems = [...box.querySelectorAll('.poem')].map(x => ({ title: x.querySelector('.pt').value, text: x.querySelector('.px').value }));
      try { await api(editing ? cfg.url + '/' + editing : cfg.url, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(d) }); reset(); say('ذخیره شد؛ صفحه‌ی عمومی را تازه کنید.'); await load(); } catch (x) { say(x.message, true); alert(x.message); }
    };
    if (cfg.setup) { refresh = cfg.setup(box, f); f.addEventListener('input', () => refresh()); f.addEventListener('change', () => refresh()); }
    reset(); refresh(); return load();
  }

  async function site(box) {
    const L = { hero_title: ['عنوان اصلی (برای رنگ طلایی، کلمه را بین دو ستاره بگذارید: *دنیای بهتر*)', 0], hero_text: ['متن زیر عنوان اصلی', 1], grades_title: ['بخش پایه‌ها: عنوان', 0], grades_text: ['بخش پایه‌ها: توضیح', 1], quote_text: ['بیت یا سخن ادبی (هر مصرع در یک خط)', 1], quote_by: ['سراینده / منبع سخن', 0], features_title: ['بخش کتابخانه: عنوان', 0], features_text: ['بخش کتابخانه: توضیح', 1], tutor_title: ['معلم هوشمند: عنوان', 0], tutor_text: ['معلم هوشمند: توضیح', 1], exams_title: ['آزمون‌ها: عنوان', 0], exams_text: ['آزمون‌ها: توضیح', 1], poems_title: ['بخش شعرها: عنوان', 0], poems_text: ['بخش شعرها: توضیح', 1], about_title: ['پایین صفحه: عنوان', 0], about_text: ['پایین صفحه: توضیح', 1] };
    const { content, keys } = await api('/api/content');
    box.innerHTML = `<form class="box"><h2>متن‌های صفحه‌ی اصلی</h2><p><small>فیلد خالی یعنی همان متن اصلی سایت نمایش داده شود.</small></p>${keys.map(k => `<label>${esc(L[k][0])}${L[k][1] ? `<textarea name="${k}"></textarea>` : `<input name="${k}">`}</label>`).join('')}<p><button class="b">ذخیره‌ی متن‌ها</button></p><p class="msg"></p></form>`;
    const f = box.querySelector('form'); keys.forEach(k => { f.elements[k].value = content[k] || ''; });
    f.onsubmit = async e => { e.preventDefault(); const m = box.querySelector('.msg'); try { await api('/api/admin/content', { method: 'PUT', body: JSON.stringify({ values: Object.fromEntries(keys.map(k => [k, f.elements[k].value])) }) }); m.className = 'msg'; m.textContent = 'ذخیره شد؛ صفحه‌ی اصلی را تازه کنید.'; } catch (x) { m.className = 'msg err'; m.textContent = x.message; } };
  }

  function music(box) {
    const d = document.createElement('div'); d.className = 'box'; d.style.marginBottom = '18px';
    d.innerHTML = `<h2>آهنگ صفحه‌ی بیت‌های گزیده</h2><p><small>یک آهنگ برای کل صفحه؛ هنگام اسکرول عوض نمی‌شود. MP3 / M4A / OGG / WAV تا ۲۵ مگابایت.</small></p><p class="mi">در حال بررسی…</p><audio controls class="hide" style="width:100%"></audio><label>انتخاب فایل آهنگ<input type="file" accept="audio/*"></label><p><button class="b d hide" type="button">حذف آهنگ</button></p><p class="msg"></p>`;
    box.prepend(d); const mi = d.querySelector('.mi'), au = d.querySelector('audio'), del = d.querySelector('button.d'), msg = d.querySelector('.msg');
    const say = (t, bad) => { msg.textContent = t; msg.className = 'msg' + (bad ? ' err' : ''); };
    const refresh = async () => { const i = await api('/api/music-info'); mi.textContent = i.has ? 'آهنگ فعلی: ' + i.name : 'هنوز آهنگی بارگذاری نشده است.'; au.classList.toggle('hide', !i.has); del.classList.toggle('hide', !i.has); if (i.has) au.src = '/api/music?v=' + i.v; else au.removeAttribute('src'); };
    d.querySelector('input').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; if (f.size > 25 * 1024 * 1024) return say('حجم فایل بیش از ۲۵ مگابایت است.', true);
      say('در حال بارگذاری…');
      try { const r = await fetch('/api/admin/music', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': f.type || 'audio/mpeg', 'X-File-Name': encodeURIComponent(f.name) }, body: f }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'خطا'); say('آهنگ ذخیره شد.'); e.target.value = ''; await refresh(); } catch (x) { say(x.message, true); }
    };
    del.onclick = async () => { if (!confirm('آهنگ حذف شود؟')) return; try { await api('/api/admin/music', { method: 'DELETE' }); say('حذف شد.'); await refresh(); } catch (x) { say(x.message, true); } };
    return refresh();
  }
  function lessons(box) {
    box.innerHTML = `<form class="box"><h2>وارد کردن گروهی درس‌ها</h2><p><small>قالب JSON را در کادر بچسبانید. هر درس که slug تکراری داشته باشد به‌روز می‌شود، نه دوباره ساخته. فایل نمونه: <b>lessons-template.json</b> در پوشه‌ی پروژه.</small></p><label>JSON درس‌ها<textarea name="j" style="min-height:320px;direction:ltr;font-family:monospace" placeholder='{"lessons":[{"grade":7,"slug":"g7-l1","title":"…","summary":"…","body":"## تیتر\n\nمتن…","important_points":["…"],"vocabulary":["واژه: معنی"],"content_status":"needs_review","source_note":"…"}]}'></textarea></label><p><button class="b">وارد کن</button></p><p class="msg"></p></form>`;
    const f = box.querySelector('form'), m = box.querySelector('.msg');
    f.onsubmit = async e => { e.preventDefault(); let data; try { data = JSON.parse(f.elements.j.value); if (Array.isArray(data)) data = { lessons: data }; } catch { m.className = 'msg err'; m.textContent = 'JSON معتبر نیست؛ ویرگول‌ها و گیومه‌ها را بررسی کنید.'; return; }
      try { const r = await api('/api/admin/lessons/import', { method: 'POST', body: JSON.stringify(data) }); m.className = 'msg' + (r.errors.length ? ' err' : ''); m.textContent = `اضافه: ${r.added} · به‌روز: ${r.updated}` + (r.errors.length ? ' · ' + r.errors.join(' | ') : ''); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } };
  }
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b)); ['poets', 'arch', 'verses', 'book', 'challenge', 'lessons', 'site'].forEach(t => $('#t-' + t).classList.toggle('hide', t !== b.dataset.t)); };
  (async () => {
    try {
      const me = (await api('/api/auth/me')).user; if (!me || me.role !== 'admin') { $('#gate').textContent = 'این صفحه فقط برای مدیر است. ابتدا از صفحه‌ی اصلی با حساب مدیر وارد شوید.'; return; }
      $('#gate').hidden = true; $('#app').classList.remove('hide');
      await Promise.all([
        entity($('#t-poets'), { key: 'poets', list: '/api/poets', url: '/api/admin/poets', title: 'شاعران ثبت‌شده', add: 'افزودن شاعر', size: 360, q: .8, max: 120000, poems: true, sub: p => `قرن ${p.century} · ${p.poems.length} شعر`,
          fields: [{ k: 'name', label: 'نام شاعر', req: 1 }, { k: 'century', label: 'قرن (عدد هجری، مثلاً ۸)', num: 1, req: 1 }, { k: 'years', label: 'سال‌ها (مثلاً ۷۲۷–۷۹۲ ق)' }, { k: 'title', label: 'لقب / ویژگی' }, { k: 'bio', label: 'زندگی‌نامه', area: 1, h: 200 }] }),
        entity($('#t-challenge'), { key: 'items', list: '/api/admin/challenges', url: '/api/admin/challenges', title: 'چالش‌های ثبت‌شده (هر روز یکی به‌صورت چرخشی نمایش داده می‌شود)', add: 'افزودن چالش', noPhoto: true, size: 100, q: .5, max: 100, label: p => p.title, sub: p => `${({ question: 'سؤال ادبی', riddle: 'معما', verse: 'تکمیل بیت', grammar: 'دستور زبان' })[p.kind]}${p.day ? ' · روز ' + p.day : ''}`,
          fields: [{ k: 'kind', label: 'نوع', sel: [['question', 'سؤال ادبی'], ['riddle', 'معما'], ['verse', 'تکمیل بیت'], ['grammar', 'دستور زبان']] }, { k: 'title', label: 'عنوان کوتاه', req: 1 }, { k: 'prompt', label: 'متن چالش (برای بیت، هر مصرع در یک خط)', area: 1, h: 110 }, { k: 'options_text', label: 'گزینه‌ها (هر گزینه در یک خط؛ ۲ تا ۶ گزینه)', area: 1, h: 100 }, { k: 'answer', label: 'پاسخ درست (دقیقاً مثل یکی از گزینه‌ها)', req: 1 }, { k: 'explanation', label: 'توضیح بعد از پاسخ (اختیاری)', area: 1, h: 80 }, { k: 'day', label: 'روز اختصاصی (میلادی، مثل 2026-11-20؛ خالی = چرخشی)' }] }),
        entity($('#t-book'), { key: 'items', list: '/api/book', url: '/api/admin/book', title: 'محتوای کتاب‌ها (به ترتیب پایه و نوع)', media: true, setup: bookSetup, add: 'افزودن به کتاب درسی', size: 1000, q: .75, max: 400000, photoLabel: 'عکس (مثلاً تصویر نمونه‌سؤال)', label: p => p.title, sub: p => `پایه ${p.grade} · ${({ device: 'آرایه ادبی', vocab: 'معنی واژگان', sample: 'نمونه سؤال' })[p.kind]}`,
          fields: [{ k: 'grade', label: 'پایه', num: 1, sel: [7, 8, 9, 10, 11, 12].map(n => [n, 'پایه ' + n]) }, { k: 'kind', label: 'بخش', sel: [['device', 'آرایه ادبی'], ['vocab', 'معنی واژگان'], ['sample', 'نمونه سؤال']] }, { k: 'title', label: 'عنوان (نام آرایه / واژه / صورت سؤال)', req: 1 }, { k: 'body', label: 'توضیح (تعریف و مثال آرایه / معنی واژه / توضیح سؤال)', area: 1, h: 120 }, { k: 'answer', label: 'پاسخ (برای نمونه سؤال؛ اختیاری)', area: 1, h: 90 }, { k: 'examples', label: 'نمونه‌ها و توضیح تکمیلی (بیت‌های نمونه و توضیح فراوان؛ بین هر بند یک خط خالی بگذارید و تیتر را با ## شروع کنید)', area: 1, h: 240 }, { k: 'sort', label: 'ترتیب نمایش', num: 1 }] }),
        entity($('#t-verses'), { key: 'verses', list: '/api/verses', url: '/api/admin/verses', title: 'بیت‌های ثبت‌شده (به ترتیب نمایش)', add: 'افزودن بیت', size: 1600, q: .72, max: 440000, photoLabel: 'عکس پس‌زمینه‌ی این بیت', label: p => p.text.split('\n')[0], sub: p => `ترتیب ${p.sort} · ${p.poet}`,
          fields: [{ k: 'text', label: 'متن بیت (هر مصرع در یک خط)', area: 1, h: 110 }, { k: 'poet', label: 'سراینده' }, { k: 'source', label: 'منبع (اختیاری؛ مثلاً غزل یا گلستان)' }, { k: 'sort', label: 'ترتیب نمایش (عدد کوچک‌تر زودتر)', num: 1 }] }),
        entity($('#t-arch'), { key: 'sites', list: '/api/arch', url: '/api/admin/arch', title: 'بناهای ثبت‌شده (به ترتیب نمایش)', add: 'افزودن بنا', size: 900, q: .75, max: 280000, sub: p => `ترتیب ${p.sort} · ${p.subtitle}`,
          fields: [{ k: 'name', label: 'نام بنا', req: 1 }, { k: 'sort', label: 'ترتیب نمایش (عدد کوچک‌تر زودتر)', num: 1 }, { k: 'subtitle', label: 'دوره · زمان · مکان' }, { k: 'body', label: 'توضیح', area: 1, h: 160 }, { k: 'facts', label: 'برچسب‌ها (با ویرگول فارسی جدا کنید)' }] }),
        site($('#t-site'))]);
      await music($('#t-verses')); lessons($('#t-lessons'));
    } catch { $('#gate').textContent = 'اتصال به سرور برقرار نشد.'; }
  })();
})();
