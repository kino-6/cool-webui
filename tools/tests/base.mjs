// The bundle loads, exposes its version, and survives being loaded twice.
export const demo = 'base.html';
export async function run(page, check) {
  check('version exposed', await page.evaluate(() => typeof cw.version === 'string'));
  check('version shown', (await page.$eval('#out', (e) => e.textContent)).startsWith('cw '));
  check('define guards a taken name', await page.evaluate(() => {
    class A extends HTMLElement {}
    cw.define('cw-probe', A);
    cw.define('cw-probe', class extends HTMLElement {});
    return customElements.get('cw-probe') === A;
  }));
}
