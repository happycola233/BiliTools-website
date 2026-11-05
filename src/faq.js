import { MOTION, springTiming } from './spring.js';

/**
 * 问答展开与收起，复刻 Compose AnimatedVisibility 的 expandVertically + fadeIn：
 * 高度使用 MotionScheme.expressive() 的 defaultSpatial 弹簧（带轻微回弹），透明度使用 defaultEffects。
 * 列表项的圆角与间距由 data-expanded 驱动，与高度同时开始变化。
 * 未加载脚本时保留原生 <details> 的展开行为。
 */
export function createFaq({ onLayoutChange }) {
  const items = [...document.querySelectorAll('.faq-item')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new AbortController();
  const running = new Map();

  function toggle(item, expand) {
    const answer = item.querySelector('.faq-answer');
    // 动画进行中再次点击时，从当前高度接着变化，不跳回起点。收起状态从 0 开始：
    // Chrome 仍会为未展开的 details 内容计算布局，直接测量会得到完整高度。
    const startHeight = item.open ? answer.getBoundingClientRect().height : 0;
    for (const animation of running.get(item) ?? []) animation.cancel();
    item.dataset.expanded = String(expand);
    item.open = true;
    if (reducedMotion.matches) {
      item.open = expand;
      onLayoutChange();
      return;
    }
    const targetHeight = expand ? answer.scrollHeight : 0;
    const spatial = springTiming(MOTION.defaultSpatial);
    const effects = springTiming(MOTION.defaultEffects);
    const height = answer.animate(
      [{ height: `${startHeight}px` }, { height: `${targetHeight}px` }],
      spatial,
    );
    const fade = answer.animate(
      [{ opacity: expand ? 0 : 1 }, { opacity: expand ? 1 : 0 }],
      // 展开时文字稍晚浮现，收起时先淡出，避免文字在过窄的空间里被裁切。
      { ...effects, delay: expand ? 60 : 0, fill: 'backwards' },
    );
    running.set(item, [height, fade]);
    height.finished
      .then(() => {
        running.delete(item);
        if (!expand) item.open = false;
        onLayoutChange();
      })
      .catch(() => {});
  }

  for (const item of items) {
    item.dataset.expanded = String(item.open);
    item.querySelector('summary').addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        toggle(item, item.dataset.expanded !== 'true');
      },
      { signal: lifecycle.signal },
    );
  }

  return {
    destroy() {
      lifecycle.abort();
      for (const animations of running.values())
        for (const animation of animations) animation.cancel();
      for (const item of items) {
        item.open = item.dataset.expanded === 'true';
        item.removeAttribute('data-expanded');
      }
    },
  };
}
