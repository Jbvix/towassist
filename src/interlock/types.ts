// Tipos do sistema de intertravamento (interlock).
// Modelado como avaliação pura: dado o estado do painel, quais comandos estão
// liberados/bloqueados e por quê. Independente de PixiJS e da IA (testável).

import type { PanelValues } from '@/sim/state.ts';

/** Uma condição é uma função pura sobre o estado do painel. */
export interface InterlockCondition {
  /** Texto legível, ex.: "Energia principal ligada". */
  label: string;
  /** Verdadeiro quando a condição está satisfeita. */
  test: (values: PanelValues) => boolean;
}

/** Regra: para acionar `controlId`, todas as `requires` devem ser satisfeitas. */
export interface InterlockRule {
  /** Controle governado por esta regra. */
  controlId: string;
  /** Condições necessárias para liberar o controle. */
  requires: InterlockCondition[];
}

/** Resultado da avaliação de um controle. */
export interface ControlEvaluation {
  controlId: string;
  allowed: boolean;
  /** Condições pendentes (não satisfeitas) que bloqueiam o controle. */
  blockedBy: string[];
}

/** Resultado completo da avaliação do intertravamento. */
export interface InterlockEvaluation {
  /** Por controle. */
  controls: Record<string, ControlEvaluation>;
  /** Mensagens globais (ex.: parada de emergência ativa). */
  alerts: string[];
}

/** Conjunto de regras de um equipamento. */
export interface InterlockRuleset {
  /** Condições globais que, se violadas, geram alerta (ex.: e-stop). */
  globalAlerts?: InterlockCondition[];
  rules: InterlockRule[];
}
