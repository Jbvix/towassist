// Painel visual do sistema de intertravamento.
// Mostra, por controle, se está liberado ou quais condições faltam; e alertas
// globais (ex.: parada de emergência). Atualizado a cada avaliação.

import type { InterlockEvaluation } from '@/interlock/types.ts';

export class InterlockPanel {
  readonly el: HTMLElement;
  private readonly handle: HTMLButtonElement;
  private readonly alertsEl: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly summaryEl: HTMLSpanElement;
  /** Rótulos legíveis dos controles (id -> label). */
  private labels: Record<string, string> = {};
  /** Controles cujas condições estão expandidas (por id). */
  private readonly expanded = new Set<string>();
  /** Última avaliação recebida (para re-renderizar ao expandir/colapsar). */
  private lastEvaluation: InterlockEvaluation | null = null;

  constructor() {
    this.el = document.createElement('aside');
    // Drawer aberto por padrão; em telas estreitas inicia fechado (ver open()).
    this.el.className = 'interlock interlock--open';
    this.el.setAttribute('aria-label', 'Sistema de intertravamento');

    // Aba (handle) para abrir/fechar a barra lateral.
    this.handle = document.createElement('button');
    this.handle.type = 'button';
    this.handle.className = 'interlock__handle';
    this.handle.setAttribute('aria-label', 'Mostrar/ocultar intertravamento');
    this.handle.innerHTML = '<span class="interlock__handle-icon">⚙</span>';
    this.handle.addEventListener('click', () => this.toggle());

    const panel = document.createElement('div');
    panel.className = 'interlock__panel';

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

    panel.append(title, this.alertsEl, this.listEl);
    this.el.append(this.handle, panel);

    // Em telas estreitas começa fechado para não cobrir a simulação.
    if (window.matchMedia('(max-width: 860px)').matches) this.setOpen(false);
  }

  private toggle(): void {
    this.setOpen(!this.el.classList.contains('interlock--open'));
  }

  /** Abre/fecha a barra lateral. */
  setOpen(open: boolean): void {
    this.el.classList.toggle('interlock--open', open);
    this.handle.setAttribute('aria-expanded', String(open));
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
    const total = controls.length;

    // Resumo no cabeçalho.
    this.summaryEl.textContent = `${liberados}/${total} liberados`;

    // Alertas globais.
    this.alertsEl.innerHTML = '';
    for (const alert of evaluation.alerts) {
      const a = document.createElement('div');
      a.className = 'interlock__alert';
      a.textContent = `⚠ ${alert}`;
      this.alertsEl.appendChild(a);
    }

    // Ordena: bloqueados primeiro (mais acionáveis), depois liberados.
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
        head.title = isOpen ? 'Ocultar condições' : 'Ver condições pendentes';
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
