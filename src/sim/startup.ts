// Partida assistida: dada a configuração do equipamento e o estado atual do
// painel, determina o PRÓXIMO passo da sequência de partida — o controle a
// acionar e uma instrução curta (estilo KRATOS). Lógica pura e testável.

import type { EquipmentId } from '@shared/types/equipment.ts';
import type { PanelValues } from '@/sim/state.ts';

export interface StartupStep {
  /** Controle que o usuário deve acionar neste passo. */
  controlId: string;
  /** Instrução curta exibida ao operador. */
  instruction: string;
  /** Condição que indica o passo já cumprido. */
  done: (v: PanelValues) => boolean;
}

export interface StartupResult {
  /** Próximo passo pendente, ou null se a sequência terminou. */
  next: StartupStep | null;
  /** Índice 1-based do passo atual (para "passo X de N"). */
  index: number;
  total: number;
}

const on = (id: string) => (v: PanelValues) => (v[id] ?? 0) >= 0.5;

const SEQUENCES: Record<EquipmentId, StartupStep[]> = {
  kraaijveld: [
    { controlId: 'main_power', instruction: 'Ligue a Energia Principal.', done: on('main_power') },
    { controlId: 'hydraulic_pump', instruction: 'Acione a Bomba Hidráulica.', done: on('hydraulic_pump') },
    { controlId: 'brake', instruction: 'Aplique o Freio antes de engatar.', done: on('brake') },
    { controlId: 'clutch', instruction: 'Engate a Embreagem.', done: on('clutch') },
    {
      controlId: 'drum_lever',
      instruction: 'Pronto. Use a Alavanca do Tambor para recolher ou soltar.',
      done: (v) => Math.abs(v['drum_lever'] ?? 0) >= 0.5,
    },
  ],
  ibercisa: [
    { controlId: 'main_power', instruction: 'Ligue a Energia Principal.', done: on('main_power') },
    { controlId: 'hpu_start', instruction: 'Dê a Partida na HPU.', done: on('hpu_start') },
    {
      controlId: 'pilot_pump',
      instruction: 'Ligue a Bomba de Pilotagem.',
      done: on('pilot_pump'),
    },
    {
      controlId: 'winch_joystick',
      instruction: 'Pronto. Use o Joystick para colher ou pagar o cabo.',
      done: (v) => Math.abs(v['winch_joystick'] ?? 0) >= 0.5,
    },
  ],
};

/** Calcula o próximo passo da partida para o equipamento e estado dados. */
export function nextStartupStep(equipment: EquipmentId, values: PanelValues): StartupResult {
  const seq = SEQUENCES[equipment];
  // Parada de emergência tem prioridade absoluta.
  if ((values['emergency_stop'] ?? 0) >= 0.5) {
    return {
      next: {
        controlId: 'emergency_stop',
        instruction: 'Parada de emergência acionada. Libere-a para iniciar a partida.',
        done: (v) => (v['emergency_stop'] ?? 0) < 0.5,
      },
      index: 0,
      total: seq.length,
    };
  }
  for (let i = 0; i < seq.length; i++) {
    if (!seq[i].done(values)) {
      return { next: seq[i], index: i + 1, total: seq.length };
    }
  }
  return { next: null, index: seq.length, total: seq.length };
}
