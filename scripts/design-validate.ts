// __DESIGN_COMPANION_DEV_ONLY__
import { readdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type { DesignIntentFile } from '../src/design-companion/types';

const PENDING = path.resolve('design-intents/pending');

const main = async () => {
  let walked = 0;
  let stale = 0;
  const authors = await readdir(PENDING).catch(() => [] as string[]);
  for (const a of authors) {
    const dir = path.join(PENDING, a);
    let files: string[] = [];
    try { files = await readdir(dir); } catch { continue; }
    for (const f of files.filter(x => x.endsWith('.md'))) {
      walked++;
      const body = await readFile(path.join(dir, f), 'utf8');
      const fmMatch = body.match(/^---\n([\s\S]+?)\n---/);
      if (!fmMatch) { stale++; continue; }
      let fm: DesignIntentFile | null = null;
      try { fm = yaml.load(fmMatch[1]) as DesignIntentFile; } catch { fm = null; }
      const hasHash = fm?.edits?.every(e => /^[a-f0-9]{8}$/.test(e.source_hash)) ?? false;
      if (!fm || !hasHash) {
        stale++;
        const updated = body.replace(/^status:\s*pending/m, 'status: stale');
        await writeFile(path.join(dir, f), updated, 'utf8');
      }
    }
  }
  console.log(`design:validate — walked=${walked} stale=${stale}`);
};
main().catch(e => { console.error(e); process.exit(1); });
