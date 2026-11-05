import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PAGES, flattenMessages, loadLocale, renderPage } from './i18n-pages.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const locales = Object.fromEntries(
  PAGES.map(({ locale }) => [locale, flattenMessages(loadLocale(websiteRoot, locale))]),
);
const [baseLocale, ...otherLocales] = Object.keys(locales);

test('every locale defines exactly the same keys', () => {
  const expected = Object.keys(locales[baseLocale]).sort();
  for (const locale of otherLocales) {
    assert.deepEqual(Object.keys(locales[locale]).sort(), expected, `${locale} keys differ`);
  }
});

test('runtime messages keep the same {placeholders} in every language', () => {
  const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, value] of Object.entries(locales[baseLocale])) {
    if (!key.startsWith('app.')) continue;
    for (const locale of otherLocales) {
      assert.deepEqual(
        placeholders(locales[locale][key]),
        placeholders(value),
        `${locale}: ${key}`,
      );
    }
  }
});

test('page copy only uses attribute-free inline tags, so quotes can be escaped safely', () => {
  for (const [locale, messages] of Object.entries(locales)) {
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(!/<\w+\s/.test(value), `${locale}: ${key} contains a tag with attributes`);
    }
  }
});

test('the template renders completely for every page', () => {
  for (const { locale } of PAGES) {
    const html = renderPage(template, locale, loadLocale(websiteRoot, locale));
    assert.ok(!/\{\{[\w.-]+\}\}/.test(html), `${locale}: unrendered placeholder`);
    assert.ok(html.includes(`<html lang="${locale}">`));
  }
});

test('a missing translation fails the build instead of shipping a placeholder', () => {
  assert.throws(() => renderPage('<p>{{hero.missing}}</p>', 'en', {}), /hero\.missing/);
});
