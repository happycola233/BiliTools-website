import { defineConfig } from 'vite';
import { i18nPages } from './scripts/i18n-pages.mjs';

export default defineConfig({
  // 相对资源地址使同一份静态产物可部署在根域名或 GitHub Pages 子路径。
  base: './',
  plugins: [i18nPages()],
  build: {
    // Vite 压缩时默认删除全部注释；保留依赖中 /*! … @license */ 形式的版权与许可声明（如 GSAP）。
    rolldownOptions: { output: { comments: { legal: true } } },
  },
});
