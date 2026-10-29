#!/usr/bin/env node
/* init-workstream — scaffold a FULL report project (section folders + READMEs +
 * report.config.json + plan/tracks.json) and register it in worklog.config.json.
 * Local (under data_root, gitignored) unless --shared (a team repo path, committed).
 *   node init-workstream.js --name "Project" [--path DIR] [--shared]
 *                           [--no-register] [--sections "a,b,c"] [--compact]
 * No --path → under data_root. Idempotent: never clobbers existing files.
 * --no-register: scaffold only, do NOT touch worklog.config.json (parallel/test builds).
 * --sections "a,b,c": scaffold exactly these axis-named sections (labels title-cased).
 * --compact: preset = findings,plan only. Default (neither given) = the 5 axis-named. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CFG = path.join(os.homedir(), '.claude/worklog.config.json');
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
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : null; };
const name = get('name'), shared = a.includes('--shared'), noRegister = a.includes('--no-register');
if (!name) { console.error('usage: --name "Project" [--path DIR] [--shared] [--no-register] [--sections "a,b,c"] [--compact]'); process.exit(2); }
const cfg = loadConfig(CFG);
const safe = name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'project';
let dir = get('path') || path.join(cfg.data_root || path.join(os.homedir(), '.claude/worklog/workstreams'), safe);
dir = path.resolve(dir);
const titleCase = (s) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const DEFAULT_SECTIONS = [['findings', 'Findings'], ['coverage_and_gaps', 'Coverage & Gaps'], ['detail', 'Detail'], ['reference', 'Reference'], ['plan', 'Plan']];
const COMPACT_SECTIONS = [['findings', 'Findings'], ['plan', 'Plan']];
let SECTIONS;
const sectArg = get('sections');
if (sectArg) {
  SECTIONS = sectArg.split(',').map((s) => s.trim()).filter(Boolean)
    .map((s) => [s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'section', titleCase(s)]);
  if (!SECTIONS.length) { console.error('--sections given but empty'); process.exit(2); }
} else if (a.includes('--compact')) {
  SECTIONS = COMPACT_SECTIONS;
} else {
  SECTIONS = DEFAULT_SECTIONS;
}
const created = [];
const put = (rel, body) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p)) { fs.writeFileSync(p, body); created.push(rel); } };
for (const [slug, label] of SECTIONS) {
  put(`${slug}/README.md`, `---\nname: ${label}\ndescription: ${label} section.\n---\n# ${slug}/ — the **${label}** tab\n▶ Artifact: (publish, then paste the URL in the project README + report.config.json)\n- (add md files here — each renders into this tab)\n↩ [project index](../README.md)\n`);
  if (slug === 'plan') { put('plan/plan.md', `### ▶ Active → next\n\n1. \n\n### Who works in parallel + blockers\n\n| Who | Working on | Hand-off / blocker |\n|---|---|---|\n`); put('plan/tracks.json', `[]\n`); }
  else put(`${slug}/${slug}.md`, `## ${label}\n\n_(start here — one plain sentence of what & why)_\n`);
}
put('report.config.json', JSON.stringify({
  title: name, eyebrow: '', lede: '', description: '',
  jiraBase: cfg.jiraBase || 'https://your-org.atlassian.net/browse/',
  artifactUrl: '', footer: `${name} · rendered from section folders`,
  stats: [], tabs: SECTIONS.map(([slug, label]) => slug === 'plan' ? { id: 'plan', label, refLabel: 'plan', section: 'plan', tracksTable: true } : { id: slug.replace(/_.*/, '').slice(0, 6), label, section: slug }),
}, null, 2) + '\n');
put('README.md', `---\nname: ${name}\ndescription: ${name} — coverage/research report.\nstatus: draft\nartifact: \n---\n# ${name}\n\n**▶ Live artifact:** (publish via the Artifact tool, then paste the /code/artifact URL here + in report.config.json)\n\nOne folder per tab; the builder assembles the artifact. Rebuild:\n\`REPORT_DIR=. node ~/.claude/skills/coverage-research-report/build-report.js\`\n\n## Sections (= tabs)\n${SECTIONS.map(([s, l]) => `- \`${s}/\` → **${l}**`).join('\n')}\n`);
if (noRegister) {
  console.log(JSON.stringify({ workstream: name, dir, shared: !!shared, created, registered: false, note: '--no-register: scaffolded only, config untouched' }, null, 2));
} else {
  // Exclusive lock (O_EXCL) around read-modify-write so a concurrent register can't
  // lose an update; re-read INSIDE the lock, then write atomically (tmp → rename).
  const lock = CFG + '.lock';
  let fd, got = false;
  for (let i = 0; i < 50 && !got; i++) {
    try { fd = fs.openSync(lock, 'wx'); got = true; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // stale-lock guard: if the lock is older than 10s, steal it
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 10000) fs.unlinkSync(lock); } catch (_) {}
      const until = Date.now() + 100; while (Date.now() < until) { /* brief spin */ }
    }
  }
  if (!got) { console.error('could not acquire config lock (' + lock + ') — another worklog write is in progress'); process.exit(2); }
  try {
    const live = loadConfig(CFG);
    live.projects = live.projects || {};
    live.projects[name] = { path: dir, shared: !!shared, artifact: '' };
    const tmp = CFG + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(live, null, 2) + '\n');
    fs.renameSync(tmp, CFG);
  } finally { try { fs.closeSync(fd); fs.unlinkSync(lock); } catch (_) {} }
  console.log(JSON.stringify({ workstream: name, dir, shared: !!shared, created, registered: true, note: created.length ? 'scaffolded + registered' : 'already existed — registered, nothing clobbered' }, null, 2));
}
