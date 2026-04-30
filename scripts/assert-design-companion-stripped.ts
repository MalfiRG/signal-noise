// __DESIGN_COMPANION_DEV_ONLY__
import { readdir, readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

// @babel/traverse v7 ships ESM/CJS interop where the default export is sometimes
// wrapped under `.default`. Normalize both shapes.
const traverse = (
  typeof (_traverse as unknown as { default?: unknown }).default === 'function'
    ? (_traverse as unknown as { default: typeof _traverse }).default
    : _traverse
) as typeof _traverse;

const SENTINEL = '__DESIGN_COMPANION_DEV_ONLY__';
const DATA_ID_PATTERN = /data-design-id|__DESIGN_COMPANION_DEV_ONLY__/;
const DEFAULT_SIZE_THRESHOLD = 1024;
const DIST = path.resolve('dist');

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir).catch(() => [] as string[]);
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e);
    const s = await stat(full).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
};

export const layer1BundleSizeDiff = async (
  withBytes: number,
  withoutBytes: number,
  threshold: number = DEFAULT_SIZE_THRESHOLD,
): Promise<void> => {
  const delta = withBytes - withoutBytes;
  if (delta > threshold) {
    throw new Error(
      `FAIL: bundle-size delta ${delta}B exceeds threshold ${threshold}B ` +
      `(with=${withBytes}B without=${withoutBytes}B)`,
    );
  }
};

export const layer2AstWalk = async (dir: string): Promise<void> => {
  const files = (await walk(dir)).filter((f) => f.endsWith('.js'));
  const hits: string[] = [];
  for (const f of files) {
    const body = await readFile(f, 'utf8').catch(() => '');
    if (!body) continue;
    let ast;
    try {
      ast = parse(body, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      });
    } catch {
      continue;
    }
    traverse(ast, {
      JSXAttribute(p) {
        const name = p.node.name;
        if (name.type === 'JSXIdentifier' && name.name === 'data-design-id') {
          hits.push(`${f}: JSXAttribute data-design-id`);
        }
      },
      StringLiteral(p) {
        if (DATA_ID_PATTERN.test(p.node.value)) {
          hits.push(`${f}: string literal matches /${DATA_ID_PATTERN.source}/`);
        }
      },
    });
  }
  if (hits.length > 0) {
    throw new Error(
      `FAIL: AST walk found dev-only markers (data-design-id / sentinel) in dist:\n  ` +
      hits.join('\n  '),
    );
  }
};

export const layer3SentinelSweep = async (dir: string): Promise<void> => {
  const files = await walk(dir);
  const matches: string[] = [];
  for (const f of files) {
    const body = await readFile(f, 'utf8').catch(() => '');
    if (body.includes(SENTINEL)) matches.push(f);
  }
  if (matches.length > 0) {
    throw new Error(
      `FAIL: sentinel "${SENTINEL}" found in dist:\n  ` + matches.join('\n  '),
    );
  }
};

export const layer4SourcemapPolicy = async (dir: string): Promise<void> => {
  const files = await walk(dir);
  const maps = files.filter((f) => f.endsWith('.map'));
  if (maps.length > 0) {
    throw new Error(
      `FAIL: source maps present in dist:\n  ` + maps.join('\n  '),
    );
  }
};

// Layer 1 wired via vite-manifest chunk attribution (Session 9 §E remediation).
// Requires `build.manifest = true` in vite.config.ts.
type ManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
};
type Manifest = Record<string, ManifestEntry>;

const DESIGN_COMPANION_PREFIX = 'src/design-companion/';

export const sumDesignCompanionBytesFromManifest = async (
  dist: string,
): Promise<number> => {
  const manifestPath = path.join(dist, '.vite', 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8').catch(() => null);
  if (raw === null) {
    throw new Error(
      `FAIL: ${manifestPath} not found — ensure vite.config.ts has build.manifest=true`,
    );
  }
  const manifest = JSON.parse(raw) as Manifest;
  let total = 0;
  for (const [key, entry] of Object.entries(manifest)) {
    const isDesignCompanion =
      key.startsWith(DESIGN_COMPANION_PREFIX) ||
      (entry.src !== undefined && entry.src.startsWith(DESIGN_COMPANION_PREFIX));
    if (!isDesignCompanion) continue;
    const distFile = path.join(dist, entry.file);
    const s = await stat(distFile).catch(() => null);
    if (s) total += s.size;
    for (const cssFile of entry.css ?? []) {
      const cs = await stat(path.join(dist, cssFile)).catch(() => null);
      if (cs) total += cs.size;
    }
  }
  return total;
};

const main = async (): Promise<void> => {
  console.log('[assert-stripped] running layer 1 (manifest chunk attribution)…');
  const designCompanionBytes = await sumDesignCompanionBytesFromManifest(DIST);
  await layer1BundleSizeDiff(designCompanionBytes, 0);

  console.log('[assert-stripped] running layers 2-4 against current dist…');
  await layer2AstWalk(DIST);
  await layer3SentinelSweep(DIST);
  await layer4SourcemapPolicy(DIST);
  console.log(
    `PASS: all four layers — design-companion-bytes=${designCompanionBytes}B ` +
    `(threshold=${DEFAULT_SIZE_THRESHOLD}B), AST-clean, sentinel-clean, no source maps`,
  );
};

const isMain = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  return import.meta.url === `file://${argv1}` ||
    argv1.endsWith('assert-design-companion-stripped.ts');
})();

if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
