'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { temporary, expectedAnswers, rawFixture, oldRows } = require('./helpers');
const { startServer } = require('./http-helper');
const { SET_ID, initializeEstimation } = require('../server/estimation-data');
const ids = rawFixture().questions.map(q => q.id);

async function setup(t) {
  let server;
  t.after(async () => { if (server) await server.stop(); });
  const { db, filename } = temporary(t);
  server = await startServer(filename);
  const request = (...args) => server.request(...args);
  const ok = async (method, route, body, status = 200, user = 1) => {
    const response = await request(method, route, body, user);
    assert.equal(response.status, status, JSON.stringify(response.data)); return response.data;
  };
  return { db, request, ok, filename, get server() { return server; },
    async restart() { await server.stop(); server = await startServer(filename); },
    async create() { return ok('POST', '/api/estimation-runs', { setId: SET_ID }); },
    confirm: (run, id, estimate, status = 200) => ok('POST', `/api/estimation-runs/${run}/estimates/${id}`, { estimate }, status),
    save: (run, id, answer, status = 200) => ok('PUT', `/api/estimation-runs/${run}/answers/${id}`, { answer }, status),
    submit: (run, answers, status = 200) => ok('POST', '/api/submissions', { setId: SET_ID, runId: run, answers }, status),
  };
}
function privateFree(data) {
  for (const [key, value] of Object.entries(data)) {
    assert.ok(!/correctAnswer|correct_answer|snapshot|relativeError|estimateScore|exactScore|scorePercent|Feedback|correctCount|result/i.test(key), `Private field: ${key}`);
    if (value && typeof value === 'object') privateFree(value);
  }
}
async function fill(h, runId, overrides = {}) {
  const answers = {};
  for (const [i, id] of ids.entries()) {
    const estimate = overrides[id]?.estimate ?? expectedAnswers[i];
    const answer = overrides[id]?.answer ?? expectedAnswers[i];
    privateFree(await h.confirm(runId, id, estimate));
    privateFree(await h.save(runId, id, answer));
    answers[id] = answer;
  }
  return answers;
}

test('TP-03/05/06/07: ownership, strict input, lock/order, idempotent saves, no early answers', async t => {
  const h = await setup(t), { runId } = await h.create();
  privateFree(await h.ok('GET', `/api/question-sets/${SET_ID}/questions`));
  for (const [method, route, body] of [
    ['POST','/api/estimation-runs',{setId:SET_ID}],
    ['GET',`/api/estimation-runs/${runId}`],
    ['POST',`/api/estimation-runs/${runId}/estimates/${ids[0]}`,{estimate:'234'}],
    ['PUT',`/api/estimation-runs/${runId}/answers/${ids[0]}`,{answer:'234'}],
    ['POST','/api/submissions',{setId:SET_ID,runId,answers:{}}],
  ]) await h.ok(method, route, body, 401, null);
  for (const method of ['GET','POST','PUT']) {
    const route = `/api/estimation-runs/${runId}` + (method === 'GET' ? '' : method === 'POST' ? `/estimates/${ids[0]}` : `/answers/${ids[0]}`);
    await h.ok(method, route, method === 'POST' ? {estimate:'234'} : method === 'PUT' ? {answer:'234'} : undefined, 404, 2);
  }
  await h.ok('POST','/api/submissions',{setId:SET_ID,runId,answers:{}},404,2);
  await h.ok('GET','/api/estimation-runs/missing',undefined,404);
  await h.ok('POST','/api/estimation-runs',{setId:SET_ID},403,2);
  await h.save(runId, ids[0], '234',409);
  await h.confirm(runId, ids[1], '376',409);
  await h.confirm(runId, 'outside', '0',400);
  await h.ok('POST','/api/submissions',{setId:SET_ID,answers:{}},400);
  await h.ok('POST','/api/submissions',{setId:'legacy-set',runId,answers:{}},400);
  for (const extra of ['score','correctAnswer','estimates']) await h.ok('POST','/api/submissions',{setId:SET_ID,runId,answers:{},[extra]:100},400);
  const invalid = ['', ' ', null, 40, {}, [], '40a', '40.5', '-40', '1e3', '1,000', '1000000001'];
  for (const value of invalid) await h.confirm(runId, ids[0], value,400);
  await h.ok('POST',`/api/estimation-runs/${runId}/estimates/${ids[0]}`,{},400);
  await h.ok('POST',`/api/estimation-runs/${runId}/estimates/${ids[0]}`,{estimate:'234',score:10},400);
  let state = await h.confirm(runId, ids[0], ' 0234 '); privateFree(state);
  const stored = () => h.db.prepare('SELECT * FROM estimation_runs WHERE id=?').get(runId);
  const locked = stored();
  await h.confirm(runId, ids[0], '234'); assert.deepEqual(stored(),locked);
  await h.confirm(runId, ids[0], '233',409); assert.deepEqual(stored(),locked);
  for (const value of invalid) await h.save(runId, ids[0], value,400);
  await h.ok('PUT',`/api/estimation-runs/${runId}/answers/${ids[0]}`,{},400);
  assert.deepEqual(stored(),locked);
  state = await h.save(runId, ids[0], '0'); privateFree(state);
  assert.equal(state.nextQuestionId,ids[1]); assert.equal(state.draftAnswers[ids[0]],'0');
  const saved = stored(); await h.save(runId, ids[0], '000'); assert.deepEqual(stored(),saved);
  await h.confirm(runId, ids[1], '1000000000'); await h.save(runId, ids[1], '1000000000');
  state = await h.save(runId, ids[0], '234'); assert.equal(state.draftAnswers[ids[1]],'1000000000');
  assert.equal(state.confirmedEstimates[ids[0]].value,'234');
  await h.submit(runId,{},409);
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM attempts').get().n,1);
  assert.equal(h.db.prepare('SELECT total_stars FROM users WHERE id=1').get().total_stars,7);
  assert.equal((await fetch(h.server.base+'/data/estimation-fixtures.json')).status,404);
});

