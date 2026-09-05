from pathlib import Path
import tempfile
import unittest

from build_newsletter_index import build, discover


class NewsletterIndexTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.before = '\ufeff<!doctype html>\r\n<title>腓利門電子報</title>\r\n'
        self.after = '\r\n<section>腓利門出版品 & unchanged links</section>\r\n'
        self.root.joinpath('index.html').write_bytes((self.before +
            '<!-- LATEST_NEWSLETTER:START -->old feature<!-- LATEST_NEWSLETTER:END -->\r\n' +
            '<!-- NEWSLETTER_INDEX:START -->old archive<!-- NEWSLETTER_INDEX:END -->' + self.after).encode('utf-8'))

    def issue(self, month, languages=(), title='Monthly newsletter'):
        folder = self.root / month
        folder.mkdir(exist_ok=True)
        folder.joinpath('index.html').write_text(f'<title>{title}</title><meta name="description" content="New arrivals">', encoding='utf-8')
        for language in languages:
            folder.joinpath(language).write_text(f'<title>{language}</title>', encoding='utf-8')
        return folder

    def content(self):
        return self.root.joinpath('index.html').read_bytes().decode('utf-8')

    def test_new_month_updates_archive_and_latest_without_homepage_edits(self):
        self.issue('2026-09', ('zh-cn.html','en.html'))
        build(self.root)
        self.issue('2026-10')
        issues = build(self.root)
        self.assertEqual([issue.month for issue in issues], ['2026-10','2026-09'])
        self.assertIn('href="./2026-10/" class="btn primary"', self.content())
        self.assertIn('十月 <span class="month-new">', self.content())
        self.assertEqual(self.content().count('class="month-new"'), 1)
        self.assertEqual(self.content().count('class="month-row"'), 2)

    def test_language_links_appear_and_disappear_with_published_files(self):
        folder = self.issue('2026-09')
        build(self.root)
        self.assertNotIn('/en.html', self.content())
        self.assertNotIn('简中', self.content())
        folder.joinpath('en.html').write_text('<title>English</title>', encoding='utf-8')
        build(self.root)
        self.assertIn('./2026-09/en.html', self.content())
        folder.joinpath('en.html').unlink()
        build(self.root)
        self.assertNotIn('/en.html', self.content())

    def test_year_rollover_and_non_issue_directories(self):
        self.issue('2026-12')
        self.issue('2027-01')
        self.issue('2026-13')
        self.issue('2027calendar')
        self.root.joinpath('2027-02').mkdir()
        issues = build(self.root)
        self.assertEqual([issue.month for issue in issues], ['2027-01','2026-12'])
        self.assertIn('2027 年 一月號', self.content())
        self.assertNotIn('2027-02', self.content())

    def test_targeted_utf8_edit_is_idempotent_and_escapes_metadata(self):
        self.issue('2026-09', title='&lt;script&gt; hello &amp; goodbye')
        build(self.root)
        result = self.root.joinpath('index.html').read_bytes()
        self.assertTrue(self.content().startswith(self.before))
        self.assertTrue(self.content().endswith(self.after))
        self.assertIn('&lt;script&gt; hello &amp; goodbye', self.content())
        self.assertNotIn('<script>', self.content())
        build(self.root)
        self.assertEqual(result, self.root.joinpath('index.html').read_bytes())

    def test_missing_markers_or_issues_do_not_silently_erase_homepage(self):
        with self.assertRaises(ValueError):
            build(self.root)
        self.issue('2026-09')
        self.root.joinpath('index.html').write_text('no markers',encoding='utf-8')
        with self.assertRaises(ValueError):
            build(self.root)
        self.assertEqual(self.content(), 'no markers')


if __name__ == '__main__':
    unittest.main()
