// The ES module build really is a module: import it and read its exports and its version.
import { readFileSync } from 'node:fs';
export const demo = 'blank.html';
export async function run(page, check) {
  const src = readFileSync('dist/cw.js').toString('base64');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const got = await page.evaluate(async (b64) => {
    const m = await import('data:text/javascript;base64,' + b64);
    return { define: typeof m.define, stage: typeof m.CwStage, version: m.version, registered: !!customElements.get('cw-stage') };
  }, src);
  check('ESM exports define and CwStage', got.define === 'function' && got.stage === 'function');
  check('importing registers the elements', got.registered);
  check(`version comes from package.json (${got.version} = ${pkg})`, got.version === pkg);
}
