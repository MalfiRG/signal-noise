// __DESIGN_COMPANION_DEV_ONLY__
import { readdir, readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { LLMTranslator } from '../src/design-companion/translator/LLMTranslator';
import { DeterministicTranslator } from '../src/design-companion/translator/DeterministicTranslator';
import type { DesignIntentFile, DesignIntentEdit } from '../src/design-companion/types';

const PEND = path.resolve('design-intents/pending');
const APPL = path.resolve('design-intents/applied');
const NEEDS_LLM = path.resolve('design-intents/needs-llm');
const t = new LLMTranslator(new DeterministicTranslator());

const main = async () => {
  let applied = 0;
  let gaps = 0;
  let delegated = 0;

  const authors = await readdir(PEND).catch(() => [] as string[]);
  for (const a of authors) {
    const dir = path.join(PEND, a);
    const files = await readdir(dir).catch(() => [] as string[]);
    if (files.length === 0) continue;
    for (const f of files.filter((x) => x.endsWith('.md'))) {
      const fullPath = path.join(dir, f);
      const body = await readFile(fullPath, 'utf8');
      const fmMatch = body.match(/^---\n([\s\S]+?)\n---/);
      if (!fmMatch) continue;

      let fm: DesignIntentFile | null;
      try {
        fm = yaml.load(fmMatch[1]) as DesignIntentFile;
      } catch {
        continue;
      }
      if (!fm || !fm.edits || !Array.isArray(fm.edits)) continue;

      let allApplied = true;
      let anyDelegate = false;
      for (const edit of fm.edits as DesignIntentEdit[]) {
        const sourcePath = path.resolve(edit.file);
        const source = await readFile(sourcePath, 'utf8').catch(() => null);
        if (source === null) {
          allApplied = false;
          gaps++;
          continue;
        }
        const r = t.applyIntent(edit, source);
        if (r.kind === 'applied') {
          await writeFile(sourcePath, r.updatedSource, 'utf8');
          applied++;
        } else if (r.kind === 'delegate') {
          allApplied = false;
          anyDelegate = true;
          delegated++;
        } else {
          allApplied = false;
          gaps++;
        }
      }

      if (allApplied) {
        // [3-tag routing] all edits applied → atomic move pending → applied
        const target = path.join(APPL, a, f);
        await mkdir(path.dirname(target), { recursive: true });
        await rename(fullPath, target);
      } else if (anyDelegate) {
        // [H5] any delegate → atomic move to needs-llm, then annotate frontmatter.
        // Order matters: rename FIRST (POSIX rename overwrites target atomically),
        // THEN write annotated content to target. The reverse order silently
        // loses the `status: needs-llm` annotation per POSIX rename(2) semantics.
        const target = path.join(NEEDS_LLM, a, f);
        await mkdir(path.dirname(target), { recursive: true });
        await rename(fullPath, target);
        const annotated = body.replace(/^status:\s*pending/m, 'status: needs-llm');
        await writeFile(target, annotated, 'utf8');
      }
      // else: any gap with no delegate → file stays in pending/ for the
      // validator's next stale-check pass.
    }
  }
  console.log(`design:apply — applied=${applied} gaps=${gaps} delegated=${delegated}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
