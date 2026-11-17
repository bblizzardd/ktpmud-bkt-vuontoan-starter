'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { spawnSync } = require('child_process');
const legacySql = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-v1.sql'), 'utf8');
const rawFixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'estimation-fixtures.json'), 'utf8'));
const expectedAnswers = ['234', '376', '232', '192', '380', '595', '32', '62', '63', '54', '81', '96'];
function temporary(t, legacy = true) {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(tempRoot, 'vuontoan-test-'));
  const filename = path.join(directory, 'test.db');
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  if (legacy) db.exec(legacySql);
  t.after(() => {
    if (db.open) db.close();
    const target = fs.realpathSync(directory);
    if (path.dirname(target) !== tempRoot || !path.basename(target).startsWith('vuontoan-test-')) {
      throw new Error('Refusing cleanup outside the test temp directory.');
    }
    fs.rmSync(target, { recursive: true, force: true });
  });
  return { db, filename, directory };
}
function oldRows(db) {
  return Object.fromEntries(['users', 'lessons', 'question_sets', 'questions', 'attempts', 'progress'].map(table =>
    [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
}
function startup(filename) {
  const result = spawnSync(process.execPath, ['-e', "const db=require('./server/db'); db.close();"], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, DB_PATH: filename }, encoding: 'utf8', timeout: 30000,
  });
  if (result.error) throw result.error;
  return result;
}
module.exports = { temporary, oldRows, startup, rawFixture, expectedAnswers };
