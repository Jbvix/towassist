// Ponte simples entre a simulação (produtor) e o chat (consumidor):
// guarda o último estado do painel para compor o contexto enviado ao KRATOS.

import type { PanelValues } from '@/sim/state.ts';

export class PanelStore {
  private values: PanelValues = {};

  update(values: PanelValues): void {
    this.values = values;
  }

  /** Estado atual arredondado, adequado para o contexto textual do assistente. */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.values)) {
      out[k] = Math.round(v * 100) / 100;
    }
    return out;
  }
}
