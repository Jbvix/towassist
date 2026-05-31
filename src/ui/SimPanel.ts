// Painel de simulação: cabeçalho com metadados do equipamento + canvas PixiJS.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';
import type { PanelStore } from '@/app/PanelStore.ts';
import { Simulator } from '@/sim/Simulator.ts';
import { InterlockPanel } from '@/ui/InterlockPanel.ts';

export class SimPanel {
  readonly el: HTMLElement;
  private readonly metaEl: HTMLDivElement;
  private readonly canvasHost: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private readonly sim = new Simulator();
  private readonly interlockPanel = new InterlockPanel();
  private ready = false;
  private toastTimer: number | null = null;

  constructor(
    private readonly screens: ScreenManager,
    private readonly panelStore: PanelStore,
  ) {
    this.el = document.createElement('section');
    this.el.className = 'sim-panel';

    this.metaEl = document.createElement('div');
    this.metaEl.className = 'sim-panel__meta';

    this.canvasHost = document.createElement('div');
    this.canvasHost.className = 'sim-panel__canvas';

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'sim-panel__toast';
    this.toastEl.hidden = true;

    this.canvasHost.append(this.interlockPanel.el, this.toastEl);
    this.el.append(this.metaEl, this.canvasHost);

    // Repassa o estado do painel ao store (consumido pelo chat do KRATOS).
    this.sim.onStateChange = (values) => this.panelStore.update(values);
    // Atualiza o painel de intertravamento a cada avaliação.
    this.sim.onInterlock = (evaluation) => this.interlockPanel.update(evaluation);
    // Mostra o motivo quando um comando é bloqueado.
    this.sim.onBlocked = (_id, label, reasons) => this.showBlockedToast(label, reasons);
  }

  /** Inicializa o PixiJS e passa a reagir à troca de telas. */
  async start(): Promise<void> {
    await this.sim.init(this.canvasHost);
    this.ready = true;
    this.screens.subscribe((active) => this.render(active));
  }

  private render(active: EquipmentId): void {
    const def = getEquipment(active);
    this.el.style.setProperty('--accent', def.meta.accent);

    this.metaEl.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = 'sim-panel__dot';
    const label = document.createElement('span');
    label.textContent = `${def.meta.name} · ${def.meta.model} — painel de comando (simulação)`;
    this.metaEl.append(dot, label);

    // Rótulos legíveis para o painel de intertravamento.
    const labels: Record<string, string> = {};
    for (const c of def.controls) labels[c.id] = c.label;
    this.interlockPanel.setLabels(labels);

    if (this.ready) this.sim.render(def);
  }

  private showBlockedToast(label: string, reasons: string[]): void {
    const why = reasons.length ? ` Falta: ${reasons.join('; ')}.` : '';
    this.toastEl.textContent = `🔒 "${label}" bloqueado pelo intertravamento.${why}`;
    this.toastEl.hidden = false;
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.hidden = true;
    }, 4000);
  }

  destroy(): void {
    this.sim.destroy();
  }
}
