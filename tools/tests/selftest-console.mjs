// Self-test of the runner: a page that only logs a console error must fail the run.
export const demo = '_console.html';
export async function run(page, check) {
  check('page loaded', true);
}
