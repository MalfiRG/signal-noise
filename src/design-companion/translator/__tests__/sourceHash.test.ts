import { describe, it, expect } from 'vitest';
import { computeInstanceId, computeSourceHash } from '../sourceHash';
import * as parser from '@babel/parser';

const parseJsx = (code: string) =>
  parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

describe('computeInstanceId', () => {
  it('produces a stable hash across reformatting', () => {
    const a = parseJsx('<PostHeader><h1 className="post-title">Hi</h1></PostHeader>');
    const b = parseJsx('<PostHeader>\n  <h1 className="post-title">Hi</h1>\n</PostHeader>');
    expect(computeInstanceId(a, ['App', 'Layout'], 0)).toEqual(
      computeInstanceId(b, ['App', 'Layout'], 0),
    );
  });

  it('produces different hashes when JSX child structure changes', () => {
    const a = parseJsx('<PostHeader><h1>A</h1></PostHeader>');
    const b = parseJsx('<PostHeader><h1>A</h1><p>B</p></PostHeader>');
    expect(computeInstanceId(a, [], 0)).not.toEqual(computeInstanceId(b, [], 0));
  });

  it('formats id as <component>::<ancestors>::<key>::<hash>', () => {
    const a = parseJsx('<Foo />');
    const id = computeInstanceId(a, ['App', 'Page'], 2);
    expect(id).toMatch(/^Foo::App>Page::2::[a-f0-9]{8}$/);
  });
});

describe('computeSourceHash', () => {
  it('hashes a JSX subtree to an 8-char hex string', () => {
    const ast = parseJsx('<h1 className="post-title">Hi</h1>');
    const h = computeSourceHash(ast);
    expect(h).toMatch(/^[a-f0-9]{8}$/);
  });
});
