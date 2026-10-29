#!/usr/bin/env node
/* prepare-time-log — cred-free Jira worklog DRAFT. Normalises hours → "Xh Ym"
 * and builds `started` at 09:00 in the configured tz. NEVER writes Jira — the
 * worklog skill confirms + writes via the connected Atlassian MCP (reading
 * existing worklogs first to avoid double-logging).
 *   node prepare-time-log.js --jira KEY --hours 1h30m --date YYYY-MM-DD [--comment ...] */
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
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : null; };
const jira = get('jira'), hours = get('hours'), date = get('date'), comment = get('comment') || '';
if (!jira || !hours || !date) { console.error('usage: --jira KEY --hours 1h30m --date YYYY-MM-DD [--comment ...]'); process.exit(2); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('date must be YYYY-MM-DD'); process.exit(2); }
// Parse a duration to minutes, consuming the WHOLE string or returning null.
// - bare number ("1.5", "0", ".5") = HOURS (documented): "1.5" → 90m, ".5" → 30m
// - "Xh" / "Xm" / "Xh Ym" tokens, where X may be a decimal (".5h" → 30m)
// - anything left unconsumed ("2h15") → null (error), never a silent partial parse
const toMin = (h) => {
  const s = String(h).trim();
  if (s === '') return null;
  // bare number → hours
  if (/^\d*\.?\d+$/.test(s)) {
    if (!/\d/.test(s)) return null;
    return Math.round(parseFloat(s) * 60);
  }
  let rest = s, min = 0, matched = false;
  const token = /^(\d*\.?\d+)\s*([hm])\s*/i;
  while (rest.length) {
    const mm = rest.match(token);
    if (!mm || !/\d/.test(mm[1])) return null; // not fully consumable
    const val = parseFloat(mm[1]);
    if (!Number.isFinite(val)) return null;
    min += mm[2].toLowerCase() === 'h' ? val * 60 : val;
    rest = rest.slice(mm[0].length);
    matched = true;
  }
  return matched ? Math.round(min) : null;
};
const fmt = (x) => ((Math.floor(x / 60) ? Math.floor(x / 60) + 'h' : '') + (Math.floor(x / 60) && x % 60 ? ' ' : '') + (x % 60 ? (x % 60) + 'm' : '')) || '0m';
const off = (d, tz) => { try { const dt = new Date(d + 'T09:00:00Z'); const n = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(dt).find((p) => p.type === 'timeZoneName').value; const mo = n.match(/GMT([+-]\d{2}):?(\d{2})/); return mo ? mo[1] + mo[2] : '+0000'; } catch (_) { return '+0000'; } };
const mins = toMin(hours);
if (mins === null) { console.error('could not parse hours: ' + hours + ' (use e.g. "1h 30m", "1.5", "90m", "0"; a bare number = hours)'); process.exit(2); }
console.log(JSON.stringify({ draft: true, jira, timeSpent: fmt(mins), started: `${date}T09:00:00.000${off(date, cfg.timezone || 'Europe/Warsaw')}`, comment, note: 'DRAFT ONLY — read existing worklogs on this issue (avoid double-log), confirm with the user, then write via the Atlassian MCP addWorklogToJiraIssue. This script never writes Jira.' }, null, 2));
