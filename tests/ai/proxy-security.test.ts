import { describe, expect, it } from 'vitest';
import {
  getApiBodyPolicy,
  getApiBodyRejection,
  getUnsafeApiRejection,
  isMutatingApiRequest,
} from '@/lib/security/api-request-policy';

function createRequest(
  pathname: string,
  method: string,
  headers: Record<string, string> = {},
  body: ReadableStream<Uint8Array> | null = null,
) {
  return {
    method,
    nextUrl: new URL(`https://corexscoring.com${pathname}`),
    headers: new Headers(headers),
    body,
  };
}

describe('proxy security boundaries', () => {
  it('identifies only mutating API requests', () => {
    expect(isMutatingApiRequest(createRequest('/api/account/delete', 'POST'))).toBe(true);
    expect(isMutatingApiRequest(createRequest('/api/account/delete', 'GET'))).toBe(false);
    expect(isMutatingApiRequest(createRequest('/catalog', 'POST'))).toBe(false);
  });

  it('rejects cross-origin mutations and accepts same-origin mutations', () => {
    const crossOrigin = createRequest('/api/account/delete', 'POST', { origin: 'https://evil.example' });
    const sameOrigin = createRequest('/api/account/delete', 'POST', {
      origin: 'https://corexscoring.com',
      'sec-fetch-site': 'same-origin',
    });

    expect(getUnsafeApiRejection(crossOrigin)?.status).toBe(403);
    expect(getUnsafeApiRejection(sameOrigin)).toBeNull();
  });

  it('rejects cross-site mutations even when the origin header is absent', () => {
    const request = createRequest('/api/account/delete', 'POST', { 'sec-fetch-site': 'cross-site' });

    expect(getUnsafeApiRejection(request)?.status).toBe(403);
  });

  it('requires and bounds bodies by endpoint', async () => {
    const valid = createRequest('/api/account/delete', 'POST', { 'content-length': '128' });
    const missing = createRequest('/api/account/delete', 'POST');
    const malformed = createRequest('/api/account/delete', 'POST', { 'content-length': 'not-a-number' });
    const oversized = createRequest('/api/account/delete', 'POST', { 'content-length': String(4 * 1024 + 1) });

    expect(getApiBodyPolicy(valid)).toEqual({ mode: 'required', maxBytes: 4 * 1024 });
    await expect(getApiBodyRejection(valid)).resolves.toBeNull();
    await expect(getApiBodyRejection(missing)).resolves.toMatchObject({ status: 411 });
    await expect(getApiBodyRejection(malformed)).resolves.toMatchObject({ status: 411 });
    await expect(getApiBodyRejection(oversized)).resolves.toMatchObject({ status: 413 });
  });

  it('does not require a length for no-body endpoints', async () => {
    const noBody = createRequest('/api/vault/ai-provider/test', 'POST');
    const unexpectedBody = createRequest('/api/vault/ai-provider/test', 'POST', { 'content-length': '1' });
    const streamWithoutLength = createRequest(
      '/api/vault/ai-provider/test',
      'POST',
      {},
      new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } }),
    );
    const streamWithZeroLength = createRequest(
      '/api/vault/ai-provider/test',
      'POST',
      { 'content-length': '0' },
      new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } }),
    );

    await expect(getApiBodyRejection(noBody)).resolves.toBeNull();
    await expect(getApiBodyRejection(unexpectedBody)).resolves.toMatchObject({ status: 400 });
    await expect(getApiBodyRejection(streamWithoutLength)).resolves.toMatchObject({ status: 400 });
    await expect(getApiBodyRejection(streamWithZeroLength)).resolves.toMatchObject({ status: 400 });
  });
});
