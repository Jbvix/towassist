// Painel visual do sistema de intertravamento (conteúdo da aba "Intertravamento").
// Lista cada controle com status e, ao tocar, mostra as condições pendentes.

import type { InterlockEvaluation } from '@/interlock/types.ts';

export class InterlockPanel {
  readonly el: HTMLElement;
  private readonly alertsEl: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly summaryEl: HTMLSpanElement;
  /** Rótulos legíveis dos controles (id -> label). */
  private labels: Record<string, string> = {};
  /** Controles com as condições expandidas (por id). */
  private readonly expanded = new Set<string>();
  /** Última avaliação (para re-renderizar ao expandir/colapsar). */
  private lastEvaluation: InterlockEvaluation | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'interlock';
    this.el.setAttribute('aria-label', 'Sistema de intertravamento');

    const title = document.createElement('div');
    title.className = 'interlock__title';
    const titleText = document.createElement('span');
    titleText.textContent = 'Intertravamento';
    this.summaryEl = document.createElement('span');
    this.summaryEl.className = 'interlock__summary';
    title.append(titleText, this.summaryEl);

    this.alertsEl = document.createElement('div');
    this.alertsEl.className = 'interlock__alerts';
    this.alertsEl.setAttribute('role', 'alert');
    this.alertsEl.setAttribute('aria-live', 'assertive');

    this.listEl = document.createElement('div');
    this.listEl.className = 'interlock__list';

    this.el.append(title, this.alertsEl, this.listEl);
  }

  /** Define os rótulos dos controles (ao trocar de equipamento). */
  setLabels(labels: Record<string, string>): void {
    this.labels = labels;
  }

  /** Renderiza a avaliação atual. */
  update(evaluation: InterlockEvaluation): void {
    this.lastEvaluation = evaluation;
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

    // Ordena bloqueados primeiro.
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
          this.update(this.lastEvaluation!);
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
