export function getAuthConfirmUrl(next: string) {
  const url = new URL('/auth/confirm', window.location.origin);
  url.searchParams.set('next', next);

  return url.toString();
}

export function getPasswordRecoveryConfirmUrl() {
  return new URL('/auth/recovery/confirm', window.location.origin).toString();
}

export function getOAuthCallbackUrl(next = '/catalog') {
  const url = new URL('/auth/oauth/callback', window.location.origin);
  url.searchParams.set('next', next);

  return url.toString();
}
