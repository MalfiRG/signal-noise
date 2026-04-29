// __DESIGN_COMPANION_DEV_ONLY__
import { execSync } from 'node:child_process';

const out = execSync('git status --short -- design-intents/', { encoding: 'utf8' });
const lines = out.split('\n').filter(Boolean);
if (lines.length === 0) {
  console.log('design:status — clean');
  process.exit(0);
}
console.log(`design:status — ${lines.length} uncommitted intent file(s):`);
for (const l of lines) console.log(`  ${l}`);
process.exit(1);
