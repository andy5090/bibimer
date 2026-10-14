"""Verify localized site navigation and translated policy structure without network access."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[2] / 'release/website/public'
LOCALES = ('en', 'ko', 'es', 'zh-Hans', 'pt-BR', 'id', 'ja', 'zh-Hant', 'fr', 'de')

class Page(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.tags = []
        self.feed(file.read_text())

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

class WebsiteLocalesTests(unittest.TestCase):
    def test_localized_routes_and_equivalent_page_navigation(self):
        for locale in LOCALES:
            base = '/' if locale == 'en' else f'/{locale}/'
            for suffix in ('', 'privacy/', 'guide/'):
                with self.subTest(locale=locale, page=suffix):
                    page = Page(ROOT / (base + suffix).lstrip('/') / 'index.html')
                    self.assertEqual([a['lang'] for t, a in page.tags if t == 'html'], [locale])
                    self.assertEqual([a['href'] for t, a in page.tags if t == 'link' and a.get('rel') == 'canonical'], ['https://bibimer.app' + base + suffix])
                    expected = {tag: 'https://bibimer.app' + ('/' if tag == 'en' else f'/{tag}/') + suffix for tag in LOCALES}
                    expected['x-default'] = 'https://bibimer.app/' + suffix
                    self.assertEqual({a['hreflang']: a['href'] for t, a in page.tags if t == 'link' and a.get('rel') == 'alternate'}, expected)
                    switches = [a for t, a in page.tags if t == 'a' and 'hreflang' in a]
                    self.assertEqual({a['hreflang']: 'https://bibimer.app' + a['href'] for a in switches}, {k:v for k,v in expected.items() if k != 'x-default'})
                    self.assertEqual([a['hreflang'] for a in switches if a.get('aria-current') == 'page'], [locale])
                    ids = [a['id'] for _, a in page.tags if 'id' in a]
                    self.assertEqual(len(ids), len(set(ids)))
                    self.assertFalse(any(t == 'select' for t, _ in page.tags))
                    scripts = [a for t, a in page.tags if t == 'script']
                    self.assertEqual([a.get('src') for a in scripts], ['/assets/language.js'])
                    self.assertTrue(all('defer' in a for a in scripts))
                    for tag, attrs in page.tags:
                        for key in ('href', 'src'):
                            path = urlsplit(attrs.get(key, '')).path
                            if attrs.get(key, '').startswith('/'):
                                target = ROOT / path.lstrip('/')
                                self.assertTrue(target.exists(), str(target))
                    if suffix == 'privacy/':
                        counts = Counter(t for t, _ in page.tags)
                        self.assertEqual(counts['h3'], 8)
                        self.assertEqual(counts['li'], 3)
                        self.assertIn('data-deletion', ids)
                        self.assertEqual(counts['p'], Counter(t for t, _ in Page(ROOT / 'privacy/index.html').tags)['p'])

if __name__ == '__main__':
    unittest.main()
