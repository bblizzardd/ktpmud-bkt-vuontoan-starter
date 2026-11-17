'use strict';
// Dedicated child process; DB_PATH is always supplied by the test harness.
if (!process.env.DB_PATH) throw new Error('Tests require a temporary DB_PATH.');
const express = require('express');
const path = require('path');
const db = require('../server/db');
const { attachUser } = require('../server/auth');
const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(attachUser(db));
app.use('/api', require('../server/api'));
app.use(express.static(path.join(__dirname, '..', 'public')));
const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
process.on('message', message => {
  if (message === 'stop') server.close(() => { db.close(); process.exit(0); });
});
