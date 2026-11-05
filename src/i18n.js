// 只导入各语言的 app 分组（运行时文案），页面文案已在构建时写进 HTML，不进入脚本包。
import { app as zhCN } from './locales/zh-CN.json';
import { app as en } from './locales/en.json';

const catalogs = { 'zh-CN': zhCN, en };

export const pageLocale = document.documentElement.lang;
export const alternateLocale = pageLocale === 'en' ? 'zh-CN' : 'en';
/** 另一语言的文案：语言建议提示条用对方语言书写，方便看不懂当前页面的访客找到入口。 */
export const alternateMessages = catalogs[alternateLocale];

/** 读取当前页面语言的运行时文案，`{name}` 由 values 中的同名字段替换。 */
export function t(key, values = {}) {
  return catalogs[pageLocale][key].replace(/\{(\w+)\}/g, (_match, name) => values[name]);
}
