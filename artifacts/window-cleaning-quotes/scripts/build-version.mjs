import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageJsonUrl = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export function getBuildVersion() {
  const commit = process.env.GITHUB_SHA?.slice(0, 8) || getLocalCommit();
  return `${packageJson.version}+${commit}`;
}

function getLocalCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
}
