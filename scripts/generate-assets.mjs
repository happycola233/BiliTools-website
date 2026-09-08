import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { vectorDrawableToSymbol } from './vector-drawable.mjs';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const androidProjectRoot = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(websiteRoot, '../BiliTools');
const outputRoot = path.join(websiteRoot, 'public/assets');
await mkdir(path.join(outputRoot, 'screens'), { recursive: true });

const screenshots = {
  series: '02-解析-番剧',
  options: '03-解析-下载选项',
  download: '05-下载',
  history: '06-历史记录',
  profile: '07-我',
  appearance: '12-设置-外观',
};
for (const [name, filename] of Object.entries(screenshots)) {
  for (const [mode, suffix] of [
    ['light', '浅色'],
    ['dark', '深色'],
  ]) {
    await sharp(path.join(androidProjectRoot, `docs/assets/screenshots/${filename}_${suffix}.jpg`))
      .resize({ width: 720 })
      .webp({ quality: 85, effort: 6 })
      .toFile(path.join(outputRoot, `screens/${name}-${mode}.webp`));
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
  phone: 'ic_mobile_vibrate_24',
  close: 'ic_close_rounded_24',
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
await writeFile(
  path.join(outputRoot, 'icons.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`,
);
console.log(
  `Prepared ${Object.keys(screenshots).length * 2} screenshots, app icon, and ${symbols.length} symbols.`,
);
