import { describe, it, expect } from 'vitest';
import { nextStartupStep } from '@/sim/startup.ts';
import type { PanelValues } from '@/sim/state.ts';

describe('Partida assistida — KRAAIJVELD', () => {
  it('começa pela energia principal', () => {
    const r = nextStartupStep('kraaijveld', {});
    expect(r.next?.controlId).toBe('main_power');
    expect(r.index).toBe(1);
  });

  it('após energia, pede a bomba', () => {
    const r = nextStartupStep('kraaijveld', { main_power: 1 });
    expect(r.next?.controlId).toBe('hydraulic_pump');
  });

  it('pede freio antes da embreagem', () => {
    const r = nextStartupStep('kraaijveld', { main_power: 1, hydraulic_pump: 1 });
    expect(r.next?.controlId).toBe('brake');
  });

  it('parada de emergência tem prioridade', () => {
    const v: PanelValues = { main_power: 1, hydraulic_pump: 1, emergency_stop: 1 };
    expect(nextStartupStep('kraaijveld', v).next?.controlId).toBe('emergency_stop');
  });

  it('conclui quando tudo está pronto e a alavanca é usada', () => {
    const v: PanelValues = {
      main_power: 1,
      hydraulic_pump: 1,
      brake: 1,
      clutch: 1,
      drum_lever: 1,
    };
    expect(nextStartupStep('kraaijveld', v).next).toBeNull();
  });
});

describe('Partida assistida — IBERCISA', () => {
  it('sequência energia → HPU → joystick', () => {
    expect(nextStartupStep('ibercisa', {}).next?.controlId).toBe('main_power');
    expect(nextStartupStep('ibercisa', { main_power: 1 }).next?.controlId).toBe('hpu_start');
    const pronto = nextStartupStep('ibercisa', { main_power: 1, hpu_start: 1 });
    expect(pronto.next?.controlId).toBe('winch_joystick');
  });
});
