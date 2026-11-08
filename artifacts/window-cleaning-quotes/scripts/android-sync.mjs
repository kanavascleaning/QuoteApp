import { spawnSync } from 'node:child_process';

const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const env = {
  ...process.env,
  PORT: process.env.PORT || '21007',
  BASE_PATH: '/',
};

function run(args) {
  const result = spawnSync(packageManager, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['run', 'web:build']);
run(['exec', 'cap', 'sync', 'android']);
