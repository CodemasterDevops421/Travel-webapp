/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');

const dryFail = process.argv.includes('--dry-fail');

function runStep(label, command, args) {
  console.log(`SEO_GATE_STEP=${label}`);
  const useNpmExecPath = command === 'npm' && typeof process.env.npm_execpath === 'string';
  const executable = useNpmExecPath ? process.execPath : command;
  const executableArgs = useNpmExecPath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    console.error(`SEO_GATE_FAILED=${label}`);
    process.exit(result.status ?? 1);
  }
}

if (dryFail) {
  console.error('SEO_GATE_DRY_FAIL=Intentional failure for CI contract verification');
  process.exit(2);
}

runStep('validate-content', 'npm', ['run', 'blog:validate']);
runStep('seo-tests', 'npm', ['run', 'test:blog-seo']);

console.log('SEO_GATE_RESULT=PASS');
