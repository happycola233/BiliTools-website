export const repositoryUrl = 'https://github.com/happycola233/BiliTools';
const latestReleaseUrl = 'https://api.github.com/repos/happycola233/BiliTools/releases/latest';
const acceleratedDownloadBase = 'https://files.happycola.top/BiliTools/';
const apkPattern = /^BiliTools-[\w.+-]+-(arm64-v8a|armeabi-v7a|universal|x86|x86_64)\.apk$/;

// 2026-09-08 核对过的发行版快照：首次加载和网络不可用时仍能下载，界面不将它标为最新。
export const bundledRelease = {
  version: 'v3.0',
  publishedAt: '2026-09-07T04:53:50Z',
  url: `${repositoryUrl}/releases/tag/v3.0`,
  packages: Object.fromEntries(
    [
      ['arm64-v8a', 70765340],
      ['armeabi-v7a', 69948205],
      ['universal', 154047534],
      ['x86', 74414890],
      ['x86_64', 75729491],
    ].map(([architecture, size]) => {
      const name = `BiliTools-v3.0-${architecture}.apk`;
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
