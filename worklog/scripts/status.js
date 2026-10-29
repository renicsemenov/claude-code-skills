#!/usr/bin/env node
/* status — a cheap, read-only "where am I right now" one-liner. NO skill spin-up.
 * Prints three things:
 *   1. in-flight ledger lines   (the `- [ … ]` task lines in active.md)
 *   2. today's plan focus       (plan-<today>.md, if present)
 *   3. cross-project roll-up    (every registered project's plan/tracks.json, grouped by status)
 * Read-only; touches nothing.
 *   node status.js [--today YYYY-MM-DD]   (today defaults to new Date()) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CONFIG = process.env.WORKLOG_CONFIG || path.join(os.homedir(), '.claude/worklog.config.json');
const WLDIR = path.join(os.homedir(), '.claude/worklog');

function loadConfig(f) {
  let raw;
  try { raw = fs.readFileSync(f, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') { console.error('no worklog config yet — run worklog setup'); process.exit(2); }
    console.error(`cannot read ${f}: ${e.message}`); process.exit(2);
  }
  try { return JSON.parse(raw); }
  catch (e) { console.error(`bad JSON in ${f}: ${e.message}`); process.exit(2); }
}

function argToday() {
  const i = process.argv.indexOf('--today');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const cfg = loadConfig(CONFIG);
const today = argToday();
const GLYPH = { done: '🟢', in_progress: '🟡', blocked: '🔴', planned: '⚪' };

// 1. in-flight ledger lines
console.log('\nIN FLIGHT  (ledger — ~/.claude/worklog/active.md)\n');
let ledgerLines = [];
try {
  ledgerLines = fs.readFileSync(path.join(WLDIR, 'active.md'), 'utf8')
    .split('\n').filter((l) => /^- \[/.test(l));
} catch (_) { /* no ledger yet */ }
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
if (ledgerLines.length) ledgerLines.forEach((l) => console.log('  ' + clip(l.trim(), 160)));
else console.log('  (no in-flight tasks)');

// 2. today's plan focus
console.log(`\nTODAY'S PLAN  (plan-${today}.md)\n`);
const planFile = path.join(WLDIR, `plan-${today}.md`);
if (fs.existsSync(planFile)) {
  const focus = fs.readFileSync(planFile, 'utf8').split('\n')
    .map((l) => l.trim()).filter(Boolean).slice(0, 14);
  if (focus.length) focus.forEach((l) => console.log('  ' + l));
  else console.log('  (plan file is empty)');
} else {
  console.log(`  (no plan for today — ${today})`);
}

// 3. cross-project roll-up (same logic as daily-focus.js)
console.log('\nACROSS PROJECTS  (plan/tracks.json · grouped by status)');
const rows = [];
for (const [name, p] of Object.entries(cfg.projects || {})) {
  let tracks = [];
  const tp = path.join(p.path, 'plan', 'tracks.json');
  const rc = path.join(p.path, 'report.config.json');
  if (fs.existsSync(tp)) { try { tracks = JSON.parse(fs.readFileSync(tp, 'utf8')); } catch (_) {} }
  else if (fs.existsSync(rc)) { try { tracks = JSON.parse(fs.readFileSync(rc, 'utf8')).tracks || []; } catch (_) {} }
  for (const t of tracks) rows.push({ project: name, jira: t.jira, status: t.status, now_next: t.now_next });
}
const order = ['blocked', 'in_progress', 'planned', 'done'];
rows.sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)) || String(a.project).localeCompare(b.project));
if (!rows.length) { console.log('\n  (no registered projects with plans yet)'); }
else {
  let cur = null;
  for (const r of rows) {
    if (r.status !== cur) { cur = r.status; console.log('\n  ' + (GLYPH[cur] || '⚪') + ' ' + String(cur).toUpperCase()); }
    console.log(`    ${r.project} · ${r.jira || '—'} — ${r.now_next || '—'}`);
  }
}
console.log('');
