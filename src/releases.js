export const repositoryUrl = 'https://github.com/happycola233/BiliTools';
const latestReleaseUrl = 'https://api.github.com/repos/happycola233/BiliTools/releases/latest';
const acceleratedDownloadBase = 'https://files.happycola.top/BiliTools/';
const apkPattern = /^BiliTools-[\w.+-]+-(arm64-v8a|armeabi-v7a|universal|x86|x86_64)\.apk$/;

export const defaultArchitecture = 'arm64-v8a';

// 2026-11-05 核对过的发行版快照（GitHub 资产大小与加速镜像一致）：首次加载和网络不可用时仍能下载，
// 界面不将它标为最新。构建时 i18n 插件也用它生成关闭 JavaScript 时的静态下载链接。
export const bundledRelease = {
  version: 'v3.2',
  publishedAt: '2026-10-15T07:01:24Z',
  url: `${repositoryUrl}/releases/tag/v3.2`,
  packages: Object.fromEntries(
    [
      ['arm64-v8a', 71927807],
      ['armeabi-v7a', 71110672],
      ['universal', 155210001],
      ['x86', 75577357],
      ['x86_64', 76891958],
    ].map(([architecture, size]) => {
      const name = `BiliTools-v3.2-${architecture}.apk`;
      return [
        architecture,
        {
          name,
          size,
          acceleratedUrl: `${acceleratedDownloadBase}${name}`,
        },
      ];
    }),
  ),
};

export function formatPackageSize(bytes) {
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

/**
 * 发布日期按页面语言显示，例如「2026 年 10 月 15 日」或「October 15, 2026」。
 * Intl 的中文结果是「2026年10月15日」，按中文排版习惯在数字与汉字之间补上空格。
 */
export function formatReleaseDate(isoDate, locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    .format(new Date(isoDate))
    .replace(/(?<=\d)(?=\p{Script=Han})|(?<=\p{Script=Han})(?=\d)/gu, ' ');
}

export function parseRelease(data) {
  // GitHub 响应是外部边界；仅将正式发行版和本仓库的已上传 APK 转为可点击链接。
  if (
    !data ||
    typeof data.tag_name !== 'string' ||
    !data.tag_name.trim() ||
    !Number.isFinite(Date.parse(data.published_at)) ||
    !Array.isArray(data.assets) ||
    data.draft !== false ||
    data.prerelease !== false
  )
    throw new Error('Invalid release metadata');

  const packages = {};
  for (const asset of data.assets) {
    const match = typeof asset?.name === 'string' && asset.name.match(apkPattern);
    if (
      !match ||
      asset.state !== 'uploaded' ||
      !Number.isSafeInteger(asset.size) ||
      asset.size <= 0
    )
      continue;
    const downloadUrl = asset.browser_download_url;
    if (
      typeof downloadUrl !== 'string' ||
      !downloadUrl.startsWith(`${repositoryUrl}/releases/download/`) ||
      !downloadUrl.endsWith(`/${encodeURIComponent(asset.name)}`)
    )
      continue;

    packages[match[1]] = {
      name: asset.name,
      size: asset.size,
      // 用资产的实际文件名构造加速直链，不假定 tag 与安装包版本的命名完全一致。
      acceleratedUrl: `${acceleratedDownloadBase}${encodeURIComponent(asset.name)}`,
    };
  }

  return {
    version: data.tag_name,
    publishedAt: data.published_at,
    url: `${repositoryUrl}/releases/tag/${encodeURIComponent(data.tag_name)}`,
    packages,
  };
}

export async function fetchLatestRelease(signal) {
  const response = await fetch(latestReleaseUrl, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' },
    signal,
  });
  if (!response.ok) throw new Error(`GitHub release request failed: ${response.status}`);
  return parseRelease(await response.json());
}
