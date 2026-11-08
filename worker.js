import POSTS from "./posts.json";

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

// سه پست در روز: ۸:۳۰، ۱۴:۰۰ و ۲۱:۰۰ به وقت تهران
const SLOTS = { "0 5 * * *": 0, "30 10 * * *": 1, "30 17 * * *": 2 };
const SITE = "https://alimosazade.ir";

function pick(slot, i) {
  if (i !== null && i !== "" && !isNaN(Number(i))) return POSTS[Number(i) % POSTS.length];
  const day = Math.floor(Date.now() / 86400000);
  return POSTS[(day * 3 + slot) % POSTS.length];
}

async function send(env, post) {
  const kb = [[{ text: "📩 مشاوره در تلگرام", url: "https://t.me/moshaver_tahsiil" }]];
  if (post.link) kb.unshift([{ text: post.button || "📖 ادامه در سایت", url: post.link }]);
  const base = { chat_id: env.CHANNEL_ID, parse_mode: "HTML", reply_markup: { inline_keyboard: kb } };
  const usePhoto = post.img && post.text.length <= 1000;
  const method = usePhoto ? "sendPhoto" : "sendMessage";
  const body = usePhoto ? { ...base, photo: SITE + post.img, caption: post.text } : { ...base, text: post.text };
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/posts") return posts();
    if (url.pathname === "/api/test-post") {
      if (!env.ADMIN_KEY || url.searchParams.get("key") !== env.ADMIN_KEY) return new Response("forbidden", { status: 403 });
      const slot = Number(url.searchParams.get("slot") || 0);
      const post = pick(slot, url.searchParams.get("i"));
      let res = await send(env, post);
      if (!res.ok && post.img) res = await send(env, { ...post, img: null });
      return Response.json(res);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const h = new Date(event.scheduledTime).getUTCHours();
      const slot = h < 8 ? 0 : h < 14 ? 1 : 2;
      const post = pick(slot, null);
      let res = await send(env, post);
      if (!res.ok && post.img) res = await send(env, { ...post, img: null });
      console.log("cron", event.cron, "slot", slot, JSON.stringify(res).slice(0, 300));
    })());
  },
};
