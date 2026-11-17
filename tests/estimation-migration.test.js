'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { initializeEstimation, compareDatabase, loadFixture, SET_ID } = require('../server/estimation-data');
const { createEstimationService } = require('../server/estimation-service');
const { temporary, oldRows, startup, rawFixture } = require('./helpers');

test('MIG-01: actual startup on empty DB and restart in separate process', t => {
  const { db, filename } = temporary(t, false); db.close();
  const first = startup(filename); assert.equal(first.status, 0, first.stderr);
  const reopened = new Database(filename);
  compareDatabase(reopened, loadFixture());
  assert.equal(reopened.prepare('SELECT COUNT(*) n FROM questions WHERE set_id=?').get(SET_ID).n, 12);
  assert.ok(reopened.prepare('SELECT COUNT(*) n FROM users').get().n > 0);
  assert.ok(reopened.prepare("SELECT id FROM questions WHERE type='paint'").get());
  const before = oldRows(reopened); reopened.close();
  const second = startup(filename); assert.equal(second.status, 0, second.stderr);
  const again = new Database(filename);
  try { assert.deepEqual(oldRows(again), before); } finally { again.close(); }
});

test('MIG-02/03: preserve legacy rows, repeat, reopen, fill consistent partial data', t => {
  const { db, filename } = temporary(t);
  const before = oldRows(db);
  initializeEstimation(db);
  const after = oldRows(db);
  for (const table of Object.keys(before)) assert.deepEqual(after[table].slice(0, before[table].length), before[table]);
  initializeEstimation(db); initializeEstimation(db); assert.deepEqual(oldRows(db), after);
  db.prepare('DELETE FROM questions WHERE id=?').run('est-div-06');
  initializeEstimation(db); assert.deepEqual(oldRows(db), after);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='estimation_questions'").get(), undefined);
  db.close();
  const result = startup(filename); assert.equal(result.status, 0, result.stderr);
  const reopened = new Database(filename);
  try { assert.deepEqual(oldRows(reopened), after); } finally { reopened.close(); }
});

test('MIG-04: all projected columns, metadata, global ID and extra questions conflict', t => {
  const { db } = temporary(t);
  initializeEstimation(db);
  const changes = {
    prompt: '78 × 3 = ?', correct_answer: '235', type: 'input', options_json: '["234"]', points: 9,
    category: 'wrong', sort_order: 99, set_id: 'legacy-set', lesson_id: 'bai-9',
  };
  for (const [field, value] of Object.entries(changes)) {
    const old = db.prepare(`SELECT ${field} AS v FROM questions WHERE id='est-mul-01'`).get().v;
    db.prepare(`UPDATE questions SET ${field}=? WHERE id='est-mul-01'`).run(value);
    const before = oldRows(db);
    assert.throws(() => initializeEstimation(db), new RegExp(field)); assert.deepEqual(oldRows(db), before);
    db.prepare(`UPDATE questions SET ${field}=? WHERE id='est-mul-01'`).run(old);
  }
  for (const [field, value] of Object.entries({ title: 'changed', kind: 'exam', lesson_id: 'bai-9', star_reward: 99, duration_minutes: 1 })) {
    const old = db.prepare(`SELECT ${field} AS v FROM question_sets WHERE id=?`).get(SET_ID).v;
    db.prepare(`UPDATE question_sets SET ${field}=? WHERE id=?`).run(value, SET_ID);
    assert.throws(() => initializeEstimation(db), new RegExp(field));
    db.prepare(`UPDATE question_sets SET ${field}=? WHERE id=?`).run(old, SET_ID);
  }
  db.prepare("INSERT INTO questions (id,set_id,type,prompt,correct_answer,sort_order) VALUES ('extra',?,'input','x','1',99)").run(SET_ID);
  assert.throws(() => initializeEstimation(db), /extra/);
});

test('MIG-06/08: immutable run snapshot survives fixture/DB edits; new reads fail', t => {
  const { db } = temporary(t); initializeEstimation(db);
  const service = createEstimationService(db), run = service.create(1, { setId: SET_ID });
  service.confirm(1, run.runId, 'est-mul-01', { estimate: '234' });
  const before = db.prepare('SELECT * FROM estimation_runs').all();
  const raw = rawFixture(); raw.questions[0].a = 38;
  assert.throws(() => initializeEstimation(db, raw), /snapshot/);
  assert.deepEqual(db.prepare('SELECT * FROM estimation_runs').all(), before);
  db.prepare("DELETE FROM questions WHERE id='est-mul-01'").run();
  assert.throws(() => initializeEstimation(db, raw), /snapshot/);
  initializeEstimation(db);
  for (const sql of [
    "UPDATE questions SET prompt='changed' WHERE id='est-mul-01'",
    "DELETE FROM questions WHERE id='est-div-06'",
    `INSERT INTO questions (id,set_id,type,prompt,correct_answer,sort_order) VALUES ('extra','${SET_ID}','input','x','1',99)`,
  ]) {
    db.exec(sql);
    assert.throws(() => service.questions(), e => e.status === 409);
    assert.throws(() => service.create(1, { setId: SET_ID }), e => e.status === 409);
    assert.deepEqual(service.get(1, run.runId).questions, run.questions);
    assert.deepEqual(db.prepare('SELECT * FROM estimation_runs').all(), before);
  }
  service.saveAnswer(1, run.runId, 'est-mul-01', { answer: '234' });
});

test('MIG-07: insert failure rolls back schema + data and succeeds after repair', t => {
  const { db } = temporary(t); const before = oldRows(db);
  db.exec("CREATE TRIGGER test_fail BEFORE INSERT ON questions WHEN NEW.id='est-mul-03' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  assert.throws(() => initializeEstimation(db), /synthetic failure/);
  assert.deepEqual(oldRows(db), before);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='estimation_runs'").get(), undefined);
  db.exec('DROP TRIGGER test_fail'); initializeEstimation(db); compareDatabase(db, loadFixture());
});

test('MIG-07: missing lesson and incompatible state schema stop startup', t => {
  const { db, filename } = temporary(t);
  const raw = rawFixture(); raw.set.lessonId = 'missing';
  assert.throws(() => initializeEstimation(db, raw), /bài học/);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='estimation_runs'").get(), undefined);
  db.exec('CREATE TABLE estimation_runs (id TEXT PRIMARY KEY)');
  assert.throws(() => initializeEstimation(db), /Schema/);
  db.close(); const result = startup(filename);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Schema/);
});
