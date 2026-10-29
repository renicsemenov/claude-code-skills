#!/usr/bin/env node
/* continue — focus a session on ONE project and render a sharp status: the
 * status-by-track table (from plan/tracks.json) + the plan's Active→Next + the
 * artifact link. The "continue work in project X" render.
 *   node continue.js                # list projects to pick from
 *   node continue.js <project>      # focus + sharp status (exact or substring match) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CONFIG = path.join(os.homedir(), '.claude/worklog.config.json');
function loadConfig(f) {
  let raw;
  try { raw = fs.readFileSync(f, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') { console.error('no worklog config yet — run worklog setup'); process.exit(2); } console.error(`cannot read ${f}: ${e.message}`); process.exit(2); }
  try { return JSON.parse(raw); } catch (e) { console.error(`bad JSON in ${f}: ${e.message}`); process.exit(2); }
}
const cfg = loadConfig(CONFIG);
const projects = cfg.projects || {};
const names = Object.keys(projects);
const arg = process.argv.slice(2).join(' ').trim();

if (!arg) { console.log('pick a project to continue:\n  ' + (names.join('\n  ') || '(none — init-workstream to add one)')); process.exit(names.length ? 0 : 2); }

const key = names.find((k) => k.toLowerCase() === arg.toLowerCase()) || names.find((k) => k.toLowerCase().includes(arg.toLowerCase()));
if (!key) { console.error(`no project matching "${arg}". known: ${names.join(' · ')}`); process.exit(2); }
const p = projects[key];
const GLYPH = { done: '🟢', in_progress: '🟡', blocked: '🔴', planned: '⚪' };
const abbr = (s) => s ? s.replace(os.homedir(), '~') : s;

console.log(`\n▶ Working on: ${key}${p.shared ? '  [shared]' : '  [local]'}`);
if (p.artifact) console.log('  artifact: ' + p.artifact);
console.log('  path:     ' + abbr(p.path) + '\n');

// status-by-track (from plan/tracks.json)
let tracks = [];
const tp = path.join(p.path, 'plan', 'tracks.json');
if (fs.existsSync(tp)) { try { tracks = JSON.parse(fs.readFileSync(tp, 'utf8')); } catch (_) {} }
if (Array.isArray(tracks) && tracks.length) {
  const order = ['blocked', 'in_progress', 'planned', 'done'];
  tracks.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  console.log('  STATUS');
  for (const t of tracks) console.log(`    ${GLYPH[t.status] || '⚪'} ${t.jira || '—'} — ${t.now_next || '—'}${t.updated ? ` (${t.updated})` : ''}`);
  console.log('');
}
// Active → next (from plan/plan.md)
const pm = path.join(p.path, 'plan', 'plan.md');
if (fs.existsSync(pm)) {
  const m = fs.readFileSync(pm, 'utf8').match(/#{2,3}\s*[▶>]?\s*Active\s*(?:→|->)?\s*next[^\n]*\n([\s\S]*?)(?:\n#{2,3}\s|\s*$)/i);
  if (m) {
    const lines = m[1].split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);
    if (lines.length) { console.log('  ACTIVE → NEXT'); for (const l of lines) console.log('    ' + l); console.log(''); }
  }
}
console.log(`  (session focused on ${key} — update plan/tracks.json at your checkpoint)\n`);
