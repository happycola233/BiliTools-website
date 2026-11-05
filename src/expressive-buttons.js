// Expressive 交互反馈，按输入方式区分：
// - 鼠标：悬停时形变（圆角收紧）；按下时圆角保持悬停时的形状，连接式按钮组照常向两侧挤压，
//   并播放水波纹，因此点击不会出现「先变形再弹回」；
// - 触摸与触控笔：没有悬停，按下即形变、挤压并播放水波纹，与 Android 上的手感一致；
// - 键盘：Enter / Space 按下时挤压并从中心播放水波纹。
// 轻触也要完整呈现一次形变：给首帧留出时间，让圆角完成主要变化后再恢复。
// 这里只延长视觉反馈；按钮的点击行为仍在原生 click 事件发生时立即执行。
const MINIMUM_PRESS_MS = 140;

// 水波纹沿用 Compose RippleAnimation：起始半径为长边的 30%，225ms 扩散到覆盖整个控件，
// 75ms 淡入；松手且扩散完成后 150ms 淡出。不透明度取 M3 按下状态层的 10%。
const RIPPLE_EXPAND_MS = 225;
const RIPPLE_FADE_IN_MS = 75;
const RIPPLE_FADE_OUT_MS = 150;
const RIPPLE_OPACITY = 0.1;

const INTERACTIVE = '.expressive-button, [data-ripple]';

export function finishSelectionColors(buttons) {
  // 选中项切换时直接呈现最终颜色，避免旧高亮拖尾；圆角与之后的主题淡变照常播放。
  // getAnimations() 会同步本次样式变更，因此快速连续切换也不会留下上一项的颜色。
  for (const button of buttons) {
    for (const animation of button.getAnimations()) {
      if (['background-color', 'color'].includes(animation.transitionProperty)) animation.finish();
    }
  }
}

/**
 * 播放一次水波纹，返回松手时调用的函数。波纹铺满并被裁切在「表面」内：默认是控件自身，
 * 也可以是控件里标记 data-ripple-surface 的部分（色块），或包住控件的 data-ripple-surface 容器（问答整项）。
 */
function startRipple(control, clientX, clientY) {
  const surface =
    control.querySelector('[data-ripple-surface]') ??
    control.closest('[data-ripple-surface]') ??
    control;
  const bounds = surface.getBoundingClientRect();
  const originX = clientX === undefined ? bounds.width / 2 : clientX - bounds.left;
  const originY = clientY === undefined ? bounds.height / 2 : clientY - bounds.top;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.setAttribute('aria-hidden', 'true');
  // 半径跟随表面的实时尺寸：连接式按钮组按下时按钮变宽、问答展开时整项变高，波纹都要铺满到边缘。
  // 波纹由 CSS 定位在表面中心，尺寸变化时圆心随之移动。
  const fit = () => {
    const { width, height } = surface.getBoundingClientRect();
    const radius = Math.hypot(width, height) / 2 + 10;
    Object.assign(ripple.style, {
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      margin: `${-radius}px`,
    });
    return radius;
  };
  const startScale = (Math.max(bounds.width, bounds.height) * 0.3) / fit();
  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(surface);
  // 表面包住控件时，波纹仍放进控件里（收起的 <details> 不渲染 <summary> 以外的内容），
  // 控件自身不设定位，波纹便相对表面定位并被表面的圆角裁切。
  (control.contains(surface) ? surface : control).append(ripple);
  // 圆心从按下的位置移向表面中心，同时半径扩散到覆盖整个表面。
  const expand = ripple.animate(
    [
      {
        transform: `translate(${originX - bounds.width / 2}px, ${originY - bounds.height / 2}px) scale(${startScale})`,
      },
      { transform: 'translate(0, 0) scale(1)' },
    ],
    { duration: RIPPLE_EXPAND_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
  );
  ripple.animate([{ opacity: 0 }, { opacity: RIPPLE_OPACITY }], {
    duration: RIPPLE_FADE_IN_MS,
    fill: 'forwards',
  });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    expand.finished
      .then(
        () =>
          ripple.animate([{ opacity: RIPPLE_OPACITY }, { opacity: 0 }], {
            duration: RIPPLE_FADE_OUT_MS,
            fill: 'forwards',
          }).finished,
      )
      .catch(() => {})
      .finally(() => {
        resizeObserver.disconnect();
        ripple.remove();
      });
  };
}

