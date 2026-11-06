// Cloudflare Pages Function: /api/posts  -> آخرین پست‌های کانال تلگرام
const CHANNEL = "moshaver_mosazadeh";

const decode = (s) => s
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .trim();

export async function onRequestGet() {
  try {
    const res = await fetch(`https://t.me/s/${CHANNEL}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    const html = await res.text();
    const chunks = html.split('tgme_widget_message_wrap').slice(1);
    const posts = [];
    for (const c of chunks) {
      const link = (c.match(/href="(https:\/\/t\.me\/[^"]+\/\d+)"/) || [])[1];
      const date = (c.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
      const t = c.match(/js-message_text"[^>]*>([\s\S]*?)<\/div>/);
      const text = t ? decode(t[1]) : "";
      if (link && text) posts.push({ link, date, text: text.slice(0, 220) });
    }
    return new Response(JSON.stringify(posts.slice(-6).reverse()), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    return new Response("[]", { headers: { "Content-Type": "application/json" } });
  }
}
