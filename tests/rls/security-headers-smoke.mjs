if (process.env.RUN_SECURITY_HEADERS_SMOKE !== "1") {
  throw new Error("Define RUN_SECURITY_HEADERS_SMOKE=1 para ejecutar el smoke de cabeceras.");
}

const appUrl = process.env.SECURITY_HEADERS_SMOKE_URL || "http://localhost:3000";
const response = await fetch(`${appUrl}/catalog`);
const expected = {
  "content-security-policy": response.headers.get("content-security-policy"),
  "content-security-policy-report-only": response.headers.get("content-security-policy-report-only"),
  "x-content-type-options": response.headers.get("x-content-type-options"),
  "referrer-policy": response.headers.get("referrer-policy"),
  "permissions-policy": response.headers.get("permissions-policy"),
  "x-frame-options": response.headers.get("x-frame-options"),
};
const checks = [
  ["csp-enforced", expected["content-security-policy"]?.includes("script-src 'self' 'nonce-")],
  ["csp-no-inline-scripts", !expected["content-security-policy"]?.includes("script-src 'self' 'unsafe-inline'")],
  ["csp-report-only", expected["content-security-policy-report-only"]?.includes("default-src 'self'")],
  ["nosniff", expected["x-content-type-options"] === "nosniff"],
  ["referrer-policy", expected["referrer-policy"] === "strict-origin-when-cross-origin"],
  ["permissions-policy", Boolean(expected["permissions-policy"])],
  ["frame-options", expected["x-frame-options"] === "DENY"],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ passed: failed.length === 0, failed, headers: expected }));
if (failed.length > 0) process.exit(1);
