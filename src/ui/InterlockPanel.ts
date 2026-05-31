// Painel visual do sistema de intertravamento.
// Mostra, por controle, se está liberado ou quais condições faltam; e alertas
// globais (ex.: parada de emergência). Atualizado a cada avaliação.

import type { InterlockEvaluation } from '@/interlock/types.ts';

export class InterlockPanel {
  readonly el: HTMLElement;
  private readonly alertsEl: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  /** Rótulos legíveis dos controles (id -> label). */
  private labels: Record<string, string> = {};

  constructor() {
    this.el = document.createElement('aside');
    this.el.className = 'interlock';

    const title = document.createElement('div');
    title.className = 'interlock__title';
    title.textContent = 'Intertravamento';

    this.alertsEl = document.createElement('div');
    this.alertsEl.className = 'interlock__alerts';

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
    // Alertas globais.
    this.alertsEl.innerHTML = '';
    for (const alert of evaluation.alerts) {
      const a = document.createElement('div');
      a.className = 'interlock__alert';
      a.textContent = `⚠ ${alert}`;
      this.alertsEl.appendChild(a);
    }

    // Lista de controles governados por regras.
    this.listEl.innerHTML = '';
    for (const ev of Object.values(evaluation.controls)) {
      const row = document.createElement('div');
      row.className = `interlock__row interlock__row--${ev.allowed ? 'ok' : 'blocked'}`;

      const head = document.createElement('div');
      head.className = 'interlock__row-head';
      const dot = document.createElement('span');
      dot.className = 'interlock__dot';
      const name = document.createElement('span');
      name.textContent = this.labels[ev.controlId] ?? ev.controlId;
      const status = document.createElement('span');
      status.className = 'interlock__status';
      status.textContent = ev.allowed ? 'LIBERADO' : 'BLOQUEADO';
      head.append(dot, name, status);
      row.appendChild(head);

      if (!ev.allowed && ev.blockedBy.length > 0) {
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
