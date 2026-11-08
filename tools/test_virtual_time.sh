#!/usr/bin/env bash
# A suite that exports virtualTime runs on Chrome's virtual clock: a minute of the page's time passes at once,
# in order, and the page still loads and navigates; other suites keep the real clock.
set -u
unset CW_GATE_CACHE
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
trap 'rm -f tools/tests/selftest-vt-*.mjs' EXIT
cat > tools/tests/selftest-vt-on.mjs <<'S'
export const demo = 'blank.html';
export const virtualTime = true;
export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const t0 = performance.now(), d0 = Date.now(), order = [];
    setTimeout(() => order.push('b'), 40000); setTimeout(() => order.push('a'), 20000);
    await window.__wait(60000);
    return { perf: performance.now() - t0, date: Date.now() - d0, order: order.join('') };
  });
  check(`a minute passes in the page (${r.perf}, ${r.date})`, r.perf > 59999 && r.perf < 60100 && r.date >= 60000 && r.date < 60100);
  check(`timers fire in their order (${r.order})`, r.order === 'ab');
  await new Promise((r) => setTimeout(r, 300));
  const after = await page.evaluate(() => performance.now());
  await page.wait(1000);
  const moved = await page.evaluate(() => performance.now()) - after;
  check(`between waits the clock stands still, page.wait moves it (${moved})`, moved > 999 && moved < 1100);
  await page.goto(page.url(), { waitUntil: 'load' });
  const t = await page.evaluate(async () => { const t0 = performance.now(); await window.__wait(5000); return performance.now() - t0; });
  check(`after a navigation the clock is virtual again (${t})`, t > 4999 && t < 5100);
}
S
cat > tools/tests/selftest-vt-off.mjs <<'S'
export const demo = 'blank.html';
export async function run(page, check) {
  const t = await page.evaluate(async () => { const t0 = performance.now(); await new Promise((r) => setTimeout(r, 400)); return performance.now() - t0; });
  check(`without virtualTime the clock is real (${t})`, t >= 400 && t < 2000);
}
S
s=$(date +%s%N); out=$(node tools/test_components.mjs selftest-vt-on selftest-vt-off); rc=$?; ms=$(( ($(date +%s%N) - s) / 1000000 ))
printf '%s\n' "$out" | grep -v '^COMPONENTS'
chk "both suites pass" "[ $rc -eq 0 ]"
chk "a minute and more of page time took a few seconds ($ms ms)" "[ $ms -lt 8000 ]"
[ $fail = 0 ] && echo "VIRTUALTIME OK" || { echo "VIRTUALTIME FAIL"; exit 1; }
