import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const androidDirectory = path.join(projectRoot, 'android');
const env = {
  ...process.env,
  PORT: process.env.PORT || '21007',
  BASE_PATH: '/',
};
const isWindows = process.platform === 'win32';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    env,
    shell: isWindows,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('pnpm', ['run', 'android:sync']);
run(isWindows ? 'gradlew.bat' : './gradlew', ['--no-daemon', 'assembleDebug'], {
  cwd: androidDirectory,
});
