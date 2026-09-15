import { describe, expect, it } from 'vitest';
import { readLimitedJson, readOptionalLimitedJson } from '@/lib/api-security';

function requestWithStream(stream: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  return { body: stream, headers: new Headers(headers) } as Request;
}

function streamFrom(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes.byteLength > 0) controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe('API security body limits', () => {
  it('accepts bounded JSON and rejects oversized bodies before parsing', async () => {
    const valid = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '11' },
      body: '{"ok":true}',
    });
    await expect(readLimitedJson(valid, 1024)).resolves.toEqual({ ok: true });

    const oversized = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '140' },
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

  it('requires Content-Length for bounded JSON bodies', async () => {
    const request = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });

    await expect(readLimitedJson(request, 1024)).rejects.toMatchObject({ status: 411 });
  });

  it('detects a body larger than its declared Content-Length while streaming', async () => {
    const body = JSON.stringify({ value: 'x'.repeat(128) });
    const request = new Request('https://corex.test/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '1' },
      body,
    });

    await expect(readLimitedJson(request, 32)).rejects.toMatchObject({ status: 413 });
  });

  it('allows an optional empty body without Content-Length', async () => {
    const request = new Request('https://corex.test/api/example', {
      method: 'POST',
    });

    await expect(readOptionalLimitedJson(request, 1024)).resolves.toBeUndefined();
    await expect(readOptionalLimitedJson(requestWithStream(streamFrom('')), 1024)).resolves.toBeUndefined();
  });

  it('parses valid JSON from an optional stream body', async () => {
    const request = requestWithStream(streamFrom('{"ok":true}'), {
      'content-type': 'application/json',
      'content-length': '11',
    });

    await expect(readOptionalLimitedJson(request, 1024)).resolves.toEqual({ ok: true });
  });

  it('rejects optional stream bodies without JSON content type', async () => {
    const request = requestWithStream(streamFrom('not-json'));

    await expect(readOptionalLimitedJson(request, 1024)).rejects.toMatchObject({ status: 415 });
  });

  it('rejects empty and oversized optional JSON bodies', async () => {
    const emptyJson = requestWithStream(streamFrom(''), { 'content-type': 'application/json' });
    const malformed = requestWithStream(streamFrom('not-json'), { 'content-type': 'application/json' });
    const oversized = requestWithStream(streamFrom('{"value":"12345"}'), { 'content-type': 'application/json' });

    await expect(readOptionalLimitedJson(emptyJson, 1024)).resolves.toBeUndefined();
    await expect(readOptionalLimitedJson(malformed, 1024)).rejects.toMatchObject({ status: 400 });
    await expect(readOptionalLimitedJson(oversized, 8)).rejects.toMatchObject({ status: 413 });
  });
});
