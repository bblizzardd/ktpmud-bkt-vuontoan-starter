'use strict';

const { randomUUID } = require('crypto');
const { SET_ID, RUBRIC_VERSION, loadFixture, compareDatabase } = require('./estimation-data');
const { EstimationError, normalizeAnswer, gradeQuestion } = require('./estimation-scoring');
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const reject = (status, message, field) => { throw new EstimationError(status, message, field); };

function bodyFields(body, allowed) {
  if (!isMap(body) || Object.keys(body).some(k => !allowed.includes(k))) reject(400, 'Dữ liệu có trường ngoài hợp đồng.', 'body');
}

function createEstimationService(db) {
  const fixture = loadFixture();

  function consistent() {
    try { compareDatabase(db, fixture); }
    catch { reject(409, 'Bộ bài đang có dữ liệu không đồng nhất. Em báo giáo viên kiểm tra trước khi mở lượt mới.'); }
  }

  function getRun(userId, runId) {
    if (typeof runId !== 'string' || !runId) reject(400, 'Thiếu mã lượt làm.', 'runId');
    const row = db.prepare('SELECT * FROM estimation_runs WHERE id=? AND user_id=?').get(runId, userId);
    if (!row) reject(404, 'Không tìm thấy lượt làm.');
    return { row, snapshot: JSON.parse(row.questions_snapshot_json), estimates: JSON.parse(row.confirmed_estimates_json), answers: JSON.parse(row.draft_answers_json) };
  }

  function publicQuestions(snapshot) {
    return snapshot.questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, category: q.category }));
  }

  function publicRun(run) {
    const { row, snapshot, estimates, answers } = run;
    const next = snapshot.questions.find(q => !own(answers, q.id));
    return { runId: row.id, setId: row.set_id, status: row.status, title: snapshot.set.title,
      questions: publicQuestions(snapshot), confirmedEstimates: estimates, draftAnswers: answers,
      readyToSubmit: !next && snapshot.questions.every(q => own(estimates, q.id)),
      nextQuestionId: next ? next.id : null,
      nextStep: row.status === 'submitted' ? 'result' : !next ? 'review' : own(estimates, next.id) ? 'answer' : 'estimate',
      ...(row.status === 'submitted' ? { result: JSON.parse(row.result_json) } : {}) };
  }

  function ensureOpen(run, questionId) {
    const index = run.snapshot.questions.findIndex(q => q.id === questionId);
    if (index < 0) reject(400, 'Câu hỏi không thuộc lượt làm.', 'questionId');
    if (run.row.status !== 'in_progress') reject(409, 'Lượt làm đã nộp, không thể thay đổi.');
    if (run.snapshot.questions.slice(0, index).some(q => !own(run.answers, q.id))) {
      reject(409, 'Em cần lưu kết quả câu trước rồi mới làm câu này.');
    }
  }

  return {
    questions() { consistent(); return { setId: SET_ID, questions: publicQuestions(fixture) }; },
    create(userId, body) {
      bodyFields(body, ['setId']);
      if (body.setId !== SET_ID) reject(400, 'Bộ bài không hợp lệ.', 'setId');
      return db.transaction(() => {
        consistent();
        const lesson = db.prepare('SELECT unlock_after FROM lessons WHERE id=?').get(fixture.set.lesson_id);
        if (lesson.unlock_after && !db.prepare('SELECT 1 FROM progress WHERE user_id=? AND lesson_id=? AND completed=1').get(userId, lesson.unlock_after)) {
          reject(403, 'Em cần hoàn thành bài trước để mở bài này.');
        }
        const id = randomUUID(), now = new Date().toISOString();
        db.prepare(`INSERT INTO estimation_runs (id,user_id,set_id,questions_snapshot_json,created_at,updated_at)
          VALUES (?,?,?,?,?,?)`).run(id, userId, SET_ID, JSON.stringify(fixture), now, now);
        return publicRun(getRun(userId, id));
      }).immediate();
    },
    get(userId, runId) { return publicRun(getRun(userId, runId)); },
    confirm(userId, runId, questionId, body) {
      bodyFields(body, ['estimate']);
      return db.transaction(() => {
        const run = getRun(userId, runId);
        ensureOpen(run, questionId);
        const value = normalizeAnswer(body.estimate, 'estimate');
        if (own(run.estimates, questionId)) {
          if (run.estimates[questionId].value !== value) reject(409, 'Ước lượng đã khóa. Em có thể bắt đầu lượt mới để thử lại.', 'estimate');
        } else {
          const now = new Date().toISOString();
          run.estimates[questionId] = { value, confirmedAt: now };
          db.prepare('UPDATE estimation_runs SET confirmed_estimates_json=?,updated_at=? WHERE id=?')
            .run(JSON.stringify(run.estimates), now, runId);
        }
        return publicRun(getRun(userId, runId));
      }).immediate();
    },
    saveAnswer(userId, runId, questionId, body) {
      bodyFields(body, ['answer']);
      return db.transaction(() => {
        const run = getRun(userId, runId);
        ensureOpen(run, questionId);
        if (!own(run.estimates, questionId)) reject(409, 'Em cần xác nhận ước lượng trước.', 'answer');
        const value = normalizeAnswer(body.answer);
        if (!own(run.answers, questionId) || run.answers[questionId] !== value) {
          run.answers[questionId] = value;
          db.prepare('UPDATE estimation_runs SET draft_answers_json=?,updated_at=? WHERE id=?')
            .run(JSON.stringify(run.answers), new Date().toISOString(), runId);
        }
        return publicRun(getRun(userId, runId));
      }).immediate();
    },
    submit(userId, body) {
      bodyFields(body, ['setId', 'runId', 'answers']);
      return db.transaction(() => {
        const run = getRun(userId, body.runId);
        if (body.setId !== run.row.set_id) reject(400, 'Bộ bài không khớp lượt làm.', 'setId');
        if (!isMap(body.answers)) reject(400, 'Câu trả lời phải là map theo mã câu hỏi.', 'answers');
        const ids = run.snapshot.questions.map(q => q.id);
        if (Object.keys(body.answers).some(id => !ids.includes(id))) reject(400, 'Có mã câu ngoài lượt làm.', 'answers');
        const answers = {};
        for (const id of Object.keys(body.answers)) answers[id] = normalizeAnswer(body.answers[id], `answers.${id}`);
        if (ids.some(id => !own(answers, id) || !own(run.estimates, id) || !own(run.answers, id))) reject(409, 'Cần lưu đủ hai bước của cả 12 câu trước khi nộp.');
        if (ids.some(id => answers[id] !== run.answers[id])) reject(409, 'Câu trả lời khác bản đã lưu. Em tải lại để xem bản mới nhất trước khi nộp.');
        if (run.row.status === 'submitted') return JSON.parse(run.row.result_json);
        if (run.snapshot.rubricVersion !== RUBRIC_VERSION) throw new Error('Unsupported snapshot rubric.');

        const detail = run.snapshot.questions.map(q => gradeQuestion(q, run.estimates[q.id].value, answers[q.id]));
        const scorePercent = Math.round(100 * detail.reduce((sum, d) => sum + d.score, 0) / (10 * detail.length));
        const correctCount = detail.filter(d => d.correct).length;
        const meta = run.snapshot.set;
        const old = db.prepare('SELECT best_score FROM progress WHERE user_id=? AND lesson_id=?').get(userId, meta.lesson_id);
        const starsEarned = Math.round(Math.max(0, scorePercent - (old ? old.best_score : 0)) / 100 * meta.star_reward);
        const durationSec = Math.max(0, Math.round((Date.now() - Date.parse(run.row.created_at)) / 1000));
        const inserted = db.prepare(`INSERT INTO attempts (user_id,kind,ref_id,score_percent,correct_count,total_count,stars_earned,duration_sec,answers_json)
          VALUES (?,?,?,?,?,?,?,?,?)`).run(userId, meta.kind, run.row.set_id, scorePercent, correctCount, ids.length, starsEarned, durationSec, JSON.stringify(answers));
        db.prepare(`INSERT INTO progress (user_id,lesson_id,best_score,completed,updated_at) VALUES (?,?,?,?,datetime('now','localtime'))
          ON CONFLICT(user_id,lesson_id) DO UPDATE SET best_score=MAX(best_score,excluded.best_score),
          completed=MAX(completed,excluded.completed),updated_at=datetime('now','localtime')`)
          .run(userId, meta.lesson_id, scorePercent, scorePercent >= 50 ? 1 : 0);
        if (starsEarned) db.prepare('UPDATE users SET total_stars=total_stars+? WHERE id=?').run(starsEarned, userId);
        const totalStars = db.prepare('SELECT total_stars FROM users WHERE id=?').get(userId).total_stars;
        const result = { runId: run.row.id, scorePercent, correctCount, totalCount: ids.length, starsEarned, totalStars, detail };
        db.prepare("UPDATE estimation_runs SET status='submitted',attempt_id=?,result_json=?,updated_at=? WHERE id=?")
          .run(Number(inserted.lastInsertRowid), JSON.stringify(result), new Date().toISOString(), run.row.id);
        return result;
      }).immediate();
    },
  };
}

module.exports = { createEstimationService };
