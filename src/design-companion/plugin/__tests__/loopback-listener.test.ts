import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import { startLoopbackListener, type LoopbackHandlerSet } from '../loopback-listener';

let server: http.Server | undefined;
const noop = (req: http.IncomingMessage, res: http.ServerResponse) => { res.statusCode = 200; res.end(); };

const handlers: LoopbackHandlerSet = {
  handleDesignRoute: noop,
  handleTokenRoute: noop,
  handleSaveRoute: async (_req, res) => { res.statusCode = 200; res.end(); },
};

beforeEach(() => {
  server = startLoopbackListener(0, handlers);
  return new Promise<void>((resolve) => server!.once('listening', resolve));
});
afterEach(() => {
  return new Promise<void>((resolve) => {
    if (server) server.close(() => { server = undefined; resolve(); });
    else resolve();
  });
});

const port = () => (server!.address() as { port: number }).port;

describe('startLoopbackListener', () => {
  it('binds to 127.0.0.1 only (not 0.0.0.0)', () => {
    const addr = server!.address() as { address: string };
    expect(addr.address).toBe('127.0.0.1');
  });
  it('routes /__design to handleDesignRoute', async () => {
    const r = await fetch(`http://127.0.0.1:${port()}/__design`);
    expect(r.status).toBe(200);
  });
  it('routes /__design/token to handleTokenRoute', async () => {
    const r = await fetch(`http://127.0.0.1:${port()}/__design/token`);
    expect(r.status).toBe(200);
  });
  it('routes POST /__design/save to handleSaveRoute', async () => {
    const r = await fetch(`http://127.0.0.1:${port()}/__design/save`, { method: 'POST', body: '{}' });
    expect(r.status).toBe(200);
  });
  it('returns 404 for unknown paths', async () => {
    const r = await fetch(`http://127.0.0.1:${port()}/something-else`);
    expect(r.status).toBe(404);
  });
});
