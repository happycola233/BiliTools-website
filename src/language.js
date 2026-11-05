import { alternateLocale, alternateMessages, pageLocale } from './i18n.js';

const STORAGE_KEY = 'bilitools-language';
const SUGGESTION_DELAY_MS = 1200;

function readChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveChoice(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* 隐私模式禁用存储时，切换照常进行，只是下次仍可能看到语言提示。 */
  }
}

/** 浏览器首选语言是否更适合另一版本：中文浏览器看中文页，其余语言优先英文页。 */
function prefersAlternate() {
  const preferred = navigator.languages?.[0] ?? navigator.language ?? '';
  const prefersChinese = /^zh\b/i.test(preferred);
  return pageLocale === 'en' ? prefersChinese : !prefersChinese;
}

export function createLanguageSwitch() {
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  const links = [...document.querySelectorAll('[data-language-switch]')];
  const snackbar = document.querySelector('.snackbar');
  let showTimer;

  // 切换语言时保留当前锚点，并记住选择；不做自动跳转，避免影响搜索引擎收录各语言页面。
  for (const link of links) {
    link.addEventListener(
      'click',
      () => {
        saveChoice(alternateLocale);
        link.hash = location.hash;
      },
      options,
    );
  }

  if (!readChoice() && prefersAlternate()) {
    snackbar.lang = alternateLocale;
    snackbar.querySelector('.snackbar-message').textContent = alternateMessages.languageSuggestion;
    snackbar.querySelector('.snackbar-action').textContent =
      alternateMessages.languageSuggestionAction;
    const dismiss = snackbar.querySelector('.snackbar-dismiss');
    dismiss.setAttribute('aria-label', alternateMessages.dismiss);
    dismiss.addEventListener(
      'click',
      () => {
        // 关闭即表示留在当前语言，之后不再提示。
        saveChoice(pageLocale);
        snackbar.hidden = true;
      },
      options,
    );
    showTimer = setTimeout(() => {
      snackbar.hidden = false;
    }, SUGGESTION_DELAY_MS);
  }

  return {
    destroy() {
      clearTimeout(showTimer);
      snackbar.hidden = true;
      lifecycle.abort();
    },
  };
}
