#!/usr/bin/env node
/* daily-focus — the head-skill's cross-project unite. Reads every registered
 * project's plan/tracks.json (or report.config.json tracks) and groups by
 * status. "show me all plans / where does everything stand."
 *   node daily-focus.js [--json]
 * Shareable-safe fields only (jira · status · now_next · updated · artifact). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CONFIG = path.join(os.homedir(), '.claude/worklog.config.json');
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
const cfg = loadConfig(CONFIG);
const GLYPH = { done: '🟢', in_progress: '🟡', blocked: '🔴', planned: '⚪' };
const asJson = process.argv.includes('--json');
const rows = [];
for (const [name, p] of Object.entries(cfg.projects || {})) {
  let tracks = [];
  const tp = path.join(p.path, 'plan', 'tracks.json');
  const rc = path.join(p.path, 'report.config.json');
  if (fs.existsSync(tp)) { try { tracks = JSON.parse(fs.readFileSync(tp, 'utf8')); } catch (_) {} }
  else if (fs.existsSync(rc)) { try { tracks = JSON.parse(fs.readFileSync(rc, 'utf8')).tracks || []; } catch (_) {} }
  for (const t of tracks) rows.push({ project: name, jira: t.jira, status: t.status, now_next: t.now_next, updated: t.updated, artifact: t.artifact || p.artifact || '' });
}
const order = ['blocked', 'in_progress', 'planned', 'done'];
rows.sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)) || String(a.project).localeCompare(b.project));
if (asJson) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
if (!rows.length) { console.log('(no registered projects with plans yet)'); process.exit(0); }
let cur = null;
for (const r of rows) {
  if (r.status !== cur) { cur = r.status; console.log('\n' + (GLYPH[cur] || '⚪') + ' ' + String(cur).toUpperCase()); }
  console.log(`  ${r.project} · ${r.jira || '—'} — ${r.now_next || '—'}${r.updated ? ` (${r.updated})` : ''}`);
}
console.log('');
