type ApiRequest = {
  method: string;
  nextUrl: URL;
  headers: Headers;
  body?: ReadableStream<Uint8Array> | null;
};

export type ApiRejection = {
  status: 400 | 403 | 411 | 413;
  message: string;
};

export type ApiBodyPolicy = {
  mode: 'required' | 'optional' | 'none';
  maxBytes: number;
};

export const API_BODY_LIMITS = {
  accountDelete: 4 * 1024,
  auth: 4 * 1024,
  small: 1 * 1024,
  aiProvider: 2 * 1024,
  adminContent: 4 * 1024,
  adminLists: 64 * 1024,
  aiChat: 64 * 1024,
} as const;

export function isMutatingApiRequest(request: ApiRequest) {
  return request.nextUrl.pathname.startsWith('/api/')
    && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

export function getUnsafeApiRejection(request: ApiRequest): ApiRejection | null {
  const origin = request.headers.get('origin');
  if (origin !== request.nextUrl.origin) {
    return { status: 403, message: 'Origen no permitido.' };
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return { status: 403, message: 'Solicitud cross-site no permitida.' };
  }

  return null;
}

export function getApiBodyPolicy(request: ApiRequest): ApiBodyPolicy | null {
  const { method, nextUrl } = request;
  const { pathname } = nextUrl;

  if (method === 'POST' && pathname === '/api/account/delete') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.accountDelete };
  }
  if (method === 'POST' && pathname === '/api/account/delete/google-intent') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && pathname === '/api/auth/update-password') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.auth };
  }
  if (method === 'PATCH' && pathname === '/api/vault/ai-provider') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.aiProvider };
  }
  if (method === 'DELETE' && pathname === '/api/vault/ai-provider') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && pathname === '/api/vault/ai-provider/test') {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'POST' && pathname === '/api/ai/action/cancel') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && pathname === '/api/ai/provider-consent') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && pathname === '/api/ai/chat') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.aiChat };
  }
  if (method === 'PATCH' && /^\/api\/ai\/conversations\/[^/]+$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'DELETE' && /^\/api\/ai\/conversations\/[^/]+$/.test(pathname)) {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'POST' && pathname === '/api/ai/admin/cleanup') {
    return { mode: 'optional', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && pathname === '/api/ai/admin/budget-alerts') {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'PATCH' && pathname === '/api/vault/admin/home') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminContent };
  }
  if (method === 'PATCH' && pathname === '/api/vault/admin/home/order') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminLists };
  }
  if (method === 'POST' && pathname === '/api/vault/admin/home/sections') {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminContent };
  }
  if (method === 'PATCH' && /^\/api\/vault\/admin\/home\/sections\/[^/]+$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminContent };
  }
  if (method === 'DELETE' && /^\/api\/vault\/admin\/home\/sections\/[^/]+$/.test(pathname)) {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'PUT' && /^\/api\/vault\/admin\/home\/sections\/[^/]+\/items$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminLists };
  }
  if (method === 'POST' && /^\/api\/vault\/admin\/home\/sections\/[^/]+\/comparisons$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminContent };
  }
  if (method === 'PATCH' && /^\/api\/vault\/admin\/home\/comparisons\/[^/]+$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminContent };
  }
  if (method === 'DELETE' && /^\/api\/vault\/admin\/home\/comparisons\/[^/]+$/.test(pathname)) {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'PUT' && /^\/api\/vault\/admin\/home\/comparisons\/[^/]+\/items$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.small };
  }
  if (method === 'POST' && /^\/api\/vault\/admin\/catalog\/[^/]+$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminLists };
  }
  if (method === 'PATCH' && /^\/api\/vault\/admin\/catalog\/[^/]+\/[^/]+$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminLists };
  }
  if (method === 'DELETE' && /^\/api\/vault\/admin\/catalog\/[^/]+\/[^/]+$/.test(pathname)) {
    return { mode: 'none', maxBytes: 0 };
  }
  if (method === 'PATCH' && /^\/api\/vault\/admin\/catalog\/[^/]+\/order$/.test(pathname)) {
    return { mode: 'required', maxBytes: API_BODY_LIMITS.adminLists };
  }

  return null;
}

export async function getApiBodyRejection(request: ApiRequest): Promise<ApiRejection | null> {
  const policy = getApiBodyPolicy(request);
  if (!policy) return null;

  const contentLengthHeader = request.headers.get('content-length');

  if (policy.mode === 'none') {
    let contentLength: number | null = null;
    if (contentLengthHeader !== null) {
      if (!/^\d+$/.test(contentLengthHeader)) {
        return { status: 400, message: 'Content-Length inválido.' };
      }
      contentLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(contentLength)) {
        return { status: 400, message: 'Content-Length inválido.' };
      }
    }
    if (contentLength !== null && contentLength > 0 && !request.body) {
      return { status: 400, message: 'Este endpoint no admite body.' };
    }
    if (!request.body) return null;

    const reader = request.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return null;
        if (value.byteLength > 0) {
          await reader.cancel();
          return { status: 400, message: 'Este endpoint no admite body.' };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  if (contentLengthHeader === null) {
    if (policy.mode === 'required') {
      return { status: 411, message: 'Content-Length requerido.' };
    }
    return null;
  }

  if (!/^\d+$/.test(contentLengthHeader)) {
    return { status: 411, message: 'Content-Length inválido.' };
  }

  const contentLength = Number(contentLengthHeader);
  if (!Number.isSafeInteger(contentLength)) {
    return { status: 411, message: 'Content-Length inválido.' };
  }
  if (contentLength > policy.maxBytes) {
    return { status: 413, message: 'Solicitud demasiado grande.' };
  }

  return null;
}
