// 只读监控页:HTTP Basic Auth(用户名密码在 Vercel 环境变量 MONITOR_USER / MONITOR_PASS)。
// 数据是扫描器每轮结束时随部署一起推上来的 health.json,不含任何邮箱或商家联系方式。
const data = require("./health.json");

const SRC = { facebook: "Facebook", reddit: "Reddit", nextdoor: "Nextdoor", xhs: "小红书", craigslist: "Craigslist" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, unit = "") => (v === null || v === undefined) ? '<span class="muted">无</span>' : esc(v) + unit;

function page(h) {
  const S = h.sources || {}, P = h.pipeline || {}, D = h.delivery || {}, A = D.accounts || {}, R = D.replies_today || {}, V = D.vendors || {};
  const lvl = (l) => l === "high" ? "var(--danger)" : l === "medium" ? "var(--warn)" : "var(--muted)";
  const alerts = (h.alerts || []).length
    ? h.alerts.map((a) => `<div class="row"><b style="color:${lvl(a.level)}">${esc(a.level)}</b> ${esc(a.msg)}</div>`).join("")
    : '<div class="muted">没有告警,一切正常</div>';
  const rows = Object.keys(SRC).map((k) => { const s = S[k] || {}; const late = (s.discovery_h || 0) > 6;
    return `<tr><td>${SRC[k]}</td><td>${fmt(s.posts)}</td><td>${fmt(s.leads)}</td><td>${fmt(s.last_seen_h, " 小时前")}</td>
      <td style="${late ? "color:var(--danger);font-weight:600" : ""}">${fmt(s.discovery_h, " 小时")}</td><td>${fmt(s.notify_min, " 分钟")}</td>
      <td class="muted">${s.daily_cap !== undefined ? esc(s.daily_used + "/" + s.daily_cap) + (s.cooldown_min ? ` · 限流 ${s.cooldown_min} 分钟` : "") : ""}</td></tr>`; }).join("");
  const upd = h.at ? new Date(h.at).toLocaleString("zh-CN", { timeZone: "America/Los_Angeles" }) : "还没有数据";
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AskedFor 监控</title><meta http-equiv="refresh" content="300">
<style>
:root{--bg:#fff;--fg:#111;--muted:#777;--border:#e5e5e5;--card:#fafafa;--danger:#d33;--warn:#c80}
@media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--muted:#999;--border:#333;--card:#1a1a1a;--danger:#f66;--warn:#fc6}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
h1{font-size:18px;margin:0 0 4px}.muted{color:var(--muted);font-size:13px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:12px 0}
.card b.t{display:block;margin-bottom:6px}.row{padding:6px 0;border-bottom:1px solid var(--border)}.row:last-child{border:0}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 4px;border-bottom:1px solid var(--border);white-space:nowrap}
.wrap{overflow-x:auto}
</style></head><body>
<h1>AskedFor 监控</h1><div class="muted">更新于 ${esc(upd)}(太平洋时间)· 每 5 分钟自动刷新</div>
<div class="card"><b class="t">🚨 告警</b>${alerts}</div>
<div class="card"><b class="t">🤝 客户(回过信或已同意)</b><div class="wrap"><table><thead><tr><th>客户</th><th>今天</th><th>7 天</th><th>累计</th><th>点开</th><th>最近一条</th><th>近 7 天</th></tr></thead><tbody>${(h.customers || []).map((c) => `<tr><td>${esc(c.name)}<br><span class="muted">${esc(c.category)} · ${esc(c.city)}</span></td><td>${esc(c.today)}</td><td>${esc(c.week)}</td><td>${esc(c.total)}</td><td>${esc(c.opened||0)}</td><td style="${(c.last_sent_h||0) > 72 ? "color:var(--danger);font-weight:600" : ""}">${fmt(c.last_sent_h, " 小时前")}</td><td class="muted">${(c.daily||[]).join(" ")}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">还没有</td></tr>'}</tbody></table></div></div>
<div class="card"><b class="t">📡 渠道(过去 24 小时)</b><div class="wrap"><table><thead><tr><th>渠道</th><th>帖子</th><th>线索</th><th>最近抓到</th><th>发现延迟</th><th>推送延迟</th><th>配额与限流</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="muted">发现延迟 = 帖子发出到我们抓到(中位数);推送延迟 = 抓到到发给 Elaine。超过 6 小时标红。</div></div>
<div class="card"><b class="t">⚠️ 今天的警告,按类型</b>${(P.warning_types||[]).length ? (P.warning_types||[]).map((t) => `<div class="row"><b>${esc(t.count)}</b> × ${esc(t.type)}</div>`).join("") : '<div class="muted">今天没有警告</div>'}</div>
<div class="card"><b class="t">⚙️ 流水线</b><div>待分类积压 <b>${fmt(P.backlog)}</b> · 今天警告 <b>${fmt(P.warnings_today)}</b> · 0 帖的群 <b>${fmt(P.zero_groups_today)}</b> 次</div><div class="muted">上一轮结束 ${fmt(P.last_cycle)} · 调度器 ${h.scheduler && h.scheduler.scheduler_on ? "开" : "关"} · 下一轮 ${fmt(h.scheduler && h.scheduler.next_run_at)}</div></div>
<div class="card"><b class="t">📬 投递(今天)</b><div>Elaine 线索:今天 <b>${fmt(D.elaine_leads_today)}</b> · 7 天 <b>${fmt(D.elaine_leads_7d)}</b></div>
<div>商家邮件:${Object.keys(A).map((k) => `${esc({gmail:"旧 Gmail", nw:"新域名邮箱"}[k]||k)} <b>${A[k].sent_today}</b>/${A[k].cap}`).join(" · ") || '<span class="muted">无</span>'}</div>
<div>回信:${Object.keys(R).length ? Object.keys(R).map((k) => `${esc(k)} ${R[k]}`).join(" · ") : '<span class="muted">无</span>'} · 退信/拒收 <b>${fmt(D.bounces_today)}</b> · 发送失败 <b>${fmt(D.failed_sends_today)}</b></div>
<div class="muted">商家 ${fmt(V.total)} 家:已同意 ${fmt(V.active)} · 回过信 ${fmt(V.engaged)} · 拒绝 ${fmt(V.declined)} · 暂停 ${fmt(V.paused)}</div></div>
</body></html>`;
}

module.exports = (req, res) => {
  const user = process.env.MONITOR_USER || "", pass = process.env.MONITOR_PASS || "";
  const hdr = req.headers.authorization || "";
  let ok = false;
  if (user && pass && hdr.startsWith("Basic ")) {
    const [u, p] = Buffer.from(hdr.slice(6), "base64").toString("utf8").split(":");
    ok = u === user && p === pass;
  }
  if (!ok) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="AskedFor monitor", charset="UTF-8"');
    res.setHeader("Cache-Control", "no-store");
    return res.end("需要登录");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(page(data));
};
