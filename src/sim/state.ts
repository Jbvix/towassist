// Estado do painel de comando (uma instância por equipamento ativo).
// Mantém o valor de cada controle e deriva mostradores/indicadores.
// É puro o suficiente para, no Sprint 5, ser consumido pelo intertravamento.

import type { EquipmentDefinition } from '@shared/types/equipment.ts';

/** Valor de um controle: 0/1 para liga-desliga; -1..1 para alavancas; 0..1 para gauges. */
export type ControlValue = number;

export type PanelValues = Record<string, ControlValue>;

type Listener = (values: PanelValues) => void;

/** Rótulos legíveis para o valor de uma alavanca (terminologia de manobra). */
export const LEVER_LABELS: Record<number, string> = {
  [-1]: 'PAGAR CABO',
  [0]: 'NEUTRO',
  [1]: 'COLHER CABO',
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
      // IMPORTANTE: apenas mostradores (gauges) são animados pelo tick().
      // Controles de entrada (botões/seletores/alavancas) NÃO entram em
      // `targets`, senão o tick os puxaria de volta a 0 logo após o clique
      // (causava "liga e desliga sozinho").
      if (c.kind === 'gauge') {
        this.targets[c.id] = 0;
      }
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
    const estop = on('emergency_stop');
    const quickRelease = on('quick_release');

    // Bomba principal: hidráulica (KRAAIJVELD) ou HPU (IBERCISA).
    const mainPump = on('hydraulic_pump') || on('hpu_start');
    // IBERCISA exige também a bomba de pilotagem (pressão de comando das válvulas).
    const pilotOk = ids.has('pilot_pump') ? on('pilot_pump') : true;
    const ready = power && mainPump && pilotOk && !estop;

    // Alavanca/joystick de comando do tambor (-1..1).
    // O Quick Release sobrepõe o comando: paga cabo imediatamente.
    let lever = this.values['drum_lever'] ?? this.values['winch_joystick'] ?? 0;
    if (quickRelease) lever = -1;

    // Pressão hidráulica: sobe com bomba ligada e energia, cai com e-stop.
    if (ids.has('hyd_pressure')) {
      this.targets['hyd_pressure'] = ready ? 0.7 : 0;
    }
    // Tensão/carga na linha: proporcional ao módulo da alavanca quando pronto.
    // Pagar cabo (lever < 0) ou Quick Release alivia a tensão rapidamente.
    const loadId = ids.has('line_tension')
      ? 'line_tension'
      : ids.has('load_cell')
        ? 'load_cell'
        : null;
    if (loadId) {
      if (quickRelease) {
        this.targets[loadId] = 0; // liberação rápida: tensão cai
      } else if (!ready) {
        this.targets[loadId] = 0;
      } else if (lever < 0) {
        this.targets[loadId] = 0.05; // pagando cabo: alivia
      } else {
        this.targets[loadId] = Math.min(1, Math.abs(lever) * 0.8 + 0.1);
      }
    }

    // Movimento do tambor: alavanca fora do neutro (ou quick release) com sistema apto.
    const moving = (ready || quickRelease) && Math.abs(lever) >= 0.5;

    // IBERCISA — Sensor Pickup: detecta rotação/velocidade do tambor.
    if (ids.has('pickup_sensor')) {
      this.values['pickup_sensor'] = moving ? 1 : 0;
    }
    // IBERCISA — Sensor de Acoplamento: confirma o acoplamento do acionamento.
    if (ids.has('coupling_sensor')) {
      this.values['coupling_sensor'] = power && mainPump ? 1 : 0;
    }

    // Indicador "pronto p/ operar" (não é animado; valor direto).
    if (ids.has('status_ready')) {
      this.values['status_ready'] = ready ? 1 : 0;
    }
  }

  private emit(): void {
    const snap = this.snapshot;
    for (const l of this.listeners) l(snap);
  }
}
