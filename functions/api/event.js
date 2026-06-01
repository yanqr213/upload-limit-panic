const ALLOWED_EVENTS = new Set([
  "page_view",
  "run_start",
  "lane_choice",
  "correct_sort",
  "wrong_sort",
  "hint_used",
  "run_end",
  "cta_click",
]);

const ALLOWED_SOURCES = new Set([
  "direct",
  "github",
  "printable-tools-lab",
  "crazygames",
  "itch",
  "community",
  "short-video",
  "referral",
  "unknown",
]);

export async function onRequestPost({ request, env }) {
  if (!env.ULP_EVENTS) return json({ ok: false, error: "Event store unavailable" }, 503);
  try {
    const body = await request.json();
    const name = cleanKey(body.name, 40);
    if (!ALLOWED_EVENTS.has(name)) return json({ ok: false, error: "Unsupported event" }, 400);
    const source = cleanSource(body.source || "direct");
    const path = cleanPath(body.path || "/");
    const day = new Date().toISOString().slice(0, 10);
    const keys = [
      `day:${day}:event:${name}`,
      `day:${day}:source:${source}:event:${name}`,
      `total:event:${name}`,
      `total:source:${source}:event:${name}`,
    ];
    if (name === "page_view") keys.push(`day:${day}:path:${path}:views`);
    await Promise.all(keys.map((key) => increment(env.ULP_EVENTS, key)));
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "Event rejected" }, 400);
  }
}

export function onRequestGet() {
  return json({ ok: true, service: "Upload Limit Panic event collector" });
}

async function increment(store, key) {
  const current = Number(await store.get(key)) || 0;
  await store.put(key, String(current + 1), { expirationTtl: key.startsWith("day:") ? 60 * 60 * 24 * 120 : undefined });
}

function cleanKey(value, maxLength) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

function cleanSource(value) {
  const source = cleanKey(value || "direct", 48);
  if (!source) return "direct";
  return ALLOWED_SOURCES.has(source) ? source : "referral";
}

function cleanPath(value) {
  const pathname = String(value || "/").split("?")[0].replace(/[^a-zA-Z0-9/_-]/g, "");
  return pathname.startsWith("/") ? pathname.slice(0, 120) : `/${pathname.slice(0, 119)}`;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
