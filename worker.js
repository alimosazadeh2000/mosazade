const CHANNEL = "moshaver_mosazadeh";

const decode = (s) => s
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .trim();

async function posts() {
  try {
    const res = await fetch(`https://t.me/s/${CHANNEL}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    const html = await res.text();
    const out = [];
    for (const c of html.split("tgme_widget_message_wrap").slice(1)) {
      const link = (c.match(/href="(https:\/\/t\.me\/[^"]+\/\d+)"/) || [])[1];
      const date = (c.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
      const t = c.match(/js-message_text"[^>]*>([\s\S]*?)<\/div>/);
      const text = t ? decode(t[1]) : "";
      if (link && text) out.push({ link, date, text: text.slice(0, 220) });
    }
    return new Response(JSON.stringify(out.slice(-6).reverse()), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    return new Response("[]", { headers: { "Content-Type": "application/json" } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/posts") return posts();
    return env.ASSETS.fetch(request);
  },
};
