/**
 * sim-report-html.mjs — run the synthetic-scale simulation and render a self-contained HTML report.
 *   node --experimental-strip-types engine/scripts/sim-report-html.mjs [N] [seed] [outPath]
 * Writes a single static HTML file (no external deps) visualizing the SimReport, and prints its path.
 */
import { writeFileSync } from "node:fs";
import { runSimulation } from "../sim/synthetic.ts";

const N = Number(process.argv[2]) || 500;
const SEED = Number(process.argv[3]) || 42;
const OUT = process.argv[4] || "/tmp/slabclaw-sim-report.html";

const r = await runSimulation({ n: N, seed: SEED });
// determinism re-run
const r2 = await runSimulation({ n: N, seed: SEED });
const deterministic = JSON.stringify(r.dispositions) === JSON.stringify(r2.dispositions) && r.portfolio.navUsd === r2.portfolio.navUsd;

const DISP_META = {
  acquired: { label: "Acquired (in-cap buy)", color: "#34d399" },
  relisted: { label: "Re-routed → relisted", color: "#38bdf8" },
  "blocked-over-cap": { label: "Blocked · over cap", color: "#f87171" },
  "blocked-no-cap": { label: "Blocked · no cap (fail-closed)", color: "#fb7185" },
  "blocked-window-budget": { label: "Blocked · window budget", color: "#fbbf24" },
  "skipped-nemotron": { label: "Skipped · non-positive edge", color: "#94a3b8" },
  "skipped-suspect-oracle": { label: "Skipped · suspect oracle", color: "#a78bfa" },
  "skipped-grade-mismatch": { label: "Skipped · grade mismatch", color: "#c084fc" },
  "reroute-pending": { label: "Re-route in flight", color: "#60a5fa" },
  error: { label: "Errored", color: "#ef4444" },
};
const totalDisp = Object.values(r.dispositions).reduce((a, b) => a + b, 0);
const dispRows = Object.entries(r.dispositions)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => {
    const m = DISP_META[k] || { label: k, color: "#64748b" };
    const pct = ((v / totalDisp) * 100).toFixed(1);
    return `<div class="bar-row"><div class="bar-label">${m.label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${m.color}"></div></div><div class="bar-val">${v}<span class="pct">${pct}%</span></div></div>`;
  })
  .join("");

const invRows = r.invariants
  .map((x) => `<li class="${x.ok ? "ok" : "bad"}"><span class="mark">${x.ok ? "✓" : "✗"}</span><span class="iname">${x.name}</span><span class="idetail">${x.detail}</span></li>`)
  .join("");

