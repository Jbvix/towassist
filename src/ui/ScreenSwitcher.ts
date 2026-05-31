// Botões de alternância entre as telas KRAAIJVELD e IBERCISA.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getAllEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';

export class ScreenSwitcher {
  readonly el: HTMLDivElement;
  private readonly buttons = new Map<EquipmentId, HTMLButtonElement>();

  constructor(private readonly screens: ScreenManager) {
    this.el = document.createElement('div');
    this.el.className = 'screen-switcher';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'Selecionar equipamento');

    for (const { meta } of getAllEquipment()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = meta.name;
      btn.addEventListener('click', () => this.screens.set(meta.id));
      this.buttons.set(meta.id, btn);
      this.el.appendChild(btn);
    }

    this.screens.subscribe((active) => this.render(active));
  }

  private render(active: EquipmentId): void {
    for (const [id, btn] of this.buttons) {
      btn.setAttribute('aria-pressed', String(id === active));
    }
  }
}