test('TP-04/08: full HTTP runs at 10/20/30% boundaries, both operations, E/C combinations', async t => {
  const h = await setup(t);
  const cases = [[342,10],[418,10],[304,7],[456,7],[266,3],[494,3],[265,0],[495,0]];
  for (const [target, values, correct] of [[4,cases,380],[6,[[30,10],[20,0]],32]]) {
    for (const [estimate, E] of values) for (const C of [10,0]) {
      const { runId } = await h.create();
      const answers = await fill(h,runId,{[ids[target]]:{estimate:String(estimate),answer:String(correct+(C ? 0 : 1))}});
      const result = await h.submit(runId,answers);
      const d = result.detail[target];
      assert.equal(d.estimateScore,E); assert.equal(d.exactScore,C); assert.equal(d.score,(E+C)/2);
      assert.equal(d.correctAnswer,String(correct));
      assert.ok(d.estimateFeedback); assert.ok(d.exactFeedback);
      assert.equal(result.scorePercent,Math.round(100*(110+(E+C)/2)/120));
      assert.equal(result.correctCount,E===10 && C===10 ? 12 : 11);
    }
  }
  assert.equal(h.db.prepare('SELECT total_stars FROM users WHERE id=1').get().total_stars,37);
});

test('TP-09: restart after lock/save/review/submission, persisted inputs and result', async t => {
  const h = await setup(t), { runId } = await h.create();
  const get = () => h.ok('GET',`/api/estimation-runs/${runId}`);
  await h.confirm(runId,ids[0],'230'); await h.restart();
  let state = await get(); privateFree(state); assert.equal(state.nextStep,'answer');
  assert.equal(state.confirmedEstimates[ids[0]].value,'230');
  await h.save(runId,ids[0],'234'); await h.restart();
  state = await get(); assert.equal(state.nextStep,'estimate'); assert.equal(state.nextQuestionId,ids[1]);
  // A lost response has no effect on persisted data: read again, then retry exactly that save.
  const before = h.db.prepare('SELECT * FROM estimation_runs WHERE id=?').get(runId);
  await h.save(runId,ids[0],'234'); assert.deepEqual(h.db.prepare('SELECT * FROM estimation_runs WHERE id=?').get(runId),before);
  const answers = await fill(h,runId,{[ids[0]]:{estimate:'230'}});
  await h.restart(); state = await get(); privateFree(state); assert.equal(state.nextStep,'review');
  assert.equal(state.readyToSubmit,true); assert.deepEqual(state.draftAnswers,answers);
  const result = await h.submit(runId,answers); await h.restart();
  assert.deepEqual((await get()).result,result);
});

