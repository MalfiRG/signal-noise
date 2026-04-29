import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { discoverDesignableSpecs, ensureRegistryCache } from '../registryDiscovery';

let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'rd-'));
  mkdirSync(path.join(root, 'src/components'), { recursive: true });
  writeFileSync(path.join(root, 'src/components/Foo.tsx'), 'export const Foo = () => null;');
  writeFileSync(
    path.join(root, 'src/components/Foo.designable.ts'),
    `export const designable = { component: 'Foo', file: 'src/components/Foo.tsx', selectors: ['.foo'] };`,
  );
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('discoverDesignableSpecs', () => {
  it('finds *.designable.ts files', async () => {
    const specs = await discoverDesignableSpecs(root);
    expect(specs.length).toBe(1);
    expect(specs[0].component).toBe('Foo');
  });
});

describe('ensureRegistryCache [C13]', () => {
  it('returns a Set of component names', async () => {
    const cache = await ensureRegistryCache(root);
    expect(cache.has('Foo')).toBe(true);
  });
  it('memoizes after first call', async () => {
    const a = await ensureRegistryCache(root);
    const b = await ensureRegistryCache(root);
    expect(a).toBe(b);
  });
});

describe('[γ] discoverDesignableSpecs derives .tsx from .designable.ts when file: is omitted', () => {
  it('produces relative-from-repo-root .tsx path matching editor convention', async () => {
    // Fresh fixture: spec body with NO `file:` field — exactly the DesignDemoTarget pattern (M13).
    const subroot = mkdtempSync(path.join(tmpdir(), 'rd-derive-'));
    mkdirSync(path.join(subroot, 'src/components'), { recursive: true });
    writeFileSync(path.join(subroot, 'src/components/Bar.tsx'), 'export const Bar = () => null;');
    writeFileSync(
      path.join(subroot, 'src/components/Bar.designable.ts'),
      `export const designable = { component: 'Bar', selectors: ['.bar'] };`,
    );
    const specs = await discoverDesignableSpecs(subroot);
    expect(specs.length).toBe(1);
    expect(specs[0].component).toBe('Bar');
    // Critical: `file` is the .tsx companion, NOT the .designable.ts path,
    // and is relative-from-repo-root to match how the save-endpoint compares against `edit.file`.
    expect(specs[0].file).toBe('src/components/Bar.tsx');
  });
});
