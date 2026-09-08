import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function createFeatureStory(scrollExperience) {
  const section = document.querySelector('#features');
  const stage = section.querySelector('.story-stage');
  const tabs = [...section.querySelectorAll('[role="tab"]')];
  const panels = [...section.querySelectorAll('.story-chapter')];
  const pictures = panels.map((panel) => panel.querySelector('picture'));
  const originalFrames = pictures.map((picture) => picture.parentElement);
  const screen = document.createElement('div');
  const media = gsap.matchMedia();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selectedIndex = 0;
  let transition;
  let scrollTrigger;
  let navigating = false;

  screen.className = 'phone story-screen';
  screen.append(...pictures);
  stage.append(screen);
  section.classList.add('story-interactive');
  section.querySelector('.story-tabs').hidden = false;

  const context = gsap.context(() => {
    gsap.set(panels.slice(1), { autoAlpha: 0 });
    gsap.set(pictures.slice(1), { xPercent: 100, autoAlpha: 0 });
  }, stage);

  function updateAccessibility() {
    tabs.forEach((tab, index) => {
      const active = index === selectedIndex;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].setAttribute('aria-hidden', String(!active));
      panels[index].inert = !active;
      pictures[index].setAttribute('aria-hidden', String(!active));
    });
  }
  updateAccessibility();

  function selectStep(index) {
    if (index === selectedIndex) return;
    transition?.progress(1).kill();
    const previous = selectedIndex;
    const direction = index > previous ? 1 : -1;
    selectedIndex = index;
    updateAccessibility();
    if (reducedMotion.matches) {
      gsap.set(panels[previous], { autoAlpha: 0 });
      gsap.set(panels[index], { autoAlpha: 1, y: 0 });
      gsap.set(pictures[previous], { autoAlpha: 0 });
      gsap.set(pictures[index], { xPercent: 0, autoAlpha: 1 });
      return;
    }
    // 共用手机边框，整页横向滑入；两张界面保持不透明，不擦除、不旋转。
    gsap.set(pictures[index], { autoAlpha: 1 });
    transition = gsap
      .timeline({ onComplete: () => gsap.set(pictures[previous], { autoAlpha: 0 }) })
      .to(
        pictures[previous],
        { xPercent: -direction * 100, duration: 0.45, ease: 'power3.inOut' },
        0,
      )
      .fromTo(
        pictures[index],
        { xPercent: direction * 100 },
        { xPercent: 0, duration: 0.45, ease: 'power3.inOut' },
        0,
      )
      .to(panels[previous], { autoAlpha: 0, y: -8, duration: 0.12 }, 0)
      .fromTo(panels[index], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.12);
  }

  function navigateToStep(index) {
    selectStep(index);
    if (!scrollTrigger) return;
    // 点击步骤时同步滚动进度，后续滚轮从当前步骤继续，不跳回前一页。
    const progress = (index + 0.5) / tabs.length;
    const destination = scrollTrigger.start + progress * (scrollTrigger.end - scrollTrigger.start);
    navigating = true;
    scrollExperience.scrollToPosition(destination, false);
    navigating = false;
  }

  const clickHandlers = tabs.map((tab, index) => {
    const handler = () => navigateToStep(index);
    tab.addEventListener('click', handler);
    return handler;
  });
  const tablist = section.querySelector('.story-tabs');
  function onTabKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let index = selectedIndex;
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    navigateToStep(index);
    tabs[index].focus({ preventScroll: true });
  }
  tablist.addEventListener('keydown', onTabKey);

  // 仅在整个展示区能舒适放入视口时短暂停留；缩放和小屏保留直接点击。
  media.add(
    '(min-width: 960px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)',
    () => {
      scrollTrigger = ScrollTrigger.create({
        trigger: stage,
        start: () => `top ${document.querySelector('.site-header').offsetHeight + 40}px`,
        end: () => `+=${window.innerHeight * 1.1}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (!navigating)
            selectStep(Math.min(tabs.length - 1, Math.floor(self.progress * tabs.length)));
        },
      });
      return () => {
        scrollTrigger = undefined;
      };
    },
  );

  return {
    destroy() {
      transition?.kill();
      media.revert();
      context.revert();
      tabs.forEach((tab, index) => tab.removeEventListener('click', clickHandlers[index]));
      tablist.removeEventListener('keydown', onTabKey);
      panels.forEach((panel) => {
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
        panel.removeAttribute('role');
        panel.setAttribute('aria-labelledby', panel.querySelector('h3').id);
      });
      pictures.forEach((picture, index) => {
        picture.removeAttribute('aria-hidden');
        originalFrames[index].append(picture);
      });
      screen.remove();
      section.classList.remove('story-interactive');
      tablist.hidden = true;
    },
  };
}
