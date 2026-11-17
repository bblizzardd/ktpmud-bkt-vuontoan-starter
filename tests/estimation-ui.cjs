'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { chromium } = require('playwright');
const { temporary, expectedAnswers } = require('./helpers');
const { startServer } = require('./http-helper');

async function open(t, user = 'test-a') {
  let server, browser;
  t.after(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
  const { db, filename } = temporary(t);
  db.prepare('UPDATE users SET password_hash=?').run(bcrypt.hashSync('synthetic-ui-password', 4));
  server = await startServer(filename);
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const response = await context.request.post(server.base + '/api/auth/login', { data: { username: user, password: 'synthetic-ui-password' } });
  assert.equal(response.status(), 200);
  const page = await context.newPage();
  // Work offline except the isolated app; no font/CDN/network dependency in this test.
  await page.route('**/*', route => new URL(route.request().url()).origin === server.base ? route.continue() : route.abort());
  const pageErrors = [];
  let notedLegacyCdn = false;
  page.on('pageerror', error => {
    // Existing starter script assumes the CDN global even though static CSS is present.
    // Keep this exact baseline error visible, but do not rewrite old code to fix it here.
    if (error.message === 'tailwind is not defined' && error.stack.includes('/assets/js/tailwind.config.js')) {
      if (!notedLegacyCdn) t.diagnostic('Known starter offline error: tailwind.config.js requires the blocked CDN global.');
      notedLegacyCdn = true;
    } else pageErrors.push(error.message);
  });
  return { db, page, server, pageErrors };
}
async function start(h) {
  await h.page.goto(h.server.base + '/exercise.html');
  await h.page.getByRole('link', { name: 'Vào bài ước lượng' }).press('Enter');
  await h.page.getByRole('button', { name: 'Bắt đầu lượt mới', exact: true }).press('Enter');
  await h.page.getByLabel('Ước lượng của em', { exact: true }).waitFor();
}
async function valueAndEnter(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  // Tab reaches the step's submit button; Enter performs only this step.
  await input.press('Tab');
  await page.keyboard.press('Enter');
}
async function screenshot(page, name) {
  if (!process.env.UI_ARTIFACT_DIR) return;
  fs.mkdirSync(process.env.UI_ARTIFACT_DIR, { recursive: true });
  await page.locator('#questions-container').screenshot({ path: path.join(process.env.UI_ARTIFACT_DIR, name) });
}

test('TP-01/03/08/09/13: keyboard through all 12 questions, review, refresh, result and legacy worksheet', { timeout: 120000 }, async t => {
  const h = await open(t), { page, db } = h;
  await start(h);
  assert.equal(await page.getByLabel('Kết quả em tính chính xác', { exact: true }).count(), 0);
  await valueAndEnter(page, 'Ước lượng của em', 'abc');
  await page.getByRole('alert').filter({ hasText: 'chỉ dùng chữ số' }).waitFor();
  assert.equal(await page.getByLabel('Ước lượng của em', { exact: true }).inputValue(), 'abc');
  assert.equal(await page.getByLabel('Ước lượng của em', { exact: true }).getAttribute('aria-invalid'), 'true');
  for (let i = 0; i < 12; i++) {
    await valueAndEnter(page, 'Ước lượng của em', expectedAnswers[i]);
    await page.getByLabel('Kết quả em tính chính xác', { exact: true }).waitFor();
    if (i === 0) {
      await page.reload();
      await page.getByLabel('Kết quả em tính chính xác', { exact: true }).waitFor();
      assert.match(await page.locator('#questions-container').innerText(), /Ước lượng đã khóa: 234/);
    }
    await valueAndEnter(page, 'Kết quả em tính chính xác', expectedAnswers[i]);
    if (i < 11) await page.getByLabel('Ước lượng của em', { exact: true }).waitFor();
  }
  await page.getByRole('heading', { name: 'Xem lại trước khi nộp', exact: true }).waitFor();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM attempts').get().n, 1);
  assert.equal(db.prepare('SELECT total_stars FROM users WHERE id=1').get().total_stars, 7);
  await screenshot(page, 'estimation-review.png');
  await page.reload();
  await page.getByRole('button', { name: 'Sửa kết quả câu 1', exact: true }).press('Enter');
  await page.getByLabel('Kết quả em tính chính xác', { exact: true }).fill('235');
  await page.getByRole('button', { name: 'Xem lại cả bộ', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'Xem lại trước khi nộp', exact: true }).waitFor();
  assert.equal(JSON.parse(db.prepare('SELECT draft_answers_json FROM estimation_runs').get().draft_answers_json)['est-mul-01'], '234');
  await page.getByRole('button', { name: 'Sửa kết quả câu 1', exact: true }).press('Enter');
  await page.getByLabel('Kết quả em tính chính xác', { exact: true }).fill('235');
  await page.getByRole('button', { name: 'Xem lại cả bộ', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Lưu và chuyển', exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'Xem lại trước khi nộp', exact: true }).waitFor();
  assert.equal(JSON.parse(db.prepare('SELECT draft_answers_json FROM estimation_runs').get().draft_answers_json)['est-mul-01'], '235');
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'Kết quả đã lưu: 96/100', exact: true }).waitFor();
  assert.match(await page.locator('#questions-container').innerText(), /Kết quả tính chưa đúng/);
  assert.match(await page.locator('#questions-container').innerText(), /Ước lượng tốt/);
  assert.match(await page.locator('#questions-container').innerText(), /Điểm câu: 5\/10/);
  await page.reload();
  await page.getByRole('heading', { name: 'Kết quả đã lưu: 96/100', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, 'estimation-mobile-result.png');
  const overflow = await page.locator('#questions-container').evaluate(el => el.scrollWidth > el.clientWidth);
  assert.equal(overflow, false);
  await page.goto(h.server.base + '/lesson.html?lesson=bai-10&set=legacy-set');
  await page.locator('[data-q="legacy-input"]').waitFor();
  assert.equal(await page.locator('[data-q="legacy-input"]').count(), 1);
  await page.goto(h.server.base + '/exercise.html');
  assert.equal(await page.locator('#math-input-1').count(), 1);
  assert.deepEqual(h.pageErrors, []);
});

test('TP-09/13: failed and lost save responses preserve input; retry; unsaved refresh', { timeout: 60000 }, async t => {
  const h = await open(t), { page, db } = h;
  await start(h);
  await valueAndEnter(page, 'Ước lượng của em', '230');
  await page.getByLabel('Kết quả em tính chính xác', { exact: true }).waitFor();
  const route = '**/api/estimation-runs/*/answers/est-mul-01';
  await page.route(route, r => r.abort());
  await valueAndEnter(page, 'Kết quả em tính chính xác', '234');
  await page.getByRole('alert').filter({ hasText: 'Chưa xác nhận lưu' }).waitFor();
  assert.equal(await page.getByLabel('Kết quả em tính chính xác', { exact: true }).inputValue(), '234');
  assert.deepEqual(JSON.parse(db.prepare('SELECT draft_answers_json FROM estimation_runs').get().draft_answers_json), {});
  await page.unroute(route);
  await page.route(route, async r => { await r.fetch(); await r.abort(); });
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).press('Enter');
  await page.getByRole('alert').filter({ hasText: 'Chưa xác nhận lưu' }).waitFor();
  assert.equal(await page.getByLabel('Kết quả em tính chính xác', { exact: true }).inputValue(), '234');
  assert.equal(JSON.parse(db.prepare('SELECT draft_answers_json FROM estimation_runs').get().draft_answers_json)['est-mul-01'], '234');
  const before = db.prepare('SELECT updated_at FROM estimation_runs').get();
  await page.unroute(route);
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).press('Enter');
  await page.getByLabel('Ước lượng của em', { exact: true }).waitFor();
  assert.deepEqual(db.prepare('SELECT updated_at FROM estimation_runs').get(), before);
  await page.getByRole('button', { name: 'Câu 1', exact: true }).press('Enter');
  await page.getByLabel('Kết quả em tính chính xác', { exact: true }).fill('999');
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await page.getByLabel('Ước lượng của em', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Câu 1', exact: true }).press('Enter');
  assert.equal(await page.getByLabel('Kết quả em tính chính xác', { exact: true }).inputValue(), '234');
  await page.getByRole('button', { name: 'Làm lượt mới', exact: true }).press('Enter');
  await page.getByLabel('Ước lượng của em', { exact: true }).waitFor();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM estimation_runs').get().n, 2);
  assert.deepEqual(h.pageErrors, []);
});

test('TP-01: locked lesson has no new entry link', { timeout: 30000 }, async t => {
  const h = await open(t, 'test-b');
  await h.page.goto(h.server.base + '/exercise.html');
  await h.page.getByText('Em cần hoàn thành bài trước để mở bộ bài này.', { exact: true }).waitFor();
  assert.equal(await h.page.getByRole('link', { name: 'Vào bài ước lượng' }).count(), 0);
});
