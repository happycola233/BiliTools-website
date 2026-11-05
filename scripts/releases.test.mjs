import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bundledRelease,
  defaultArchitecture,
  fetchLatestRelease,
  formatPackageSize,
  formatReleaseDate,
  parseRelease,
  repositoryUrl,
} from '../src/releases.js';
import { PAGES, loadLocale, renderPage } from './i18n-pages.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));

const architectures = ['arm64-v8a', 'armeabi-v7a', 'universal', 'x86', 'x86_64'];
function releaseFixture(version = 'v3.1') {
  return {
    tag_name: version,
    published_at: '2026-09-08T08:00:00Z',
    draft: false,
    prerelease: false,
    assets: architectures.map((architecture, index) => {
      const name = `BiliTools-${version}-${architecture}.apk`;
      return {
        name,
        size: 70_000_000 + index,
        state: 'uploaded',
        browser_download_url: `${repositoryUrl}/releases/download/${version}/${name}`,
      };
    }),
  };
}

test('a new release updates all five architectures and accelerated download links', () => {
  const release = parseRelease(releaseFixture());
  assert.equal(release.version, 'v3.1');
  assert.equal(release.url, `${repositoryUrl}/releases/tag/v3.1`);
  assert.deepEqual(Object.keys(release.packages), architectures);
  for (const [index, architecture] of architectures.entries()) {
    const asset = release.packages[architecture];
    assert.equal(asset.name, `BiliTools-v3.1-${architecture}.apk`);
    assert.equal(asset.size, 70_000_000 + index);
    assert.equal(asset.acceleratedUrl, `https://files.happycola.top/BiliTools/${asset.name}`);
  }
});

test('uses actual asset filenames when a tag and package version are named differently', () => {
  const data = releaseFixture();
  data.tag_name = 'android/3.1';
  const release = parseRelease(data);
  assert.equal(release.url, `${repositoryUrl}/releases/tag/android%2F3.1`);
  assert.equal(
    release.packages['arm64-v8a'].acceleratedUrl,
    'https://files.happycola.top/BiliTools/BiliTools-v3.1-arm64-v8a.apk',
  );
});

test('missing architectures never inherit old release downloads', () => {
  const data = releaseFixture();
  data.assets = [data.assets[2]];
  assert.deepEqual(Object.keys(parseRelease(data).packages), ['universal']);
  data.assets = [];
  assert.deepEqual(parseRelease(data).packages, {});
});

test('ignores unfinished assets, other files, invalid sizes and external download URLs', () => {
  const data = releaseFixture();
  data.assets[0].state = 'starter';
  data.assets[1].size = -1;
  data.assets[2].browser_download_url = 'https://example.com/BiliTools-v3.1-universal.apk';
  data.assets[3].size = '74000000';
  data.assets.push(
    null,
    { name: 'checksums.txt' },
    {
      ...data.assets[4],
      name: 'AnotherApp-v3.1-arm64-v8a.apk',
    },
  );
  assert.deepEqual(Object.keys(parseRelease(data).packages), ['x86_64']);
});

test('rejects mismatched APK filenames and deceptive repository prefixes', () => {
  for (const url of [
    `${repositoryUrl}.example.com/releases/download/v3.1/BiliTools-v3.1-arm64-v8a.apk`,
    `${repositoryUrl}/releases/download/v3.1/BiliTools-v3.1-universal.apk`,
    'javascript:alert(1)',
  ]) {
    const data = releaseFixture();
    data.assets[0].browser_download_url = url;
    assert.equal(parseRelease(data).packages['arm64-v8a'], undefined);
  }
});

test('rejects malformed responses, draft releases and prereleases', () => {
  for (const data of [
    null,
    {},
    ...[
      { tag_name: '' },
      { published_at: 'invalid' },
      { assets: null },
      { draft: true },
      { prerelease: true },
    ].map((patch) => ({ ...releaseFixture(), ...patch })),
  ]) {
    assert.throws(() => parseRelease(data), /Invalid release metadata/);
  }
});

test('displays binary file sizes with matching MiB units', () => {
  assert.equal(formatPackageSize(70765340), '67.5 MiB');
  assert.equal(formatPackageSize(154047534), '146.9 MiB');
});

test('release dates keep a space between digits and Chinese characters', () => {
  // 取当天正午，避免运行环境的时区把日期推到前后一天。
  const date = '2026-11-05T12:00:00';
  assert.equal(formatReleaseDate(date, 'zh-CN'), '2026 年 11 月 5 日');
  assert.equal(formatReleaseDate(date, 'en'), 'November 5, 2026');
});

test('the static no-JavaScript download matches the bundled release snapshot', async () => {
  const template = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const asset = bundledRelease.packages[defaultArchitecture];
  for (const { locale } of PAGES) {
    const html = renderPage(template, locale, loadLocale(websiteRoot, locale));
    for (const value of [
      asset.acceleratedUrl,
      formatPackageSize(asset.size),
      bundledRelease.version,
    ]) {
      assert.ok(html.includes(value), `${locale}: static download differs from snapshot: ${value}`);
    }
    assert.match(
      html,
      new RegExp(`data-architecture="${defaultArchitecture}"\\s+aria-checked="true"`),
    );
  }
});

test('requests GitHub latest metadata without credentials and passes its abort signal', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/happycola233/BiliTools/releases/latest');
    assert.equal(options.headers.Accept, 'application/vnd.github+json');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.signal, controller.signal);
    return Response.json(releaseFixture());
  });
  assert.equal((await fetchLatestRelease(controller.signal)).version, 'v3.1');
});

test('HTTP errors, malformed JSON and unavailable networks reject for the UI to handle', async (t) => {
  for (const status of [403, 404, 429, 500]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status }));
    await assert.rejects(fetchLatestRelease(), new RegExp(String(status)));
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>error</html>'));
  await assert.rejects(fetchLatestRelease(), SyntaxError);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(fetchLatestRelease(), /Failed to fetch/);
});
