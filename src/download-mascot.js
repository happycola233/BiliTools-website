export function createDownloadMascot() {
  const button = document.querySelector('.download-mascot');
  const icon = button.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  let hop;

  function cancelHop() {
    hop?.cancel();
    hop = undefined;
  }

  button.disabled = false;
  button.addEventListener(
    'click',
    () => {
      cancelHop();
      if (reducedMotion.matches) return;

      // 对齐 App 的 BiliTvLaunchMotion：120ms 蓄力、260ms 跃起、260ms 回弹。
      // 位移按 App 46dp 图标画布换成百分比，桌面与移动端保持相同的弹跳比例。
      hop = icon.animate(
        [
          {
            transform: 'translateY(0) rotate(0deg) scale(1, 1)',
            offset: 0,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          },
          {
            transform: 'translateY(15.2174%) rotate(-2deg) scale(1.06, 0.92)',
            offset: 120 / 640,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
          {
            transform: 'translateY(-100%) rotate(4deg) scale(0.96, 1.07)',
            offset: 380 / 640,
            // OvershootInterpolator(0.55) 的等价三次贝塞尔曲线。
            easing: 'cubic-bezier(0.333333, 1.183333, 0.666667, 1)',
          },
          { transform: 'translateY(0) rotate(0deg) scale(1, 1)', offset: 1 },
        ],
        { duration: 640 },
      );
    },
    { signal: lifecycle.signal },
  );
  reducedMotion.addEventListener('change', cancelHop, { signal: lifecycle.signal });

  const visibility = new IntersectionObserver(([entry]) => {
    button.classList.toggle('is-visible', entry.isIntersecting);
    if (!entry.isIntersecting) cancelHop();
  });
  visibility.observe(button);

  return {
    destroy() {
      lifecycle.abort();
      visibility.disconnect();
      cancelHop();
      button.classList.remove('is-visible');
      button.disabled = true;
    },
  };
}
