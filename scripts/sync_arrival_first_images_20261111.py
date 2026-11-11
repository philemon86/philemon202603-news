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
PRODUCTS = ["p9p10p11p12"]
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
    """Swap only the third arrival card; leave all other book/newsletter content intact."""
    languages = {
        "index.html": {
            "old_title":"百週年紀念水滴鋼珠筆",
            "title":"TJC LOGO／貓狗躲躲筆",
            "old_detail":"0.5mm 按壓式・多款顏色",
            "detail":"0.5mm・四款貓狗造型",
            "old_intro":"百週年紀念鋼珠筆",
            "intro":"貓狗躲躲筆",
            "old_alt":"百週年紀念水滴鋼珠筆",
            "alt":"TJC LOGO／貓狗躲躲筆",
        },
        "zh-cn.html": {
            "old_title":"百周年纪念水滴钢珠笔",
            "title":"TJC LOGO／猫狗躲躲笔",
            "old_detail":"0.5mm 按压式・多款颜色",
            "detail":"0.5mm・四款猫狗造型",
            "old_intro":"百周年纪念钢珠笔",
            "intro":"猫狗躲躲笔",
            "old_alt":"百周年纪念水滴钢珠笔",
            "alt":"TJC LOGO／猫狗躲躲笔",
        },
        "en.html": {
            "old_title":"Centennial Retractable Gel Pens",
            "title":"TJC Cat & Dog Peekaboo Pens",
            "old_detail":"0.5mm · Multiple colors",
            "detail":"0.5mm · Four cat & dog styles",
            "old_intro":"centennial pens",
            "intro":"cat-and-dog peekaboo pens",
            "old_alt":"Centennial pens",
            "alt":"TJC Cat & Dog Peekaboo Pens",
        },
    }
    card_pattern = re.compile(
        r'<a class="arrival-card" href="https://www\.pbooks\.com\.tw/products/p5p6p7"[\s\S]*?</a>'
    )
    for lang in LANGUAGES:
        path = ROOT / "2026-11" / lang
        text = path.read_text(encoding="utf-8")
        cfg = languages[lang]
        cards = list(card_pattern.finditer(text))
        if len(cards) != 1:
            raise RuntimeError(f"{lang}: expected one old pen card, found {len(cards)}")
        card = cards[0].group(0)
        for old, new in [
            ("https://www.pbooks.com.tw/products/p5p6p7","https://www.pbooks.com.tw/products/p9p10p11p12"),
            ("assets/arrivals/p5p6p7.webp","assets/arrivals/p9p10p11p12.webp"),
            ("P5 / P6 / P7","P9 / P10 / P11 / P12"),
            ("NT$15–20","NT$29"),
            (cfg["old_title"],cfg["title"]),
            (cfg["old_detail"],cfg["detail"])
        ]:
            if old not in card:
                raise RuntimeError(f"{lang}: could not find expected {old!r} in product card")
            card = card.replace(old, new)
        if cfg["old_alt"] != cfg["old_title"]:
            if cfg["old_alt"] not in card:
                raise RuntimeError(f"{lang}: original image alt missing")
            card = card.replace(cfg["old_alt"], cfg["alt"])
        text = text[:cards[0].start()] + card + text[cards[0].end():]
        if cfg["old_intro"] not in text:
            raise RuntimeError(f"{lang}: original introduction missing")
        text = text.replace(cfg["old_intro"], cfg["intro"], 1)
        # The earlier square-photo update is already present. Enforce it without
        # changing layout or downloading any additional photos.
        if "/* Arrival photos are genuinely square" not in text:
            square_css = """
/* All real product photographs are square on desktop and mobile. */
.stock-arrivals .arrival-art { aspect-ratio:1/1; min-height:0; max-height:none; }
.stock-arrivals .arrival-art img {
  width:100%;height:100%;max-height:none;aspect-ratio:1/1;
  padding:0;object-fit:contain;display:block;
}
@media(max-width:680px) {
  .stock-arrivals .arrival-art {aspect-ratio:1/1;min-height:0;max-height:none;}
  .stock-arrivals .arrival-art img {max-height:none;padding:0;}
}
"""
            text=text.replace("</style>",square_css+"</style>",1)
        if "p5p6p7.webp" in text or "products/p5p6p7" in text:
            raise RuntimeError(f"{lang}: obsolete pen link/image remains")
        if text.count('class="arrival-card') != 4:
            raise RuntimeError(f"{lang}: expected four product cards")
        path.write_text(text, encoding="utf-8")
        print(f"HTML_OK {lang}: first photo 1:1; replaced original pen by P9/P10/P11/P12",flush=True)


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    code = "p9p10p11p12"
    page = f"https://www.pbooks.com.tw/products/{code}"
    first, candidates = parse_product_image(page)
    source, width, height, bytesize = download_photo(candidates, code)
    manifest = TARGET / "sources.json"
    previous = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else {}
    previous.pop("p5p6p7", None)
    previous[code] = {
        "product":page,"source_image":source,
        "dimensions":[width,height],"bytes":bytesize
    }
    replace_cards()
    manifest.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    obsolete = TARGET / "p5p6p7.webp"
    if obsolete.exists():
        obsolete.unlink()
    print("ALL_PRODUCTS_OK",flush=True)


if __name__ == "__main__":
    main()
