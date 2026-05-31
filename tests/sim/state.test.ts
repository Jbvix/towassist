import { describe, it, expect } from 'vitest';
import { PanelState } from '@/sim/state.ts';
import { getEquipment } from '@/data/index.ts';

describe('PanelState — KRAAIJVELD', () => {
  const def = getEquipment('kraaijveld');

  it('inicia tudo desligado', () => {
    const s = new PanelState(def);
    expect(s.get('main_power')).toBe(0);
    expect(s.get('status_ready')).toBe(0);
  });

  it('não fica pronto só com energia', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    expect(s.get('status_ready')).toBe(0);
  });

  it('fica pronto com energia + bomba (sem parada de emergência)', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    s.set('hydraulic_pump', 1);
    expect(s.get('status_ready')).toBe(1);
  });

  it('parada de emergência derruba o "pronto"', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    s.set('hydraulic_pump', 1);
    s.set('emergency_stop', 1);
    expect(s.get('status_ready')).toBe(0);
  });

  it('a pressão hidráulica tende ao alvo após ticks', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    s.set('hydraulic_pump', 1);
    // Avança ~2 s de simulação.
    for (let i = 0; i < 40; i++) s.tick(0.05);
    expect(s.get('hyd_pressure')).toBeGreaterThan(0.5);
  });

  it('snapshot reflete o estado atual', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    expect(s.snapshot['main_power']).toBe(1);
  });
});

describe('PanelState — IBERCISA', () => {
  const def = getEquipment('ibercisa');

  it('fica pronto com energia + HPU', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    s.set('hpu_start', 1);
    expect(s.get('status_ready')).toBe(1);
  });

  it('a célula de carga reage ao joystick quando pronto', () => {
    const s = new PanelState(def);
    s.set('main_power', 1);
    s.set('hpu_start', 1);
    s.set('winch_joystick', 1);
    for (let i = 0; i < 40; i++) s.tick(0.05);
    expect(s.get('load_cell')).toBeGreaterThan(0);
  });
});

describe('PanelState — reset', () => {
  it('reset zera os valores para o novo equipamento', () => {
    const s = new PanelState(getEquipment('kraaijveld'));
    s.set('main_power', 1);
    s.reset(getEquipment('ibercisa'));
    expect(s.get('main_power')).toBe(0);
    expect(s.snapshot['hpu_start']).toBe(0);
  });
});
