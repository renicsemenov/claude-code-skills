#!/usr/bin/env node
/* worklog-map — show THE WORKLOG SYSTEM and WHERE each project's data lives
 * (local under data_root, gitignored · vs shared, committed in a team repo).
 * A project may be BOTH: organised locally + a shared copy in a repo.
 *   node worklog-map.js            # system map + per-project locations
 *   node worklog-map.js --tree     # also list each project's tab folders */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CONFIG = process.env.WORKLOG_CONFIG || path.join(os.homedir(), '.claude/worklog.config.json');
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
const HOME = os.homedir(), abbr = (p) => p ? p.replace(HOME, '~') : p;
const brain = path.resolve(__dirname, '..');                                   // the worklog skill dir (this script's home)
const engine = path.join(HOME, '.claude/skills/coverage-research-report');     // the report builder skill (by convention)
const dataRoot = cfg.data_root || '(unset — run setup)';
const tree = process.argv.includes('--tree');

console.log('\nTHE WORKLOG SYSTEM  —  skill = brain · scripts/build = tools · folders = data\n');
console.log('  🧠 brain    ' + abbr(brain) + '   (SKILL.md · scripts/ · references/)');
console.log('  🛠️  engine   ' + abbr(engine) + '   (build-report.js · read-tracks.js)');
console.log('  ⚙️  config   ' + abbr(CONFIG) + '   (identity + operational)  ·  ~/.claude/worklog/active.md (ledger)');
console.log('  📁 data     ' + abbr(dataRoot) + '/   (local projects, gitignored)\n');

const projects = Object.entries(cfg.projects || {});
if (!projects.length) { console.log('(no projects yet — `init-workstream` to add one)\n'); process.exit(0); }

const isLocal = (p) => p && cfg.data_root && p.startsWith(cfg.data_root);
console.log('WHERE EACH PROJECT IS LINKED\n');
for (const [name, p] of projects) {
  const local = isLocal(p.path);
  console.log(`  ${local ? '📁 local ' : '🔗 shared'}  ${name}`);
  console.log(`              path:     ${abbr(p.path)}`);
  if (p.shared_source) console.log(`              repo:     ${abbr(p.shared_source)}   (shared copy kept in the team repo)`);
  if (p.artifact) console.log(`              artifact: ${p.artifact}${p.artifact_owner ? '   ⭐ owner' : ''}`);
  if (tree) {
    try {
      const secs = fs.readdirSync(p.path, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
      if (secs.length) console.log(`              tabs:     ${secs.join(' · ')}`);
    } catch (_) { console.log('              tabs:     (folder not found)'); }
  }
  console.log('');
}
console.log('legend:  📁 local = under data_root (gitignored)   ·   🔗 shared = committed in a team repo   ·   a project can have BOTH (local data + a repo copy)\n');
