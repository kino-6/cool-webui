// Self-test of the runner: a page with only allowed console errors passes.
export const demo = '_allow.html?only';
export const allowConsole = /ALLOWED/;
export async function run(page, check) {
  check('page loaded', true);
}
