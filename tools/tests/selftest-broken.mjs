// Self-test of the runner: a page that throws must fail the run.
export const demo = '_broken.html';
export async function run(page, check) {
  check('page loaded', true);
}
