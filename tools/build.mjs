// Build the component bundles: dist/cw.js (ES module) and dist/cw.iife.js (classic script for file:// and OBS).
import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// inside one full gate the tree does not change, so the first build serves every row (CW_GATE_CACHE, tools/full_gate.py)
const once = process.env.CW_GATE_CACHE && resolve(process.env.CW_GATE_CACHE, 'built');
if (once && existsSync(once)) {
  console.log('built already in this full gate');
  process.exit(0);
}

// start from an empty dist so a stale file can never stand in for a removed entry
rmSync('dist', { recursive: true, force: true });

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

const common = { entryPoints: ['src/index.js'], bundle: true, minify: true, target: 'es2022', logLevel: 'warning', define: { __CW_VERSION__: JSON.stringify(version) } };
await build({ ...common, format: 'esm', outfile: 'dist/cw.js' });
await build({ ...common, format: 'iife', globalName: 'cw', outfile: 'dist/cw.iife.js' });
const card = { ...common, entryPoints: ['integrations/ha-card.js'], loader: { '.css': 'text' } };
await build({ ...card, format: 'esm', outfile: 'dist/cw-ha-card.js' });
await build({ ...card, format: 'iife', outfile: 'dist/cw-ha-card.iife.js' });
await build({ ...common, entryPoints: ['src/source.js'], format: 'esm', outfile: 'dist/cw-source.js' });
await build({ ...common, entryPoints: ['src/source.js'], format: 'iife', outfile: 'dist/cw-source.iife.js' });
if (once) writeFileSync(once, '');
console.log('built dist/cw.js dist/cw.iife.js dist/cw-ha-card.js dist/cw-ha-card.iife.js dist/cw-source.js dist/cw-source.iife.js');
