import { gsap } from 'gsap';

/** srcset 的最后一项是原图（1440w），放大查看时始终使用它。 */
function fullSizeUrl(picture) {
  const source = picture.querySelector('source');
  // main.js 根据当前明暗把 source.media 设为 all / not all，据此选择对应主题的截图。
  const srcset = matchMedia(source.media).matches
    ? source.srcset
    : picture.querySelector('img').srcset;
  const largest = srcset.split(',').at(-1).trim().split(/\s+/)[0];
  return new URL(largest, document.baseURI).href;
}

export function createScreenshotViewer(scrollExperience, { onClose }) {
  const dialog = document.querySelector('.screenshot-dialog');
  const images = [...dialog.querySelectorAll('.dialog-image')];
  const title = dialog.querySelector('#dialog-title');
  const count = dialog.querySelector('.dialog-count');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  const screens = [...document.querySelectorAll('.showcase-slide')].map((slide) => ({
    button: slide.querySelector('.screen-zoom'),
    picture: slide.querySelector('picture'),
    title: slide.querySelector('.showcase-caption strong').textContent,
  }));
  let activeIndex = 0;
  let visibleImage = images[0];
  let transition;
  let requestId = 0;

  function describe(screen) {
    // 弹窗使用短标题，完整图片说明由替代文本提供。
    title.textContent = screen.title;
    count.textContent = `${activeIndex + 1} / ${screens.length}`;
  }

  async function showScreenshot(direction = 0) {
    const request = ++requestId;
    const screen = screens[activeIndex];
    // 图片解码完成后才开始切换；快速连续点击只呈现最新请求。
    const source = new Image();
    source.src = fullSizeUrl(screen.picture);
    try {
      await source.decode();
    } catch {
      // 资源加载失败时保留上一张完整图片。
      return;
    }
    if (request !== requestId || !dialog.open) return;
    transition?.progress(1).kill();
    const incoming = images.find((image) => image !== visibleImage);
    const outgoing = visibleImage;
    incoming.src = source.src;
    incoming.alt = screen.picture.querySelector('img').alt;
    incoming.hidden = false;
    outgoing.setAttribute('aria-hidden', 'true');
    incoming.removeAttribute('aria-hidden');
    describe(screen);
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

  screens.forEach((screen, index) => {
    screen.button.disabled = false;
    screen.button.addEventListener(
      'click',
      () => {
        activeIndex = index;
        // 先沿用展示区已加载的图片，原图解码完成后再替换，避免空白或闪出上一张。
        visibleImage.src = screen.picture.querySelector('img').currentSrc;
        visibleImage.alt = screen.picture.querySelector('img').alt;
        describe(screen);
        dialog.showModal();
        scrollExperience.setPaused(true);
        showScreenshot();
      },
      options,
    );
  });
  function move(direction) {
    activeIndex = (activeIndex + direction + screens.length) % screens.length;
    showScreenshot(direction);
  }
  for (const button of dialog.querySelectorAll('[data-dialog-direction]')) {
    button.addEventListener('click', () => move(Number(button.dataset.dialogDirection)), options);
  }
  dialog.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    },
    options,
  );
  dialog.addEventListener(
    'close',
    () => {
      requestId++;
      transition?.progress(1).kill();
      scrollExperience.setPaused(false);
      // 关闭后展示区停在最后查看的界面，方便接着阅读它的说明。
      onClose(activeIndex);
    },
    options,
  );
  dialog.addEventListener(
    'click',
    (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom)
      )
        dialog.close();
    },
    options,
  );
  return {
    syncTheme() {
      if (dialog.open) showScreenshot();
    },
    destroy() {
      requestId++;
      transition?.kill();
      lifecycle.abort();
      for (const screen of screens) screen.button.disabled = true;
    },
  };
}
