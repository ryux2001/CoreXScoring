import { describe, expect, it } from 'vitest';
import { readLimitedJson } from '@/lib/api-security';

describe('API security body limits', () => {
  it('accepts bounded JSON and rejects oversized bodies before parsing', async () => {
    const valid = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });
    await expect(readLimitedJson(valid, 1024)).resolves.toEqual({ ok: true });

    const oversized = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(128) }),
    });
    await expect(readLimitedJson(oversized, 32)).rejects.toMatchObject({ status: 413 });
  });

  it('rejects non-JSON payloads', async () => {
    const request = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not-json',
    });
    await expect(readLimitedJson(request, 1024)).rejects.toMatchObject({ status: 415 });
  });
});
