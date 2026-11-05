import {
  bundledRelease,
  defaultArchitecture,
  fetchLatestRelease,
  formatPackageSize,
  formatReleaseDate,
} from './releases.js';
import { pageLocale, t } from './i18n.js';
import { createSplitButton } from './split-button.js';
import { finishSelectionColors } from './expressive-buttons.js';

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
  let selectedArchitecture = defaultArchitecture;

  function updatePackage() {
    const asset = release.packages[selectedArchitecture];
    for (const choice of choices) {
      choice.setAttribute(
        'aria-checked',
        String(choice.dataset.architecture === selectedArchitecture),
      );
    }
    finishSelectionColors(choices);
    packageSummary.textContent = asset
      ? `${selectedArchitecture} · ${formatPackageSize(asset.size)}`
      : t('packageUnavailable');
    if (asset) {
      downloadLink.href = asset.acceleratedUrl;
      downloadLink.removeAttribute('aria-disabled');
      downloadLink.removeAttribute('tabindex');
      downloadLink.setAttribute('aria-label', t('downloadLabel', { name: asset.name }));
    } else {
      downloadLink.removeAttribute('href');
      downloadLink.removeAttribute('aria-label');
      downloadLink.setAttribute('aria-disabled', 'true');
      downloadLink.tabIndex = -1;
    }
  }

  function renderRelease(isLatest) {
    version.textContent = release.version;
    releaseLabel.textContent = t(isLatest ? 'releaseLatest' : 'releasePublished');
    publishedDate.dateTime = release.publishedAt;
    publishedDate.textContent = formatReleaseDate(release.publishedAt, pageLocale);
    section.querySelector('[data-release-notes]').href = release.url;
    for (const choice of choices) {
      const asset = release.packages[choice.dataset.architecture];
      const sizeLabel = choice.querySelector('[data-package-size]');
      choice.disabled = !asset;
      sizeLabel.textContent = asset ? formatPackageSize(asset.size) : t('packageNotProvided');
      sizeLabel.title = asset
        ? t('packageBytes', { size: asset.size.toLocaleString(pageLocale) })
        : '';
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
    status.textContent = t('releaseChecking');
    try {
      // 超时与组件销毁共用取消信号，避免断网时一直停在加载状态。
      release = await fetchLatestRelease(
        AbortSignal.any([lifecycle.signal, AbortSignal.timeout(8000)]),
      );
      renderRelease(true);
      status.textContent = Object.keys(release.packages).length ? '' : t('releaseNoAssets');
      retry.hidden = true;
    } catch {
      if (lifecycle.signal.aborted) return;
      status.textContent = t('releaseFailed', { version: release.version });
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
