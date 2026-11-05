import { defineConfig } from 'vite';
import { i18nPages } from './scripts/i18n-pages.mjs';

export default defineConfig({
  // 相对资源地址使同一份静态产物可部署在根域名或 GitHub Pages 子路径。
  base: './',
  plugins: [i18nPages()],
});
