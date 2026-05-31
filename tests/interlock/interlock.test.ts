import { describe, it, expect } from 'vitest';
import { InterlockEngine } from '@/interlock/InterlockEngine.ts';
import { kraaijveldRules } from '@/interlock/rules/kraaijveld.rules.ts';
import { ibercisaRules } from '@/interlock/rules/ibercisa.rules.ts';
import type { PanelValues } from '@/sim/state.ts';

describe('InterlockEngine — KRAAIJVELD', () => {
  const engine = new InterlockEngine(kraaijveldRules);

  it('bloqueia a bomba sem energia', () => {
    const v: PanelValues = {};
    expect(engine.isAllowed('hydraulic_pump', v)).toBe(false);
    const ev = engine.evaluate(v).controls['hydraulic_pump'];
    expect(ev.allowed).toBe(false);
    expect(ev.blockedBy).toContain('Energia principal ligada');
  });

  it('libera a bomba com energia e sem parada de emergência', () => {
    const v: PanelValues = { main_power: 1 };
    expect(engine.isAllowed('hydraulic_pump', v)).toBe(true);
  });

  it('parada de emergência bloqueia a bomba e gera alerta', () => {
    const v: PanelValues = { main_power: 1, emergency_stop: 1 };
    expect(engine.isAllowed('hydraulic_pump', v)).toBe(false);
    expect(engine.evaluate(v).alerts.length).toBeGreaterThan(0);
  });

  it('a alavanca do tambor exige embreagem e pressão', () => {
    const semEmbreagem: PanelValues = { main_power: 1, hydraulic_pump: 1, hyd_pressure: 0.7 };
    expect(engine.isAllowed('drum_lever', semEmbreagem)).toBe(false);

    const completo: PanelValues = {
      main_power: 1,
      hydraulic_pump: 1,
      hyd_pressure: 0.7,
      clutch: 1,
    };
    expect(engine.isAllowed('drum_lever', completo)).toBe(true);
  });

  it('a embreagem exige freio aplicado', () => {
    const semFreio: PanelValues = { main_power: 1, hydraulic_pump: 1, hyd_pressure: 0.7 };
    const ev = engine.evaluate(semFreio).controls['clutch'];
    expect(ev.allowed).toBe(false);
    expect(ev.blockedBy).toContain('Freio aplicado');
  });
});

describe('InterlockEngine — IBERCISA', () => {
  const engine = new InterlockEngine(ibercisaRules);

  it('a HPU exige energia', () => {
    expect(engine.isAllowed('hpu_start', {})).toBe(false);
    expect(engine.isAllowed('hpu_start', { main_power: 1 })).toBe(true);
  });

  it('o joystick exige freio de cinta liberado', () => {
    const comFreio: PanelValues = {
      main_power: 1,
      hpu_start: 1,
      hyd_pressure: 0.7,
      band_brake: 1,
    };
    const ev = engine.evaluate(comFreio).controls['winch_joystick'];
    expect(ev.allowed).toBe(false);
    expect(ev.blockedBy).toContain('Freio de cinta liberado');

    const semFreio: PanelValues = { main_power: 1, hpu_start: 1, hyd_pressure: 0.7 };
    expect(engine.isAllowed('winch_joystick', semFreio)).toBe(true);
  });
});

describe('InterlockEngine — comportamento geral', () => {
  it('controle sem regra é sempre liberado', () => {
    const engine = new InterlockEngine(kraaijveldRules);
    expect(engine.isAllowed('main_power', {})).toBe(true);
  });

  it('setRuleset troca o conjunto de regras', () => {
    const engine = new InterlockEngine(kraaijveldRules);
    engine.setRuleset(ibercisaRules);
    expect(engine.evaluate({}).controls['hpu_start']).toBeDefined();
    expect(engine.evaluate({}).controls['hydraulic_pump']).toBeUndefined();
  });
});
