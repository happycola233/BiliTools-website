import { bundledRelease, fetchLatestRelease, formatPackageSize } from './releases.js';
import { createSplitButton } from './split-button.js';

export function createDownloads() {
  const section = document.querySelector('#download');
  const menu = document.querySelector('#package-menu');
  const menuToggle = section.querySelector('.split-button-toggle');
  const choices = [...menu.querySelectorAll('[data-architecture]')];
  const splitButton = createSplitButton(menuToggle, menu);
  const version = section.querySelector('[data-release-version]');
  const releaseLabel = section.querySelector('[data-release-label]');
  const publishedDate = section.querySelector('[data-release-date]');
  const status = section.querySelector('[data-release-status]');
  const retry = section.querySelector('[data-release-retry]');
  const packageSummary = section.querySelector('[data-package-summary]');
  const downloadLink = section.querySelector('[data-download-link]');
  const lifecycle = new AbortController();
  let release = bundledRelease;
  let selectedArchitecture = 'arm64-v8a';

  function updatePackage() {
    const asset = release.packages[selectedArchitecture];
    for (const choice of choices) {
      choice.setAttribute(
        'aria-checked',
        String(choice.dataset.architecture === selectedArchitecture),
      );
    }
    packageSummary.textContent = asset
      ? `${selectedArchitecture} · ${formatPackageSize(asset.size)}`
      : '此版本暂未提供 APK';
    if (asset) {
      downloadLink.href = asset.acceleratedUrl;
      downloadLink.removeAttribute('aria-disabled');
      downloadLink.removeAttribute('tabindex');
      downloadLink.setAttribute('aria-label', `加速下载 ${asset.name}`);
    } else {
      downloadLink.removeAttribute('href');
      downloadLink.removeAttribute('aria-label');
      downloadLink.setAttribute('aria-disabled', 'true');
      downloadLink.tabIndex = -1;
    }
  }

  function renderRelease(isLatest) {
    version.textContent = release.version;
    releaseLabel.textContent = isLatest ? '最新版本' : '已发布版本';
    publishedDate.dateTime = release.publishedAt;
    publishedDate.textContent = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(release.publishedAt));
    section.querySelector('[data-release-notes]').href = release.url;
    for (const choice of choices) {
      const asset = release.packages[choice.dataset.architecture];
      const sizeLabel = choice.querySelector('[data-package-size]');
      choice.disabled = !asset;
      sizeLabel.textContent = asset ? formatPackageSize(asset.size) : '暂未提供';
      sizeLabel.title = asset ? `${asset.size.toLocaleString('zh-CN')} 字节` : '';
    }
    // 新版可能只上传了部分架构；始终让选中项、文件信息和下载直链来自同一发行版。
    if (!release.packages[selectedArchitecture])
      selectedArchitecture = choices.find((choice) => !choice.disabled)?.dataset.architecture;
    menuToggle.disabled = !selectedArchitecture;
    if (menuToggle.disabled && menu.matches(':popover-open')) menu.hidePopover();
    if (choices.includes(document.activeElement) && document.activeElement.disabled)
      choices.find((choice) => !choice.disabled)?.focus({ preventScroll: true });
    updatePackage();
  }

  async function refreshRelease() {
    retry.disabled = true;
    status.textContent = '正在检查最新版本…';
    try {
      // 超时与组件销毁共用取消信号，避免断网时一直停在加载状态。
      release = await fetchLatestRelease(
        AbortSignal.any([lifecycle.signal, AbortSignal.timeout(8000)]),
      );
      renderRelease(true);
      status.textContent = Object.keys(release.packages).length
        ? ''
        : '新版本已发布，安装包尚未上传。';
      retry.hidden = true;
    } catch {
      if (lifecycle.signal.aborted) return;
      status.textContent = `暂时无法检查更新，可先下载 ${release.version}，或稍后重试。`;
      retry.hidden = false;
    } finally {
      retry.disabled = false;
    }
  }

  renderRelease(false);
  menu.addEventListener(
    'click',
    (event) => {
      const choice = event.target.closest('[data-architecture]');
      if (!choice || choice.disabled) return;
      selectedArchitecture = choice.dataset.architecture;
      updatePackage();
      splitButton.close();
    },
    { signal: lifecycle.signal },
  );
  retry.addEventListener('click', refreshRelease, { signal: lifecycle.signal });
  void refreshRelease();

  return {
    destroy() {
      lifecycle.abort();
      splitButton.destroy();
    },
  };
}
