#!/usr/bin/env node
/* ============================================================================
 * coverage-research-report — GENERIC builder
 * ----------------------------------------------------------------------------
 * Renders the tabbed HTML "honest researcher" report from EITHER:
 *   (A) a PROJECT FOLDER — REPORT_DIR=<dir> with report.config.json + one folder
 *       per section (= one tab). This is the house layout (see data_root README).
 *   (B) a single markdown — REPORT_MD=<file> with a leading ```json config block
 *       + `##`-delimited sections. (backward-compatible.)
 *
 * Output → $TMPDIR/coverage-report.html (override REPORT_OUT). Publish via the
 * Artifact tool with url=<the /code/artifact/uuid> to redeploy the SAME artifact.
 *
 * Stats "auto:<marker>" are TALLIED from the prose (never hand-typed). Status
 * comes from tracks[] (plan/tracks.json in folder mode, else config.tracks) and
 * the Plan tab's table is GENERATED from it. A tab may carry `views:[…]` for a
 * 3-way-style switcher (per-feature / unified / oracle).
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadMarked() {
  const tries = [
    process.env.MARKED_PATH, 'marked',
    path.join(__dirname, 'node_modules/marked'),      // vendored next to the skill (npm i marked here)
    path.join(process.cwd(), 'node_modules/marked'),
  ].filter(Boolean);
  for (const t of tries) { try { const m = require(t); return m.marked || m; } catch (_) {} }
  throw new Error('`marked` not found. `npm i -g marked`, or set MARKED_PATH.');
}
const marked = loadMarked();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const readSafe = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (_) { return ''; } };
// section content = *.md in the folder, SORTED by name — but never README.md
// (that's the folder's index/navigation, not tab content) nor _underscore files.
const globMd = (dir) => { try { return fs.readdirSync(dir).filter((f) => /\.md$/.test(f) && !/^readme\.md$/i.test(f) && !f.startsWith('_')).sort().map((f) => readSafe(path.join(dir, f))).join('\n\n'); } catch (_) { return ''; } };

// ---- resolve source: (A) folder project, or (B) single markdown ------------
const DIR = process.env.REPORT_DIR && path.resolve(process.env.REPORT_DIR);
let cfg, mode, projectDir = '', mdDir = '', bodyForStats = '';
const sections = {};
function slug(s) { return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

if (DIR) {
  mode = 'folder'; projectDir = DIR;
  const cfgPath = path.join(DIR, 'report.config.json');
  if (!fs.existsSync(cfgPath)) throw new Error(`folder mode: ${cfgPath} not found`);
  cfg = JSON.parse(readSafe(cfgPath));
  bodyForStats = (cfg.tabs || []).map((t) => t.section ? globMd(path.join(DIR, t.section)) : '').join('\n');
} else {
  mode = 'md';
  const MD_PATH = process.env.REPORT_MD || path.join(process.cwd(), 'report.md');
  if (!fs.existsSync(MD_PATH)) throw new Error(`report markdown not found: ${MD_PATH} (set REPORT_MD or REPORT_DIR)`);
  mdDir = path.dirname(MD_PATH);
  const raw = fs.readFileSync(MD_PATH, 'utf8');
  const cfgMatch = raw.match(/```json\s+config\s*\n([\s\S]*?)\n```/);
  if (!cfgMatch) throw new Error('single-md mode: missing a leading ```json config block');
  cfg = JSON.parse(cfgMatch[1]);
  const body = raw.slice(cfgMatch.index + cfgMatch[0].length);
  bodyForStats = body;
  body.split(/\n(?=## )/).forEach((chunk) => {
    const m = chunk.match(/^##\s+(.+)/m);
    if (m) sections[slug(m[1])] = chunk.replace(/^##\s+.+\n/, '');
  });
}
function pickSection(frag) {
  const want = slug(frag);
  const key = Object.keys(sections).find((k) => k === want) || Object.keys(sections).find((k) => k.includes(want));
  return key ? sections[key] : '';
}
// a file ref resolves: absolute · else relative to the tab's section folder (folder mode) · else the md dir
function resolveRef(tab, rel) {
  if (path.isAbsolute(rel)) return rel;
  if (mode === 'folder') return path.join(projectDir, tab.section || '', rel);
  return path.join(mdDir, rel);
}

// ---- stats: "auto:<marker>" tallied from the prose; else literal ----------
// A stat may add `from:"<section>"` to tally WITHIN one section (folder: that
// section's md; single-md: that `##` section) instead of the whole doc.
const tallyIn = (text, marker) => {
  if (marker === '####') return (text.match(/^#### /gm) || []).length;
  if (marker === '###') return (text.match(/^### /gm) || []).length;
  const re = marker.startsWith('/') && marker.lastIndexOf('/') > 0
    ? new RegExp(marker.slice(1, marker.lastIndexOf('/')), marker.slice(marker.lastIndexOf('/') + 1) || 'g')
    : new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return (text.match(re) || []).length;
};
const statScope = (from) => !from ? bodyForStats : (mode === 'folder' ? globMd(path.join(projectDir, from)) : pickSection(from));
const stats = (cfg.stats || []).map((s) => ({ ...s, value: typeof s.value === 'string' && s.value.startsWith('auto:') ? tallyIn(statScope(s.from), s.value.slice(5)) : s.value }));

// ---- tracks[] — folder: plan/tracks.json else config.tracks ---------------
function loadTracks() {
  if (mode === 'folder') {
    const tp = path.join(projectDir, 'plan', 'tracks.json');
    if (fs.existsSync(tp)) { try { return JSON.parse(readSafe(tp)); } catch (_) {} }
  }
  return cfg.tracks || [];
}
const TRACKS = loadTracks();
const JIRA = (ref) => (cfg.jiraBase || 'https://your-org.atlassian.net/browse/') + ref;
const GLYPH = { done: '🟢', in_progress: '🟡', blocked: '🔴', planned: '⚪' };
function tracksTableMd(tracks) {
  if (!Array.isArray(tracks) || !tracks.length) return '';
  const rows = tracks.map((t) => `| [${t.jira}](${JIRA(t.jira)}) | ${GLYPH[t.status] || '⚪'} ${t.status || ''} | ${t.now_next || '—'}${t.updated ? ` <sub>${t.updated}</sub>` : ''} |`).join('\n');
  return `### Where we are — status by track\n\n| Track | Status | Now / next |\n|---|---|---|\n${rows}\n\n`;
}

// ---- a tab's html (md section · oracle file · or a view-switcher) ----------
function codeBlock(file) { return `<pre class="code">${esc(readSafe(file) || '// not readable: ' + file)}</pre>`; }
function sectionMd(tab) { return mode === 'folder' && tab.section ? globMd(path.join(projectDir, tab.section)) : pickSection(tab.from || tab.id); }
function viewHtml(tab, v) {
  const lead = v.lead ? `<p class="schema-lead">${v.lead}</p>` : '';
  if (v.oracleFile) return lead + codeBlock(resolveRef(tab, v.oracleFile));
  if (v.file) return lead + (/\.(md|markdown)$/.test(v.file) ? `<div class="md">${marked(readSafe(resolveRef(tab, v.file)))}</div>` : codeBlock(resolveRef(tab, v.file)));
  if (v.section) return lead + `<div class="md">${marked(globMd(path.join(projectDir, v.section)))}</div>`;
  return lead;
}
function tabHtml(tab) {
  if (Array.isArray(tab.views)) {
    const btns = tab.views.map((v, i) => `<button role="tab" aria-selected="${i === 0}" onclick="sw(this,'${tab.id}-${v.id}')">${v.label}</button>`).join('');
    const panes = tab.views.map((v, i) => `<div id="${tab.id}-${v.id}" class="sview${i === 0 ? ' on' : ''}">${viewHtml(tab, v)}</div>`).join('');
    return `${tab.lead ? `<p class="schema-lead">${tab.lead}</p>` : ''}<div class="switch" role="tablist">${btns}</div>${panes}`;
  }
  if (tab.oracleFile) return `${tab.lead ? `<p class="lead">${tab.lead}</p>` : ''}${codeBlock(resolveRef(tab, tab.oracleFile))}`;
  let md = sectionMd(tab);
  if (tab.tracksTable) md = tracksTableMd(TRACKS) + md;
  return `<div class="md">${marked(md)}</div>`;
}

const tabs = cfg.tabs || [];
const tabsBar = tabs.map((t, i) => `<button class="tab" role="tab" aria-selected="${i === 0}" onclick="go('${t.id}',this)">${t.label}${t.ref ? `<span class="ref">${t.ref}</span>` : ''}</button>`).join('');
const panels = tabs.map((t, i) => {
  const refLine = t.ref ? `<div class="panel-ref"><a href="${JIRA(t.ref)}">${t.ref}</a></div>` : (t.refLabel ? `<div class="panel-ref">${t.refLabel}</div>` : '');
  return `<section class="panel${i === 0 ? ' on' : ''}" id="p-${t.id}">${refLine}${tabHtml(t)}</section>`;
}).join('\n');
const statsBar = stats.length ? `<div class="stats">${stats.map((s) => `<div class="stat${s.tone ? ' ' + s.tone : ''}"><div class="n">${s.value}</div><div class="l">${s.label}</div></div>`).join('')}</div>` : '';

const css = `
  :root{--ground:#F4F6F9;--panel:#FFFFFF;--ink:#14202B;--muted:#55636F;--faint:#8A96A3;--line:#E3E8EF;
    --primary:#3B52C4;--teal:#0E7C86;--violet:#7A4FC0;--ok:#1F9D6B;--warn:#C07E16;--bad:#D4483B;--mute:#9AA6B2;
    --mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,monospace;--sans:system-ui,-apple-system,"Segoe UI",sans-serif;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.5}
  .wrap{max-width:1080px;margin:0 auto;padding:40px 24px 90px}
  .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--primary)}
  h1{font-size:30px;font-weight:760;letter-spacing:-.02em;margin:11px 0 8px;text-wrap:balance}
  .lede{font-size:16px;color:var(--muted);max-width:74ch;margin-bottom:22px}
  .stats{display:flex;flex-wrap:wrap;gap:0;margin:0 0 26px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel)}
  .stat{flex:1 1 110px;padding:13px 15px;border-right:1px solid var(--line)}.stat:last-child{border-right:none}
  .stat .n{font:750 22px/1 var(--sans);letter-spacing:-.03em}.stat .l{font-size:11px;color:var(--faint);margin-top:4px}
  .stat.ok .n{color:var(--ok)}.stat.warn .n{color:var(--warn)}.stat.q .n{color:var(--mute)}.stat.bad .n{color:var(--bad)}
  .tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:2px solid var(--line);margin-bottom:24px;position:sticky;top:0;background:var(--ground);z-index:5;padding-top:4px}
  .tab{appearance:none;border:none;background:none;font:600 14px/1 var(--sans);color:var(--muted);padding:12px 16px 13px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:8px}
  .tab:hover{color:var(--ink)}
  .tab[aria-selected="true"]{color:var(--primary);border-bottom-color:var(--primary)}
  .tab .ref{font:600 10px/1 var(--mono);color:var(--faint);background:#eef1f6;padding:3px 6px;border-radius:5px}
  .panel{display:none}.panel.on{display:block;animation:fade .2s ease}
  @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .panel-ref{font-size:12.5px;color:var(--faint);margin:-6px 0 16px}
  .panel-ref a{color:var(--primary);text-decoration:none;font-weight:600}
  .md h2{font-size:20px;font-weight:720;margin:30px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  .md h2:first-child{margin-top:0}
  .md h3{font-size:15px;font-weight:700;margin:26px 0 9px;color:var(--primary)}
  .md h4{font:650 13.5px/1.3 var(--sans);margin:20px 0 6px;padding:6px 10px;background:#eef1fb;border-left:3px solid var(--primary);border-radius:0 6px 6px 0}
  .md p,.lead{max-width:78ch;margin:0 0 11px;color:var(--muted)}.md p b,.md li b{color:var(--ink)}
  .md li{color:var(--muted);margin:3px 0}
  .md code{font-family:var(--mono);font-size:.86em;background:#eef1f6;padding:1px 5px;border-radius:4px}
  .md blockquote{border-left:3px solid var(--teal);background:#eef7f8;margin:0 0 13px;padding:9px 15px;border-radius:0 8px 8px 0;color:var(--muted)}
  .md blockquote p{margin:0}
  .md table{border-collapse:collapse;width:100%;font-size:12.5px;margin:4px 0 18px;display:block;overflow-x:auto}
  .md th,.md td{text-align:left;padding:7px 11px;border-bottom:1px solid var(--line);vertical-align:top}
  .md th{font:600 11px/1.3 var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--faint);background:#fbfcfe}
  .md td:first-child{font-family:var(--mono);font-size:11.5px;white-space:nowrap}
  .switch{display:inline-flex;background:#eef1f6;border-radius:9px;padding:3px;gap:3px;margin-bottom:16px}
  .switch button{appearance:none;border:none;background:none;font:600 12.5px/1 var(--sans);color:var(--muted);padding:8px 14px;border-radius:7px;cursor:pointer}
  .switch button[aria-selected="true"]{background:#fff;color:var(--primary);box-shadow:0 1px 2px rgba(0,0,0,.06)}
  .sview{display:none}.sview.on{display:block}
  .schema-lead{font-size:14px;color:var(--muted);max-width:76ch;margin:0 0 16px}
  pre.code{background:#0f1620;color:#cdd8e3;border-radius:11px;padding:16px 18px;overflow-x:auto;font-family:var(--mono);font-size:12.5px;line-height:1.65;margin:0}
  .foot{margin-top:56px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--faint)}
`;

const html = `<title>${cfg.title || 'Coverage report'}</title>
<meta name="description" content="${(cfg.description || cfg.lede || '').replace(/"/g, '&quot;')}">
<style>${css}</style>
<div class="wrap">
  ${cfg.eyebrow ? `<div class="eyebrow">${cfg.eyebrow}</div>` : ''}
  <h1>${cfg.title || 'Coverage report'}</h1>
  ${cfg.lede ? `<p class="lede">${cfg.lede}</p>` : ''}
  ${statsBar}
  <div class="tabs" role="tablist">${tabsBar}</div>
  ${panels}
  ${cfg.footer ? `<div class="foot">${cfg.footer}</div>` : ''}
</div>
<script>
  function go(id, el){
    document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected','false'));
    el.setAttribute('aria-selected','true');
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
    document.getElementById('p-'+id).classList.add('on');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function sw(el, id){
    el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected','false'));
    el.setAttribute('aria-selected','true');
    var panel = el.closest('.panel');
    panel.querySelectorAll('.sview').forEach(v=>v.classList.remove('on'));
    document.getElementById(id).classList.add('on');
  }
</script>`;

const OUT = process.env.REPORT_OUT || path.join(os.tmpdir(), 'coverage-report.html');
fs.writeFileSync(OUT, html);
console.log('wrote', OUT, '·', mode, 'mode ·', html.length, 'chars · tabs', tabs.length,
  '· stats', JSON.stringify(stats.map((s) => `${s.label}=${s.value}`)));
console.log(cfg.artifactUrl
  ? 'publish: Artifact tool, file_path=' + OUT + ', url=' + cfg.artifactUrl
  : 'publish: Artifact tool (no url yet) → paste the returned /code/artifact/<uuid> into config.artifactUrl');
