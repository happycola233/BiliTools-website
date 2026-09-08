import { createScrollExperience } from './motion.js';
import { createScreenshotViewer } from './screenshot-viewer.js';
import { createFeatureStory } from './feature-story.js';
import { createDownloads } from './downloads.js';
import { createDownloadMascot } from './download-mascot.js';

const root = document.documentElement;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const themeToggle = document.querySelector('.theme-toggle');
const themeSources = document.querySelectorAll('[data-theme-source]');
const screenshotLinks = [...document.querySelectorAll('.screenshot-link')];
const scrollExperience = createScrollExperience();
const featureStory = createFeatureStory(scrollExperience);
const screenshotViewer = createScreenshotViewer(screenshotLinks, scrollExperience);
const downloads = createDownloads();
const downloadMascot = createDownloadMascot();

function isDark() {
  return root.dataset.theme ? root.dataset.theme === 'dark' : systemTheme.matches;
}

function syncTheme() {
  const dark = isDark();
  const label = `切换为${dark ? '浅' : '深'}色模式`;
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
  themeToggle.querySelector('.theme-moon').style.display = dark ? 'none' : 'block';
  themeToggle.querySelector('.theme-sun').style.display = dark ? 'block' : 'none';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#15171c' : '#f8f9ff';
  for (const source of themeSources) source.media = dark ? 'all' : 'not all';
  for (const link of screenshotLinks) {
    const picture = link.querySelector('picture');
    link.href = dark ? picture.querySelector('source').srcset : picture.querySelector('img').src;
  }
  screenshotViewer.syncTheme();
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

const gallery = document.querySelector('#screenshot-gallery');
const galleryButtons = [...document.querySelectorAll('[data-gallery-direction]')];
document.querySelector('.gallery-controls').hidden = false;
function updateGalleryControls() {
  galleryButtons[0].disabled = gallery.scrollLeft <= 1;
  galleryButtons[1].disabled = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 1;
}
for (const button of galleryButtons) {
  button.addEventListener('click', () => {
    // 用相邻卡片的实际间距计算步长，适配浏览器缩放与响应式尺寸。
    const cards = gallery.querySelectorAll('.screenshot-card');
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    gallery.scrollBy({
      left: Number(button.dataset.galleryDirection) * step,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  });
}
gallery.addEventListener('scroll', updateGalleryControls, { passive: true });
new ResizeObserver(updateGalleryControls).observe(gallery);
updateGalleryControls();

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    downloadMascot.destroy();
    downloads.destroy();
    featureStory.destroy();
    screenshotViewer.destroy();
    scrollExperience.destroy();
  });

const navigationLinks = [...document.querySelectorAll('.main-nav a')];
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
  { rootMargin: '-20% 0px -40% 0px' },
);
for (const link of navigationLinks) sectionObserver.observe(document.querySelector(link.hash));
