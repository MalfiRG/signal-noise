// __DESIGN_COMPANION_DEV_ONLY__
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { DesignableSpec } from '../types';

const walkDesignable = async (dir: string, out: string[] = []): Promise<string[]> => {
  let entries: import('node:fs').Dirent[] = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkDesignable(full, out);
    else if (e.name.endsWith('.designable.ts')) out.push(full);
  }
  return out;
};

export const discoverDesignableSpecs = async (repoRoot: string): Promise<DesignableSpec[]> => {
  const files = await walkDesignable(path.join(repoRoot, 'src'));
  const out: DesignableSpec[] = [];
  for (const f of files) {
    const body = await readFile(f, 'utf8');
    const compMatch = body.match(/component:\s*['"]([^'"]+)['"]/);
    const fileMatch = body.match(/file:\s*['"]([^'"]+)['"]/);
    const selMatch = body.match(/selectors:\s*\[([^\]]*)\]/);
    if (!compMatch) continue;
    const selectors = selMatch
      ? Array.from(selMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map(m => m[1])
      : [];
    const file = fileMatch?.[1] ?? f;
    out.push({ component: compMatch[1], file, selectors });
  }
  return out;
};

// [C13] Module-level cache feeds both the save-endpoint registry-allowlist (Phase 0)
// and the auto-wrap Vite plugin (Phase 2). The Vite plugin invalidates by reassigning
// `cache = null` on hot-reload of any *.designable.ts file (see Task 2.8).
let cache: Set<string> | null = null;
let cacheRoot: string | null = null;

export const ensureRegistryCache = async (repoRoot: string): Promise<Set<string>> => {
  if (cache && cacheRoot === repoRoot) return cache;
  const specs = await discoverDesignableSpecs(repoRoot);
  cache = new Set(specs.map(s => s.component));
  cacheRoot = repoRoot;
  return cache;
};

export const ensureRegistryFiles = async (repoRoot: string): Promise<Set<string>> => {
  const specs = await discoverDesignableSpecs(repoRoot);
  return new Set(specs.map(s => s.file));
};

export const invalidateRegistryCache = (): void => {
  cache = null;
  cacheRoot = null;
};
