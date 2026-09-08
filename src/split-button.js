export function createSplitButton(trigger, menu) {
  const lifecycle = new AbortController();
  const choices = [...menu.querySelectorAll('[role="menuitemradio"]')];
  let positionFrame;
  let initialFocus = 'selected';
  const isOpen = () => menu.matches(':popover-open');

  function focusChoice(choice) {
    for (const item of choices) item.tabIndex = item === choice ? 0 : -1;
    choice?.focus({ preventScroll: true });
    choice?.scrollIntoView({ block: 'nearest' });
  }

  function positionMenu() {
    const bounds = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth;
    if (bounds.bottom < 0 || bounds.top > viewportHeight) {
      menu.hidePopover();
      return;
    }
    // 宽度由响应式样式决定；offsetWidth 不受弹层入场缩放动画影响。
    const width = menu.offsetWidth;
    const below = viewportHeight - bounds.bottom - 20;
    const above = bounds.top - 20;
    const opensBelow = below >= Math.min(menu.scrollHeight, 420) || below >= above;
    menu.style.maxHeight = `${Math.max(0, opensBelow ? below : above)}px`;
    menu.style.left = `${Math.max(12, Math.min(bounds.right - width, viewportWidth - width - 12))}px`;
    menu.style.top = `${opensBelow ? bounds.bottom + 8 : bounds.top - menu.offsetHeight - 8}px`;
    menu.style.transformOrigin = opensBelow ? 'top right' : 'bottom right';
  }

  // ScrollSmoother 使用 transform 移动页面；仅在菜单打开时跟踪实际按钮位置。
  function trackPosition() {
    if (!isOpen()) return;
    positionMenu();
    positionFrame = requestAnimationFrame(trackPosition);
  }

  menu.addEventListener(
    'beforetoggle',
    (event) => {
      trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
      if (event.newState === 'closed') cancelAnimationFrame(positionFrame);
    },
    { signal: lifecycle.signal },
  );

  menu.addEventListener(
    'toggle',
    () => {
      if (!isOpen()) return;
      cancelAnimationFrame(positionFrame);
      positionMenu();
      const available = choices.filter((choice) => !choice.disabled);
      focusChoice(
        initialFocus === 'last'
          ? available.at(-1)
          : initialFocus === 'first'
            ? available[0]
            : (available.find((choice) => choice.getAttribute('aria-checked') === 'true') ??
              available[0]),
      );
      initialFocus = 'selected';
      positionFrame = requestAnimationFrame(trackPosition);
    },
    { signal: lifecycle.signal },
  );

  trigger.addEventListener(
    'keydown',
    (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      initialFocus = event.key === 'ArrowUp' ? 'last' : 'first';
      menu.showPopover();
    },
    { signal: lifecycle.signal },
  );

  menu.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        // Tab 先回到展开按钮，再由浏览器继续正常的页面焦点顺序。
        if (event.key === 'Escape') event.preventDefault();
        menu.hidePopover();
        trigger.focus({ preventScroll: true });
        return;
      }
      const available = choices.filter((choice) => !choice.disabled);
      const currentIndex = available.indexOf(document.activeElement);
      let nextIndex;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = available.length - 1;
      else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % available.length;
      else if (event.key === 'ArrowUp')
        nextIndex = (currentIndex - 1 + available.length) % available.length;
      else return;
      event.preventDefault();
      focusChoice(available[nextIndex]);
    },
    { signal: lifecycle.signal },
  );

  trigger.hidden = false;
  return {
    close() {
      if (isOpen()) menu.hidePopover();
      trigger.focus({ preventScroll: true });
    },
    destroy() {
      if (isOpen()) menu.hidePopover();
      lifecycle.abort();
      cancelAnimationFrame(positionFrame);
    },
  };
}
