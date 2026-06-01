const EVENTS = ["page_view", "run_start", "lane_choice", "correct_sort", "wrong_sort", "hint_used", "run_end", "cta_click"];
const SOURCES = ["direct", "github", "printable-tools-lab", "crazygames", "itch", "community", "short-video", "referral", "unknown"];

export async function onRequestGet({ env }) {
  if (!env.ULP_EVENTS) return json({ ok: false, error: "Metrics store unavailable" }, 503);
  const today = new Date().toISOString().slice(0, 10);
  const count = async (key) => Number(await env.ULP_EVENTS.get(key)) || 0;
  const [totalEntries, todayEntries, sources] = await Promise.all([
    Promise.all(EVENTS.map(async (event) => [event, await count(`total:event:${event}`)])),
    Promise.all(EVENTS.map(async (event) => [event, await count(`day:${today}:event:${event}`)])),
    Promise.all(SOURCES.map(async (source) => {
      const [totalSourceEntries, todaySourceEntries] = await Promise.all([
        Promise.all(EVENTS.map(async (event) => [event, await count(`total:source:${source}:event:${event}`)])),
        Promise.all(EVENTS.map(async (event) => [event, await count(`day:${today}:source:${source}:event:${event}`)])),
      ]);
      return {
        source,
        ...Object.fromEntries(totalSourceEntries),
        today: Object.fromEntries(todaySourceEntries),
      };
    })),
  ]);
  const totals = Object.fromEntries(totalEntries);
  const starts = totals.run_start || 0;
  const ends = totals.run_end || 0;
  return json({
    ok: true,
    today,
    totals,
    todayTotals: Object.fromEntries(todayEntries),
    funnel: {
      startToEndRate: starts ? Number((ends / starts).toFixed(3)) : 0,
      hintPerStart: starts ? Number(((totals.hint_used || 0) / starts).toFixed(3)) : 0,
      wrongSortRate: (totals.correct_sort || totals.wrong_sort) ? Number(((totals.wrong_sort || 0) / ((totals.correct_sort || 0) + (totals.wrong_sort || 0))).toFixed(3)) : 0,
    },
    sources,
  });
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
