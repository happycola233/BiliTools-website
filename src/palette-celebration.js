import confetti from 'canvas-confetti';
import { t } from './i18n.js';

export function createPaletteCelebration(button, status) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const idleIcon = button.querySelector('[data-celebration-icon="idle"]');
  const doneIcon = button.querySelector('[data-celebration-icon="done"]');
  const label = button.querySelector('span');
  const defaultMessage = status.textContent;
  const timers = new Set();
  let canvas;
  let launch;
  let ribbon;
  let run = 0;

  function later(callback, delay) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  }

  function stop() {
    run++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    launch?.reset();
    canvas?.remove();
    label.textContent = t('previewDownload');
    idleIcon.hidden = false;
    doneIcon.hidden = true;
    status.textContent = defaultMessage;
  }

  function play(colors, name) {
    // 连点重新播放同一场彩带，避免粒子与延时任务无限叠加。
    stop();
    const currentRun = run;
    label.textContent = t('celebrate');
    idleIcon.hidden = true;
    doneIcon.hidden = false;
    status.textContent = t('celebrateMessage', { name });
    if (reducedMotion.matches) {
      later(stop, 2600);
      return;
    }

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'palette-confetti';
      canvas.setAttribute('aria-hidden', 'true');
      launch = confetti.create(canvas, {
        resize: true,
        useWorker: true,
        disableForReducedMotion: true,
      });
      // 窄纸带与小圆纸片混合，沿用库的翻转、阻力和重力模拟。
      ribbon = confetti.shapeFromPath({ path: 'M0 0H3V12H0Z', matrix: [1, 0, 0, 1, -1.5, -6] });
    }
    // Canvas 放在平滑滚动容器外，始终覆盖视口，且不拦截页面操作。
    document.body.append(canvas);
    const bounds = button.getBoundingClientRect();
    const compact = window.innerWidth < 600;
    const shared = {
      colors,
      shapes: [ribbon, 'square', 'circle'],
      gravity: 0.85,
      ticks: 230,
      scalar: 1,
    };
    launch({
      ...shared,
      particleCount: compact ? 24 : 40,
      origin: {
        x: (bounds.left + bounds.width / 2) / window.innerWidth,
        y: bounds.top / window.innerHeight,
      },
      spread: 75,
      startVelocity: 32,
    });

    later(() => {
      for (const [x, angle] of [
        [0.08, 62],
        [0.92, 118],
      ]) {
        launch({
          ...shared,
          particleCount: compact ? 48 : 85,
          origin: { x, y: 0.66 },
          angle,
          spread: 66,
          startVelocity: compact ? 46 : 64,
          decay: 0.93,
        });
      }
    }, 140);

    later(() => {
      const ending = launch({
        ...shared,
        particleCount: compact ? 30 : 55,
        origin: { x: 0.5, y: 0.22 },
        spread: 160,
        startVelocity: 16,
        gravity: 0.65,
        scalar: 0.8,
      });
      ending.then(() => {
        if (run === currentRun) stop();
      });
    }, 380);
  }

  reducedMotion.addEventListener('change', stop, { signal: lifecycle.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
    },
    { signal: lifecycle.signal },
  );

  return {
    play,
    stop,
    destroy() {
      stop();
      lifecycle.abort();
    },
  };
}
