'use strict';
const { fork } = require('child_process');
const path = require('path');
const { once } = require('events');
const { issueToken } = require('../server/auth');

async function startServer(filename) {
  const child = fork(path.join(__dirname, 'api-server.cjs'), [], {
    env: { ...process.env, DB_PATH: filename }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Startup timed out: ${output}`)); }, 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
    child.once('message', message => { clearTimeout(timer); resolve(message.port); });
  });
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    async request(method, route, body, userId = 1) {
      const response = await fetch(base + route, { method,
        headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${issueToken({ id: userId, role: userId === 3 ? 'teacher' : 'student' })}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      return { status: response.status, data };
    },
    async stop() {
      if (child.exitCode !== null) return;
      const exit = once(child, 'exit'); child.send('stop');
      const timer = setTimeout(() => child.kill(), 5000);
      try { await exit; } finally { clearTimeout(timer); }
    },
  };
}
module.exports = { startServer };
