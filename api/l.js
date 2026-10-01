// 线索链接的跳转页:https://askedforleads.com/l/<outreach_id>.<sig>?u=<帖子网址>
// GET 只返回一个中间页,由浏览器脚本记一次点击再跳走。邮箱的安全扫描只会 GET、不执行脚本,所以不会被算成点击。
// 签名(HMAC,密钥在环境变量 TRACK_SECRET)盖住 id 和网址:别人改不了目标,这个页面也当不了开放跳转。
const crypto = require("crypto");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function verify(t, u) {
  const secret = process.env.TRACK_SECRET || "";
  const m = /^(\d{1,12})\.([0-9a-f]{16})$/.exec(String(t || ""));
  if (!secret || !m || !/^https?:\/\//i.test(String(u || ""))) return null;
  const want = crypto.createHmac("sha256", secret).update(`${m[1]}|${u}`).digest("hex").slice(0, 16);
  const ok = want.length === m[2].length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(m[2]));
  return ok ? m[1] : null;
}

module.exports = async (req, res) => {
  const t = req.query.t, u = req.query.u;
  const id = verify(t, u);
  if (!id) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("This link is not valid."); }

  if (req.method === "POST") {
    try {
      const { put } = require("@vercel/blob");
      const key = `clicks/${id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.txt`;
      await put(key, String(req.headers["user-agent"] || "").slice(0, 200), { access: "public", addRandomSuffix: false, contentType: "text/plain" });
    } catch (e) { console.error("click log failed", e && e.message); }
    res.statusCode = 204; return res.end();
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const self = `/api/l?t=${encodeURIComponent(t)}&u=${encodeURIComponent(u)}`;
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Opening the post</title><meta name="robots" content="noindex">
<style>body{font:16px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#222;background:#f4f7f5;margin:0;padding:48px 16px;text-align:center}a{color:#0b6b4f}</style></head>
<body><p>Opening the post…</p><p><a id="go" href="${esc(u)}" rel="noreferrer">Continue to the post</a></p>
<script>(function(){var u=${JSON.stringify(String(u))};var done=false;function go(){if(done)return;done=true;location.replace(u);}
try{fetch(${JSON.stringify(self)},{method:"POST",keepalive:true}).then(go,go);}catch(e){go();}setTimeout(go,1500);})();</script>
</body></html>`);
};
