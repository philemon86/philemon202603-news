"""Refresh the homepage from published YYYY-MM directories before deployment."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re

MONTHS = ('一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二')
LANGUAGES = (('zh-Hant', '繁中', 'index.html'), ('zh-Hans', '简中', 'zh-cn.html'), ('en', 'EN', 'en.html'))


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ''
        self.description = ''
        self.short_title = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'meta':
            if attrs.get('name') == 'description':
                self.description = attrs.get('content', '')
            if attrs.get('name') == 'newsletter-title':
                self.short_title = attrs.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, value):
        if self.in_title:
            self.title += value


@dataclass
class Issue:
    month: str
    title: str
    description: str
    languages: list[tuple[str, str, str]]

    @property
    def label(self):
        year, month = self.month.split('-')
        return f'{year} 年 {MONTHS[int(month) - 1]}月號'

    @property
    def href(self):
        return f'./{self.month}/'


def discover(root: Path) -> list[Issue]:
    issues = []
    for directory in root.iterdir():
        if not directory.is_dir() or not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', directory.name):
            continue
        page = directory / 'index.html'
        if not page.is_file():
            continue
        metadata = Metadata()
        metadata.feed(page.read_text(encoding='utf-8-sig'))
        if not metadata.title.strip():
            raise ValueError(f'{page}: a published issue needs a page title')
        title = metadata.short_title or re.split(r'[｜|]', metadata.title)[0].strip()
        languages = [(code, label, '' if filename == 'index.html' else filename)
                     for code, label, filename in LANGUAGES if (directory / filename).is_file()]
        issues.append(Issue(directory.name, title, metadata.description, languages))
    return sorted(issues, key=lambda issue: issue.month, reverse=True)


def language_links(issue: Issue) -> str:
    return ''.join(f'<a href="{issue.href}{filename}" hreflang="{code}" lang="{code}" '
                   f'aria-label="{issue.label}・{label}">{label}</a>'
                   for code, label, filename in issue.languages)


def render_archive(issues: list[Issue]) -> str:
    groups: dict[str, list[Issue]] = {}
    for issue in issues:
        groups.setdefault(issue.month[:4], []).append(issue)
    result = []
    for year, months in groups.items():
        rows = []
        for issue in months:
            month = issue.month[-2:]
            newest = ' <span class="month-new">最新</span>' if issue == issues[0] else ''
            rows.append(f'<li class="month-row"><a class="month-link" href="{issue.href}" '
                        f'aria-label="閱讀{issue.label}"><span class="month-number">{month}</span>'
                        f'<span class="month-label">{MONTHS[int(month)-1]}月{newest}</span>'
                        f'<span class="month-arrow" aria-hidden="true">↗</span></a>'
                        f'<div class="month-languages" role="group" aria-label="{issue.label}語言版本">'
                        f'{language_links(issue)}</div></li>')
        result.append(f'<div class="issue-year-group"><h3 class="issue-year">{year}</h3>'
                      '<ol class="month-list">\n' + '\n'.join(rows) + '\n</ol></div>')
    return '\n'.join(result)


def render_feature(issue: Issue) -> str:
    return (f'<div class="latest-issue-feature"><span class="latest-issue-date">{issue.label} · 最新上線</span>'
            f'<a class="latest-issue-title" href="{issue.href}">{escape(issue.title)}</a>'
            f'<p>{escape(issue.description)}</p>'
            f'<div class="month-languages" role="group" aria-label="最新一期語言版本">{language_links(issue)}</div></div>'
            '<div class="hero-cta">'
            f'<a href="{issue.href}" class="btn primary">最新一期電子報 <span aria-hidden="true">↗</span></a>'
            '<a href="https://www.pbooks.com.tw/" class="btn" target="_blank" rel="noopener">Go to Store</a></div>')


def replace_block(source: str, name: str, content: str) -> str:
    start, end = f'<!-- {name}:START -->', f'<!-- {name}:END -->'
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f'Expected exactly one {name} marker pair')
    return re.sub(re.escape(start) + r'.*?' + re.escape(end),
                  lambda _: f'{start}\n{content}\n{end}', source, flags=re.S)


def build(root: Path) -> list[Issue]:
    issues = discover(root)
    if not issues:
        raise ValueError('No published monthly newsletters found')
    path = root / 'index.html'
    # Preserve the rest of the homepage byte-for-byte, including its UTF-8 BOM/newlines.
    source = path.read_bytes().decode('utf-8')
    source = replace_block(source, 'NEWSLETTER_INDEX', render_archive(issues))
    source = replace_block(source, 'LATEST_NEWSLETTER', render_feature(issues[0]))
    path.write_bytes(source.encode('utf-8'))
    return issues


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    issues = build(args.root)
    print(f'Newsletter index: {len(issues)} months; latest {issues[0].month}')