const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SlabClaw — Synthetic Simulation</title>
<style>
:root{--bg:#0a0b0e;--panel:#14161b;--panel2:#1b1e25;--line:#262a33;--ink:#e8eaed;--dim:#8b919c;--yellow:#ffd400;--green:#34d399;--red:#f87171}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#16181f,#0a0b0e);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1040px;margin:0 auto;padding:48px 28px 80px}
.mono{font-family:"SF Mono",ui-monospace,Menlo,monospace}
.eyebrow{letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:var(--yellow);font-weight:700}
h1{font-size:30px;margin:8px 0 6px;letter-spacing:-.02em}
.sub{color:var(--dim);margin:0 0 28px}
.banner{display:flex;align-items:center;gap:18px;background:linear-gradient(90deg,rgba(52,211,153,.12),transparent);border:1px solid rgba(52,211,153,.35);border-radius:16px;padding:20px 24px;margin-bottom:28px}
.banner.fail{background:linear-gradient(90deg,rgba(248,113,113,.12),transparent);border-color:rgba(248,113,113,.4)}
.banner .big{font-size:26px;font-weight:800;color:var(--green)}
.banner.fail .big{color:var(--red)}
.banner .meta{color:var(--dim);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.kpi .v{font-size:23px;font-weight:700;letter-spacing:-.01em}
.kpi .l{color:var(--dim);font-size:12px;margin-top:3px}
.kpi .v.y{color:var(--yellow)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 24px;margin-bottom:20px}
.panel h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 18px;font-weight:700}
.bar-row{display:grid;grid-template-columns:210px 1fr 84px;align-items:center;gap:14px;margin:9px 0}
.bar-label{color:var(--ink);font-size:13px}
.bar-track{background:#0e1014;border-radius:7px;height:18px;overflow:hidden;border:1px solid var(--line)}
.bar-fill{height:100%;border-radius:7px 0 0 7px;transition:width .6s}
.bar-val{text-align:right;font-weight:700}.bar-val .pct{color:var(--dim);font-weight:400;font-size:11px;margin-left:7px}
ul.inv{list-style:none;margin:0;padding:0}
ul.inv li{display:grid;grid-template-columns:24px 200px 1fr;gap:10px;align-items:baseline;padding:9px 0;border-top:1px solid var(--line);font-size:13px}
ul.inv li:first-child{border-top:0}
ul.inv .mark{font-weight:800}ul.inv li.ok .mark{color:var(--green)}ul.inv li.bad .mark{color:var(--red)}
ul.inv .iname{font-weight:600}ul.inv .idetail{color:var(--dim)}
.pnl{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.pnl .cell{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:16px}
.pnl .cell .v{font-size:21px;font-weight:700}.pnl .cell .l{color:var(--dim);font-size:12px;margin-top:3px}
.foot{color:var(--dim);font-size:12px;margin-top:26px;text-align:center}
.tag{display:inline-block;background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:11px;color:var(--dim);margin-left:8px}
.flow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:14px}
.flow .node{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.flow .arrow{color:var(--yellow)}
.flow .n{font-weight:700;font-size:18px}
</style></head><body><div class="wrap">
<div class="eyebrow">SlabClaw Acquisition Desk · pre-mainnet gate (D8)</div>
<h1>Synthetic-scale simulation <span class="tag mono">MockUSDC · zero-network</span></h1>
<p class="sub">The real Deals×Routes orchestrator run over <b>${r.n}</b> synthetic cards · seed ${r.seed} · ${r.ms}ms${deterministic ? " · deterministic ✓" : ""}</p>

<div class="banner ${r.ok ? "" : "fail"}">
  <div class="big">${r.ok ? "PASS" : "FAIL"}</div>
  <div class="meta">${r.invariants.filter((x) => x.ok).length}/${r.invariants.length} invariants hold at scale · cap firebreak intact · realized vs unrealized distinct · every re-route resumed</div>
</div>

<div class="grid">
  <div class="kpi"><div class="v">${r.n}</div><div class="l">cards simulated</div></div>
  <div class="kpi"><div class="v y">${r.dispositions["acquired"] ?? 0}</div><div class="l">acquired (in-cap)</div></div>
  <div class="kpi"><div class="v" style="color:#f87171">${(r.dispositions["blocked-over-cap"] ?? 0) + (r.dispositions["blocked-no-cap"] ?? 0) + (r.dispositions["blocked-window-budget"] ?? 0)}</div><div class="l">blocked by firebreak</div></div>
  <div class="kpi"><div class="v" style="color:#38bdf8">${r.reroutesResumed}</div><div class="l">re-routes resumed</div></div>
</div>

<div class="panel"><h2>Disposition breakdown — every candidate reaches a terminal state</h2>${dispRows}</div>

<div class="panel"><h2>Re-route lifecycle (buy physical → ship to vault → tokenize → exit)</h2>
  <div class="flow">
    <div class="node">physical buy <span class="n">${r.reroutesOpened}</span></div>
    <div class="arrow">→</div>
    <div class="node">leg persisted + staged</div>
    <div class="arrow">→</div>
    <div class="node">arrival recorded</div>
    <div class="arrow">→</div>
    <div class="node">resumed → relisted <span class="n">${r.reroutesResumed}</span></div>
  </div>
</div>

<div class="panel"><h2>Portfolio P&L (realized and unrealized kept DISTINCT — P7)</h2>
  <div class="pnl">
    <div class="cell"><div class="v" style="color:#34d399">${money(r.portfolio.realizedUsd)}</div><div class="l">realized (booked sales)</div></div>
    <div class="cell"><div class="v" style="color:#38bdf8">${money(r.portfolio.unrealizedUsd)}</div><div class="l">unrealized (held, marked-to-oracle)</div></div>
    <div class="cell"><div class="v y">${money(r.portfolio.navUsd)}</div><div class="l">NAV (cash ${money(r.portfolio.cashUsd)} + book)</div></div>
  </div>
</div>

<div class="panel"><h2>Invariants validated at scale</h2><ul class="inv">${invRows}</ul></div>

<div class="foot">policy: per-card cap ${money(r.policy.perCardCapUsd)} · window cap ${money(r.policy.windowCapUsd)} · settlement labeled <span class="mono">mockusdc:synth:…</span> — explicitly synthetic, never a real chain tx. This is the gate that must stay green before any real-money run.</div>
</div></body></html>`;

writeFileSync(OUT, html);
console.log(`PASS=${r.ok} N=${r.n} → ${OUT}`);
