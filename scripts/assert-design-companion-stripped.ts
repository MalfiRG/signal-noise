// __DESIGN_COMPANION_DEV_ONLY__
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';

const SENTINEL = '__DESIGN_COMPANION_DEV_ONLY__';
const DIST = path.resolve('dist');

const walk = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  let entries: string[] = [];
  try { entries = await readdir(dir); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e);
    const { stat } = await import('node:fs/promises');
    const s = await stat(full);
    if (s.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
};

const main = async () => {
  const files = await walk(DIST);
  const matches: string[] = [];
  for (const f of files) {
    const body = await readFile(f, 'utf8').catch(() => '');
    if (body.includes(SENTINEL)) matches.push(f);
  }
  if (matches.length > 0) {
    console.error('FAIL: sentinel found in dist:');
    for (const m of matches) console.error(`  ${m}`);
    process.exit(1);
  }
  console.log('PASS: sentinel sweep — zero hits in dist');
};
main();
