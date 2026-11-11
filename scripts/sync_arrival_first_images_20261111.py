#!/usr/bin/env python3
"""One-time safe sync of each CYBERBIZ product's first photo into the November newsletter."""
from __future__ import annotations

import io
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ["pg11b", "pg11", "p5p6p7", "pg49"]
TARGET = ROOT / "2026-11/assets/arrivals"
LANGUAGES = ("index.html", "zh-cn.html", "en.html")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PhilemonImageSync/1.0; +https://www.philemon.com.tw/)",
           "Accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8"}
S = requests.Session()
S.headers.update(HEADERS)

def parse_product_image(url: str) -> tuple[str, list[str]]:
    r = S.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    # CYBERBIZ documentation: the OG image defaults to the product's first photo.
    # A product may override the OG thumbnail, so use Product JSON-LD first if available.
    ld_candidates = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            obj = json.loads(script.string or script.text)
        except (ValueError, TypeError):
            continue
        def visit(v):
            if isinstance(v, list):
                for i in v:
                    visit(i)
            elif isinstance(v, dict):
                kind = v.get("@type", "")
                if "Product" in (kind if isinstance(kind, list) else [kind]):
                    im = v.get("image", [])
                    if isinstance(im, dict):
                        im = [im.get("url") or im.get("contentUrl")]
                    if isinstance(im, str):
                        im = [im]
                    if isinstance(im, list):
                        for x in im:
                            if isinstance(x, str):
                                ld_candidates.append(x)
                            elif isinstance(x, dict):
                                ld_candidates.append(x.get("url") or x.get("contentUrl"))
                for key in ("@graph", "mainEntity", "itemListElement"):
                    if key in v:
                        visit(v[key])
        visit(obj)
    candidates = [x for x in ld_candidates if x]
    for sel in ('meta[property="og:image"]','meta[property="og:image:secure_url"]','meta[name="twitter:image"]'):
        tag = soup.select_one(sel)
        if tag and tag.get("content"):
            candidates.append(tag["content"])
    # Product slider image is the last fallback when structured data is missing.
    for tag in soup.select('img[itemprop="image"], .product-images img, .product-image img, .product_gallery img, .product-gallery img'):
        s = tag.get("data-src") or tag.get("src") or tag.get("data-original")
        if s:
            candidates.append(s)
    candidates = list(dict.fromkeys(urljoin(r.url, str(x)) for x in candidates))
    if not candidates:
        raise RuntimeError(f"No first product photo found in HTML/OG/JSON-LD for {url}; do not use a generic image.")
    return candidates[0], candidates

def download_photo(candidates: list[str], code: str) -> tuple[str,int,int,int]:
    problems = []
    for source in candidates:
        try:
            parsed = urlparse(source)
            if parsed.scheme != "https":
                raise ValueError("non-HTTPS image source")
            resp = S.get(source, timeout=30, headers={"Referer": f"https://www.pbooks.com.tw/products/{code}"})
            resp.raise_for_status()
            if len(resp.content) > 14_000_000:
                raise ValueError("source file exceeds 14 MB")
            im = Image.open(io.BytesIO(resp.content))
            im.load()
            if min(im.size) < 180:
                raise ValueError(f"image too small {im.size}")
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((800, 800), Image.Resampling.LANCZOS)
            out = TARGET / f"{code}.webp"
            im.save(out, "WEBP", quality=81, method=6)
            print(f"IMAGE_OK {code}: {source} -> {out} ({im.width}x{im.height}, {out.stat().st_size} bytes)", flush=True)
            return source, im.width, im.height, out.stat().st_size
        except Exception as ex:
            problems.append(f"{source}: {ex}")
    raise RuntimeError(f"All image candidates failed for {code}: {'; '.join(problems)}")

def replace_cards():
    disclaimer_old = {
        "index.html": "商品圖為簡約示意，實際花色、款式、價格與庫存請以商品頁為準。",
        "zh-cn.html": "商品图为简约示意，实际花色、款式、价格与库存请以商品页为准。",
        "en.html": "Artwork is illustrative. See each product page for actual patterns, colors, pricing and availability."
    }
    disclaimer_new = {
        "index.html": "照片取自各商品頁的第一張商品圖；實際花色、款式、價格與庫存請以商品頁為準。",
        "zh-cn.html": "照片取自各商品页的第一张商品图；实际花色、款式、价格与库存请以商品页为准。",
        "en.html": "Photos are the first product images from the store. Check each product page for available patterns, colors, pricing and stock."
    }
    css = """
/* Product-first photos: one shared locally optimized WebP per product for all three locales. */
.stock-arrivals .arrival-art img {
  display:block;width:100%;height:100%;max-height:220px;object-fit:contain;
  padding:8px 12px;box-sizing:border-box;
}
@media(max-width:680px) {
  .stock-arrivals .arrival-art img {max-height:165px;padding:5px;}
}
"""
    for lang in LANGUAGES:
        path = ROOT / "2026-11" / lang
        text = path.read_text(encoding="utf-8")
        if ".stock-arrivals .arrival-art img" not in text:
            text = text.replace("</style>", css + "\n</style>", 1)
        for code in PRODUCTS:
            # Each thumbnail belongs to an explicit product URL, and each must be replaced once.
            pattern = re.compile(
                r'(<a class="arrival-card(?: featured)?" href="https://www\.pbooks\.com\.tw/products/'
                + re.escape(code)
                + r'"[\s\S]*?<figure class="arrival-art" aria-hidden="true">)'
                + r'(<svg[\s\S]*?</svg>)'
                + r'(</figure>)'
            )
            alt = {
                "pg11b": ("百週年紀念聖經專用布套","百周年纪念圣经专用布套","Centennial Bible fabric cover"),
                "pg11": ("讚美詩布套","赞美诗布套","Hymnbook fabric cover"),
                "p5p6p7": ("百週年紀念水滴鋼珠筆","百周年纪念水滴钢珠笔","Centennial pens"),
                "pg49": ("讚美詩壓克力鑰匙圈","赞美诗亚克力钥匙圈","Hymn-inspired acrylic keychain")
            }[code][LANGUAGES.index(lang)]
            repl = rf'\g<1><img src="assets/arrivals/{code}.webp" alt="{alt}" loading="lazy" decoding="async" width="800" height="800">\g<3>'
            text, n = pattern.subn(repl, text)
            if n != 1:
                raise RuntimeError(f"{lang} {code}: Expected exactly 1 matching product SVG; got {n}")
        a, b = disclaimer_old[lang], disclaimer_new[lang]
        if a not in text:
            raise RuntimeError(f"Original image notice not found in {lang}")
        text = text.replace(a, b, 1)
        path.write_text(text, encoding="utf-8")
        print(f"HTML_OK {lang}: real product images and updated disclaimer", flush=True)

def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    results = {}
    for code in PRODUCTS:
        page = f"https://www.pbooks.com.tw/products/{code}"
        candidate, candidates = parse_product_image(page)
        source, width, height, bytesize = download_photo(candidates, code)
        results[code] = {"product":page,"source_image":source,"dimensions":[width,height],"bytes":bytesize}
    replace_cards()
    (TARGET / "sources.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ALL_PRODUCTS_OK",flush=True)

if __name__ == "__main__":
    main()
