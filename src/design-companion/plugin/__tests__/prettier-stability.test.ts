import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { injectDesignIdInSource } from '../inject-design-id';

describe('content-addressable ID survives prettier --write', () => {
  it('id of root JSX element is unchanged after prettier reformat', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pf-'));
    const file = path.join(dir, 'Foo.tsx');
    const code = `export function Foo(){return <div className="x"><h1>hi</h1></div>}`;
    writeFileSync(file, code);
    const beforeId = (injectDesignIdInSource(readFileSync(file, 'utf8'), { filename: file }).code ?? '')
      .match(/data-design-id="([^"]+)"/)?.[1];
    try {
      execSync(`npx prettier --write ${file}`, { stdio: 'ignore' });
    } catch {}
    const afterId = (injectDesignIdInSource(readFileSync(file, 'utf8'), { filename: file }).code ?? '')
      .match(/data-design-id="([^"]+)"/)?.[1];
    expect(beforeId).toBeDefined();
    expect(beforeId).toBe(afterId);
    rmSync(dir, { recursive: true, force: true });
  });
});