test('TP-10: concurrent submit/save, replay, payload mismatch, rollback and no repeated stars', async t => {
  const h = await setup(t), { runId } = await h.create();
  const answers = await fill(h,runId);
  await h.submit(runId,{...answers,[ids[0]]:'235'},409);
  const missing = {...answers}; delete missing[ids[0]]; await h.submit(runId,missing,409);
  await h.submit(runId,{...answers,extra:'1'},400); await h.submit(runId,{...answers,[ids[0]]:234},400);
  const before = oldRows(h.db), runBefore = h.db.prepare('SELECT * FROM estimation_runs').all();
  h.db.exec("CREATE TRIGGER test_submit_failure BEFORE UPDATE ON estimation_runs WHEN NEW.status='submitted' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  await h.submit(runId,answers,500);
  assert.deepEqual(oldRows(h.db),before); assert.deepEqual(h.db.prepare('SELECT * FROM estimation_runs').all(),runBefore);
  h.db.exec('DROP TRIGGER test_submit_failure');
  const results = await Promise.all([h.submit(runId,answers),h.submit(runId,answers),h.submit(runId,{...answers,[ids[0]]:' 0234 '})]);
  assert.deepEqual(results[0],results[1]); assert.deepEqual(results[0],results[2]);
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM attempts WHERE ref_id=?').get(SET_ID).n,1);
  assert.equal(h.db.prepare('SELECT total_stars FROM users WHERE id=1').get().total_stars,37);
  assert.equal(typeof JSON.parse(h.db.prepare('SELECT answers_json FROM attempts WHERE ref_id=?').get(SET_ID).answers_json)[ids[0]],'string');
  await h.save(runId,ids[0],'234',409); await h.confirm(runId,ids[0],'234',409); await h.submit(runId,{...answers,[ids[0]]:'235'},409);
  const second = await h.create(), secondAnswers = await fill(h,second.runId);
  const race = await Promise.all([
    h.request('POST','/api/submissions',{setId:SET_ID,runId:second.runId,answers:secondAnswers}),
    h.request('PUT',`/api/estimation-runs/${second.runId}/answers/${ids[0]}`,{answer:'235'}),
  ]);
  assert.ok((race[0].status===200 && race[1].status===409) || (race[0].status===409 && race[1].status===200));
  // Explicit reverse ordering: saved answer makes an old submission stale.
  const third = await h.create(), thirdAnswers = await fill(h,third.runId);
  await h.save(third.runId,ids[0],'235'); await h.submit(third.runId,thirdAnswers,409);
  assert.equal(h.db.prepare('SELECT total_stars FROM users WHERE id=1').get().total_stars,37);
});

test('MIG-06/08 over HTTP: reject new runs after DB edits; existing history grades from snapshot', async t => {
  const h = await setup(t), { runId } = await h.create();
  const answers = await fill(h,runId);
  h.db.prepare("UPDATE questions SET correct_answer='999',prompt='changed' WHERE id=?").run(ids[0]);
  privateFree(await h.ok('GET',`/api/question-sets/${SET_ID}/questions`,undefined,409));
  await h.ok('POST','/api/estimation-runs',{setId:SET_ID},409);
  const result = await h.submit(runId,answers); assert.equal(result.detail[0].correctAnswer,'234');
  const before = oldRows(h.db), snapshot = h.db.prepare('SELECT * FROM estimation_runs').all();
  assert.throws(()=>initializeEstimation(h.db),/xung đột/);
  assert.deepEqual(oldRows(h.db),before); assert.deepEqual(h.db.prepare('SELECT * FROM estimation_runs').all(),snapshot);
  assert.deepEqual((await h.ok('GET',`/api/estimation-runs/${runId}`)).result,result);
});

test('TP-11: original four types, login, progress, teacher analytics and leaderboard', async t => {
  const h = await setup(t);
  h.db.prepare('UPDATE users SET password_hash=? WHERE id=1').run(bcrypt.hashSync('synthetic-test-password',4));
  const login = await h.ok('POST','/api/auth/login',{username:'test-a',password:'synthetic-test-password'},200,null);
  assert.equal(login.user.username,'test-a'); assert.ok(login.token);
  const questions = await h.ok('GET','/api/question-sets/legacy-set/questions');
  assert.deepEqual(questions.questions.map(q=>q.type),['input','multiple-choice','compare','paint']);
  privateFree(questions);
  const answers = {'legacy-input':'24','legacy-choice':'A','legacy-compare':'=','legacy-paint':'green'};
  const result = await h.ok('POST','/api/submissions',{setId:'legacy-set',answers,durationSec:10});
  assert.equal(result.scorePercent,100); assert.equal(result.correctCount,4); assert.equal(result.starsEarned,30);
  const repeated = await h.ok('POST','/api/submissions',{setId:'legacy-set',answers}); assert.equal(repeated.starsEarned,0);
  const progress = await h.ok('GET','/api/me/progress'); assert.equal(progress.lessons.find(l=>l.id==='bai-10').bestScore,100);
  await h.ok('GET','/api/teacher/analytics',undefined,200,3); await h.ok('GET','/api/leaderboard');
});
