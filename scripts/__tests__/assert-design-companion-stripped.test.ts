import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  layer1BundleSizeDiff,
  layer2AstWalk,
  layer3SentinelSweep,
  layer4SourcemapPolicy,
  sumDesignCompanionBytesFromManifest,
} from '../assert-design-companion-stripped';

let dist: string;

beforeEach(async () => {
  dist = await mkdtemp(path.join(tmpdir(), 'dist-'));
});

afterEach(async () => {
  await rm(dist, { recursive: true, force: true });
});

describe('layer 3 — sentinel sweep', () => {
  it('FAILS when a dist file contains __DESIGN_COMPANION_DEV_ONLY__', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = "__DESIGN_COMPANION_DEV_ONLY__";');
    await expect(layer3SentinelSweep(dist)).rejects.toThrow(/sentinel/i);
  });

  it('PASSES on a clean dist', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = 1;');
    await expect(layer3SentinelSweep(dist)).resolves.toBeUndefined();
  });

  it('walks subdirectories', async () => {
    const sub = path.join(dist, 'assets');
    await rm(sub, { recursive: true, force: true });
    const { mkdir } = await import('node:fs/promises');
    await mkdir(sub);
    await writeFile(path.join(sub, 'chunk.js'), 'var s = "__DESIGN_COMPANION_DEV_ONLY__";');
    await expect(layer3SentinelSweep(dist)).rejects.toThrow(/sentinel/i);
  });
});

describe('layer 2 — AST walk', () => {
  it('FAILS when a string literal contains data-design-id in a dist .js file', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = "data-design-id-leak";');
    await expect(layer2AstWalk(dist)).rejects.toThrow(/data-design-id/);
  });

  it('FAILS when a string literal contains the dev-only sentinel substring', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = "__DESIGN_COMPANION_DEV_ONLY__";');
    await expect(layer2AstWalk(dist)).rejects.toThrow(/__DESIGN_COMPANION_DEV_ONLY__/);
  });

  it('PASSES on a clean dist', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = 1; const y = "ok";');
    await expect(layer2AstWalk(dist)).resolves.toBeUndefined();
  });

  it('skips non-.js files (css, html)', async () => {
    await writeFile(path.join(dist, 'app.css'), '.x { content: "data-design-id"; }');
    await writeFile(path.join(dist, 'index.html'), '<div data-design-id="nope"></div>');
    await expect(layer2AstWalk(dist)).resolves.toBeUndefined();
  });
});

describe('layer 4 — sourcemap policy', () => {
  it('FAILS when a .map file is present in dist', async () => {
    await writeFile(path.join(dist, 'app.js.map'), '{}');
    await expect(layer4SourcemapPolicy(dist)).rejects.toThrow(/source maps/i);
  });

  it('PASSES on a dist with no .map files', async () => {
    await writeFile(path.join(dist, 'app.js'), 'const x = 1;');
    await writeFile(path.join(dist, 'index.html'), '<html></html>');
    await expect(layer4SourcemapPolicy(dist)).resolves.toBeUndefined();
  });
});

describe('layer 1 — bundle-size diff', () => {
  it('FAILS when delta exceeds threshold', async () => {
    await expect(layer1BundleSizeDiff(8192, 1024, 1024)).rejects.toThrow(/delta|bundle/i);
  });

  it('PASSES when delta is within threshold', async () => {
    await expect(layer1BundleSizeDiff(2048, 1536, 1024)).resolves.toBeUndefined();
  });

  it('PASSES when delta is exactly at threshold (≤, not <)', async () => {
    await expect(layer1BundleSizeDiff(2048, 1024, 1024)).resolves.toBeUndefined();
  });

  it('FAILS one byte over threshold', async () => {
    await expect(layer1BundleSizeDiff(2049, 1024, 1024)).rejects.toThrow(/delta|bundle/i);
  });
});

describe('sumDesignCompanionBytesFromManifest', () => {
  const writeManifest = async (manifest: Record<string, unknown>): Promise<void> => {
    await mkdir(path.join(dist, '.vite'), { recursive: true });
    await writeFile(path.join(dist, '.vite', 'manifest.json'), JSON.stringify(manifest), 'utf8');
  };

  it('returns 0 when manifest has no design-companion entries', async () => {
    await writeFile(path.join(dist, 'main.js'), 'X'.repeat(500));
    await writeManifest({
      'src/main.tsx': { file: 'main.js', isEntry: true },
    });
    expect(await sumDesignCompanionBytesFromManifest(dist)).toBe(0);
  });

  it('sums bytes of entries keyed by src/design-companion/ path', async () => {
    await writeFile(path.join(dist, 'leak.js'), 'X'.repeat(750));
    await writeManifest({
      'src/design-companion/foo.ts': { file: 'leak.js' },
      'src/main.tsx': { file: 'main.js', isEntry: true },
    });
    expect(await sumDesignCompanionBytesFromManifest(dist)).toBe(750);
  });

  it('sums bytes when entry.src references design-companion (virtual chunk shape)', async () => {
    await writeFile(path.join(dist, 'chunk.js'), 'X'.repeat(300));
    await writeManifest({
      '_chunk-ABC.js': { file: 'chunk.js', src: 'src/design-companion/translator/x.ts' },
    });
    expect(await sumDesignCompanionBytesFromManifest(dist)).toBe(300);
  });

  it('includes css files referenced by design-companion entries', async () => {
    await writeFile(path.join(dist, 'leak.js'), 'X'.repeat(100));
    await writeFile(path.join(dist, 'leak.css'), 'X'.repeat(200));
    await writeManifest({
      'src/design-companion/foo.ts': { file: 'leak.js', css: ['leak.css'] },
    });
    expect(await sumDesignCompanionBytesFromManifest(dist)).toBe(300);
  });

  it('throws when manifest.json is missing', async () => {
    await expect(sumDesignCompanionBytesFromManifest(dist)).rejects.toThrow(/manifest\.json/);
  });
});
