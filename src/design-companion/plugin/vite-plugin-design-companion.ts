// __DESIGN_COMPANION_DEV_ONLY__
import * as http from 'node:http';
import * as path from 'node:path';
import type { Plugin } from 'vite';
import { injectDesignIdInSource } from './inject-design-id';
import { startLoopbackListener, type LoopbackHandlerSet } from './loopback-listener';
import { handleSaveRequest } from './save-endpoint';
import { TokenStore } from './security/session-token';
import { ensureRegistryFiles } from '../translator/registryDiscovery';

const isJsxFile = (id: string) => /\.(j|t)sx?$/.test(id) && !id.includes('node_modules');

const DESIGN_LISTENER_PORT = 8081;

export const designCompanionTokenStore = new TokenStore();

export const designCompanion = (): Plugin => {
  let listener: http.Server | undefined;

  return {
    name: 'design-companion',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      if (!isJsxFile(id)) return null;
      const r = injectDesignIdInSource(code, { filename: id });
      return r.code ? { code: r.code, map: null } : null;
    },
    async configureServer(server) {
      const repoRoot = server.config.root;
      const designIntentsRoot = path.resolve(repoRoot, 'design-intents');
      const allowedFiles = await ensureRegistryFiles(repoRoot);

      const handlers: LoopbackHandlerSet = {
        handleDesignRoute(_req, res) {
          // [C10] The route itself is rendered by App.tsx in the host React tree.
          // The listener responds 200 OK as a "listener is alive" probe. The user actually
          // navigates to http://localhost:8080/__design (Vite SPA) which renders the editor
          // in-app; the listener at 8081 is the SAVE/TOKEN backplane only.
          res.setHeader('Content-Type', 'text/plain');
          res.statusCode = 200;
          res.end('design-companion listener alive');
        },
        handleTokenRoute(req, res) {
          const remote = req.socket.remoteAddress ?? '';
          const token = designCompanionTokenStore.issue(remote);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ token }));
        },
        async handleSaveRoute(req, res) {
          let body = '';
          req.on('data', c => { body += c; });
          await new Promise<void>((resolve, reject) => {
            req.on('end', resolve); req.on('error', reject);
          });
          try {
            const parsed = JSON.parse(body);
            const result = await handleSaveRequest({
              headers: Object.fromEntries(
                Object.entries(req.headers).map(([k, v]) =>
                  [k.toLowerCase(), Array.isArray(v) ? v[0] : v]),
              ),
              body: parsed,
              remoteAddress: req.socket.remoteAddress ?? '',
              designIntentsRoot,
              tokenStore: designCompanionTokenStore,
              allowedFiles,
            });
            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.body));
          } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'SCHEMA', detail: 'invalid JSON' }));
          }
        },
      };
      listener = startLoopbackListener(DESIGN_LISTENER_PORT, handlers);
    },
    closeBundle() {
      listener?.close();
      listener = undefined;
    },
  };
};
