// 本地扫描器来取点击记录(Authorization: Bearer TRACK_SECRET)。GET 列出,POST {del:[路径]} 删掉已经记下的。
const crypto = require("crypto");

function authed(req) {
  const secret = process.env.TRACK_SECRET || "";
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return secret && got.length === secret.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!authed(req)) { res.statusCode = 401; return res.end('{"error":"unauthorized"}'); }
  const { list, del } = require("@vercel/blob");
  if (req.method === "POST") {
    const keys = ((req.body && req.body.del) || []).filter((k) => /^clicks\/\d+_\d+_[0-9a-f]+\.txt$/.test(k)).slice(0, 500);
    if (keys.length) {
      const all = await list({ prefix: "clicks/", limit: 1000 });
      const urls = all.blobs.filter((b) => keys.includes(b.pathname)).map((b) => b.url);
      if (urls.length) await del(urls);
    }
    return res.end(JSON.stringify({ deleted: keys.length }));
  }
  const out = await list({ prefix: "clicks/", limit: 1000 });
  const clicks = out.blobs.map((b) => { const m = /^clicks\/(\d+)_(\d+)_/.exec(b.pathname); return m ? { key: b.pathname, id: Number(m[1]), ts: Number(m[2]) } : null; }).filter(Boolean);
  res.end(JSON.stringify({ clicks }));
};
