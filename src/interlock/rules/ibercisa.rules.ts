// Regras de intertravamento do guincho IBERCISA (MR-MAN-H 70 100-64).
// NOTA: lógica didática, a ser validada/refinada contra o manual
// (docs/manuais/ibercisa/...Arcimbaldo.pdf) no Sprint 6.

import { on, off, atLeast } from '@/interlock/InterlockEngine.ts';
import type { InterlockRuleset } from '@/interlock/types.ts';

export const ibercisaRules: InterlockRuleset = {
  globalAlerts: [
    {
      label: 'PARADA DE EMERGÊNCIA ACIONADA — todos os movimentos inibidos.',
      test: on('emergency_stop'),
    },
  ],
  rules: [
    // Partida da HPU exige energia e e-stop liberado.
    {
      controlId: 'hpu_start',
      requires: [
        { label: 'Energia principal ligada', test: on('main_power') },
        { label: 'Parada de emergência liberada', test: off('emergency_stop') },
      ],
    },
    // O freio de cinta exige HPU em funcionamento.
    {
      controlId: 'band_brake',
      requires: [
        { label: 'HPU em funcionamento', test: on('hpu_start') },
        { label: 'Pressão hidráulica suficiente', test: atLeast('hyd_pressure', 0.5) },
      ],
    },
    // O joystick do guincho exige sistema pronto, pilotagem, acoplamento,
    // freio liberado e e-stop ok.
    {
      controlId: 'winch_joystick',
      requires: [
        { label: 'HPU em funcionamento', test: on('hpu_start') },
        { label: 'Bomba de pilotagem ligada', test: on('pilot_pump') },
        { label: 'Pressão hidráulica suficiente', test: atLeast('hyd_pressure', 0.5) },
        { label: 'Acoplamento confirmado', test: on('coupling_sensor') },
        { label: 'Freio de cinta liberado', test: off('band_brake') },
        { label: 'Parada de emergência liberada', test: off('emergency_stop') },
      ],
    },
  ],
};
