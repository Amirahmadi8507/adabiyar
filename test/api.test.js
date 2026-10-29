// تست یکپارچه API: سرور واقعی را با پایگاه داده موقت اجرا می‌کند.
// اگر بسته‌ها نصب نشده باشند (npm install)، این تست‌ها رد می‌شوند و خطا نمی‌دهند.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let hasDeps = true;
try { for (const m of ['express', 'sql.js', 'bcryptjs', 'express-session', 'helmet', 'express-rate-limit']) require.resolve(m); } catch { hasDeps = false; }

const PORT = 4300 + Math.floor(Math.random() * 500), BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adabiyar-test-'));
let proc;
async function http(method, url, body, cookie) {
  const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => null);
  return { status: r.status, data, cookie: (r.headers.get('set-cookie') || '').split(';')[0] || cookie };
}
const question = i => ({ prompt: `سؤال ${i}؟`, options: [`الف${i}`, `ب${i}`, `پ${i}`, `ت${i}`], correct_answer: `ب${i}` });

test.before(async () => {
  if (!hasDeps) return;
  proc = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT, DATA_DIR: dataDir, DB_FILE: path.join(dataDir, 't.sqlite'), ADMIN_EMAIL: 'admin@test.io', ADMIN_PASSWORD: 'AdminPass-123456', AI_PROVIDER: 'off', TZ: 'Asia/Tehran', NODE_ENV: 'development' } });
  await new Promise((res, rej) => { proc.stdout.on('data', d => /اجرا شد/.test(String(d)) && res()); proc.on('exit', c => rej(new Error('server exited ' + c))); setTimeout(() => rej(new Error('server start timeout')), 20000); });
});
test.after(async () => {
  if (proc && proc.exitCode === null) { const closed = new Promise(r => proc.once('exit', r)); proc.kill('SIGINT'); await closed; }   // تا ذخیره نهایی تمام شود
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5 });
});

test('ثبت‌نام: ایمیل تکراری ۴۰۹ می‌دهد (نه ۵۰۰)', { skip: !hasDeps }, async () => {
  const u = { name: 'علی', email: 'ali@test.io', password: 'password-12345' };
  assert.equal((await http('POST', '/api/auth/register', u)).status, 201);
  assert.equal((await http('POST', '/api/auth/register', u)).status, 409);
});

test('جریان کامل آزمون در منطقه زمانی تهران: شروع، ذخیره خودکار، ارسال، نتیجه', { skip: !hasDeps }, async () => {
  const admin = (await http('POST', '/api/auth/login', { email: 'admin@test.io', password: 'AdminPass-123456' })).cookie;
  const t = (await http('POST', '/api/auth/register', { name: 'معلم', email: 'teach@test.io', password: 'password-12345' })).data.user;
  assert.equal((await http('PATCH', `/api/admin/users/${t.id}/role`, { role: 'teacher' }, admin)).status, 200);
  const teacher = (await http('POST', '/api/auth/login', { email: 'teach@test.io', password: 'password-12345' })).cookie;
  assert.equal((await http('POST', '/api/exams', { title: 'x', grade: 'abc' }, teacher)).status, 400);
  const exam = (await http('POST', '/api/exams', { title: 'آزمون تست', grade: 7, duration_minutes: 10 }, teacher)).data.exam;
  assert.equal((await http('POST', `/api/exams/${exam.id}/publish`, {}, teacher)).status, 400);   // کمتر از ۵ سؤال
  const qids = []; for (let i = 1; i <= 5; i++) qids.push((await http('POST', `/api/exams/${exam.id}/questions`, question(i), teacher)).data.question.id);
  assert.equal((await http('POST', `/api/exams/${exam.id}/publish`, {}, teacher)).status, 200);

  const student = (await http('POST', '/api/auth/login', { email: 'ali@test.io', password: 'password-12345' })).cookie;
  assert.equal((await http('GET', `/api/exams/${exam.id}`, null, student)).data.questions.length, 0);   // پیش از شروع سؤالی نمی‌بیند
  const start = await http('POST', `/api/exams/${exam.id}/start`, {}, student);
  assert.equal(start.status, 200); assert.ok(start.data.remaining_seconds > 500);
  const attempt = start.data.attempt.id;
  await http('PUT', `/api/attempts/${attempt}/answers`, { answers: [{ question_id: qids[0], answer: 'ب1' }] }, student);
  assert.equal((await http('GET', `/api/attempts/${attempt}/results`, null, student)).status, 409);   // نشت پاسخ حین آزمون ممنوع
  const sub = await http('POST', `/api/attempts/${attempt}/submit`, { answers: qids.map((id, i) => ({ question_id: id, answer: i < 3 ? `ب${i + 1}` : 'غلط' })) }, student);
  assert.equal(sub.status, 200); assert.equal(sub.data.score, 3); assert.equal(sub.data.max_score, 5);
  assert.equal((await http('POST', `/api/exams/${exam.id}/start`, {}, student)).status, 409);
  const stats = (await http('GET', `/api/exams/${exam.id}/stats`, null, teacher)).data;
  assert.equal(stats.finished, 1); assert.equal(stats.average, 3);
});

test('نشان‌ها، جست‌وجوی شعر و بیت روز', { skip: !hasDeps }, async () => {
  const student = (await http('POST', '/api/auth/login', { email: 'ali@test.io', password: 'password-12345' })).cookie;
  const poems = (await http('GET', '/api/poems')).data.poems; assert.ok(poems.length >= 30);
  assert.equal((await http('PUT', `/api/bookmarks/poem/${poems[0].id}`, { on: true }, student)).status, 200);
  assert.equal((await http('GET', '/api/bookmarks', null, student)).data.poems.length, 1);
  assert.ok((await http('GET', '/api/poems/daily')).data.poem.verse);
  assert.equal((await http('GET', '/api/lessons?q=' + encodeURIComponent('%'))).data.lessons.length, 0);   // % به‌عنوان نویسه ساده جست‌وجو می‌شود
});
