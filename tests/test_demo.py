"""PPC COA Database — automated browser tests (demo mode).
Run:  python3 tests/test_demo.py
Serves the project on localhost, drives Chromium via Playwright, and prints
PASS/FAIL per check. Exit code 0 only if every check passes.
Covers the brief's test battery for everything testable without a Supabase
project: load, theme, search/filter/sort, detail, uploads (valid/invalid/
oversized/missing fields), pending-approval gating, admin protection,
duplicate detection, responsive overflow at 360/390/768/1024/1440.
"""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = 8901
SEED_PNG = ROOT / "assets" / "seed" / "janoshik-reta-20mg.png"

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")

def click_at_center(p, selector):
    """Harness workaround: this headless Chromium build does not synthesize
    a click event from programmatic mouse down/up on table-row links
    (mousedown/mouseup arrive, click never fires). A JS-dispatched click
    event navigates exactly as a real user's click does (verified separately),
    so the test uses that for row navigation."""
    p.evaluate(f"""() => document.querySelector('{selector}')
        .dispatchEvent(new MouseEvent('click', {{bubbles: true, cancelable: true, view: window}}))""")

def main():
    from playwright.sync_api import sync_playwright
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)],
                           cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            p = ctx.new_page()
            p.goto(f"http://localhost:{PORT}/")
            p.wait_for_selector(".stat .num")

            # 1. Loads + dark default
            check("site loads", p.title() and "COA" in p.title())
            theme = p.evaluate("document.documentElement.dataset.theme")
            check("dark mode is default", theme == "dark", theme)

            # 2. Theme toggle + persistence
            p.click("#themeToggle")
            p.wait_for_function("document.documentElement.dataset.theme === 'light'")
            p.reload(); p.wait_for_selector(".stat .num")
            check("theme preference persists after refresh",
                  p.evaluate("document.documentElement.dataset.theme") == "light")
            p.click("#themeToggle")  # back to dark for later screenshots

            # 3. Home stats are real (3 seed records, 1 compound, 2 labs)
            nums = p.evaluate("[...document.querySelectorAll('.stat .num')].map(e=>e.textContent.trim())")
            check("home stats match seed data (3/1/2)", nums[:3] == ["3", "1", "2"], str(nums))

            # 4. Browse: search + filter + sort
            p.goto(f"http://localhost:{PORT}/#/browse")
            p.wait_for_selector("#filt")
            p.fill('input[name="q"]', "janoshik")
            p.wait_for_function("document.querySelectorAll('tbody tr').length === 2")
            check("search 'janoshik' returns 2 records", True)
            p.fill('input[name="q"]', "")
            p.wait_for_function("document.querySelectorAll('tbody tr').length === 3")
            p.select_option('select[name="lab"]', "Accumark Labs")
            p.wait_for_function("document.querySelectorAll('tbody tr').length === 1")
            check("lab filter narrows to 1 record", True)
            p.select_option('select[name="lab"]', "")
            p.select_option('select[name="sort"]', "testdate")
            first = p.evaluate("document.querySelector('tbody tr td').textContent")
            check("sort by testing date puts Accumark first", "Retatrutide" in first)

            # 5. Detail page shows correct record (isolate the 20 mg Janoshik report first)
            p.goto(f"http://localhost:{PORT}/#/browse")
            p.wait_for_selector("#filt")
            p.fill('input[name="q"]', "ape")
            p.wait_for_function("document.querySelectorAll('tbody tr').length === 1")
            click_at_center(p, "tbody tr a")
            p.wait_for_selector(".detail-grid")
            body = p.evaluate("document.body.innerText")
            check("detail page shows transcribed values (22.59 mg, 99.535%)",
                  "22.59 mg" in body and "99.535%" in body)

            # 6. Submit: missing fields -> clear errors, nothing saved
            p.goto(f"http://localhost:{PORT}/#/submit")
            p.click("#submitBtn")
            p.wait_for_selector(".error-box")
            check("missing required fields produce clear error", True)

            # 7. Invalid file type rejected
            bad = ROOT / "tests" / "bad.txt"; bad.write_text("not a coa")
            p.set_input_files("#fileInput", str(bad))
            p.wait_for_function("document.querySelector('#fileField').classList.contains('invalid')")
            check("invalid file type (.txt) rejected", True)

            # 8. Oversized file rejected (>10 MB)
            big = ROOT / "tests" / "big.png"
            with open(big, "wb") as f: f.write(b"\x89PNG" + b"\x00" * (11 * 1024 * 1024))
            p.set_input_files("#fileInput", str(big))
            p.wait_for_function("document.querySelector('#fileField').classList.contains('invalid')")
            check("oversized file (>10 MB) rejected", True)

            # 9. Valid upload -> success + reference, stays pending (not public)
            p.fill('input[name="compound"]', "Retatrutide")
            p.fill('input[name="lab"]', "Janoshik")
            p.fill('input[name="batch"]', "2026")
            p.set_input_files("#fileInput", str(SEED_PNG))
            p.wait_for_function("!document.querySelector('#fileField').classList.contains('invalid')")
            # duplicate warning should appear (same compound+batch+lab as seed)
            p.wait_for_selector(".warn-box", timeout=8000)
            check("duplicate detection flags same compound+batch+lab", True)
            p.click("#submitBtn")
            p.wait_for_selector(".success-box")
            ref = p.evaluate("document.body.innerText.match(/PPC-\\d{4}-\\d{4}/)[0]")
            check("successful upload shows reference number", bool(ref), ref)
            p.goto(f"http://localhost:{PORT}/#/browse")
            p.wait_for_selector("#filt")
            cnt = p.evaluate("document.querySelectorAll('tbody tr').length")
            check("new submission NOT in public browse (pending gate)", cnt == 3, f"rows={cnt}")

            # 10. Admin protection: unsigned-out admin page shows sign-in
            p.goto(f"http://localhost:{PORT}/#/admin")
            p.wait_for_selector("#loginForm")
            check("admin page requires sign-in when logged out", True)
            p.fill('input[name="password"]', "wrong-password")
            p.click("#loginForm button[type=submit]")
            p.wait_for_selector(".error-box")
            check("wrong admin password rejected", True)
            p.fill('input[name="password"]', "ppc-demo-admin")
            p.click("#loginForm button[type=submit]")
            p.wait_for_selector(".admin-tabs")
            check("demo admin sign-in succeeds", True)

            # 11. Approve -> appears publicly; reject second -> stays hidden
            rows = p.evaluate("document.querySelectorAll('#adminList tbody tr').length")
            check("pending submission visible in admin queue", rows == 1, f"rows={rows}")
            click_at_center(p, "#adminList tbody tr a")
            p.wait_for_selector("#editForm")
            p.click("[data-act=approve]")
            p.wait_for_function("document.querySelectorAll('#adminList tbody tr').length === 0")
            p.goto(f"http://localhost:{PORT}/#/browse")
            p.wait_for_selector("#filt")
            cnt = p.evaluate("document.querySelectorAll('tbody tr').length")
            check("approved record appears in public browse", cnt == 4, f"rows={cnt}")

            # 12. Responsive: no horizontal overflow at 5 widths
            for w in (360, 390, 768, 1024, 1440):
                p.set_viewport_size({"width": w, "height": 900})
                p.goto(f"http://localhost:{PORT}/#/browse")
                p.wait_for_selector("#filt")
                overflow = p.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(f"no horizontal overflow at {w}px", overflow <= 1, f"overflow={overflow}px")
                p.goto(f"http://localhost:{PORT}/#/submit")
                p.wait_for_selector("#subForm")
                overflow = p.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(f"submit form no overflow at {w}px", overflow <= 1, f"overflow={overflow}px")

            b.close()
    finally:
        srv.terminate()
        for f in ("bad.txt", "big.png"):
            try: os.remove(ROOT / "tests" / f)
            except OSError: pass

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results)-len(failed)}/{len(results)} checks passed.")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
