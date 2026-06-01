// Tela de abertura (splash): logo "K" de KRATOS, apresentação, barra de
// progresso com as etapas de preparação. Dura ~30 s e pode ser pulada.

import { APP_NAME, APP_VERSION, APP_AUTHOR, APP_TAGLINE } from '@shared/meta.ts';

const DURATION_MS = 30_000;

/** Etapas exibidas durante a preparação (apenas visuais/didáticas). */
const STEPS = [
  'Inicializando o assistente KRATOS…',
  'Carregando perfis dos guinchos (KRAAIJVELD e IBERCISA)…',
  'Montando o painel de comando…',
  'Preparando o sistema de intertravamento…',
  'Conectando à base de conhecimento dos manuais…',
  'Calibrando instrumentação e simulação 2D…',
  'Pronto para operar.',
];

export class Splash {
  readonly el: HTMLElement;
  private readonly bar: HTMLDivElement;
  private readonly pct: HTMLSpanElement;
  private readonly stepEl: HTMLDivElement;
  private rafId = 0;
  private startedAt = 0;
  private finished = false;
  private onDone: (() => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'splash';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Carregando o TowAssist');

    this.el.innerHTML = `
      <div class="splash__inner">
        <div class="splash__logo" aria-hidden="true">
          <span class="splash__logo-k">K</span>
        </div>
        <h1 class="splash__title">${APP_NAME}</h1>
        <p class="splash__tagline">${APP_TAGLINE}</p>
        <div class="splash__assistant">
          Assistente <strong>KRATOS</strong> — Chefe de Máquinas
        </div>
        <div class="splash__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <div class="splash__bar"></div>
        </div>
        <div class="splash__status">
          <span class="splash__step">Inicializando…</span>
          <span class="splash__pct">0%</span>
        </div>
        <button type="button" class="splash__skip">Pular introdução →</button>
        <div class="splash__footer">v${APP_VERSION} · por ${APP_AUTHOR}</div>
      </div>`;

    this.bar = this.el.querySelector('.splash__bar') as HTMLDivElement;
    this.pct = this.el.querySelector('.splash__pct') as HTMLSpanElement;
    this.stepEl = this.el.querySelector('.splash__step') as HTMLDivElement;

    const skip = this.el.querySelector('.splash__skip') as HTMLButtonElement;
    skip.addEventListener('click', () => this.finish());
  }

  /** Inicia a animação; chama `onDone` ao concluir (ou ao pular). */
  start(onDone: () => void): void {
    this.onDone = onDone;
    this.startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - this.startedAt;
      const p = Math.min(1, elapsed / DURATION_MS);
      const pctValue = Math.round(p * 100);

      this.bar.style.width = `${pctValue}%`;
      this.pct.textContent = `${pctValue}%`;
      this.el
        .querySelector('.splash__progress')!
        .setAttribute('aria-valuenow', String(pctValue));

      const stepIdx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      const stepText = STEPS[stepIdx];
      if (this.stepEl.textContent !== stepText) this.stepEl.textContent = stepText;

      if (p >= 1) {
        this.finish();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this.rafId);
    this.el.classList.add('splash--hide');
    // Remove após a transição de fade-out.
    window.setTimeout(() => {
      this.el.remove();
      this.onDone?.();
    }, 450);
  }
}
