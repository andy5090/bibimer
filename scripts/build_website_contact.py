#!/usr/bin/env python3
"""Render the ten localized, static contact pages from one shared template."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = json.loads((ROOT / "release/website/contact-locales.json").read_text())
PUBLIC = ROOT / "release/website/public"
CATEGORIES = ["bug", "setup", "feature", "privacy", "other"]


def esc(value):
    return html.escape(value, quote=True)


def page_path(locale, page=""):
    return "/" + ("" if locale == "en" else locale + "/") + page


def render(locale, text):
    path = page_path(locale, "contact/")
    url = "https://bibimer.app" + path
    title = "Bibimer · " + text["title"]
    alternates = "\n".join(f'  <link rel="alternate" hreflang="{key}" href="https://bibimer.app{page_path(key, "contact/")}">' for key in LOCALES)
    links = "".join(f'<a href="{page_path(key, "contact/")}" lang="{key}" hreflang="{key}"' + (' aria-current="page"' if key == locale else '') + f'>{esc(item["name"])}</a>' for key, item in LOCALES.items())
    options = "".join(f'<li role="option" id="category-{key}" data-value="{key}" aria-selected="{str(index == 0).lower()}" tabindex="-1">{esc(label)}</li>' for index, (key, label) in enumerate(zip(CATEGORIES, text["categories"])))
    statuses = " ".join(f'data-{key}="{esc(text[key])}"' for key in ["sending", "send", "invalid", "error", "limited", "conflict"])
    social = "ko" if locale == "ko" else "en"
    required = f'<span class="field-required">{esc(text["required"])}</span>'
    return f'''<!doctype html>
<html lang="{locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{esc(text['description'])}">
  <title>{esc(title)}</title>
  <link rel="icon" href="/favicon.ico?v=20261014" sizes="16x16 32x32" type="image/x-icon">
  <link rel="icon" href="/assets/favicon.svg?v=20261014" sizes="any" type="image/svg+xml">
  <link rel="canonical" href="{url}">
{alternates}
  <link rel="alternate" hreflang="x-default" href="https://bibimer.app/contact/">
  <link rel="stylesheet" href="/assets/guide.css">
  <link rel="stylesheet" href="/assets/language.css">
  <link rel="stylesheet" href="/assets/contact.css">
  <link rel="stylesheet" href="/assets/typography.css">
  <script src="/assets/language.js" defer></script>
  <script src="/assets/contact.js" defer></script>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bibimer">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(text['description'])}">
  <meta property="og:url" content="{url}">
  <meta property="og:locale" content="{text['og']}">
  <meta property="og:image" content="https://bibimer.app/assets/social/{social}.png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="500">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(text['description'])}">
  <meta name="twitter:image" content="https://bibimer.app/assets/social/{social}.png">
</head>
<body>
<div class="guide-shell">
  <header>
    <a class="brand" href="{page_path(locale)}"><img src="/assets/icon.png" alt="" width="28" height="28">BIBIMER</a>
    <div class="header-actions"><nav aria-label="{esc(text['home'])}"><a href="{page_path(locale)}">{esc(text['home'])}</a><a href="{page_path(locale, 'guide/')}">{esc(text['guide'])}</a></nav><nav class="language-nav" aria-label="{esc(text['language'])}">{links}</nav></div>
  </header>
  <main class="contact-main">
    <section class="guide-intro" aria-labelledby="contact-title">
      <p class="eyebrow">{esc(text['eyebrow'])}</p>
      <h1 id="contact-title">{esc(text['title'])}</h1>
      <p class="lead">{esc(text['description'])}</p>
    </section>
    <noscript><div class="contact-notice"><p>{esc(text['noscript'])}</p><a href="https://github.com/andy5090/bibimer/issues">{esc(text['github'])}</a></div></noscript>
    <form id="contact-form" class="contact-form" novalidate {statuses} aria-labelledby="contact-title" hidden>
      <p class="contact-notice">{esc(text['notice'])}</p>
      <div class="field category-picker">
        <label id="category-label">{esc(text['category'])} {required}</label>
        <button id="category-trigger" class="category-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="category-options" aria-labelledby="category-label category-value"><span id="category-value">{esc(text['categories'][0])}</span><span aria-hidden="true">⌄</span></button>
        <ul id="category-options" class="category-options" role="listbox" aria-labelledby="category-label" hidden>{options}</ul>
        <input type="hidden" name="category" value="bug">
      </div>
      <div class="field" id="custom-category-field" hidden><label for="custom-category">{esc(text['custom'])} {required}</label><input id="custom-category" name="customCategory" maxlength="80" autocomplete="off"></div>
      <div class="field"><label for="contact-subject">{esc(text['subject'])} {required}</label><input id="contact-subject" name="subject" required maxlength="120" aria-describedby="subject-hint"><span id="subject-hint" class="field-hint">{esc(text['subjectHint'])}</span></div>
      <div class="field"><label for="contact-message">{esc(text['message'])} {required}</label><textarea id="contact-message" name="message" required minlength="10" maxlength="5000" rows="7" aria-describedby="message-hint"></textarea><span id="message-hint" class="field-hint">{esc(text['messageHint'])}</span></div>
      <div class="field"><label for="contact-email">{esc(text['email'])}</label><input id="contact-email" name="email" type="email" maxlength="254" autocomplete="email" inputmode="email" aria-describedby="email-hint"><span id="email-hint" class="field-hint">{esc(text['emailHint'])}</span></div>
      <div class="contact-honeypot" aria-hidden="true"><label for="contact-website">Website</label><input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <div class="consent-field"><label><input type="checkbox" name="consent" required><span>{esc(text['consent'])} <a href="{page_path(locale, 'privacy/')}">{esc(text['privacy'])}</a></span></label></div>
      <p id="contact-status" class="contact-status" role="status" aria-live="polite" tabindex="-1" hidden></p>
      <button id="contact-submit" class="contact-submit" type="submit">{esc(text['send'])}<span aria-hidden="true">↗</span></button>
    </form>
    <section id="contact-success" class="contact-success" aria-labelledby="success-title" tabindex="-1" hidden><span class="success-mark" aria-hidden="true">✓</span><h2 id="success-title">{esc(text['success'])}</h2><p>{esc(text['receipt'])}<br><code id="contact-receipt"></code></p><button type="button" id="contact-new" class="contact-submit">{esc(text['new'])}</button></section>
  </main>
  <footer><span>Bibimer · {esc(text['footer'])}</span><a href="{page_path(locale, 'privacy/')}">{esc(text['privacy'])}</a></footer>
</div>
</body>
</html>
'''


if __name__ == "__main__":
    for locale, text in LOCALES.items():
        target = PUBLIC / page_path(locale, "contact/").lstrip("/") / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(locale, text))
    print(f"Rendered {len(LOCALES)} localized contact pages")
