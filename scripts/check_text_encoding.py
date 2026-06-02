from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]

CHECKS = {
    "index.html": [
        "腓利門電子報",
        "腓利門出版品",
        "最新一期電子報",
        "六月電子報",
    ],
    "2026-06/index.html": [
        "被愛接住的人，",
        "也會被聖靈帶著走",
        "以下新品到貨了，歡迎選購。",
    ],
    "2026-06/zh-cn.html": [
        "腓利门电子报",
        "被爱接住的人，",
        "以下新品到货了，欢迎选购。",
    ],
    "2026-06/en.html": [
        "Philemon Newsletter",
        "Those held in love,",
        "The following new arrivals are now in stock. Welcome to shop.",
    ],
}


def main() -> int:
    failed = False

    for rel_path, expected_strings in CHECKS.items():
      path = ROOT / rel_path
      if not path.exists():
        print(f"[MISSING] {rel_path}")
        failed = True
        continue

      try:
        text = path.read_text(encoding="utf-8")
      except UnicodeDecodeError as exc:
        print(f"[DECODE ERROR] {rel_path}: {exc}")
        failed = True
        continue

      missing = [item for item in expected_strings if item not in text]
      if missing:
        print(f"[FAILED] {rel_path}")
        for item in missing:
          print(f"  - missing: {item}")
        failed = True
      else:
        print(f"[OK] {rel_path}")

    if failed:
      print("\nEncoding/text check failed.")
      return 1

    print("\nAll text checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
