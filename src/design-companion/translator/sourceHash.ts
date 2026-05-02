// __DESIGN_COMPANION_DEV_ONLY__
import { createHash } from 'node:crypto';
import type { ParseResult } from '@babel/parser';
import type { File, JSXElement, Node } from '@babel/types';
// @babel/traverse is CJS — Vite's ESM transform exposes the namespace `{ default, ... }`,
// while vitest's interop unwraps it. Read `.default` if present to handle both runtimes.
import _traverse from '@babel/traverse';
const traverse = ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse) as typeof _traverse;

const shortHash = (input: string): string =>
  createHash('sha256').update(input).digest('hex').slice(0, 8);

const normalizeJsx = (node: Node): unknown => {
  if (node.type === 'JSXElement') {
    return {
      t: 'JSXElement',
      n: (node.openingElement.name as { name?: string }).name ?? '?',
      a: node.openingElement.attributes.map(attr => ({
        type: attr.type,
        name: attr.type === 'JSXAttribute' ? (attr.name as { name?: string }).name : '?',
      })),
      c: node.children
        .filter(c => c.type !== 'JSXText' || c.value.trim().length > 0)
        .map(normalizeJsx),
    };
  }
  if (node.type === 'JSXText') return { t: 'JSXText', v: node.value.trim() };
  if (node.type === 'JSXFragment') {
    return { t: 'JSXFragment', c: node.children.map(normalizeJsx) };
  }
  return { t: node.type };
};

export const computeSourceHash = (ast: ParseResult<File> | JSXElement | Node): string => {
  let target: Node | undefined;
  if ('type' in ast && ast.type === 'File') {
    traverse(ast, {
      JSXElement(path) {
        if (!target) target = path.node;
      },
    });
  } else {
    target = ast as Node;
  }
  if (!target) return '00000000';
  return shortHash(JSON.stringify(normalizeJsx(target)));
};

export const computeInstanceId = (
  ast: ParseResult<File> | JSXElement | Node,
  ancestorPath: readonly string[],
  keyOrIndex: number | string,
): string => {
  let component = '?';
  let target: Node | undefined;
  if ('type' in ast && ast.type === 'File') {
    traverse(ast, {
      JSXElement(path) {
        if (!target) {
          target = path.node;
          const open = path.node.openingElement.name as { name?: string };
          component = open.name ?? '?';
        }
      },
    });
  } else if ((ast as Node).type === 'JSXElement') {
    target = ast as JSXElement;
    component = ((target as JSXElement).openingElement.name as { name?: string }).name ?? '?';
  }
  const ancestors = ancestorPath.length === 0 ? '' : ancestorPath.join('>');
  const hash = computeSourceHash(target ?? (ast as Node));
  return `${component}::${ancestors}::${keyOrIndex}::${hash}`;
};
