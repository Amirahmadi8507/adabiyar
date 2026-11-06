'use strict';
const rpEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// نمودار میله‌ای SVG بدون کتابخانه. items: [{label, value (0..100 یا null), sub}]  — از راست به چپ (قدیمی‌ترین سمت راست)
function barChart(items, opts = {}) {
  const W = 360, H = 170, padB = 34, padT = 18, n = Math.max(1, items.length), step = W / n, bw = Math.min(34, step * .62);
  const faN = v => String(v).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const bars = items.map((it, i) => {
    const cx = W - step * (i + .5), v = it.value, h = v === null || v === undefined ? 0 : Math.max(2, (H - padB - padT) * Math.min(100, v) / 100), y = H - padB - h;
    const col = v === null || v === undefined || v === 0 ? '#ffffff22' : opts.color ? opts.color : v >= 70 ? '#33b3a6' : v >= 50 ? '#d7ad69' : '#d9615e';
    return `<g><rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h || 2}" rx="5" fill="${col}"/>${v === null || v === undefined || v === 0 ? '' : `<text x="${cx}" y="${y - 4}" text-anchor="middle" font-size="11" fill="#f2d7a3">${faN(Math.round(v))}</text>`}<text x="${cx}" y="${H - 18}" text-anchor="middle" font-size="10" fill="#b7b1a5">${rpEsc(it.label)}</text>${it.sub ? `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#8a857a">${rpEsc(it.sub)}</text>` : ''}</g>`;
  }).join('');
  const grid = [0, 50, 100].map(g => { const y = H - padB - (H - padB - padT) * g / 100; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#ffffff1a" stroke-dasharray="3 4"/><text x="${W - 1}" y="${y - 2}" text-anchor="end" font-size="8" fill="#6f6a60">${faN(g)}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${rpEsc(opts.label || 'نمودار')}">${grid}${bars}</svg>`;
}
const RP_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const rpFa = v => String(v).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const rpLevel = p => p >= 70 ? 'good' : p >= 50 ? 'mid' : 'bad';
function topicRows(list) {
  return list.map(t => `<div class="rp-topic"><span>${rpEsc(t.title)}<br><small class="rp-note">${rpFa(t.questions || t.students || 0)} ${t.questions ? 'سؤال' : 'دانش‌آموز'}</small></span><div class="rp-bar rp-${rpLevel(t.pct)}"><i style="width:${Math.max(3, t.pct)}%"></i></div><b>${rpFa(Math.round(t.pct))}٪</b></div>`).join('');
}
function renderReport(r) {
  const s = r.summary, d = x => new Date(String(x).replace(' ', 'T') + 'Z');
  if (!s.count && !s.pending) return '<p class="rp-note">هنوز آزمونی داده نشده؛ بعد از اولین آزمون، کارنامه و نمودارها اینجا ساخته می‌شود.</p>';
  const weeks = r.weekly.map(w => ({ label: new Date(w.start + 'T00:00:00Z').toLocaleDateString('fa-IR-u-ca-persian', { month: 'numeric', day: 'numeric', timeZone: 'UTC' }), value: w.avg, sub: w.count ? rpFa(w.count) + ' آزمون' : '' }));
  const months = r.monthly.map(m => ({ label: RP_MONTHS[Number(m.key.slice(5)) - 1], value: m.avg, sub: m.count ? rpFa(m.count) + ' آزمون' : '' }));
  return `<div class="rp-grid"><div class="rp-card"><small>آزمون‌های تصحیح‌شده</small><b>${rpFa(s.count)}</b></div><div class="rp-card"><small>میانگین</small><b>${s.avg === null ? '—' : rpFa(Math.round(s.avg)) + '٪'}</b></div><div class="rp-card"><small>بهترین نمره</small><b>${s.best === null ? '—' : rpFa(Math.round(s.best)) + '٪'}</b></div><div class="rp-card"><small>آخرین نمره</small><b>${s.latest === null ? '—' : rpFa(Math.round(s.latest)) + '٪'}</b></div>${s.pending ? `<div class="rp-card"><small>در انتظار تصحیح تشریحی</small><b>${rpFa(s.pending)}</b></div>` : ''}</div>
  <div class="rp-two"><div class="rp-chart"><h4>میانگین هفتگی (۸ هفته‌ی اخیر؛ برچسب: ماه/روز شروع هفته)</h4>${barChart(weeks, { label: 'میانگین هفتگی' })}</div><div class="rp-chart"><h4>میانگین ماهانه (۶ ماه اخیر)</h4>${barChart(months, { label: 'میانگین ماهانه' })}</div></div>
  <h4>تسلط بر مبحث‌ها</h4>${r.topics.length ? `<div class="rp-two"><div><b class="rp-tag good">نقاط قوت</b>${r.strengths.length ? topicRows(r.strengths) : '<p class="rp-note">هنوز مبحثی بالای ۷۵٪ نیست.</p>'}</div><div><b class="rp-tag bad">نیازمند تمرین</b>${r.weaknesses.length ? topicRows(r.weaknesses) : '<p class="rp-note">مبحث ضعیفی دیده نمی‌شود. آفرین!</p>'}</div></div><details><summary>همه‌ی مبحث‌ها (${rpFa(r.topics.length)})</summary>${topicRows(r.topics)}</details>` : '<p class="rp-note">برای تحلیل مبحث‌ها لازم است معلم هنگام ساخت سؤال، آن را به یک «درس» وصل کند. آزمون‌های بدون درس فقط در نمره‌ها دیده می‌شوند.</p>'}
  <h4>نمره‌ی آزمون‌ها</h4><div class="rp-table"><table><thead><tr><th>آزمون</th><th>نمره</th><th>درصد</th><th>تاریخ</th></tr></thead><tbody>${r.exams.map(e => `<tr><td>${rpEsc(e.title)}</td><td>${e.pending ? '—' : rpFa(e.score) + ' از ' + rpFa(e.max)}</td><td>${e.pending ? 'در انتظار تصحیح' : rpFa(Math.round(e.pct)) + '٪'}</td><td>${rpFa(d(e.date).toLocaleDateString('fa-IR'))}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderAnalytics(a) {
  if (!a.exams) return '<p class="rp-note">هنوز آزمونی برای این کلاس ساخته نشده است.</p>';
  const dist = a.distribution.map(x => ({ label: x.label, value: a.students.filter(s => s.avg !== null).length ? 100 * x.count / a.students.filter(s => s.avg !== null).length : null, sub: rpFa(x.count) + ' نفر' }));
  const ex = a.perExam.map(e => ({ label: e.title.length > 9 ? e.title.slice(0, 9) + '…' : e.title, value: e.avg, sub: rpFa(e.takers) + ' نفر' }));
  return `<div class="rp-grid"><div class="rp-card"><small>میانگین کلاس</small><b>${a.classAvg === null ? '—' : rpFa(Math.round(a.classAvg)) + '٪'}</b></div><div class="rp-card"><small>مشارکت در آزمون‌ها</small><b>${a.participation === null ? '—' : rpFa(Math.round(a.participation)) + '٪'}</b></div><div class="rp-card"><small>آزمون‌های کلاس</small><b>${rpFa(a.exams)}</b></div><div class="rp-card"><small>نیازمند توجه</small><b>${rpFa(a.needsAttention.length)}</b></div></div>
  <div class="rp-two"><div class="rp-chart"><h4>توزیع میانگین دانش‌آموزان (درصد کلاس)</h4>${barChart(dist.reverse(), { label: 'توزیع نمره‌ها', color: '#d7ad69' })}</div><div class="rp-chart"><h4>میانگین هر آزمون</h4>${barChart(ex, { label: 'میانگین آزمون‌ها' })}</div></div>
  <h4>کدام مبحث دشوارتر بوده؟</h4>${a.topics.length ? `<div class="rp-table"><table><thead><tr><th>مبحث (درس)</th><th>میانگین</th><th>دانش‌آموز ضعیف در این مبحث</th></tr></thead><tbody>${a.topics.map(t => `<tr><td>${rpEsc(t.title)}</td><td><span class="rp-tag ${t.pct < 50 ? 'bad' : t.pct >= 70 ? 'good' : ''}">${rpFa(Math.round(t.pct))}٪</span></td><td>${rpFa(t.struggling)} از ${rpFa(t.students)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="rp-note">برای دیدن مبحث‌های دشوار، هنگام ساخت سؤال، آن را به یک «درس» وصل کنید.</p>'}
  <h4>سخت‌ترین سؤال‌ها</h4>${a.hardestQuestions.length ? `<ol class="rp-list">${a.hardestQuestions.map(q => `<li>${rpEsc(q.prompt)} <span class="rp-note">— ${rpEsc(q.exam_title)} · درست‌پاسخ‌دهی ${rpFa(Math.round(q.pct))}٪</span></li>`).join('')}</ol>` : '<p class="rp-note">هنوز داده‌ای نیست.</p>'}
  <h4>دانش‌آموزان نیازمند توجه</h4>${a.needsAttention.length ? `<ul class="rp-list">${a.needsAttention.map(s => `<li><b>${rpEsc(s.name)}</b> — ${rpEsc(s.reason)}${s.avg !== null ? ' (' + rpFa(Math.round(s.avg)) + '٪)' : ''}</li>`).join('')}</ul>` : '<p class="rp-note">فعلاً دانش‌آموزی در وضعیت هشدار نیست.</p>'}`;
}
