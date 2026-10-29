#!/usr/bin/env node
/* log-activity — capture SIDE / ad-hoc work (PR review, quick fix, support) as a
 * dated short-story so it doesn't read as zero. Appends to the gitignored keeper:
 * a per-project activity.md if --project, else a monthly general log under data_root.
 *   node log-activity.js --title "..." --date YYYY-MM-DD [--note ...] [--kind pr-review] [--jira KEY] [--project NAME] */
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
const title = get('title'), date = get('date'), note = get('note'), kind = get('kind'), jira = get('jira'), project = get('project');
if (!title || !date) { console.error('usage: --title "..." --date YYYY-MM-DD [--note ..] [--kind ..] [--jira KEY] [--project NAME]'); process.exit(2); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('date must be YYYY-MM-DD'); process.exit(2); }
const base = cfg.jiraBase || 'https://your-org.atlassian.net/browse/';
if (project && !(cfg.projects && cfg.projects[project])) {
  const known = Object.keys(cfg.projects || {});
  console.error(`unknown --project "${project}". Known projects: ${known.length ? known.join(', ') : '(none registered)'}`);
  process.exit(2);
}
const entry = `### ${date} · ${title}${kind ? ` _[${kind}]_` : ''}${jira ? ` [${jira}](${base}${jira})` : ''}\n${note ? note + '\n' : ''}\n`;
let file, header;
if (project && cfg.projects && cfg.projects[project]) { file = path.join(cfg.projects[project].path, 'activity.md'); header = `# ${project} — activity log\n\n`; }
else { const root = cfg.data_root || path.join(os.homedir(), '.claude/worklog'); fs.mkdirSync(root, { recursive: true }); file = path.join(root, `_activity-${date.slice(0, 7)}.md`); header = `# Activity log — ${date.slice(0, 7)}\n\n`; }
if (!fs.existsSync(file)) fs.writeFileSync(file, header);
fs.appendFileSync(file, entry);
console.log(JSON.stringify({ logged: true, file, entry: entry.trim() }, null, 2));
