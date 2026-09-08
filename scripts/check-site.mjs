import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const buildRoot = path.join(websiteRoot, 'dist');
const html = await readFile(path.join(buildRoot, 'index.html'), 'utf8');
const sprite = await readFile(path.join(buildRoot, 'assets/icons.svg'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const [, references] of html.matchAll(
  /\b(?:aria-labelledby|aria-describedby|aria-controls|popovertarget)="([^"]+)"/g,
)) {
  for (const id of references.split(/\s+/))
    assert.ok(ids.includes(id), `Missing accessible control target: ${id}`);
}

let referenceCount = 0;
for (const [, attribute, value] of html.matchAll(/\b(href|src|srcset)="([^"]+)"/g)) {
  if (/^https?:/.test(value)) {
    assert.ok(
      /^https:\/\/github\.com\/happycola233\/BiliTools(?:[\/#]|$)/.test(value) ||
        /^https:\/\/files\.happycola\.top\/BiliTools\/BiliTools-[\w.+-]+\.apk$/.test(value),
      `Unexpected external link: ${value}`,
    );
    continue;
  }
  if (value.startsWith('#')) {
    assert.ok(value === '#' || ids.includes(value.slice(1)), `Missing anchor: ${value}`);
    continue;
  }
  assert.ok(value.startsWith('./'), `Resource must support subpath hosting: ${value}`);
  const [filename, fragment] = value.split('#');
  await access(path.join(buildRoot, filename));
  if (fragment) assert.ok(sprite.includes(`id="${fragment}"`), `Missing icon: ${fragment}`);
  if (attribute === 'srcset')
    assert.ok(filename.endsWith('-dark.webp'), `Unexpected themed screenshot: ${filename}`);
  referenceCount++;
}

for (const [, stylesheet] of html.matchAll(/href="(\.\/assets\/[^"#]+\.css)"/g)) {
  const css = await readFile(path.join(buildRoot, stylesheet), 'utf8');
  for (const [, filename] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (filename.startsWith('data:')) continue;
    assert.ok(!filename.startsWith('/'), 'CSS asset must use a relative path');
    await access(path.resolve(buildRoot, path.dirname(stylesheet), filename));
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
for (const script of [
  'main.js',
  'motion.js',
  'feature-story.js',
  'screenshot-viewer.js',
  'downloads.js',
  'download-mascot.js',
  'split-button.js',
  'releases.js',
]) {
  execFileSync(process.execPath, ['--check', path.join(websiteRoot, 'src', script)]);
}
console.log(
  `Validated ${referenceCount} asset references, ${ids.length} anchors, ${iconCount} rendered icons, relative CSS URLs, and JavaScript syntax.`,
);
