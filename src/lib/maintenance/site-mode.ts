export type SiteMode = "normal" | "maintenance" | "emergency";

export function getSiteMode(value = process.env.SITE_MODE): SiteMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === "maintenance" || normalized === "emergency" ? normalized : "normal";
}

export function areMaintenanceAdminsAllowed(value = process.env.MAINTENANCE_ALLOW_ADMINS): boolean {
  return value?.trim().toLowerCase() === "true";
}
