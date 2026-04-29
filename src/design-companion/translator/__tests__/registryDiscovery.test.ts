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
