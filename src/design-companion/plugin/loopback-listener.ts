// __DESIGN_COMPANION_DEV_ONLY__
import * as http from 'node:http';

export interface LoopbackHandlerSet {
  handleDesignRoute(req: http.IncomingMessage, res: http.ServerResponse): void;
  handleTokenRoute(req: http.IncomingMessage, res: http.ServerResponse): void;
  handleSaveRoute(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://[::1]:8080',
]);

const setCorsHeaders = (req: http.IncomingMessage, res: http.ServerResponse): void => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Design-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
};

export const startLoopbackListener = (
  port: number,
  handlers: LoopbackHandlerSet,
): http.Server => {
  const server = http.createServer((req, res) => {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const url = req.url ?? '/';
    if (url === '/__design' || url === '/__design/' || url.startsWith('/__design/?')) {
      handlers.handleDesignRoute(req, res); return;
    }
    if (url === '/__design/token' || url.startsWith('/__design/token?')) {
      handlers.handleTokenRoute(req, res); return;
    }
    if (url === '/__design/save' && req.method === 'POST') {
      void handlers.handleSaveRoute(req, res); return;
    }
    res.statusCode = 404;
    res.end();
  });
  server.listen(port, '127.0.0.1');
  return server;
};