export function createExpressiveButtons() {
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let pressedButton;
  let pressedAt = 0;
  let releaseTimer;
  let pointerId;
  let releaseRipple;
  let hoveredButton;

  function findControl(event) {
    return event.target.closest?.(`:is(${INTERACTIVE}):not(:disabled):not([aria-disabled="true"])`);
  }

  function finishRipple() {
    releaseRipple?.();
    releaseRipple = undefined;
  }

  function ripple(control, clientX, clientY) {
    finishRipple();
    if (!reducedMotion.matches) releaseRipple = startRipple(control, clientX, clientY);
  }

  function clearPress() {
    clearTimeout(releaseTimer);
    pressedButton?.removeAttribute('data-pressed');
    pressedButton = undefined;
  }

  function press(button) {
    if (button !== pressedButton) clearPress();
    else clearTimeout(releaseTimer);
    pressedButton = button;
    pressedAt = performance.now();
    button.setAttribute('data-pressed', '');
  }

  function releasePress() {
    const remaining = reducedMotion.matches
      ? 0
      : MINIMUM_PRESS_MS - (performance.now() - pressedAt);
    if (remaining > 0) releaseTimer = setTimeout(clearPress, remaining);
    else clearPress();
  }

  function endPointer() {
    pointerId = undefined;
    finishRipple();
    if (pressedButton) releasePress();
  }

  function setHovered(button) {
    if (button === hoveredButton) return;
    hoveredButton?.removeAttribute('data-hovered');
    hoveredButton = button;
    hoveredButton?.setAttribute('data-hovered', '');
  }

  // 鼠标悬停形变；触摸设备没有悬停，不会触发。
  document.addEventListener(
    'pointerover',
    (event) => {
      if (event.pointerType === 'mouse')
        setHovered(findControl(event)?.closest('.expressive-button'));
    },
    options,
  );
  document.addEventListener(
    'pointerout',
    (event) => {
      if (event.pointerType === 'mouse' && !hoveredButton?.contains(event.relatedTarget))
        setHovered(undefined);
    },
    options,
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const control = findControl(event);
      if (!control) return;
      pointerId = event.pointerId;
      ripple(control, event.clientX, event.clientY);
      if (control.matches('.expressive-button')) press(control);
    },
    options,
  );
  document.addEventListener(
    'pointerup',
    (event) => {
      // 触屏抬手后紧接着派发 pointerout；接触已结束，不能让它截断尚未播放完的反馈。
      if (event.pointerId === pointerId) endPointer();
    },
    options,
  );
  document.addEventListener(
    'pointercancel',
    (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = undefined;
      finishRipple();
      clearPress();
    },
    options,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || !['Enter', ' '].includes(event.key)) return;
      const control = findControl(event);
      if (!control || (event.key === ' ' && !control.matches('button, summary'))) return;
      ripple(control);
      if (control.matches('.expressive-button')) press(control);
    },
    options,
  );
  document.addEventListener(
    'keyup',
    (event) => {
      if (pointerId !== undefined || !['Enter', ' '].includes(event.key)) return;
      finishRipple();
      if (pressedButton) releasePress();
    },
    options,
  );
  window.addEventListener(
    'blur',
    () => {
      finishRipple();
      clearPress();
      setHovered(undefined);
    },
    options,
  );

  return {
    destroy() {
      finishRipple();
      clearPress();
      setHovered(undefined);
      lifecycle.abort();
    },
  };
}
