import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const androidRoot = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(websiteRoot, '../BiliTools');
const roles = {
  primary: 'colorPrimary',
  primaryFixedDim: 'colorPrimaryFixedDim',
  onPrimaryFixed: 'colorOnPrimaryFixed',
  card: 'colorSurfaceBright',
  surfaceLow: 'colorSurfaceContainerLow',
  surfaceContainer: 'colorSurfaceContainer',
  surfaceHigh: 'colorSurfaceContainerHigh',
  onSurface: 'colorOnSurface',
  onSurfaceVariant: 'colorOnSurfaceVariant',
};
const palettes = {};

// 只同步演示需要的颜色角色，网站构建无需依赖 Android 工程。
for (const [mode, directory] of [
  ['light', 'values'],
  ['dark', 'values-night'],
]) {
  const xml = await readFile(
    path.join(androidRoot, `app/src/main/res/${directory}/themes.xml`),
    'utf8',
  );
  for (const [, name, content] of xml.matchAll(
    /<style name="ThemeOverlay\.BiliTools\.Color(\w+)"[^>]*>([\s\S]*?)<\/style>/g,
  )) {
    const colors = Object.fromEntries(
      [...content.matchAll(/<item name="(\w+)">#FF([\dA-F]{6})<\/item>/g)].map(
        ([, role, color]) => [role, `#${color.toLowerCase()}`],
      ),
    );
    palettes[name.toLowerCase()] ??= {};
    palettes[name.toLowerCase()][mode] = Object.fromEntries(
      Object.entries(roles).map(([role, attribute]) => {
        if (!colors[attribute]) throw new Error(`${name}/${mode}: missing ${attribute}`);
        return [role, colors[attribute]];
      }),
    );
  }
}
await writeFile(
  path.join(websiteRoot, 'src/palettes.json'),
  `${JSON.stringify(palettes, null, 2)}\n`,
);
console.log(`Synced ${Object.keys(palettes).length} app palettes in light and dark modes.`);
