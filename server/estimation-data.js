'use strict';

const fs = require('fs');
const path = require('path');
const SET_ID = 'phieu-uoc-luong-v1';
const RUBRIC_VERSION = 'relative-error-v1';
const FIXTURE_PATH = path.join(__dirname, '..', 'data', 'estimation-fixtures.json');

// No FK to mutable question_sets: a teacher deleting a set must not delete run history.
const RUN_SCHEMA = `CREATE TABLE estimation_runs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  set_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted')),
  questions_snapshot_json TEXT NOT NULL,
  confirmed_estimates_json TEXT NOT NULL DEFAULT '{}',
  draft_answers_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  attempt_id INTEGER UNIQUE REFERENCES attempts(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((status = 'in_progress' AND attempt_id IS NULL AND result_json IS NULL)
      OR (status = 'submitted' AND attempt_id IS NOT NULL AND result_json IS NOT NULL))
)`;

function fail(message) { throw new Error(`[estimation] ${message}`); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function keys(value, expected, label) {
  if (!object(value) || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) fail(`${label}: thiếu/thừa trường.`);
}

function compileFixture(raw) {
  keys(raw, ['version', 'rubricVersion', 'set', 'questions'], 'fixture');
  if (raw.version !== SET_ID || raw.rubricVersion !== RUBRIC_VERSION) fail('version/rubricVersion không được hỗ trợ.');
  keys(raw.set, ['id', 'title', 'lessonId', 'kind', 'starReward', 'durationMinutes'], 'set');
  const s = raw.set;
  if (s.id !== raw.version || typeof s.title !== 'string' || !s.title.trim() ||
      typeof s.lessonId !== 'string' || !/^[a-z0-9-]+$/.test(s.lessonId) || s.kind !== 'exercise' ||
      !Number.isInteger(s.starReward) || s.starReward < 0 || s.starReward > 100 || s.durationMinutes !== 0) fail('Metadata bộ V1 không hợp lệ.');
  if (!Array.isArray(raw.questions) || raw.questions.length !== 12) fail('V1 cần đúng 12 câu.');
  const ids = new Set();
  const questions = raw.questions.map((q, i) => {
    keys(q, ['id', 'a', 'b', 'operator'], `Câu ${i + 1}`);
    if (typeof q.id !== 'string' || !/^est-[a-z0-9-]+$/.test(q.id) || ids.has(q.id)) fail(`ID không hợp lệ/trùng: ${q.id}`);
    ids.add(q.id);
    if (!Number.isInteger(q.a) || q.a < 10 || q.a > 100000 || !Number.isInteger(q.b) || q.b < 1 || q.b > 9 ||
        !['*', '/'].includes(q.operator) || (q.operator === '/' && q.a % q.b !== 0)) fail(`${q.id}: toán hạng/phép toán không hợp lệ.`);
    const answer = q.operator === '*' ? q.a * q.b : q.a / q.b;
    if (!Number.isInteger(answer) || answer <= 0 || answer > 100000) fail(`${q.id}: kết quả ngoài miền V1.`);
    return { id: q.id, set_id: s.id, lesson_id: s.lessonId, type: 'estimate',
      prompt: `${q.a} ${q.operator === '*' ? '×' : '÷'} ${q.b} = ?`, options_json: null,
      correct_answer: String(answer), points: 10, category: q.operator === '*' ? 'Ước lượng phép nhân' : 'Ước lượng phép chia', sort_order: i + 1 };
  });
  if (raw.questions.filter(q => q.operator === '*').length !== 6) fail('V1 cần 6 câu nhân và 6 câu chia.');
  return { version: raw.version, rubricVersion: raw.rubricVersion,
    set: { id: s.id, title: s.title, kind: s.kind, lesson_id: s.lessonId, star_reward: s.starReward, duration_minutes: s.durationMinutes }, questions };
}

function loadFixture(file = FIXTURE_PATH) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail('Không đọc được JSON fixture hợp lệ.'); }
  return compileFixture(raw);
}

function compareRow(actual, expected, label) {
  if (!actual) fail(`${label}: thiếu bản ghi.`);
  for (const [key, value] of Object.entries(expected)) {
    // Only name the conflicting field; do not put correct answers into API errors.
    if (actual[key] !== value) fail(`${label}: xung đột trường ${key}. Cần kiểm tra ID/version, không ghi đè.`);
  }
}

function verifySchema(db) {
  const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='estimation_runs'").get();
  const normalize = sql => sql.replace(/\s+/g, '').replace(/;$/, '').toLowerCase();
  // V1 has one exact schema. Never silently accept an incomplete pre-existing table.
  if (!existing || normalize(existing.sql) !== normalize(RUN_SCHEMA)) fail('Schema estimation_runs không tương thích; cần migration tường minh.');
}

function compareDatabase(db, fixture, allowMissing = false) {
  if (!db.prepare('SELECT id FROM lessons WHERE id=?').get(fixture.set.lesson_id)) fail('Thiếu bài học tham chiếu.');
  const set = db.prepare('SELECT * FROM question_sets WHERE id=?').get(fixture.set.id);
  if (set || !allowMissing) compareRow(set, fixture.set, fixture.set.id);
  for (const q of fixture.questions) {
    const row = db.prepare('SELECT * FROM questions WHERE id=?').get(q.id);
    if (row || !allowMissing) compareRow(row, q, q.id);
  }
  const ids = new Set(fixture.questions.map(q => q.id));
  for (const row of db.prepare('SELECT id FROM questions WHERE set_id=?').all(fixture.set.id)) {
    if (!ids.has(row.id)) fail(`${fixture.set.id}: câu thừa ${row.id}.`);
  }
}

function initializeEstimation(db, raw) {
  const fixture = raw === undefined ? loadFixture() : compileFixture(raw);
  db.transaction(() => {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='estimation_runs'").get()) db.exec(RUN_SCHEMA);
    verifySchema(db);
    // A partially missing DB must not let a changed V1 overwrite a published version.
    for (const row of db.prepare('SELECT DISTINCT questions_snapshot_json FROM estimation_runs WHERE set_id=?').all(fixture.set.id)) {
      if (row.questions_snapshot_json !== JSON.stringify(fixture)) fail('Fixture khác snapshot đã phát hành; cần ID/version mới.');
    }
    compareDatabase(db, fixture, true);
    if (!db.prepare('SELECT id FROM question_sets WHERE id=?').get(fixture.set.id)) {
      db.prepare(`INSERT INTO question_sets (id,title,kind,lesson_id,star_reward,duration_minutes)
        VALUES (@id,@title,@kind,@lesson_id,@star_reward,@duration_minutes)`).run(fixture.set);
    }
    const insert = db.prepare(`INSERT INTO questions (id,set_id,lesson_id,type,prompt,options_json,correct_answer,points,category,sort_order)
      VALUES (@id,@set_id,@lesson_id,@type,@prompt,@options_json,@correct_answer,@points,@category,@sort_order)`);
    for (const q of fixture.questions) if (!db.prepare('SELECT id FROM questions WHERE id=?').get(q.id)) insert.run(q);
    compareDatabase(db, fixture);
  }).immediate();
  return fixture;
}

module.exports = { SET_ID, RUBRIC_VERSION, RUN_SCHEMA, compileFixture, loadFixture, compareDatabase, initializeEstimation };
