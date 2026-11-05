import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { PAGES } from './i18n-pages.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const buildRoot = path.join(websiteRoot, 'dist');
const sprite = await readFile(path.join(buildRoot, 'assets/icons.svg'), 'utf8');
const pagePaths = PAGES.map(({ entry }) => path.join(buildRoot, entry));

/** srcset 中每个候选的地址（去掉 720w 等宽度描述）。 */
const srcsetUrls = (value) => value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]);

let referenceCount = 0;
let anchorCount = 0;
for (const [index, pagePath] of pagePaths.entries()) {
  const { entry, locale } = PAGES[index];
  const html = await readFile(pagePath, 'utf8');
  const pageDirectory = path.dirname(pagePath);
  assert.ok(html.includes(`<html lang="${locale}">`), `${entry}: unexpected html lang`);
  assert.ok(!/\{\{[\w.-]+\}\}/.test(html), `${entry}: unrendered i18n placeholder`);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${entry}: HTML IDs must be unique`);
  anchorCount += ids.length;
  for (const [, references] of html.matchAll(
    /\b(?:aria-labelledby|aria-describedby|aria-controls|popovertarget)="([^"]+)"/g,
  )) {
    for (const id of references.split(/\s+/))
      assert.ok(ids.includes(id), `${entry}: missing accessible control target ${id}`);
  }

  for (const [, attribute, value] of html.matchAll(/\b(href|src|srcset)="([^"]+)"/g)) {
    for (const url of attribute === 'srcset' ? srcsetUrls(value) : [value]) {
      if (/^https?:/.test(url)) {
        assert.ok(
          /^https:\/\/github\.com\/happycola233\/BiliTools(?:[\/#]|$)/.test(url) ||
            /^https:\/\/files\.happycola\.top\/BiliTools\/BiliTools-[\w.+-]+\.apk$/.test(url),
          `${entry}: unexpected external link ${url}`,
        );
        continue;
      }
      if (url.startsWith('#')) {
        assert.ok(url === '#' || ids.includes(url.slice(1)), `${entry}: missing anchor ${url}`);
        continue;
      }
      // 资源与语言切换链接都必须是相对路径，才能部署在根域名或 GitHub Pages 子路径。
      assert.ok(!/^(?:\/|[a-z]+:)/i.test(url), `${entry}: path must be relative: ${url}`);
      const [filename, fragment] = url.split('#');
      const target = path.resolve(pageDirectory, filename);
      await access(filename.endsWith('/') ? path.join(target, 'index.html') : target);
      if (fragment)
        assert.ok(sprite.includes(`id="${fragment}"`), `${entry}: missing icon ${fragment}`);
      referenceCount++;
    }
  }

  for (const [, stylesheet] of html.matchAll(/href="([^"#]+\.css)"/g)) {
    const stylesheetPath = path.resolve(pageDirectory, stylesheet);
    const css = await readFile(stylesheetPath, 'utf8');
    for (const [, filename] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (filename.startsWith('data:')) continue;
      assert.ok(!filename.startsWith('/'), 'CSS asset must use a relative path');
      await access(path.resolve(path.dirname(stylesheetPath), filename));
    }
    // 压缩后若只剩 -webkit- 前缀，Chrome 与 Firefox 会丢失模糊；开发服务不压缩，看不出这类问题。
    for (const [rule] of css.matchAll(/\{[^{}]*-webkit-backdrop-filter:[^{}]*\}/g))
      assert.ok(/[{;]backdrop-filter:/.test(rule), `CSS lost unprefixed backdrop-filter: ${rule}`);
  }
}

// 实际栅格化每个图标：仅校验 symbol 存在，无法发现 Android group 位移丢失导致的空白。
let iconCount = 0;
for (const [, name, viewBox, content] of sprite.matchAll(
  /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g,
)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="48" height="48">${content}</svg>`;
  const { data } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let visiblePixels = 0;
  for (let index = 3; index < data.length; index += 4) if (data[index] > 0) visiblePixels++;
  assert.ok(visiblePixels > 20, `Icon renders empty: ${name}`);
  iconCount++;
}
assert.ok(iconCount > 0, 'No sprite symbols were tested');

const scripts = (await readdir(path.join(websiteRoot, 'src'))).filter((file) =>
  file.endsWith('.js'),
);
for (const script of scripts) {
  execFileSync(process.execPath, ['--check', path.join(websiteRoot, 'src', script)]);
}
console.log(
  `Validated ${PAGES.length} pages, ${referenceCount} asset references, ${anchorCount} anchors, ${iconCount} rendered icons, relative CSS URLs, and ${scripts.length} scripts.`,
);
