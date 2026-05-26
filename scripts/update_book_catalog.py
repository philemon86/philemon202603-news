import argparse
import json
import re
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://www.pbooks.com.tw/products/"
ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "book" / "products.json"


session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (book-catalog-updater)"})


def clean_text(value):
    if not value:
        return ""
    value = BeautifulSoup(str(value), "html.parser").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", unescape(value)).strip()


def only_numbers(text):
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", text or "")]


def normalize_code(value):
    match = re.search(r"C\d{3}", value or "", re.I)
    return match.group(0).upper() if match else ""


def first_code_number(value):
    match = re.search(r"C(\d{3})", value or "", re.I)
    return int(match.group(1)) if match else 0


def split_people(value):
    if not value:
        return []
    parts = re.split(r"[、,，／/]+", value)
    return [p.strip() for p in parts if p.strip()]


def parse_price_from_variants(html_text):
    match = re.search(r'productVariantsInfo\s*:\s*"([^"]+)"', html_text)
    if not match:
        return None
    candidates = []
    for segment in match.group(1).split("|"):
        parts = segment.split(",")
        if len(parts) < 5:
            continue
        try:
            candidates.append(float(parts[4]))
        except ValueError:
            pass
    return min(candidates) if candidates else None


def extract_images(html_text, base_url):
    gallery = []
    match = re.search(r"imgSrc\s*:\s*\[(.*?)\]", html_text, re.S)
    if match:
        for raw_url in re.findall(r'["\']([^"\']+)["\']', match.group(1)):
            if not raw_url:
                continue
            url = raw_url
            if url.startswith("//"):
                url = "https:" + url
            elif url.startswith("/"):
                url = urljoin(base_url, url)
            key = url.split("?")[0]
            if key and key not in [item.split("?")[0] for item in gallery]:
                gallery.append(url)

    if not gallery:
        og = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html_text)
        if og:
            url = og.group(1)
            gallery.append("https:" + url if url.startswith("//") else url)

    return gallery[0] if gallery else "", gallery[1:3]


def extract_brief_fields_from_html(brief_html):
    soup = BeautifulSoup(brief_html or "", "html.parser")
    for br in soup.find_all("br"):
        br.replace_with("\n")
    text = soup.get_text("\n", strip=True)
    text = re.sub(r"\n+", "\n", text)

    fields = {}
    labels = ["商品編號", "ISBN", "作者", "出版社", "出版日期", "語言"]
    for index, label in enumerate(labels):
        next_labels = labels[index + 1 :]
        if next_labels:
            lookahead = "|".join(re.escape(item + "：") for item in next_labels)
            pattern = rf"{re.escape(label)}：\s*(.*?)(?=\n?(?:{lookahead})|$)"
        else:
            pattern = rf"{re.escape(label)}：\s*(.*)$"
        match = re.search(pattern, text, re.S)
        if match:
            fields[label] = re.sub(r"\s+", " ", match.group(1)).strip()
    return fields, text


def extract_intro_and_catalog(soup):
    heading = soup.find("h5", string=re.compile("商品介紹"))
    intro_parts = []
    catalog_items = []
    if not heading:
        return "", []

    section = heading.find_next("div", class_="ckeditor")
    if not section:
        return "", []

    found_catalog = False
    for part in section.find_all(["p", "ul", "li", "h5", "div"], recursive=True):
        text = part.get_text(" ", strip=True)
        if not text:
            continue
        if re.search(r"【(作者序|出版序|作者介紹|其他資料)】", text):
            break
        if "【目錄】" in text:
            found_catalog = True
            continue
        if found_catalog:
            catalog_items.append(text)
        else:
            intro_parts.append(text)

    intro = " ".join(intro_parts)
    intro = re.sub(r"\s+", " ", intro).strip()
    return intro, catalog_items


def parse_product_page(slug, html_text, url):
    soup = BeautifulSoup(html_text, "html.parser")
    title_el = soup.select_one(".product_title h1")
    title = clean_text(title_el)
    if not title:
        return None

    code = normalize_code(title) or normalize_code(slug)
    if not code:
        return None

    slogan = clean_text(soup.select_one(".product_slogan"))
    price = parse_price_from_variants(html_text)
    if price is None:
        price_numbers = only_numbers(clean_text(soup.select_one(".price")))
        del_numbers = only_numbers(clean_text(soup.select_one("del")))
        price = max(del_numbers or price_numbers or [0])

    brief_el = soup.select_one(".product_brief")
    brief_html = str(brief_el) if brief_el else ""
    fields, brief_text = extract_brief_fields_from_html(brief_html)
    intro, catalog = extract_intro_and_catalog(soup)
    image, inner_images = extract_images(html_text, url)

    author = fields.get("作者", "")
    publication_date = fields.get("出版日期", "")
    language_and_format = fields.get("語言", "")
    page_match = re.search(r"(\d+)\s*頁", brief_text)
    pages = int(page_match.group(1)) if page_match else None

    return {
        "code": code,
        "slug": slug,
        "title": title,
        "title_clean": re.sub(r"^C\d{3}\s*[✦｜|\-—:：]?\s*", "", title, flags=re.I),
        "url": url,
        "image": image,
        "inner_images": inner_images,
        "slogan": slogan,
        "price": int(round(price)) if price else None,
        "isbn": fields.get("ISBN", ""),
        "author": author,
        "authors": split_people(author),
        "publisher": fields.get("出版社", ""),
        "publication_date": publication_date,
        "year": publication_date[:4] if re.match(r"\d{4}", publication_date) else "",
        "language_and_format": language_and_format,
        "pages": pages,
        "intro": intro,
        "catalog": catalog,
        "brief": brief_text,
    }


