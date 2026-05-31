// Painel de simulação: cabeçalho com metadados do equipamento + canvas PixiJS.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';
import { Simulator } from '@/sim/Simulator.ts';

export class SimPanel {
  readonly el: HTMLElement;
  private readonly metaEl: HTMLDivElement;
  private readonly canvasHost: HTMLDivElement;
  private readonly sim = new Simulator();
  private ready = false;

  constructor(private readonly screens: ScreenManager) {
    this.el = document.createElement('section');
    this.el.className = 'sim-panel';

    this.metaEl = document.createElement('div');
    this.metaEl.className = 'sim-panel__meta';

    this.canvasHost = document.createElement('div');
    this.canvasHost.className = 'sim-panel__canvas';

    this.el.append(this.metaEl, this.canvasHost);
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

    if (this.ready) this.sim.render(def);
  }

  destroy(): void {
    this.sim.destroy();
  }
}
