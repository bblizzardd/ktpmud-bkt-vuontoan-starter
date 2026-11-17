'use strict';

const express = require('express');
const { requireAuth } = require('./auth');
const { SET_ID } = require('./estimation-data');
const { createEstimationService } = require('./estimation-service');
const { EstimationError } = require('./estimation-scoring');

module.exports = function estimationApi(db) {
  const router = express.Router();
  const service = createEstimationService(db);
  const handle = fn => (req, res) => {
    try { res.json(fn(req)); }
    catch (error) {
      if (error instanceof EstimationError) return res.status(error.status).json({ error: error.message, ...(error.field ? { field: error.field } : {}) });
      console.error('[estimation]', error.message);
      res.status(500).json({ error: 'Chưa lưu được dữ liệu. Em thử lại; nếu vẫn lỗi, hãy báo giáo viên.' });
    }
  };
  router.post('/estimation-runs', requireAuth, handle(req => service.create(req.user.id, req.body)));
  router.get('/estimation-runs/:runId', requireAuth, handle(req => service.get(req.user.id, req.params.runId)));
  router.post('/estimation-runs/:runId/estimates/:questionId', requireAuth, handle(req => service.confirm(req.user.id, req.params.runId, req.params.questionId, req.body)));
  router.put('/estimation-runs/:runId/answers/:questionId', requireAuth, handle(req => service.saveAnswer(req.user.id, req.params.runId, req.params.questionId, req.body)));
  router.get('/question-sets/:setId/questions', requireAuth, (req, res, next) => {
    if (req.params.setId !== SET_ID) return next();
    return handle(() => service.questions())(req, res);
  });
  router.post('/submissions', requireAuth, (req, res, next) => {
    const body = req.body || {};
    // A forged/missing runId must never make this type fall through to the legacy grader.
    const hasEstimate = typeof body.setId === 'string' && db.prepare("SELECT 1 FROM questions WHERE set_id=? AND type='estimate'").get(body.setId);
    if (body.setId === SET_ID || Object.prototype.hasOwnProperty.call(body, 'runId') || hasEstimate) {
      return handle(() => service.submit(req.user.id, body))(req, res);
    }
    next();
  });
  return router;
};
