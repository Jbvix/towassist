// Gerencia a tela ativa (KRAAIJVELD / IBERCISA) e notifica os interessados.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { EQUIPMENT_ORDER } from '@/data/index.ts';

type Listener = (active: EquipmentId) => void;

export class ScreenManager {
  private active: EquipmentId;
  private readonly listeners = new Set<Listener>();

  constructor(initial: EquipmentId = EQUIPMENT_ORDER[0]) {
    this.active = initial;
  }

  get current(): EquipmentId {
    return this.active;
  }

  /** Define a tela ativa; ignora se já for a atual. */
  set(id: EquipmentId): void {
    if (id === this.active) return;
    this.active = id;
    for (const listener of this.listeners) listener(id);
  }

  /** Inscreve um listener e o chama imediatamente com o estado atual. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.active);
    return () => this.listeners.delete(listener);
  }
}
