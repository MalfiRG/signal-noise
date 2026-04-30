// __DESIGN_COMPANION_DEV_ONLY__
// @babel/traverse and @babel/generator are CJS — Vite's ESM transform exposes
// the namespace `{ default, ... }`, while vitest's interop unwraps it. Read
// `.default` if present so both runtimes resolve to the function.
import * as parser from '@babel/parser';
import _generate from '@babel/generator';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
const generate = ((_generate as unknown as { default?: typeof _generate }).default ?? _generate) as typeof _generate;
const traverse = ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse) as typeof _traverse;
import { computeInstanceId } from '../translator/sourceHash';

export interface InjectOptions {
  filename: string;
  // Optional registry of component names to auto-wrap with withDesignOverrides.
  // Phase 0 callers omit this; Phase 2 callers pass the discoverDesignableSpecs() result. [C14]
  registry?: Set<string>;
}

export interface InjectResult {
  code: string | null;
}

const hasDataDesignIdAttr = (el: t.JSXOpeningElement): boolean =>
  el.attributes.some(
    a =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === 'data-design-id',
  );

export const injectDesignIdInSource = (
  code: string,
  opts: InjectOptions,
): InjectResult => {
  // Per F-ADV-22: tighter early skip — accept `<Capitalized` / `<lowercase` followed by whitespace,
  // self-close `/`, or close `>`. The widened terminator handles `<span/>` and `<Foo/>` correctly.
  if (!/<[A-Z][A-Za-z0-9]*[\s/>]|<[a-z][a-z0-9]*[\s/>]/.test(code)) return { code: null };
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  let modified = false;
  const wrappedNames = new Set<string>();
  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      if (hasDataDesignIdAttr(opening)) return;
      const ancestors: string[] = [];
      path.findParent(p => {
        if (p.isFunctionDeclaration() || p.isArrowFunctionExpression()) {
          const id = (p.node as t.FunctionDeclaration).id?.name ?? '?';
          ancestors.unshift(id);
        }
        return false;
      });
      const id = computeInstanceId(path.node, ancestors, path.key as number);
      opening.attributes.unshift(
        t.jsxAttribute(t.jsxIdentifier('data-design-id'), t.stringLiteral(id)),
      );
      modified = true;
    },
    ExportNamedDeclaration(path) {
      if (!opts.registry) return;
      const decl = path.node.declaration;
      if (!decl) return;

      // Resolve the exported name from FunctionDeclaration or VariableDeclaration.
      let name: string | null = null;
      let isFunctionDecl = false;
      if (decl.type === 'FunctionDeclaration' && decl.id) {
        name = decl.id.name;
        isFunctionDecl = true;
      } else if (decl.type === 'VariableDeclaration' && decl.declarations.length === 1) {
        const declarator = decl.declarations[0];
        if (declarator.id.type === 'Identifier') {
          // Idempotency: skip if init is already withDesignOverrides(...) call.
          if (
            declarator.init?.type === 'CallExpression' &&
            declarator.init.callee.type === 'Identifier' &&
            declarator.init.callee.name === 'withDesignOverrides'
          ) {
            return;
          }
          name = declarator.id.name;
        }
      }

      if (!name || !opts.registry.has(name) || wrappedNames.has(name)) return;
      wrappedNames.add(name);

      const innerName = `${name}_inner`;
      const wrappedExport = t.exportNamedDeclaration(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(name),
            t.callExpression(t.identifier('withDesignOverrides'), [
              t.identifier(innerName),
              t.stringLiteral(name),
            ]),
          ),
        ]),
      );

      if (isFunctionDecl) {
        const fn = decl as t.FunctionDeclaration;
        if (fn.id) fn.id.name = innerName;
        path.replaceWithMultiple([fn, wrappedExport]);
      } else {
        const vd = decl as t.VariableDeclaration;
        const declarator = vd.declarations[0];
        (declarator.id as t.Identifier).name = innerName;
        path.replaceWithMultiple([vd, wrappedExport]);
      }
      modified = true;
    },
    ExportDefaultDeclaration(path) {
      if (!opts.registry) return;
      const decl = path.node.declaration;

      // Pattern A: export default function X() { ... }
      if (decl.type === 'FunctionDeclaration' && decl.id) {
        const name = decl.id.name;
        if (!opts.registry.has(name) || wrappedNames.has(name)) return;
        wrappedNames.add(name);
        const innerName = `${name}_inner`;
        decl.id.name = innerName;
        // Sibling FunctionDeclaration + new default export of the wrapped call.
        path.replaceWithMultiple([
          decl,
          t.exportDefaultDeclaration(
            t.callExpression(t.identifier('withDesignOverrides'), [
              t.identifier(innerName),
              t.stringLiteral(name),
            ]),
          ),
        ]);
        modified = true;
        return;
      }

      // Pattern B: export default <Identifier>  (e.g., `const X = ...; export default X`)
      // Wrap at the export site without renaming the in-scope binding — the wrapped
      // version is the default-exported one; the named const remains intact.
      if (decl.type === 'Identifier') {
        const name = decl.name;
        if (!opts.registry.has(name) || wrappedNames.has(name)) return;
        wrappedNames.add(name);
        path.node.declaration = t.callExpression(t.identifier('withDesignOverrides'), [
          t.identifier(name),
          t.stringLiteral(name),
        ]);
        modified = true;
        return;
      }

      // Pattern C: export default () => <div/>  (anonymous) → SKIP (no name to register against).
      // Also catches export default <ArrowFunctionExpression> with no enclosing const.
      // Per plan §4859 — emit a warn-class diagnostic in production, but for the
      // unit test we just leave the node untouched.
    },
  });

  // If any export was wrapped, ensure withDesignOverrides is imported.
  if (wrappedNames.size > 0) {
    const programBody = ast.program.body;
    const HOC_SOURCE = '@/design-companion/core/LivePreviewLayer';
    const hasImport = programBody.some(
      n =>
        n.type === 'ImportDeclaration' &&
        n.source.value === HOC_SOURCE &&
        n.specifiers.some(
          s =>
            s.type === 'ImportSpecifier' &&
            s.imported.type === 'Identifier' &&
            s.imported.name === 'withDesignOverrides',
        ),
    );
    if (!hasImport) {
      programBody.unshift(
        t.importDeclaration(
          [t.importSpecifier(t.identifier('withDesignOverrides'), t.identifier('withDesignOverrides'))],
          t.stringLiteral(HOC_SOURCE),
        ),
      );
    }
  }

  if (!modified) return { code: null };
  const output = generate(ast, { retainLines: true, jsescOption: { minimal: true } });
  return { code: output.code };
};
