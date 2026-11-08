// Compare every variable in the theme table of docs/design/components.md with themes/tile.css and themes/glass.css.
// `node tools/check_theme_tokens.mjs game` compares the game table with themes/game.css instead.
// Font cells name the first family; every other cell must equal the CSS value (case and spaces ignored).
import { readFileSync } from 'node:fs';

const doc = readFileSync('docs/design/components.md', 'utf8');
const css = (name) => Object.fromEntries([...readFileSync(`themes/${name}.css`, 'utf8').matchAll(/(--cw-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const norm = (s) => s.replace(/`/g, '').replace(/\s+/g, '').toLowerCase();
const same = (name, got, want) => got !== undefined && (name.endsWith('font')
  ? norm(got.split(',')[0]).replace(/'/g, '') === norm(want)
  : norm(got) === norm(want));

if (process.argv[2] === 'game') {
  const part = doc.slice(doc.indexOf('### ゲームの見た目'), doc.indexOf('### 背景と透明'));
  const table = [...part.matchAll(/^\| `(--cw-[a-z-]+)` \| [^|]+ \| ([^|]+) \|$/gm)];
  const game = css('game');
  let ok = 0, bad = 0;
  for (const [, name, want] of table) {
    if (same(name, game[name], want)) ok++;
    else { bad++; console.log(`FAIL game ${name}: table ${want.trim()} / css ${game[name]}`); }
  }
  for (const name of Object.keys(game)) if (!table.some((r) => r[1] === name)) { bad++; console.log(`FAIL game ${name}: in the CSS but not in the table`); }
  console.log(bad || ok === 0 ? `TOKENS FAIL (${bad})` : `TOKENS OK (${ok})`);
  process.exit(bad || ok === 0 ? 1 : 0);
}
const section = doc.slice(doc.indexOf('### 配色と書体'), doc.indexOf('### ゲームの見た目'));
const rows = [...section.matchAll(/^\| `(--cw-[a-z-]+)` \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/gm)];
const themes = { tile: css('tile'), glass: css('glass') };

let ok = 0, bad = 0;
for (const [, name, tile, glass] of rows) {
  for (const [theme, want] of [['tile', tile], ['glass', glass]]) {
    const got = themes[theme][name];
    const match = same(name, got, want);
    if (match) ok++;
    else { bad++; console.log(`FAIL ${theme} ${name}: table ${want.trim()} / css ${got}`); }
  }
}
for (const theme of Object.keys(themes)) {
  for (const name of Object.keys(themes[theme])) {
    if (!rows.some((r) => r[1] === name)) { bad++; console.log(`FAIL ${theme} ${name}: in the CSS but not in the table`); }
  }
}
console.log(bad || ok === 0 ? `TOKENS FAIL (${bad})` : `TOKENS OK (${ok})`);
process.exit(bad || ok === 0 ? 1 : 0);
