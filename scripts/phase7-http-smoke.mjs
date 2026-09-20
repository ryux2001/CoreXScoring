import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function get(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
  });
  return {
    response,
    body: await response.text(),
  };
}

function metadata(body) {
  const lang = body.match(/<html[^>]*\slang="([^"]+)"/)?.[1] || "";
  const canonical = body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] || "";
  const robots = body.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/)?.[1] || "";
  return { lang, canonical, robots };
}

async function assertLocalizedPage(path, locale, canonicalPath) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, `${path} should respond with 200`);
  const page = metadata(body);
  assert.equal(page.lang, locale, `${path} should set html lang=${locale}`);
  assert.equal(page.canonical, `https://corexscoring.com${canonicalPath}`, `${path} should have the canonical URL`);
  assert.match(body, /hrefLang="en"/i, `${path} should expose the English alternate`);
  assert.match(body, /hrefLang="es"/i, `${path} should expose the Spanish alternate`);
}

await assertLocalizedPage("/catalog", "en", "/catalog");
await assertLocalizedPage("/es/catalog", "es", "/es/catalog");

const englishPrefix = await get("/en/catalog");
assert.equal(englishPrefix.response.status, 308, "/en/catalog should permanently redirect");
assert.equal(englishPrefix.response.headers.get("location"), "/catalog");

for (const path of ["/comparator", "/comparator/example-a/example-b", "/es/comparator/example-a/example-b"]) {
  const { response, body } = await get(path);
  assert.equal(response.status, 200, `${path} should respond with 200`);
  const page = metadata(body);
  assert.match(page.robots, /noindex, nofollow/, `${path} should be noindex/nofollow`);
  assert.equal(page.canonical, "", `${path} should not inherit a canonical URL`);
}

const vault = await get("/vault");
assert.equal(vault.response.status, 307, "/vault should redirect anonymous visitors");
assert.equal(vault.response.headers.get("location"), "/auth");

const auth = await get("/auth");
assert.equal(auth.response.status, 200, "/auth should respond with 200");
assert.match(metadata(auth.body).robots, /noindex, nofollow/);

const robots = await get("/robots.txt");
assert.equal(robots.response.status, 200);
assert.match(robots.body, /Allow: \/\s*\n/);
assert.doesNotMatch(robots.body, /Disallow:.*(?:comparator|auth|vault)/i);

const sitemap = await get("/sitemap.xml");
assert.equal(sitemap.response.status, 200);
assert.match(sitemap.body, /https:\/\/corexscoring\.com\/catalog/);
assert.match(sitemap.body, /https:\/\/corexscoring\.com\/es\/catalog/);
assert.doesNotMatch(sitemap.body, /comparator/i);
assert.doesNotMatch(sitemap.body, /https:\/\/corexscoring\.com\/en\//);
assert.doesNotMatch(sitemap.body, /\/auth|\/vault/i);

console.log(`Phase 7 HTTP smoke passed against ${baseUrl}`);
