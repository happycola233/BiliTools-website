import { createScrollExperience } from './motion.js';
import { createScreenshotViewer } from './screenshot-viewer.js';
import { createShowcase } from './showcase.js';
import { createDownloads } from './downloads.js';
import { createDownloadMascot } from './download-mascot.js';
import { createPalettePreview } from './palette-preview.js';
import { createExpressiveButtons } from './expressive-buttons.js';
import { createLanguageSwitch } from './language.js';
import { createFaq } from './faq.js';
import { t } from './i18n.js';

const root = document.documentElement;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector('.theme-toggle');
const themeSources = document.querySelectorAll('[data-theme-source]');
const scrollExperience = createScrollExperience();
const showcase = createShowcase();
const screenshotViewer = createScreenshotViewer(scrollExperience, { onClose: showcase.select });
const downloads = createDownloads();
const downloadMascot = createDownloadMascot();
const palettePreview = createPalettePreview();
const expressiveButtons = createExpressiveButtons();
const languageSwitch = createLanguageSwitch();
const faq = createFaq({ onLayoutChange: scrollExperience.refresh });

function isDark() {
  return root.dataset.theme ? root.dataset.theme === 'dark' : systemTheme.matches;
}

function syncTheme() {
  const dark = isDark();
  const label = t(dark ? 'themeToLight' : 'themeToDark');
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
  themeToggle.querySelector('.theme-moon').style.display = dark ? 'none' : 'block';
  themeToggle.querySelector('.theme-sun').style.display = dark ? 'block' : 'none';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#111216' : '#f8f7fc';
  // 手动切换主题时，截图也跟随页面主题，而不只跟随系统偏好。
  for (const source of themeSources) source.media = dark ? 'all' : 'not all';
  screenshotViewer.syncTheme();
  palettePreview.syncTheme(dark);
}

themeToggle.hidden = false;
syncTheme();
themeToggle.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try {
    localStorage.setItem('bilitools-theme', root.dataset.theme);
  } catch {
    /* 隐私模式禁用存储时，当前页面仍可切换主题。 */
  }
  syncTheme();
});
systemTheme.addEventListener('change', () => {
  if (!root.dataset.theme) syncTheme();
});

// 顶栏导航高亮当前阅读的区块。
const navigationLinks = [...document.querySelectorAll('.nav-pill a')];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navigationLinks) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  },
  { rootMargin: '-35% 0px -55% 0px' },
);
for (const link of navigationLinks) sectionObserver.observe(document.querySelector(link.hash));

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    sectionObserver.disconnect();
    faq.destroy();
    languageSwitch.destroy();
    expressiveButtons.destroy();
    downloadMascot.destroy();
    palettePreview.destroy();
    downloads.destroy();
    screenshotViewer.destroy();
    showcase.destroy();
    scrollExperience.destroy();
  });
