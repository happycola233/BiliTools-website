import { gsap } from 'gsap';

export function createScreenshotViewer(links, scrollExperience) {
  const dialog = document.querySelector('.screenshot-dialog');
  const images = [...dialog.querySelectorAll('.dialog-image')];
  const title = dialog.querySelector('#dialog-title');
  const count = dialog.querySelector('.dialog-count');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let visibleImage = images[0];
  let transition;
  let requestId = 0;

  async function showScreenshot(direction = 0) {
    const request = ++requestId;
    const link = links[activeIndex];
    // 图片解码完成后才开始切换；快速连续点击只呈现最新请求。
    const source = new Image();
    source.src = link.href;
    try {
      await source.decode();
    } catch {
      // 本地资源加载失败时保留上一张完整图片。
      return;
    }
    if (request !== requestId || !dialog.open) return;
    transition?.progress(1).kill();
    const incoming = images.find((image) => image !== visibleImage);
    const outgoing = visibleImage;
    incoming.src = source.src;
    incoming.alt = link.querySelector('img').alt;
    incoming.hidden = false;
    outgoing.setAttribute('aria-hidden', 'true');
    incoming.removeAttribute('aria-hidden');
    // 弹窗使用短标题，完整图片说明由替代文本提供。
    title.textContent = link.closest('figure').querySelector('h3').textContent;
    count.textContent = `${activeIndex + 1} / ${links.length}`;
    visibleImage = incoming;
    const finish = () => {
      outgoing.hidden = true;
    };
    if (!direction || reducedMotion.matches) {
      gsap.set(incoming, { x: 0, opacity: 1 });
      finish();
      return;
    }
    transition = gsap
      .timeline({ onComplete: finish, defaults: { duration: 0.36, ease: 'power2.out' } })
      .fromTo(outgoing, { x: 0, opacity: 1 }, { x: -direction * 32, opacity: 0 }, 0)
      .fromTo(incoming, { x: direction * 32, opacity: 0 }, { x: 0, opacity: 1 }, 0);
  }

  links.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activeIndex = index;
      // 首次打开沿用画廊中已经加载的图片，避免短暂闪出上一张截图。
      visibleImage.src = link.href;
      visibleImage.alt = link.querySelector('img').alt;
      title.textContent = link.closest('figure').querySelector('h3').textContent;
      count.textContent = `${index + 1} / ${links.length}`;
      dialog.showModal();
      scrollExperience.setPaused(true);
      showScreenshot();
    });
  });
  function move(direction) {
    activeIndex = (activeIndex + direction + links.length) % links.length;
    showScreenshot(direction);
  }
  for (const button of dialog.querySelectorAll('[data-dialog-direction]')) {
    button.addEventListener('click', () => move(Number(button.dataset.dialogDirection)));
  }
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  dialog.addEventListener('close', () => {
    requestId++;
    transition?.progress(1).kill();
    scrollExperience.setPaused(false);
  });
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      dialog.close();
  });
  return {
    syncTheme() {
      if (dialog.open) showScreenshot();
    },
    destroy() {
      requestId++;
      transition?.kill();
    },
  };
}
