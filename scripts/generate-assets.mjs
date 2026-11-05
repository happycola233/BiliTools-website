import { readFile, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { vectorDrawableToSymbol } from './vector-drawable.mjs';
import { materialShapeSymbols } from './material-shapes.mjs';
import { SCREENS, LOCALE_SCREEN_DIRS, THEMES } from '../src/screens.js';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const androidProjectRoot = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(websiteRoot, '../BiliTools');
const outputRoot = path.join(websiteRoot, 'public/assets');
const screensRoot = path.join(outputRoot, 'screens');
await rm(screensRoot, { recursive: true, force: true });

// 每张截图输出两档：720 宽 WebP 供常规屏幕显示；原图 JPG 原样复制（不重新编码），
// 供高像素密度屏幕与放大查看，保留 Android 仓库中已无损优化的画质与色彩配置。
let screenshotCount = 0;
for (const directory of new Set(Object.values(LOCALE_SCREEN_DIRS))) {
  await mkdir(path.join(screensRoot, directory), { recursive: true });
  for (const screen of SCREENS) {
    for (const theme of THEMES) {
      const source = path.join(
        androidProjectRoot,
        `docs/assets/screenshots/${directory}/${screen}-${theme}.jpg`,
      );
      const target = path.join(screensRoot, directory, `${screen}-${theme}`);
      await sharp(source)
        .resize({ width: 720 })
        .webp({ quality: 90, effort: 6 })
        .toFile(`${target}-720.webp`);
      await copyFile(source, `${target}.jpg`);
      screenshotCount++;
    }
  }
}

await sharp(path.join(androidProjectRoot, 'docs/assets/BiliTools_icon_transparent.png'))
  .resize(192, 192)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outputRoot, 'icon.png'));

// 复用 App 矢量，路径、透明填充与 group 平移统一由转换器保留。
const icons = {
  download: 'ic_save_alt_24',
  moon: 'ic_dark_mode_24',
  sun: 'ic_light_mode_24',
  github: 'ic_github_invertocat_black',
  external: 'ic_open_in_new_24',
  back: 'ic_arrow_back_24',
  down: 'ic_expand_more_24',
  quality: 'ic_high_quality_24',
  check: 'ic_check_rounded_24',
  parse: 'ic_movie_filter_24',
  share: 'ic_share_24',
  subtitle: 'ic_metadata_24',
  folder: 'ic_folder_24',
  close: 'ic_close_rounded_24',
  language: 'ic_language_rounded_24',
  palette: 'ic_palette_24',
  audio: 'ic_graphic_eq_24',
  danmaku: 'ic_danmaku_24',
  checklist: 'ic_checklist_rounded_24',
  privacy: 'ic_verified_user_rounded_24',
  update: 'ic_update_24',
  sparkle: 'ic_wand_shine_24',
  window: 'ic_select_window_rounded_24',
  help: 'ic_info_24',
  feedback: 'ic_feedback_24',
  code: 'ic_code_24',
  'content-video': 'ic_output_movie_24',
  'content-course': 'ic_lightbulb_24',
  'content-audio': 'ic_album_24',
  'content-article': 'ic_article_24',
  'content-favorites': 'ic_bookmark_manager_24',
  'content-later': 'ic_watch_later_24',
  'content-space': 'ic_account_circle_24',
  'output-audiovisual': 'ic_output_movie_24',
  'output-video': 'ic_output_video_file_24',
  'output-audio': 'ic_output_audio_file_24',
};
const symbols = [];
for (const [name, filename] of Object.entries(icons)) {
  const xml = await readFile(
    path.join(androidProjectRoot, `app/src/main/res/drawable/${filename}.xml`),
    'utf8',
  );
  const { width, height, content, symbol } = vectorDrawableToSymbol(name, xml);
  symbols.push(symbol);
  if (name === 'back')
    symbols.push(
      `<symbol id="arrow" viewBox="0 0 ${width} ${height}"><g transform="translate(${width} ${height}) rotate(180)">${content}</g></symbol>`,
    );
}
symbols.push(...materialShapeSymbols());
await writeFile(
  path.join(outputRoot, 'icons.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`,
);
console.log(`Prepared ${screenshotCount} screenshots, app icon, and ${symbols.length} symbols.`);
