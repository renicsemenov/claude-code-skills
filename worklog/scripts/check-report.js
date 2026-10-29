#!/usr/bin/env node
/* check-report — a standalone preflight for a worklog report project (folder mode).
 * Validates the SAME things build-report.js relies on, so a render can't half-fail:
 *   - report.config.json is present and valid JSON
 *   - every tab.section names an existing folder under <REPORT_DIR>
 *   - every oracleFile / file ref resolves (absolute, else relative to the tab's section folder)
 *   - every tracks[].status ∈ {done, in_progress, blocked, planned}
 * Prints a clean problem list; exits non-zero on any problem, 0 when clean.
 *   node check-report.js <REPORT_DIR> */
'use strict';
const fs = require('fs'), path = require('path');

const DIR = process.argv[2] && path.resolve(process.argv[2]);
if (!DIR) { console.error('usage: node check-report.js <REPORT_DIR>'); process.exit(2); }
if (!fs.existsSync(DIR) || !fs.statSync(DIR).isDirectory()) { console.error(`not a directory: ${DIR}`); process.exit(2); }

const problems = [];
const add = (m) => problems.push(m);
const STATUSES = new Set(['done', 'in_progress', 'blocked', 'planned']);

// 1. report.config.json present + valid JSON
const cfgPath = path.join(DIR, 'report.config.json');
let cfg = null;
if (!fs.existsSync(cfgPath)) { add(`report.config.json not found at ${cfgPath}`); }
else {
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
  catch (e) { add(`report.config.json is not valid JSON: ${e.message}`); }
}

// resolve a file ref the way build-report.js does:
// absolute → as-is; else relative to the tab's section folder under DIR.
function resolveRef(tab, rel) {
  if (path.isAbsolute(rel)) return rel;
  return path.join(DIR, tab.section || '', rel);
}

if (cfg) {
  const tabs = Array.isArray(cfg.tabs) ? cfg.tabs : [];
  if (!tabs.length) add('report.config.json has no tabs[]');

  for (const tab of tabs) {
    const id = tab.id || '(no id)';
    // 2. tab.section folder exists (tabs that render a section)
    if (tab.section) {
      const sec = path.join(DIR, tab.section);
      if (!fs.existsSync(sec) || !fs.statSync(sec).isDirectory()) add(`tab "${id}": section folder missing — ${tab.section}/`);
    }
    // 3. file / oracleFile refs resolve — on the tab itself and on each view
    const refsToCheck = [];
    if (tab.oracleFile) refsToCheck.push(tab.oracleFile);
    for (const v of (Array.isArray(tab.views) ? tab.views : [])) {
      if (v.oracleFile) refsToCheck.push(v.oracleFile);
      if (v.file) refsToCheck.push(v.file);
      // a view may itself point at a section folder
      if (v.section) {
        const vs = path.join(DIR, v.section);
        if (!fs.existsSync(vs) || !fs.statSync(vs).isDirectory()) add(`tab "${id}" view "${v.id || '?'}": section folder missing — ${v.section}/`);
      }
    }
    for (const rel of refsToCheck) {
      const resolved = resolveRef(tab, rel);
      if (!fs.existsSync(resolved)) add(`tab "${id}": ref does not resolve — "${rel}" → ${resolved}`);
    }
  }
}

// 4. tracks[].status — plan/tracks.json (folder mode) else cfg.tracks
let tracks = [];
const tp = path.join(DIR, 'plan', 'tracks.json');
if (fs.existsSync(tp)) {
  try { tracks = JSON.parse(fs.readFileSync(tp, 'utf8')); }
  catch (e) { add(`plan/tracks.json is not valid JSON: ${e.message}`); }
} else if (cfg && Array.isArray(cfg.tracks)) {
  tracks = cfg.tracks;
}
if (Array.isArray(tracks)) {
  tracks.forEach((t, i) => {
    if (!STATUSES.has(t.status)) add(`tracks[${i}] (${t.jira || '?'}): invalid status "${t.status}" — want ${[...STATUSES].join('|')}`);
  });
}

// report
const name = path.basename(DIR);
if (!problems.length) {
  console.log(`\n✅ PASS — ${name}: report.config.json valid · sections present · refs resolve · tracks statuses ok\n`);
  process.exit(0);
}
console.log(`\n❌ ${problems.length} problem(s) — ${name}:\n`);
problems.forEach((p) => console.log('  • ' + p));
console.log('');
process.exit(1);
