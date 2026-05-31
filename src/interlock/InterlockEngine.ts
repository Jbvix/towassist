// Motor de intertravamento: avaliação pura do estado do painel contra um
// conjunto de regras. Sem efeitos colaterais — fácil de testar.

import type { PanelValues } from '@/sim/state.ts';
import type {
  ControlEvaluation,
  InterlockEvaluation,
  InterlockRuleset,
} from '@/interlock/types.ts';

export class InterlockEngine {
  constructor(private ruleset: InterlockRuleset) {}

  /** Troca o conjunto de regras (ao alternar de equipamento). */
  setRuleset(ruleset: InterlockRuleset): void {
    this.ruleset = ruleset;
  }

  /** Avalia o estado atual e devolve liberações, bloqueios e alertas. */
  evaluate(values: PanelValues): InterlockEvaluation {
    const controls: Record<string, ControlEvaluation> = {};

    for (const rule of this.ruleset.rules) {
      const blockedBy = rule.requires
        .filter((cond) => !cond.test(values))
        .map((cond) => cond.label);
      controls[rule.controlId] = {
        controlId: rule.controlId,
        allowed: blockedBy.length === 0,
        blockedBy,
      };
    }

    const alerts: string[] = [];
    for (const alert of this.ruleset.globalAlerts ?? []) {
      // Alertas: a condição descreve a situação ANORMAL; dispara se for verdadeira.
      if (alert.test(values)) alerts.push(alert.label);
    }

    return { controls, alerts };
  }

  /** Conveniência: um controle específico está liberado? */
  isAllowed(controlId: string, values: PanelValues): boolean {
    const rule = this.ruleset.rules.find((r) => r.controlId === controlId);
    if (!rule) return true; // sem regra => livre
    return rule.requires.every((c) => c.test(values));
  }
}

/** Helpers de condição reutilizáveis. */
export const on = (id: string) => (v: PanelValues) => (v[id] ?? 0) >= 0.5;
export const off = (id: string) => (v: PanelValues) => (v[id] ?? 0) < 0.5;
export const atLeast = (id: string, threshold: number) => (v: PanelValues) =>
  (v[id] ?? 0) >= threshold;
