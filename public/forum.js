(() => {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const when = iso => { const t = Date.parse(String(iso).replace(' ', 'T') + 'Z'); return Number.isFinite(t) ? new Date(t).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : ''; };
  const api = async (u, o = {}) => { const r = await fetch(u, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...o }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا'); return d; };
  let boards = [], board = new URLSearchParams(location.search).get('board') || 'general';
  const shell = body => { app.innerHTML = `<h1>تالار گفت‌وگو</h1><div class="bar"><label>تالار: <select id="bsel">${boards.map(b => `<option value="${esc(b.id)}" ${b.id === board ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label></div><div id="body">${body}</div>`; $('#bsel').onchange = e => { board = e.target.value; history.replaceState(null, '', '?board=' + board); list(); }; };
  async function list() {
    let d; try { d = await api('/api/forum/topics?board=' + encodeURIComponent(board)); } catch (e) { shell(`<p class="err">${esc(e.message)}</p>`); return; }
    shell(`<p class="msg">${d.board.mod ? 'شما ناظر این تالار هستید: می‌توانید موضوع را سنجاق، قفل یا پنهان کنید و گزارش‌ها را ببینید.' : 'لطفاً مؤدب بنویسید. معلم بر گفت‌وگوها نظارت می‌کند و می‌تواند پیام نامناسب را حذف کند.'}</p>
      <details class="card"><summary><b>+ موضوع تازه</b></summary><form id="nf"><p><input class="w" name="title" maxlength="150" placeholder="عنوان (مثلاً: معنی بیت دوم درس ستایش)" required></p><p><textarea name="body" maxlength="4000" placeholder="سؤال یا نظر خود را بنویسید…" required></textarea></p><button>ارسال</button> <span id="nm" class="msg"></span></form></details>
      <div id="reports"></div>${d.topics.map(t => `<div class="card topic" data-id="${t.id}"><div><h3>${t.pinned ? '📌 ' : ''}${t.locked ? '🔒 ' : ''}${esc(t.title)}</h3><small>${esc(t.author)} · ${when(t.last_activity)}</small></div><div class="n"><b>${fa(t.replies)}</b><br><small>پاسخ</small></div></div>`).join('') || '<p class="msg">هنوز موضوعی نیست؛ اولین نفر باش!</p>'}`);
    $('#nf').onsubmit = async e => { e.preventDefault(); const f = e.target; try { const r = await api('/api/forum/topics', { method: 'POST', body: JSON.stringify({ board, title: f.title.value, body: f.body.value }) }); open(r.id); } catch (x) { $('#nm').className = 'err'; $('#nm').textContent = x.message; } };
    $('#body').onclick = e => { const t = e.target.closest('.topic'); if (t) open(t.dataset.id); };
    if (d.board.mod) loadReports();
  }
  async function loadReports() {
    const { reports } = await api('/api/forum/reports?board=' + encodeURIComponent(board)).catch(() => ({ reports: [] })); const box = $('#reports'); if (!box || !reports.length) return;
    box.innerHTML = `<div class="card"><b>گزارش‌های بررسی‌نشده (${fa(reports.length)})</b>${reports.map(r => `<div class="rep"><small>${r.target_type === 'post' ? 'پاسخ' : 'موضوع'} در «${esc(r.title)}»${r.reason ? ' — دلیل: ' + esc(r.reason) : ''}</small><p>${esc(r.content)}</p><div class="tools"><button class="s d" data-hide="${r.id}">حذف محتوا</button><button class="s o" data-dismiss="${r.id}">نادیده بگیر</button><button class="s o" data-go="${r.topic_id}">دیدن موضوع</button></div></div>`).join('')}</div>`;
    box.onclick = async e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.go) return open(b.dataset.go); const id = b.dataset.hide || b.dataset.dismiss; try { await api(`/api/forum/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action: b.dataset.hide ? 'hide' : 'dismiss' }) }); list(); } catch (x) { alert(x.message); } };
  }
  async function open(id) {
    let d; try { d = await api('/api/forum/topics/' + id); } catch (e) { alert(e.message); return list(); }
    const t = d.topic, mod = d.board.mod;
    shell(`<p><button class="o s" id="back">← بازگشت به فهرست</button></p><div class="card"><h2 style="margin:.1em 0;color:var(--gold2)">${t.pinned ? '📌 ' : ''}${t.locked ? '🔒 ' : ''}${esc(t.title)}</h2><small class="msg">${esc(t.author)} · ${when(t.created_at)}</small><p style="white-space:pre-wrap">${esc(t.body)}</p>
      <div class="tools"><button class="s o" data-rt="${t.id}">گزارش</button>${mod ? `<button class="s o" data-flag="pinned" data-v="${t.pinned ? 0 : 1}">${t.pinned ? 'برداشتن سنجاق' : 'سنجاق'}</button><button class="s o" data-flag="locked" data-v="${t.locked ? 0 : 1}">${t.locked ? 'باز کردن گفت‌وگو' : 'قفل گفت‌وگو'}</button><button class="s d" data-flag="hidden" data-v="1">حذف موضوع</button>` : ''}</div></div>
      ${d.posts.map(p => `<div class="card post ${p.hidden ? 'hid' : ''}"><small>${esc(p.author)} · ${when(p.created_at)}${p.hidden ? ' · (پنهان‌شده)' : ''}</small><p>${esc(p.body)}</p><div class="tools">${p.hidden ? '' : (p.mine || mod ? `<button class="s o" data-dp="${p.id}">حذف</button>` : '') + (p.mine ? '' : `<button class="s o" data-rp="${p.id}">گزارش</button>`)}</div></div>`).join('')}
      ${t.locked && !mod ? '<p class="msg">این گفت‌وگو توسط معلم بسته شده است.</p>' : `<form id="rf" class="card"><textarea name="body" maxlength="3000" placeholder="پاسخ شما…" required></textarea><p><button>ارسال پاسخ</button> <span id="rm" class="msg"></span></p></form>`}`);
    $('#back').onclick = list;
    if ($('#rf')) $('#rf').onsubmit = async e => { e.preventDefault(); try { await api(`/api/forum/topics/${id}/posts`, { method: 'POST', body: JSON.stringify({ body: e.target.body.value }) }); open(id); } catch (x) { $('#rm').className = 'err'; $('#rm').textContent = x.message; } };
    $('#body').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.flag) { await api(`/api/forum/topics/${id}/flag`, { method: 'POST', body: JSON.stringify({ flag: b.dataset.flag, value: b.dataset.v === '1' }) }); return b.dataset.flag === 'hidden' ? list() : open(id); }
        if (b.dataset.dp) { if (!confirm('این پیام حذف شود؟')) return; await api('/api/forum/posts/' + b.dataset.dp, { method: 'DELETE' }); return open(id); }
        if (b.dataset.rt || b.dataset.rp) { const reason = prompt('دلیل گزارش (اختیاری):') ?? null; if (reason === null) return; await api('/api/forum/report', { method: 'POST', body: JSON.stringify({ type: b.dataset.rp ? 'post' : 'topic', id: Number(b.dataset.rp || b.dataset.rt), reason }) }); b.textContent = 'گزارش شد ✓'; b.disabled = true; }
      } catch (x) { alert(x.message); }
    };
  }
  (async () => {
    try {
      const me = (await api('/api/auth/me')).user; if (!me) { app.innerHTML = '<h1>تالار گفت‌وگو</h1><p class="msg">برای دیدن و نوشتن در تالار ابتدا از صفحه‌ی اصلی وارد شوید.</p><a href="/">رفتن به صفحه‌ی اصلی</a>'; return; }
      boards = (await api('/api/forum/boards')).boards; if (!boards.some(b => b.id === board)) board = 'general'; list();
    } catch { app.innerHTML = '<p class="err">اتصال به سرور برقرار نشد.</p>'; }
  })();
})();