def parse_seed_html(path):
    soup = BeautifulSoup(Path(path).read_text(encoding="utf-8"), "html.parser")
    products = []
    for block in soup.select(".product-container"):
        title = clean_text(block.select_one(".product-title"))
        code = normalize_code(title)
        if not code:
            continue
        brief_el = block.select_one(".product-brief")
        brief_html = str(brief_el) if brief_el else ""
        fields, brief_text = extract_brief_fields_from_html(brief_html)
        image_el = block.select_one(".product-image img")
        price_numbers = only_numbers(clean_text(block.select_one(".price-tag")))
        catalog = [clean_text(item) for item in block.select(".product-catalog div")][1:]
        catalog = [item for item in catalog if item]
        intro = clean_text(block.select_one(".product-intro"))
        intro = re.sub(r"^商品介紹\s*", "", intro)
        author = fields.get("作者", "")
        publication_date = fields.get("出版日期", "")
        page_match = re.search(r"(\d+)\s*頁", brief_text)
        products.append({
            "code": code,
            "slug": code,
            "title": title,
            "title_clean": re.sub(r"^C\d{3}\s*[✦｜|\-—:：]?\s*", "", title, flags=re.I),
            "url": BASE_URL + code,
            "image": image_el.get("src", "") if image_el else "",
            "inner_images": [img.get("src", "") for img in block.select(".inner-page-img")],
            "slogan": clean_text(block.select_one(".product-slogan")),
            "price": int(price_numbers[0]) if price_numbers else None,
            "isbn": fields.get("ISBN", ""),
            "author": author,
            "authors": split_people(author),
            "publisher": fields.get("出版社", ""),
            "publication_date": publication_date,
            "year": publication_date[:4] if re.match(r"\d{4}", publication_date) else "",
            "language_and_format": fields.get("語言", ""),
            "pages": int(page_match.group(1)) if page_match else None,
            "intro": intro,
            "catalog": catalog,
            "brief": brief_text,
        })
    return products


def load_existing_products():
    if not DATA_PATH.exists():
        return []
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return data.get("products", [])


def looks_corrupted(product):
    sample = " ".join(str(product.get(key, "")) for key in ["title", "title_clean", "author", "slogan"])
    return "�" in sample or sample.count("?") >= 4


def discover_slugs(existing_products, lookahead):
    slugs = {p.get("slug") or p.get("code") for p in existing_products if p.get("slug") or p.get("code")}
    max_code = max([first_code_number(slug) for slug in slugs] or [291])
    for number in range(1, max_code + lookahead + 1):
        slugs.add(f"C{number:03d}")
    return sorted(slugs, key=lambda slug: (first_code_number(slug), slug))


def fetch_product(slug):
    url = BASE_URL + slug
    try:
        response = session.get(url, timeout=20)
    except requests.RequestException as exc:
        print(f"skip {slug}: {exc}")
        return None
    if response.status_code != 200:
        return None
    return parse_product_page(slug, response.text, url)


def write_products(products):
    deduped = {}
    for product in products:
        if product and product.get("code") and not looks_corrupted(product):
            deduped[product["code"]] = product
    ordered = sorted(deduped.values(), key=lambda item: first_code_number(item["code"]), reverse=True)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "https://www.pbooks.com.tw/products/C###",
        "products": ordered,
    }
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {DATA_PATH} ({len(ordered)} products)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-html", help="Parse an existing generated catalog HTML before fetching.")
    parser.add_argument("--no-fetch", action="store_true", help="Only use seed/existing JSON data.")
    parser.add_argument("--lookahead", type=int, default=12, help="How many C### codes after the current max to probe.")
    args = parser.parse_args()

    products = load_existing_products()
    if args.seed_html:
        products.extend(parse_seed_html(args.seed_html))

    if not args.no_fetch:
        fetched = []
        for slug in discover_slugs(products, args.lookahead):
            product = fetch_product(slug)
            if product:
                fetched.append(product)
                print(f"fetched {product['code']} {product['title_clean']}")
        products.extend(fetched)

    write_products(products)


if __name__ == "__main__":
    main()
