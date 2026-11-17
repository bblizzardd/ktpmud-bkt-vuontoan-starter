'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAnswer, estimatePoints, gradeQuestion } = require('../server/estimation-scoring');

test('TP-04: exact inclusive boundaries, both sides, both directions, 50/50', () => {
  for (const [score, values] of [[10,[100,91,109,90,110]], [7,[89,111,81,119,80,120]], [3,[79,121,71,129,70,130]], [0,[69,131,0]]]) {
    for (const value of values) {
      assert.equal(estimatePoints(String(value), 100), score, `u=${value}`);
      for (const exact of [true, false]) {
        const detail = gradeQuestion({ id: 'unit', prompt: 'unit', correct_answer: '100' }, String(value), exact ? '100' : '101');
        assert.equal(detail.estimateScore, score);
        assert.equal(detail.exactScore, exact ? 10 : 0);
        assert.equal(detail.score, (score + (exact ? 10 : 0)) / 2);
        assert.equal(detail.correct, score === 10 && exact);
      }
    }
  }
  for (const [p,u,e] of [[5,4,7],[5,6,7],[99,100,10],[42,400,0]]) assert.equal(estimatePoints(String(u), p), e);
  for (const invalid of [0,-1,0.5,100001,NaN,Infinity]) assert.throws(() => estimatePoints('10', invalid));
});

test('TP-05: normalize only unsigned integer strings within domain', () => {
  for (const value of ['', ' ', null, undefined, 40, {}, [], '40a', '40.5', '-40', '+40', '1e3', '1,000', '1 000', '1000000001', 'Infinity', '１２']) {
    assert.throws(() => normalizeAnswer(value), error => error.status === 400);
  }
  assert.equal(normalizeAnswer(' 042 '), '42');
  assert.equal(normalizeAnswer('000'), '0');
  assert.equal(normalizeAnswer('1000000000'), '1000000000');
});
