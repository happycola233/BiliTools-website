import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  bundledRelease,
  defaultArchitecture,
  formatPackageSize,
  formatReleaseDate,
} from '../src/releases.js';
import { LOCALE_SCREEN_DIRS } from '../src/screens.js';

/**
 * 构建期多语言页面：根目录 index.html 是唯一的页面模板，`{{key}}` 占位符按 src/locales/*.json 渲染。
 * 中文页即 index.html 本身；en/index.html 只是入口占位文件，内容同样由模板渲染。
 * 两种语言都是完整的静态 HTML：首屏不闪烁，关闭 JavaScript 也能阅读与下载。
 */
export const PAGES = [
  { entry: 'index.html', locale: 'zh-CN' },
  { entry: 'en/index.html', locale: 'en' },
];

const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function flattenMessages(messages, prefix = '') {
  return Object.entries(messages).reduce((flat, [key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') flat[name] = value;
    else Object.assign(flat, flattenMessages(value, name));
    return flat;
  }, {});
}

export function loadLocale(root, locale) {
  return JSON.parse(readFileSync(path.join(root, 'src/locales', `${locale}.json`), 'utf8'));
}

/** 与语言相关但不需要翻译的值：发行版快照、截图目录。 */
function derivedValues(locale) {
  const asset = bundledRelease.packages[defaultArchitecture];
  return {
    'release.version': bundledRelease.version,
    'release.publishedAt': bundledRelease.publishedAt,
    'release.date': formatReleaseDate(bundledRelease.publishedAt, locale),
    'release.url': bundledRelease.url,
    'release.downloadUrl': asset.acceleratedUrl,
    'release.summary': `${defaultArchitecture} · ${formatPackageSize(asset.size)}`,
    'screens.dir': LOCALE_SCREEN_DIRS[locale],
  };
}

export function renderPage(template, locale, messages) {
  // 文案只允许不带属性的行内标签（如 <br>、<strong>），因此可统一转义双引号，安全地放进属性值。
  const values = { ...flattenMessages(messages), ...derivedValues(locale) };
  return template.replace(PLACEHOLDER, (_match, key) => {
    if (!(key in values)) throw new Error(`[i18n] ${locale} 缺少文案：${key}`);
    return values[key].replaceAll('"', '&quot;');
  });
}

export function i18nPages() {
  let root;
  return {
    name: 'bilitools-i18n-pages',
    config(config) {
      root = path.resolve(config.root ?? process.cwd());
      return {
        build: {
          rolldownOptions: {
            input: Object.fromEntries(
              PAGES.map(({ entry, locale }) => [locale, path.join(root, entry)]),
            ),
          },
        },
      };
    },
    transformIndexHtml: {
      order: 'pre',
      handler(_html, context) {
        const entry = path.relative(root, context.filename).split(path.sep).join('/');
        const page = PAGES.find((candidate) => candidate.entry === entry);
        if (!page) return;
        const template = readFileSync(path.join(root, 'index.html'), 'utf8');
        return renderPage(template, page.locale, loadLocale(root, page.locale));
      },
    },
    configureServer(server) {
      // 文案改动后整页刷新；模板 index.html 由 Vite 自身监听并刷新所有页面。
      const localeDirectory = path.join(root, 'src/locales');
      server.watcher.add(localeDirectory);
      server.watcher.on('change', (file) => {
        if (path.dirname(file) === localeDirectory) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
