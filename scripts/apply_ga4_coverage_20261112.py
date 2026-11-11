#!/usr/bin/env python3
"""One-time migration: consistent GA4 across Philemon public content + C300->C296 wheel.
No GA4 property or API credentials required. Static site only; no personal data sent.
"""
from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]
TAG = "G-JD1JHF86H1"
SCRIPT_MARKER = "ga4-unified.js?v=20261112"
TARGETS = [
    "index.html",
    *[f"{issue}/{language}" for issue in ("2026-03","2026-04","2026-05","2026-06","2026-09","2026-11")
      for language in ("index.html","zh-cn.html","en.html")],
    "2026-05/book/index.html",
    "2026-08/index.html",   # Wrapper view only; embedded external website is separate.
    *[f"c{n}/index.html" for n in range(290,301)],
    "c298/en.html", "c298/zh-cn.html",
    "c002/index.html", "c136/index.html", "c185/index.html",
    "cup/index.html", "2026-luggage/index.html",
    "book/index.html", "bookstore/index.html", "first/index.html",
    "timeline/index.html",
    "shirt/index.html", "shirt/banner.html", "shirt/size-guide.html",
    "2027calendar/index.html",
    "soonsoonbible/index.html", "soonsoonbible/rankings.html",
]
# Preserve redirect-only routes (/2026-07/, /C299/, /camp/) and
# third-party iframe content (/2026-08/, /2027calendar/) unchanged.
# Existing music/analytics.js already sets GA4 and records real playback starts.

WHEEL_RE = re.compile(
    r'(?P<slot><div class="dish-slot" style="--angle:\s*\d+deg;">'
    r'\s*<div class="book-plate">\s*<button\b[\s\S]*?</button>'
    r'\s*</div>\s*</div>)'
)
BOOK_ORDER = [
    "c300", "c299", "c298", "c297",
    "c296-01", "c296-02", "c296-03", "c296-04"
]

def reorder_wheel(html: str, path: str):
    if path not in {"2026-11/index.html", "2026-11/en.html", "2026-11/zh-cn.html"}:
        return html
    wheel_start = html.find('class="turntable-wheel"')
    wheel_end = html.find('id="turntableOrderDialog"', wheel_start)
    if wheel_start < 0 or wheel_end < 0:
        raise ValueError(f"{path}: rotating table not found")
    region = html[wheel_start:wheel_end]
    matches = list(WHEEL_RE.finditer(region))
    if len(matches) != 8:
        raise ValueError(f"{path}: expected 8 original book slots, got {len(matches)}")
    mapping = {}
    for match in matches:
        block = match.group("slot")
        src = re.search(r'<img\b[^>]*\bsrc="([^"]+)"', block)
        if src is None:
            raise ValueError(f"{path}: book cover image missing")
        url = src.group(1).lower()
        if "c296-" in url:
            key = re.search(r'c296-0[1-4]', url).group(0)
        else:
            p = re.search(r'c(?:297|298|299|300)', url)
            if p is None:
                raise ValueError(f"{path}: unrecognized cover {url}")
            key = p.group(0)
        if key in mapping:
            raise ValueError(f"{path}: duplicate cover {key}")
        mapping[key] = block
    if set(mapping) != set(BOOK_ORDER):
        raise ValueError(f"{path}: missing books: {set(BOOK_ORDER) - set(mapping)}")
    arranged = []
    for i, key in enumerate(BOOK_ORDER):
        angle = i * 45
        html_block = re.sub(r'--angle:\s*\d+deg', f'--angle: {angle}deg', mapping[key], count=1)
        if key == "c300":
            html_block = html_block.replace('loading="eager"', 'loading="eager" fetchpriority="high"')
        arranged.append(html_block)
    region = region[:matches[0].start()] + "\n\n          ".join(arranged) + region[matches[-1].end():]
    html = html[:wheel_start] + region + html[wheel_end:]
    # Confirm that the ordered product links are really the intended sequence.
    found = [
        re.search(r'<img\b[^>]*\bsrc="([^"]+)"', m.group("slot")).group(1).lower()
        for m in WHEEL_RE.finditer(region)
    ]
    identified = [re.search(r'c296-0[1-4]|c(?:297|298|299|300)', u).group(0) for u in found]
    if identified != BOOK_ORDER:
        raise ValueError(f"{path}: failed rotation ordering: {identified}")
    return html

