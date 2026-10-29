#!/usr/bin/env node
/* ============================================================================
 * read-tracks — the worklog-facing READER of a report's authoritative status.
 * ----------------------------------------------------------------------------
 * Parses the `tracks[]` block from one or more coverage-research-report markdown
 * files and emits a deterministic one-line roll-up per track, so `worklog` can
 * drop it into its daily view WITHOUT re-typing status by hand.
 *
 * Direction is READ-ONLY: report md (authoritative) -> worklog (provisional
 * daily cache). This never writes the report. It emits ONLY the shareable-safe
 * roll-up fields — jira · status · now_next · updated · artifact — never hours,
 * never another workstream, never the who/blocker names (those stay prose).
 *
 *   node read-tracks.js <report.md> [more.md ...]        # human roll-up lines
 *   node read-tracks.js <report.md> --json               # machine array
 *   node read-tracks.js <report.md> --jira PROJ-42        # just that track
 * ==========================================================================*/
'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const jiraIdx = args.indexOf('--jira');
const onlyJira = jiraIdx >= 0 ? args[jiraIdx + 1] : null;
const files = args.filter((a, i) =>
  !a.startsWith('--') && !(jiraIdx >= 0 && i === jiraIdx + 1));

if (!files.length) {
  console.error('usage: node read-tracks.js <report.md> [more.md ...] [--json] [--jira KEY]');
  process.exit(2);
}

const GLYPH = { done: '🟢', in_progress: '🟡', blocked: '🔴', planned: '⚪' };

function tracksOf(mdPath) {
  let raw;
  try { raw = fs.readFileSync(mdPath, 'utf8'); }
  catch (_) { console.error(`! cannot read ${mdPath}`); return []; }
  const m = raw.match(/```json\s+config\s*\n([\s\S]*?)\n```/);
  if (!m) { console.error(`! no config block in ${mdPath}`); return []; }
  let cfg;
  try { cfg = JSON.parse(m[1]); }
  catch (e) { console.error(`! bad config JSON in ${mdPath}: ${e.message}`); return []; }
  const base = cfg.jiraBase || 'https://your-org.atlassian.net/browse/';
  return (cfg.tracks || []).map((t) => ({
    jira: t.jira, status: t.status, now_next: t.now_next, updated: t.updated,
    // prefer an explicit artifact deep-link; fall back to the report's own artifactUrl
    artifact: t.artifact || cfg.artifactUrl || '',
    jiraUrl: base + t.jira, source: mdPath,
  }));
}

let tracks = files.flatMap(tracksOf);
if (onlyJira) tracks = tracks.filter((t) => t.jira === onlyJira);

if (asJson) {
  process.stdout.write(JSON.stringify(tracks, null, 2) + '\n');
} else {
  for (const t of tracks) {
    const g = GLYPH[t.status] || '⚪';
    const up = t.updated ? ` (${t.updated})` : '';
    const art = t.artifact ? ` → ${t.artifact}` : '';
    console.log(`${t.jira}  ${g} ${t.status || '?'}  — ${t.now_next || '—'}${up}${art}`);
  }
  if (!tracks.length) console.error('(no tracks matched)');
}
