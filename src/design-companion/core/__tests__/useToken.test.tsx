import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TokenProvider, useToken } from '../useToken';

const Probe = () => <span data-testid="t">{useToken() ?? '(null)'}</span>;

describe('TokenProvider', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it('fetches token at mount and exposes it via context', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ token: 'abc123' }),
    }));
    render(<TokenProvider><Probe /></TokenProvider>);
    await waitFor(() => expect(screen.getByTestId('t').textContent).toBe('abc123'));
  });
  it('exposes null while fetch is in flight or fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('econn')));
    render(<TokenProvider><Probe /></TokenProvider>);
    expect(screen.getByTestId('t').textContent).toBe('(null)');
  });
});
