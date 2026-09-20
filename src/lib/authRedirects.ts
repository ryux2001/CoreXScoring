function getLocalizedNextPath(next: string) {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  return firstSegment === 'es' && next.startsWith('/') && !next.startsWith('/es/')
    ? `/es${next}`
    : next;
}

export function getAuthConfirmUrl(next: string) {
  const url = new URL('/auth/confirm', window.location.origin);
  url.searchParams.set('next', getLocalizedNextPath(next));

  return url.toString();
}

export function getPasswordRecoveryConfirmUrl(next = '/auth/update-password') {
  const url = new URL('/auth/recovery/confirm', window.location.origin);
  url.searchParams.set('next', getLocalizedNextPath(next));
  return url.toString();
}

export function getOAuthCallbackUrl(next = '/catalog') {
  const url = new URL('/auth/oauth/callback', window.location.origin);
  url.searchParams.set('next', getLocalizedNextPath(next));

  return url.toString();
}
