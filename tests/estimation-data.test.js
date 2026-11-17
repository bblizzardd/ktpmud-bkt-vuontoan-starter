'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { compileFixture, loadFixture, initializeEstimation } = require('../server/estimation-data');
const { rawFixture, expectedAnswers, temporary, oldRows } = require('./helpers');

test('TP-02 / MIG-01: real 6 multiply + 6 divide questions, deterministic projection', () => {
  const raw = rawFixture(), compiled = compileFixture(raw);
  assert.equal(new Set(compiled.questions.map(q => q.id)).size, 12);
  assert.deepEqual(compiled.questions.map(q => q.correct_answer), expectedAnswers);
  assert.equal(compiled.questions[0].prompt, '39 × 6 = ?');
  assert.equal(compiled.questions[6].prompt, '192 ÷ 6 = ?');
  assert.equal(raw.questions.filter(q => q.operator === '*').length, 6);
  assert.equal(raw.questions.filter(q => q.operator === '/').length, 6);
  assert.deepEqual(compileFixture(raw), compiled);
});

test('MIG-05: reject invalid fixture before writes', t => {
  const { db, directory } = temporary(t);
  const before = oldRows(db);
  const invalid = [
    r => r.questions.pop(), r => r.questions.push({ ...r.questions[0], id: 'est-extra' }),
    r => r.questions[1].id = r.questions[0].id, r => r.version = 'unknown', r => r.rubricVersion = 'unknown',
    r => delete r.questions[0].a, r => r.questions[0].prompt = 'manual', r => r.questions[0].type = 'input',
    r => r.questions[0].operator = '+', r => r.questions[0].a = 6, r => r.questions[0].b = 0,
    r => r.questions[6].b = 0, r => r.questions[0].b = 12, r => r.questions[6].b = 12,
    r => { r.questions[0].a = 6; r.questions[0].b = 39; },
    r => { r.questions[6].a = 6; r.questions[6].b = 192; },
    r => r.questions[6].a = 193, r => r.questions[0].a = 39.5, r => r.questions[0].a = -39,
    r => r.questions[0].a = 100001, r => r.questions[0].a = 100000,
    r => r.questions[6].operator = '*', r => r.set.id = 'different', r => r.set.starReward = -1,
  ];
  for (const mutate of invalid) {
    const raw = rawFixture(); mutate(raw);
    assert.throws(() => initializeEstimation(db, raw), /estimation/);
    assert.deepEqual(oldRows(db), before);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='estimation_runs'").get(), undefined);
  }
  const broken = path.join(directory, 'broken.json'); fs.writeFileSync(broken, '{');
  assert.throws(() => loadFixture(broken), /JSON/);
});
