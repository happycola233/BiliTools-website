import palettes from './palettes.json';
import { createPaletteCelebration } from './palette-celebration.js';
import { finishSelectionColors } from './expressive-buttons.js';
import { lobes, shapePolygon } from './material-shapes.js';
import { t } from './i18n.js';

// 色块的静止与悬停形状：圆形，以及与 App「关于」页图标底座同族、瓣更浅更柔的九瓣饼干形。
// 圆形也按同样的点数生成，两者之间才能平滑过渡。
const SWATCH_SHAPES = {
  '--swatch-rest-shape': shapePolygon(lobes(9, 0, 0)),
  '--swatch-active-shape': shapePolygon(lobes(9, 0.08, 0.15)),
};

export function createPalettePreview() {
  const composition = document.querySelector('.palette-composition');
  const preview = composition.querySelector('.palette-preview');
  const previewName = composition.querySelector('.palette-preview-name');
  const buttons = [...composition.querySelectorAll('[data-palette]')];
  const modes = [...composition.querySelectorAll('[data-palette-mode]')];
  const outputs = [...preview.querySelectorAll('[data-preview-output]')];
  const outputGroup = preview.querySelector('.palette-preview-segments');
  const quality = preview.querySelector('.palette-preview-quality');
  const download = preview.querySelector('.palette-preview-download');
  const celebration = createPaletteCelebration(
    download,
    composition.querySelector('.palette-hint'),
  );
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  let selected = buttons[0];
  let mode = 'light';
  let selectedOutput = 0;

  const paletteList = composition.querySelector('.palette-list');
  for (const [property, shape] of Object.entries(SWATCH_SHAPES))
    paletteList.style.setProperty(property, shape);

  const nameOf = (button) => button.querySelector('.palette-name').textContent;

  function applyColors(element, palette) {
    for (const [role, color] of Object.entries(palettes[palette][mode])) {
      const property = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      element.style.setProperty(`--palette-${property}`, color);
    }
  }

  function render() {
    applyColors(composition, selected.dataset.palette);
    previewName.textContent = `${nameOf(selected)} · ${t(mode === 'dark' ? 'paletteDark' : 'paletteLight')}`;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
  }

  function selectOutput(index) {
    selectedOutput = index;
    for (const [position, button] of outputs.entries()) {
      button.setAttribute('aria-checked', String(position === index));
      button.tabIndex = position === index ? 0 : -1;
    }
    finishSelectionColors(outputs);
    quality.textContent = t(['qualityAudiovisual', 'qualityVideo', 'qualityAudio'][index]);
  }

  outputs.forEach((button, index) => {
    button.addEventListener('click', () => selectOutput(index), options);
  });
  outputGroup.addEventListener(
    'keydown',
    (event) => {
      let index = selectedOutput;
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = outputs.length - 1;
      else if (['ArrowLeft', 'ArrowUp'].includes(event.key))
        index = (index + outputs.length - 1) % outputs.length;
      else if (['ArrowRight', 'ArrowDown'].includes(event.key))
        index = (index + 1) % outputs.length;
      else return;
      event.preventDefault();
      selectOutput(index);
      outputs[index].focus({ preventScroll: true });
    },
    options,
  );

  download.addEventListener(
    'click',
    () => {
      const paletteNames = Object.keys(palettes);
      const index = paletteNames.indexOf(selected.dataset.palette);
      const colors = [0, 0, 1, -1, 6].map(
        (offset) =>
          palettes[paletteNames[(index + offset + paletteNames.length) % paletteNames.length]].light
            .primaryFixedDim,
      );
      celebration.play(colors, nameOf(selected));
    },
    options,
  );

  function setMode(nextMode) {
    mode = nextMode;
    composition.dataset.previewMode = mode;
    for (const button of buttons) applyColors(button, button.dataset.palette);
    for (const button of modes) {
      button.setAttribute('aria-pressed', String(button.dataset.paletteMode === mode));
    }
    render();
  }

  for (const button of buttons) {
    button.addEventListener(
      'click',
      () => {
        selected = button;
        render();
      },
      options,
    );
  }

  for (const button of modes) {
    button.addEventListener('click', () => setMode(button.dataset.paletteMode), options);
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') celebration.stop();
    },
    options,
  );

  return {
    syncTheme(dark) {
      setMode(dark ? 'dark' : 'light');
    },
    destroy() {
      celebration.destroy();
      lifecycle.abort();
      for (const property of Object.keys(SWATCH_SHAPES)) paletteList.style.removeProperty(property);
    },
  };
}
