import { finishSelectionColors } from './expressive-buttons.js';
import { MOTION, springTiming } from './spring.js';

// 两侧各露出的截图数量，以及它们相对当前截图的水平位移（以截图宽度为单位）。
// 位移随缩放递减，让相邻截图稍稍压在当前截图之后，形成前后层次。
const SIDE_SHIFTS = [0, 0.86, 1.5, 2];
const SWIPE_THRESHOLD_PX = 40;

const pad = (value) => String(value).padStart(2, '0');

/**
 * 界面展示：焦点轮播。当前界面居中放大，相邻界面缩小、淡出排在两侧；
 * 下方显示标题与说明，标签条、左右按钮和横向轻扫都能切换。
 * 未加载脚本时，CSS 将全部截图排成可横向滚动的列表，说明文字随图展示。
 */
export function createShowcase() {
  const showcase = document.querySelector('.showcase');
  const stage = showcase.querySelector('.showcase-stage');
  const track = showcase.querySelector('.showcase-track');
  const slides = [...track.querySelectorAll('.showcase-slide')];
  const tablist = showcase.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const stepButtons = [...showcase.querySelectorAll('[data-showcase-step]')];
  const details = showcase.querySelector('.showcase-details');
  const count = details.querySelector('.showcase-count');
  const title = details.querySelector('.showcase-title');
  const description = details.querySelector('.showcase-description');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  let selectedIndex = 0;
  let swipe;
  let suppressClick = false;

  showcase.classList.add('is-interactive');
  for (const element of [tablist, details, ...stepButtons]) element.hidden = false;
  slides.forEach((slide, index) => {
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-labelledby', tabs[index].id);
  });

  function describe() {
    const caption = slides[selectedIndex].querySelector('.showcase-caption');
    count.textContent = `${pad(selectedIndex + 1)} / ${pad(slides.length)}`;
    title.textContent = caption.querySelector('strong').textContent;
    description.textContent = caption.querySelector('span').textContent;
  }

  // 首尾相接：两侧始终有相邻截图，切到第一张或最后一张时画面也保持对称。
  const half = Math.floor(slides.length / 2);
  const offsetOf = (index) =>
    ((index - selectedIndex + slides.length + half) % slides.length) - half;

  function render() {
    slides.forEach((slide, index) => {
      const offset = offsetOf(index);
      const distance = Math.min(Math.abs(offset), SIDE_SHIFTS.length - 1);
      const active = offset === 0;
      slide.dataset.distance = String(distance);
      slide.style.setProperty('--shift', String(Math.sign(offset) * SIDE_SHIFTS[distance]));
      // 两侧截图只作预览：点击即切换过去，不进入读屏内容与 Tab 焦点顺序。
      slide.setAttribute('aria-hidden', String(!active));
      slide.querySelector('.screen-zoom').tabIndex = active ? 0 : -1;
    });
    tabs.forEach((tab, index) => {
      const active = index === selectedIndex;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    finishSelectionColors(tabs);
    describe();
  }

  // 横向标签条只滚动自身，不触发页面滚动（页面可能由平滑滚动接管）。
  function revealTab(tab) {
    if (tablist.scrollWidth <= tablist.clientWidth) return;
    const left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
    tablist.scrollTo({ left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function select(index) {
    const next = (index + slides.length) % slides.length;
    if (next === selectedIndex) return;
    selectedIndex = next;
    render();
    revealTab(tabs[next]);
    // 说明文字只做轻微浮现，与截图透明度同用 DefaultEffects 弹簧，不回弹。
    if (!reducedMotion.matches)
      details.animate(
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'none' },
        ],
        springTiming(MOTION.defaultEffects),
      );
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index), options);
  });
  tablist.addEventListener(
    'keydown',
    (event) => {
      let index = selectedIndex;
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else if (event.key === 'ArrowLeft') index -= 1;
      else if (event.key === 'ArrowRight') index += 1;
      else return;
      event.preventDefault();
      select(index);
      tabs[selectedIndex].focus({ preventScroll: true });
    },
    options,
  );
  for (const button of stepButtons) {
    button.addEventListener(
      'click',
      () => select(selectedIndex + Number(button.dataset.showcaseStep)),
      options,
    );
  }

  // 捕获阶段拦截两侧截图的点击：切换过去，而不是打开放大查看。
  track.addEventListener(
    'click',
    (event) => {
      const slide = event.target.closest('.showcase-slide');
      const index = slides.indexOf(slide);
      if (!suppressClick && (index === -1 || index === selectedIndex)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
      if (index !== -1) select(index);
    },
    { ...options, capture: true },
  );

  // 横向轻扫切换；纵向滑动交给页面滚动（touch-action: pan-y）。
  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button === 0) swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    options,
  );
  stage.addEventListener(
    'pointerup',
    (event) => {
      if (swipe?.id !== event.pointerId) return;
      const deltaX = event.clientX - swipe.x;
      const deltaY = event.clientY - swipe.y;
      swipe = undefined;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;
      // 轻扫结束时浏览器仍会派发一次 click，跳过它，避免误开放大查看。
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      });
      select(selectedIndex + (deltaX < 0 ? 1 : -1));
    },
    options,
  );
  stage.addEventListener(
    'pointercancel',
    () => {
      swipe = undefined;
    },
    options,
  );
  stage.addEventListener('dragstart', (event) => event.preventDefault(), options);

  render();

  return {
    select,
    destroy() {
      lifecycle.abort();
      slides.forEach((slide) => {
        slide.removeAttribute('role');
        slide.removeAttribute('aria-labelledby');
        slide.removeAttribute('aria-hidden');
        slide.removeAttribute('data-distance');
        slide.style.removeProperty('--shift');
      });
      showcase.classList.remove('is-interactive');
      for (const element of [tablist, details, ...stepButtons]) element.hidden = true;
    },
  };
}
