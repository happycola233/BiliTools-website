import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

export function createScrollExperience() {
  const media = gsap.matchMedia();
  const header = document.querySelector('.site-header');
  let smoother;
  const headerOffset = () => header.getBoundingClientRect().bottom + 12;

  // 平滑容器的生命周期独立于布局断点，调整窗口高度不会重置滚动位置。
  media.add('(prefers-reduced-motion: no-preference)', () => {
    // 沿用 Antigravity 的 0.6 秒桌面平滑；触屏保留原生滚动。
    if (ScrollTrigger.isTouch !== 1) {
      smoother = ScrollSmoother.create({
        wrapper: '#smooth-wrapper',
        content: '#smooth-content',
        smooth: 0.6,
        effects: false,
        // 锚点已按导航栏偏移定位，不再让插件把获得焦点的整段内容滚到居中。
        onFocusIn: (_instance, event) =>
          !document.querySelector('.screenshot-dialog').open &&
          !event.target.closest('[popover]') &&
          !event.target.closest('.palette-composition') &&
          !event.target.matches('[tabindex="-1"]'),
      });
    }
    gsap.to('.reading-progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: true },
    });
    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      })
      .to('.hero-phone-series', { y: 24 }, 0)
      .to('.hero-phone-options', { y: -16 }, 0)
      .to('.hero-phone-download', { y: 12 }, 0);
    return () => {
      smoother?.kill();
      smoother = undefined;
    };
  });

  function scrollToHash(hash, animate = true) {
    const target =
      hash && hash !== '#' ? document.getElementById(decodeURIComponent(hash.slice(1))) : 0;
    if (target === null) return;
    if (smoother) smoother.scrollTo(target, animate, `top ${headerOffset()}px`);
    else {
      // 原生滚动下，返回顶部和页内锚点遵循相同的动画偏好。
      const behavior =
        animate && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant';
      if (target) target.scrollIntoView({ behavior });
      else window.scrollTo({ top: 0, behavior });
    }
  }

  function onAnchorClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = link.hash
      ? document.getElementById(decodeURIComponent(link.hash.slice(1)))
      : null;
    if (link.hash && !target) return;
    event.preventDefault();
    history.pushState(null, '', link.hash || `${location.pathname}${location.search}`);
    scrollToHash(link.hash);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
  const restoreAnchor = () => scrollToHash(location.hash, false);
  document.addEventListener('click', onAnchorClick);
  window.addEventListener('popstate', restoreAnchor);
  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
    if (location.hash) restoreAnchor();
  });

  return {
    scrollToPosition(position, animate = true) {
      if (smoother) smoother.scrollTo(position, animate);
      else window.scrollTo({ top: position, behavior: animate ? 'smooth' : 'instant' });
    },
    setPaused(paused) {
      smoother?.paused(paused);
    },
    destroy() {
      document.removeEventListener('click', onAnchorClick);
      window.removeEventListener('popstate', restoreAnchor);
      media.revert();
    },
  };
}
