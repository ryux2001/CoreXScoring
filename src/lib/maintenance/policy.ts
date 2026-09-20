const maintenanceAdminPagePatterns = [
  /^\/vault\/admin\/(?:monitoring|ai|catalog|catalog\/home)$/,
  /^\/vault\/admin\/catalog\/(?:builds|combos)(?:\/new|\/[^/]+)?$/,
];

const maintenanceAdminApiRules: Array<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^\/api\/ai\/admin\/usage$/ },
  { method: 'GET', pattern: /^\/api\/ai\/admin\/budget-alerts$/ },
  { method: 'POST', pattern: /^\/api\/ai\/admin\/(?:cleanup|budget-alerts)$/ },
  { method: 'GET', pattern: /^\/api\/vault\/admin\/home\/catalog-items$/ },
  { method: 'PATCH', pattern: /^\/api\/vault\/admin\/home(?:\/order)?$/ },
  { method: 'POST', pattern: /^\/api\/vault\/admin\/home\/sections$/ },
  { method: 'PATCH', pattern: /^\/api\/vault\/admin\/home\/sections\/[^/]+$/ },
  { method: 'DELETE', pattern: /^\/api\/vault\/admin\/home\/sections\/[^/]+$/ },
  { method: 'PUT', pattern: /^\/api\/vault\/admin\/home\/sections\/[^/]+\/items$/ },
  { method: 'POST', pattern: /^\/api\/vault\/admin\/home\/sections\/[^/]+\/comparisons$/ },
  { method: 'PATCH', pattern: /^\/api\/vault\/admin\/home\/comparisons\/[^/]+$/ },
  { method: 'DELETE', pattern: /^\/api\/vault\/admin\/home\/comparisons\/[^/]+$/ },
  { method: 'PUT', pattern: /^\/api\/vault\/admin\/home\/comparisons\/[^/]+\/items$/ },
  { method: 'GET', pattern: /^\/api\/vault\/admin\/catalog\/products$/ },
  { method: 'POST', pattern: /^\/api\/vault\/admin\/catalog\/(?:builds|combos)$/ },
  { method: 'PATCH', pattern: /^\/api\/vault\/admin\/catalog\/(?:builds|combos)\/order$/ },
  { method: 'PATCH', pattern: /^\/api\/vault\/admin\/catalog\/(?:builds|combos)\/[^/]+$/ },
  { method: 'DELETE', pattern: /^\/api\/vault\/admin\/catalog\/(?:builds|combos)\/[^/]+$/ },
];

export function isMaintenanceAdminPage(pathname: string): boolean {
  return maintenanceAdminPagePatterns.some((pattern) => pattern.test(pathname));
}

export function isAllowedMaintenanceAdminApi(method: string, pathname: string): boolean {
  return maintenanceAdminApiRules.some((rule) => rule.method === method && rule.pattern.test(pathname));
}

export function isMaintenanceAdminLoginPath(pathname: string): boolean {
  return pathname === '/maintenance/admin-login';
}

export function isMaintenanceAdminOAuthCallback(pathname: string, next: string | null): boolean {
  return pathname === '/auth/oauth/callback'
    && (next === '/vault/admin/monitoring' || next === '/es/vault/admin/monitoring');
}

export function isAuthorizedMaintenanceAdmin(user: {
  is_anonymous?: boolean;
  app_metadata?: unknown;
} | null): boolean {
  if (!user || user.is_anonymous || !user.app_metadata || typeof user.app_metadata !== 'object') return false;
  return (user.app_metadata as { role?: unknown }).role === 'admin';
}
