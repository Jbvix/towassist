// Estado do painel de comando (uma instância por equipamento ativo).
// Mantém o valor de cada controle e deriva mostradores/indicadores.
// É puro o suficiente para, no Sprint 5, ser consumido pelo intertravamento.

import type { EquipmentDefinition } from '@shared/types/equipment.ts';

/** Valor de um controle: 0/1 para liga-desliga; -1..1 para alavancas; 0..1 para gauges. */
export type ControlValue = number;

export type PanelValues = Record<string, ControlValue>;

type Listener = (values: PanelValues) => void;

/** Rótulos legíveis para o valor de uma alavanca. */
export const LEVER_LABELS: Record<number, string> = {
  [-1]: 'SOLTAR',
  [0]: 'NEUTRO',
  [1]: 'RECOLHER',
};

export class PanelState {
  private values: PanelValues = {};
  /** Alvos das grandezas animadas (gauges), suavizados a cada tick. */
  private targets: PanelValues = {};
  private readonly listeners = new Set<Listener>();

  constructor(private def: EquipmentDefinition) {
    this.reset(def);
  }

  /** Reinicia o estado para um (novo) equipamento. */
  reset(def: EquipmentDefinition): void {
    this.def = def;
    this.values = {};
    this.targets = {};
    for (const c of def.controls) {
      this.values[c.id] = 0;
      this.targets[c.id] = 0;
    }
    this.emit();
  }

  get snapshot(): PanelValues {
    return { ...this.values };
  }

  get(id: string): ControlValue {
    return this.values[id] ?? 0;
  }

  /** Define o valor de um controle interativo e re-deriva o painel. */
  set(id: string, value: ControlValue): void {
    this.values[id] = value;
    this.derive();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  /**
   * Avança a animação das grandezas (chamado pelo ticker).
   * Retorna true se algo mudou de forma perceptível.
   */
  tick(deltaSec: number): boolean {
    let changed = false;
    const rate = Math.min(1, deltaSec * 2.5); // suavização (~0.4 s)
    for (const id of Object.keys(this.targets)) {
      const cur = this.values[id] ?? 0;
      const tgt = this.targets[id] ?? 0;
      if (Math.abs(tgt - cur) > 0.002) {
        this.values[id] = cur + (tgt - cur) * rate;
        changed = true;
      } else if (cur !== tgt) {
        this.values[id] = tgt;
        changed = true;
      }
    }
    if (changed) this.emit();
    return changed;
  }

  /** Deriva gauges e indicadores a partir dos controles de entrada. */
  private derive(): void {
    const ids = new Set(this.def.controls.map((c) => c.id));
    const on = (id: string) => (this.values[id] ?? 0) >= 0.5;

    const power = on('main_power');
    const pump = on('hydraulic_pump') || on('hpu_start');
    const estop = on('emergency_stop');
    const ready = power && pump && !estop;

    // Alavanca/joystick de comando do tambor (-1..1).
    const lever = this.values['drum_lever'] ?? this.values['winch_joystick'] ?? 0;

    // Pressão hidráulica: sobe com bomba ligada e energia, cai com e-stop.
    if (ids.has('hyd_pressure')) {
      this.targets['hyd_pressure'] = ready ? 0.7 : 0;
    }
    // Tensão/carga na linha: proporcional ao módulo da alavanca quando pronto.
    const loadId = ids.has('line_tension')
      ? 'line_tension'
      : ids.has('load_cell')
        ? 'load_cell'
        : null;
    if (loadId) {
      this.targets[loadId] = ready ? Math.min(1, Math.abs(lever) * 0.8 + 0.1) : 0;
    }
    // Indicador "pronto p/ operar".
    if (ids.has('status_ready')) {
      this.values['status_ready'] = ready ? 1 : 0;
      this.targets['status_ready'] = ready ? 1 : 0;
    }
  }

  private emit(): void {
    const snap = this.snapshot;
    for (const l of this.listeners) l(snap);
  }
}
