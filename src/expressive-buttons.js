// 轻点也要完整呈现一次形变：给首帧留出时间，让圆角完成主要变化后再恢复。
// 这里只延长视觉反馈；按钮的点击行为仍在原生 click 事件发生时立即执行。
const MINIMUM_PRESS_MS = 140;

export function finishSelectionColors(buttons) {
  // 选中项切换时直接呈现最终颜色，避免旧高亮拖尾；圆角、挤压与之后的主题淡变照常播放。
  // getAnimations() 会同步本次样式变更，因此快速连续切换也不会留下上一项的颜色。
  for (const button of buttons) {
    for (const animation of button.getAnimations()) {
      if (['background-color', 'color'].includes(animation.transitionProperty)) animation.finish();
    }
  }
}

export function createExpressiveButtons() {
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let pressedButton;
  let pressedAt = 0;
  let releaseTimer;
  let pointerId;

  function clearPress() {
    clearTimeout(releaseTimer);
    pressedButton?.removeAttribute('data-pressed');
    pressedButton = undefined;
    pointerId = undefined;
  }

  function press(button) {
    if (button !== pressedButton) clearPress();
    else clearTimeout(releaseTimer);
    pressedButton = button;
    pressedAt = performance.now();
    button.setAttribute('data-pressed', '');
  }

  function release() {
    const remaining = reducedMotion.matches
      ? 0
      : MINIMUM_PRESS_MS - (performance.now() - pressedAt);
    if (remaining > 0) releaseTimer = setTimeout(clearPress, remaining);
    else clearPress();
  }

  function findButton(event) {
    return event.target.closest('.expressive-button:not(:disabled):not([aria-disabled="true"])');
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const button = findButton(event);
      if (!button) return;
      press(button);
      pointerId = event.pointerId;
    },
    options,
  );
  document.addEventListener(
    'pointerup',
    (event) => {
      if (event.pointerId !== pointerId) return;
      // 触屏抬手后紧接着派发 pointerout；接触已结束，不能让它截断尚未播放完的反馈。
      pointerId = undefined;
      release();
    },
    options,
  );
  document.addEventListener(
    'pointercancel',
    (event) => {
      if (event.pointerId === pointerId) clearPress();
    },
    options,
  );
  document.addEventListener(
    'pointerout',
    (event) => {
      if (event.pointerId === pointerId && !pressedButton.contains(event.relatedTarget))
        clearPress();
    },
    options,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || !['Enter', ' '].includes(event.key)) return;
      const button = findButton(event);
      if (button && (event.key === 'Enter' || button.tagName === 'BUTTON')) press(button);
    },
    options,
  );
  document.addEventListener(
    'keyup',
    (event) => {
      if (pressedButton && pointerId === undefined && ['Enter', ' '].includes(event.key)) release();
    },
    options,
  );
  document.addEventListener(
    'focusout',
    (event) => {
      if (event.target === pressedButton && pointerId === undefined) release();
    },
    options,
  );
  window.addEventListener('blur', clearPress, options);

  return {
    destroy() {
      clearPress();
      lifecycle.abort();
    },
  };
}
