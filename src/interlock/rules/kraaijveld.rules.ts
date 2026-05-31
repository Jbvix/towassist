// Regras de intertravamento do guincho KRAAIJVELD (modelo 2500P).
// NOTA: lógica didática, a ser validada/refinada contra o manual
// (docs/manuais/kraaijveld/Users Manual - 2500P.pdf) no Sprint 6.

import { on, off, atLeast } from '@/interlock/InterlockEngine.ts';
import type { InterlockRuleset } from '@/interlock/types.ts';

export const kraaijveldRules: InterlockRuleset = {
  globalAlerts: [
    {
      label: 'PARADA DE EMERGÊNCIA ACIONADA — todos os movimentos inibidos.',
      test: on('emergency_stop'),
    },
  ],
  rules: [
    // A bomba hidráulica exige energia e ausência de parada de emergência.
    {
      controlId: 'hydraulic_pump',
      requires: [
        { label: 'Energia principal ligada', test: on('main_power') },
        { label: 'Parada de emergência liberada', test: off('emergency_stop') },
      ],
    },
    // A embreagem só engata com bomba ligada e freio aplicado (segurança).
    {
      controlId: 'clutch',
      requires: [
        { label: 'Bomba hidráulica ligada', test: on('hydraulic_pump') },
        { label: 'Pressão hidráulica suficiente', test: atLeast('hyd_pressure', 0.5) },
        { label: 'Freio aplicado', test: on('brake') },
        { label: 'Parada de emergência liberada', test: off('emergency_stop') },
      ],
    },
    // A alavanca do tambor exige sistema pronto e embreagem engatada.
    {
      controlId: 'drum_lever',
      requires: [
        { label: 'Embreagem engatada', test: on('clutch') },
        { label: 'Pressão hidráulica suficiente', test: atLeast('hyd_pressure', 0.5) },
        { label: 'Parada de emergência liberada', test: off('emergency_stop') },
      ],
    },
  ],
};