def inject_ga(html: str, path: str):
    if SCRIPT_MARKER in html:
        return html, "already_patched"
    legacy = bool(re.search(r'googletagmanager\.com/gtag/js',html, re.I)) and bool(re.search(
        r'gtag\s*\(\s*["\']config["\']', html))
    if not legacy and TAG in html:
        raise ValueError(f"{path}: existing GA4 measurement found without normal bootstrap; inspect manually")
    legacy_purchase = bool(re.search(r'gtag\s*\(\s*["\']event["\']\s*,\s*["\']purchase_link_click["\']', html))
    embedded = path == "shirt/banner.html"
    insert = ('<script defer src="/assets/js/ga4-unified.js?v=20261112"'
              f' data-legacy-ga="{int(legacy)}"'
              f' data-legacy-purchase="{int(legacy_purchase)}"'
              f' data-embedded="{int(embedded)}"></script>\n')
    matches = list(re.finditer(r'</head\s*>', html, re.I))
    if len(matches) != 1:
        raise ValueError(f"{path}: invalid head closing tag count: {len(matches)}")
    at = matches[0].start()
    return html[:at] + insert + html[at:], "legacy" if legacy else ("embedded_no_pageview" if embedded else "new")

def patch_banner_success():
    # The public banner submits through a Google Bridge; this fires only after
    # the Bridge confirms success. No name/church/contact is ever transmitted.
    path = ROOT / "shirt/banner.js"
    html = path.read_text(encoding="utf-8")
    if "shirt_interest_submit_success" in html:
        return "already_patched"
    needle = "setStatus('登記成功，已送出 '+n+' 件意向。','success');"
    if html.count(needle) != 1:
        raise ValueError("shirt/banner.js: cannot locate exact confirmed-success callback")
    replacement = needle + (
        "\n    if(typeof window.gtag==='function')window.gtag('event','shirt_interest_submit_success',"
        "{item_category:'anniversary_shirt',quantity:n,form_variant:'banner'});"
    )
    path.write_text(html.replace(needle,replacement),encoding="utf-8")
    return "tracked_verified_success"

def main():
    summary = []
    if not (ROOT/"assets/js/ga4-unified.js").is_file():
        raise ValueError("Missing shared GA4 script")
    if len(TARGETS) != len(set(TARGETS)):
        raise ValueError("Duplicate tracked path")
    for rel in TARGETS:
        path = ROOT / rel
        if not path.is_file():
            raise ValueError(f"Missing target: {rel}")
        contents = path.read_text(encoding="utf-8-sig")
        before = contents
        contents = reorder_wheel(contents, rel)
        contents, mode = inject_ga(contents, rel)
        if contents.count(SCRIPT_MARKER) != 1:
            raise ValueError(f"{rel}: GA4 injected more or less than once")
        if rel.startswith("2026-11/"):
            bookregion = contents[contents.find('class="turntable-wheel"'):contents.find('id="turntableOrderDialog"')]
            found = [re.search(r'c296-0[1-4]|c(?:297|298|299|300)',r).group(0)
              for r in re.findall(r'<img\b[^>]*src="([^"]+)"',bookregion) if re.search(r'c296-0[1-4]|c(?:297|298|299|300)',r)]
            if found != BOOK_ORDER:
                raise ValueError(f"{rel}: wrong post-change rotation order {found}")
        if contents != before:
            path.write_text(contents,encoding="utf-8")
        summary.append({"path":rel,"mode":mode,"updated":contents!=before,
                        "language":re.search(r'<html\b[^>]*lang=["\']([^"\']+)',contents,re.I).group(1)
                          if re.search(r'<html\b[^>]*lang=["\']([^"\']+)',contents,re.I) else "und"})
    banner = patch_banner_success()
    report = {
        "measurementId":TAG,
        "scope":"github-static-code",
        "trackedPages":len(summary),
        "GA4SetupModeCounts":{k:sum(x["mode"]==k for x in summary) for k in
              ("legacy","new","embedded_no_pageview","already_patched")},
        "order":["C300","C299","C298","C297","C296-01","C296-02","C296-03","C296-04"],
        "bannerSuccessTracking":banner,
        "externalIframeNote":"Cross-origin iframe content must carry its own GA4. Parent wrapper views only.",
        "redirectsSkipped":["2026-07/","camp/","C299/"],
        "pages":summary
    }
    destination = ROOT / "docs/ga4-coverage-20261112.json"
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
    print("GA4_COVERAGE_SUCCESS",flush=True)

if __name__=="__main__":
    main()
