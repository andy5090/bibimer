"""Verify localized site navigation and translated policy structure without network access."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import urlsplit
import unittest
import xml.etree.ElementTree as ET

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
    def test_indexable_pages_and_sharing_metadata(self):
        expected_urls = set()
        titles = set()
        for locale in LOCALES:
            base = '/' if locale == 'en' else f'/{locale}/'
            for suffix in ('', 'privacy/', 'guide/', 'contact/'):
                file = ROOT / (base + suffix).lstrip('/') / 'index.html'
                page = Page(file)
                meta = {a.get('name') or a.get('property'): a.get('content')
                        for t, a in page.tags if t == 'meta'}
                url = 'https://bibimer.app' + base + suffix
                expected_urls.add(url)
                title = re.search(r'<title>(.*?)</title>', file.read_text()).group(1)
                self.assertNotIn(title, titles)
                titles.add(title)
                self.assertTrue(meta['description'])
                self.assertNotIn('noindex', meta.get('robots', ''))
                self.assertEqual(meta['og:title'], title)
                self.assertEqual(meta['og:description'], meta['description'])
                self.assertEqual(meta['og:url'], url)
                self.assertEqual(meta['og:locale'].split('_')[0], locale.split('-')[0])
                self.assertEqual(meta['twitter:card'], 'summary_large_image')
                self.assertEqual(meta['twitter:title'], title)
                self.assertEqual(meta['twitter:description'], meta['description'])
                self.assertEqual(meta['twitter:image'], meta['og:image'])
                image = urlsplit(meta['og:image'])
                self.assertEqual(image.netloc, 'bibimer.app')
                self.assertTrue((ROOT / image.path.lstrip('/')).is_file())
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [n.text for n in ET.parse(ROOT / 'sitemap.xml').findall('s:url/s:loc', ns)]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertEqual(set(urls), expected_urls)
        self.assertIn('Sitemap: https://bibimer.app/sitemap.xml', (ROOT / 'robots.txt').read_text())
        # Review instructions remain crawlable so their noindex directive can be read.
        for route in ('review/index.html', 'ko/review/index.html', '404.html'):
            meta = {a.get('name'): a.get('content') for t, a in Page(ROOT / route).tags if t == 'meta'}
            self.assertIn('noindex', meta['robots'])

    def test_localized_routes_and_equivalent_page_navigation(self):
        for locale in LOCALES:
            base = '/' if locale == 'en' else f'/{locale}/'
            for suffix in ('', 'privacy/', 'guide/', 'contact/'):
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
                    self.assertEqual([a.get('src') for a in scripts], ['/assets/language.js'] + (['/assets/contact.js'] if suffix == 'contact/' else []))
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
