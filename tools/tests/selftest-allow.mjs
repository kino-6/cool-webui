// Self-test of the runner: allowConsole hides only the matching console errors.
export const demo = '_allow.html';
export const allowConsole = /ALLOWED/;
export async function run(page, check) {
  check('page loaded', true);
}
