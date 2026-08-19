import './style.css';

type StudioMode = 'original' | 'compare' | 'concept';

const stage = document.querySelector<HTMLElement>('[data-art-stage]');
const revealControl = document.querySelector<HTMLInputElement>('[data-reveal-control]');
const revealOutput = document.querySelector<HTMLOutputElement>('[data-reveal-output]');
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode-button]');

if (!stage || !revealControl || !revealOutput) {
  throw new Error('The art studio controls could not be initialized.');
}

const setMode = (mode: StudioMode) => {
  stage.dataset.mode = mode;
  modeButtons.forEach((button) => {
    const isActive = button.dataset.modeButton === mode;
    button.setAttribute('aria-pressed', String(isActive));
  });

  revealControl.disabled = mode !== 'compare';
};

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.modeButton as StudioMode;
    setMode(mode);
  });
});

revealControl.addEventListener('input', () => {
  const reveal = `${revealControl.value}%`;
  stage.style.setProperty('--reveal', reveal);
  revealOutput.value = reveal;
});
