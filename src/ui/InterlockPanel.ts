// Painel visual do sistema de intertravamento.
// Trilha lateral SEMPRE visível na borda direita com mini-sinaleiros
// (ponto colorido + sigla). Ao clicar num sinaleiro, abre o painel completo
// com as condições. Alertas globais (ex.: parada de emergência) em destaque.

import type { InterlockEvaluation } from '@/interlock/types.ts';

export class InterlockPanel {
  readonly el: HTMLElement;
  private readonly railEl: HTMLDivElement;
  private readonly panelEl: HTMLDivElement;
  private readonly alertsEl: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly summaryEl: HTMLSpanElement;
  /** Rótulos legíveis dos controles (id -> label). */
  private labels: Record<string, string> = {};
  /** Controles cujas condições estão expandidas (por id). */
  private readonly expanded = new Set<string>();
  /** Última avaliação recebida (para re-renderizar). */
  private lastEvaluation: InterlockEvaluation | null = null;

  constructor() {
    this.el = document.createElement('aside');
    this.el.className = 'interlock';
    this.el.setAttribute('aria-label', 'Sistema de intertravamento');

    // Trilha de sinaleiros (sempre visível na borda).
    this.railEl = document.createElement('div');
    this.railEl.className = 'interlock__rail';

    // Painel completo (desliza ao abrir).
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'interlock__panel';

    const title = document.createElement('div');
    title.className = 'interlock__title';
    const titleText = document.createElement('span');
    titleText.textContent = 'Intertravamento';
    this.summaryEl = document.createElement('span');
    this.summaryEl.className = 'interlock__summary';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'interlock__close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.setOpen(false));
    title.append(titleText, this.summaryEl, closeBtn);

    this.alertsEl = document.createElement('div');
    this.alertsEl.className = 'interlock__alerts';
    this.alertsEl.setAttribute('role', 'alert');
    this.alertsEl.setAttribute('aria-live', 'assertive');

    this.listEl = document.createElement('div');
    this.listEl.className = 'interlock__list';

    this.panelEl.append(title, this.alertsEl, this.listEl);
    this.el.append(this.railEl, this.panelEl);
  }

  private setOpen(open: boolean): void {
    this.el.classList.toggle('interlock--open', open);
  }

  /** Abre o painel já com um controle expandido (vindo do sinaleiro). */
  private openControl(controlId: string): void {
    this.expanded.clear();
    this.expanded.add(controlId);
    this.setOpen(true);
    if (this.lastEvaluation) this.renderPanel(this.lastEvaluation);
  }

  /** Define os rótulos dos controles (ao trocar de equipamento). */
  setLabels(labels: Record<string, string>): void {
    this.labels = labels;
  }

  /** Sigla curta de identificação a partir do rótulo (ex.: "Bomba Hidráulica" → "BH"). */
  private abbrev(controlId: string): string {
    const label = this.labels[controlId] ?? controlId;
    const words = label
      .replace(/[()]/g, '')
      .split(/[\s/]+/)
      .filter((w) => w.length > 2 || /^[A-ZÀ-Ý]/.test(w)); // ignora "do", "de"…
    const letters = words.map((w) => w[0]).join('').toUpperCase();
    return letters.slice(0, 3) || label.slice(0, 2).toUpperCase();
  }

  /** Renderiza a avaliação atual (trilha + painel). */
  update(evaluation: InterlockEvaluation): void {
    this.lastEvaluation = evaluation;
    this.renderRail(evaluation);
    this.renderPanel(evaluation);
  }

  private renderRail(evaluation: InterlockEvaluation): void {
    const controls = Object.values(evaluation.controls);
    this.railEl.innerHTML = '';

    // Indicador de alerta global (parada de emergência) no topo da trilha.
    if (evaluation.alerts.length > 0) {
      const warn = document.createElement('div');
      warn.className = 'interlock__signal interlock__signal--alert';
      warn.title = evaluation.alerts[0];
      warn.innerHTML = '<span class="interlock__signal-dot"></span><span class="interlock__signal-tag">!</span>';
      this.railEl.appendChild(warn);
    }

    // Ordena bloqueados primeiro.
    const ordered = [...controls].sort((a, b) => Number(a.allowed) - Number(b.allowed));
    for (const ev of ordered) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `interlock__signal interlock__signal--${ev.allowed ? 'ok' : 'blocked'}`;
      const label = this.labels[ev.controlId] ?? ev.controlId;
      btn.title = `${label}: ${ev.allowed ? 'LIBERADO' : 'BLOQUEADO'} — toque para detalhes`;
      btn.setAttribute('aria-label', btn.title);
      btn.innerHTML =
        '<span class="interlock__signal-dot"></span>' +
        `<span class="interlock__signal-tag">${this.abbrev(ev.controlId)}</span>`;
      btn.addEventListener('click', () => this.openControl(ev.controlId));
      this.railEl.appendChild(btn);
    }
  }

  private renderPanel(evaluation: InterlockEvaluation): void {
    const controls = Object.values(evaluation.controls);
    const liberados = controls.filter((c) => c.allowed).length;
    this.summaryEl.textContent = `${liberados}/${controls.length} liberados`;

    // Alertas globais.
    this.alertsEl.innerHTML = '';
    for (const alert of evaluation.alerts) {
      const a = document.createElement('div');
      a.className = 'interlock__alert';
      a.textContent = `⚠ ${alert}`;
      this.alertsEl.appendChild(a);
    }

    const ordered = [...controls].sort((a, b) => Number(a.allowed) - Number(b.allowed));
    this.listEl.innerHTML = '';
    for (const ev of ordered) {
      const hasReasons = !ev.allowed && ev.blockedBy.length > 0;
      const isOpen = this.expanded.has(ev.controlId);

      const row = document.createElement('div');
      row.className = `interlock__row interlock__row--${ev.allowed ? 'ok' : 'blocked'}`;
      if (hasReasons) row.classList.add('interlock__row--expandable');
      if (isOpen) row.classList.add('interlock__row--open');

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'interlock__row-head';
      const dot = document.createElement('span');
      dot.className = 'interlock__dot';
      const name = document.createElement('span');
      name.className = 'interlock__name';
      name.textContent = this.labels[ev.controlId] ?? ev.controlId;
      const status = document.createElement('span');
      status.className = 'interlock__status';
      status.textContent = ev.allowed ? 'LIBERADO' : 'BLOQUEADO';
      head.append(dot, name, status);

      if (hasReasons) {
        const caret = document.createElement('span');
        caret.className = 'interlock__caret';
        caret.setAttribute('aria-hidden', 'true');
        caret.textContent = '▾';
        head.appendChild(caret);
        head.setAttribute('aria-expanded', String(isOpen));
        head.addEventListener('click', () => {
          if (this.expanded.has(ev.controlId)) this.expanded.delete(ev.controlId);
          else this.expanded.add(ev.controlId);
          this.renderPanel(this.lastEvaluation!);
        });
      } else {
        head.disabled = true;
      }
      row.appendChild(head);

      if (hasReasons && isOpen) {
        const reasons = document.createElement('ul');
        reasons.className = 'interlock__reasons';
        for (const r of ev.blockedBy) {
          const li = document.createElement('li');
          li.textContent = r;
          reasons.appendChild(li);
        }
        row.appendChild(reasons);
      }

      this.listEl.appendChild(row);
    }
  }
}
