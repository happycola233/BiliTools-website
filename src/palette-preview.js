import palettes from './palettes.json';
import { createPaletteCelebration } from './palette-celebration.js';
import { finishSelectionColors } from './expressive-buttons.js';

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

  function applyColors(element, palette) {
    for (const [role, color] of Object.entries(palettes[palette][mode])) {
      const property = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      element.style.setProperty(`--palette-${property}`, color);
    }
  }

  function render() {
    applyColors(composition, selected.dataset.palette);
    previewName.textContent = `${selected.dataset.name} · ${mode === 'dark' ? '夜间' : '日间'}`;
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
    quality.textContent = ['1080P · DASH', '1080P · 无音轨', '192K · M4A'][index];
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
      celebration.play(colors, selected.dataset.name);
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
    const name = button.textContent;
    button.dataset.name = name;
    button.classList.add('expressive-button');
    button.setAttribute('aria-controls', preview.id);
    button.innerHTML = `<span class="palette-swatch" aria-hidden="true">
      <svg class="icon palette-check"><use href="./assets/icons.svg#check"></use></svg>
    </span><span class="palette-name">${name}</span>`;
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
    },
  };
}
