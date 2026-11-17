'use strict';

class EstimationError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

function normalizeAnswer(value, field = 'answer') {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value.trim()) || Number(value) > 1000000000) {
    throw new EstimationError(400, 'Nhập số nguyên từ 0 đến 1.000.000.000, chỉ dùng chữ số.', field);
  }
  return String(Number(value.trim()));
}

function estimatePoints(estimate, correctAnswer) {
  const u = Number(normalizeAnswer(estimate, 'estimate'));
  if (!Number.isInteger(correctAnswer) || correctAnswer <= 0 || correctAnswer > 100000) {
    throw new Error('Đáp án chuẩn phải là số nguyên dương không quá 100000.');
  }
  const d = Math.abs(u - correctAnswer);
  if (10 * d <= correctAnswer) return 10;
  if (5 * d <= correctAnswer) return 7;
  if (10 * d <= 3 * correctAnswer) return 3;
  return 0;
}

function gradeQuestion(question, estimate, answer) {
  const u = normalizeAnswer(estimate, 'estimate');
  const v = normalizeAnswer(answer);
  const p = Number(question.correct_answer);
  const estimateScore = estimatePoints(u, p);
  const exactScore = Number(v) === p ? 10 : 0;
  const feedback = { 10: 'Ước lượng tốt', 7: 'Ước lượng khá gần', 3: 'Ước lượng còn lệch', 0: 'Ước lượng chưa hợp lý' };
  return {
    questionId: question.id, prompt: question.prompt, estimate: u, answer: v,
    correctAnswer: String(p), estimateScore, exactScore, score: (estimateScore + exactScore) / 2,
    relativeError: Math.abs(Number(u) - p) / p,
    estimateFeedback: feedback[estimateScore],
    exactFeedback: exactScore ? 'Tính chính xác đúng' : 'Kết quả tính chưa đúng',
    correct: exactScore === 10 && estimateScore === 10,
  };
}

module.exports = { EstimationError, normalizeAnswer, estimatePoints, gradeQuestion };
