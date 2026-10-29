#!/usr/bin/env node
/* tidy — housekeeping for the ledger folder. v1: move any
 * ~/.claude/worklog/plan-<date>.md whose <date> is BEFORE today into
 * ~/.claude/worklog/plan-archive/ (created if needed). Does NOT touch active.md.
 *   node tidy.js [--today YYYY-MM-DD] [--dry]
 * --today  : override "today" (defaults to new Date()); a plan dated today stays put.
 * --dry    : list what WOULD move, write nothing. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const WLDIR = process.env.WORKLOG_DIR || path.join(os.homedir(), '.claude/worklog');
const ARCHIVE = path.join(WLDIR, 'plan-archive');

function argToday() {
  const i = process.argv.indexOf('--today');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const today = argToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) { console.error(`bad --today: ${today} (want YYYY-MM-DD)`); process.exit(2); }
const dry = process.argv.includes('--dry');

let entries;
try { entries = fs.readdirSync(WLDIR); }
catch (e) {
  if (e.code === 'ENOENT') { console.error(`no worklog dir at ${WLDIR}`); process.exit(2); }
  console.error(`cannot read ${WLDIR}: ${e.message}`); process.exit(2);
}

const PLAN = /^plan-(\d{4}-\d{2}-\d{2})\.md$/;
const toMove = entries
  .map((f) => { const m = f.match(PLAN); return m ? { file: f, date: m[1] } : null; })
  .filter(Boolean)
  .filter((e) => e.date < today)            // lexical compare is correct for ISO dates
  .sort((a, b) => a.date.localeCompare(b.date));

console.log(`\nTIDY  (today=${today}${dry ? ' · DRY-RUN' : ''})\n`);
if (!toMove.length) { console.log('  nothing to archive — no plan files older than today\n'); process.exit(0); }

if (!dry && !fs.existsSync(ARCHIVE)) fs.mkdirSync(ARCHIVE, { recursive: true });

let moved = 0;
for (const e of toMove) {
  const from = path.join(WLDIR, e.file);
  const to = path.join(ARCHIVE, e.file);
  if (dry) { console.log(`  would move  ${e.file}  →  plan-archive/`); continue; }
  if (fs.existsSync(to)) { console.log(`  SKIP (exists) ${e.file} already in plan-archive/`); continue; }
  try { fs.renameSync(from, to); console.log(`  moved  ${e.file}  →  plan-archive/`); moved++; }
  catch (err) { console.log(`  FAILED ${e.file}: ${err.message}`); }
}
console.log(dry ? `\n  ${toMove.length} file(s) would move.\n` : `\n  ${moved} file(s) archived.\n`);
