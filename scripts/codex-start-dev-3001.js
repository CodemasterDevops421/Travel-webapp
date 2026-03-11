const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = 'C:/Users/Lenovo/Downloads/travelapp/Travel-webapp';
const logPath = path.join(cwd, 'codex-dev-3001.log');
const out = fs.openSync(logPath, 'a');
const cmd = process.env.ComSpec || 'C:/Windows/System32/cmd.exe';

const child = spawn(cmd, ['/c', 'npm run start -- -p 3001'], {
  cwd,
  detached: true,
  stdio: ['ignore', out, out]
});

child.unref();
console.log(`started:${child.pid}`);
