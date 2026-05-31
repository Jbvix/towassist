// Nó visual interativo de um controle do painel (PixiJS).
// Renderiza a "caixa" + glifo conforme o tipo e o valor atual, e dispara
// uma intenção de mudança quando o usuário interage (clique/drag).

import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { PanelControl } from '@shared/types/equipment.ts';
import { LEVER_LABELS } from '@/sim/state.ts';

const W = 160;
const H = 70;
const COLORS = {
  box: 0x141a21,
  boxActive: 0x1c2530,
  border: 0x2a3542,
  text: 0xe7edf3,
  muted: 0x9fb0c0,
  danger: 0xd8503f,
  ok: 0x3fb37a,
};

/** Intenção de mudança emitida pelo controle (o estado real é aplicado fora). */
export type ControlIntent =
  | { kind: 'toggle'; id: string }
  | { kind: 'set'; id: string; value: number };

export class ControlNode {
  readonly container = new Container();
  readonly control: PanelControl;

  private readonly box = new Graphics();
  private readonly glyph = new Graphics();
  private readonly valueText: Text;
  private accent: number;
  private value = 0;
  private enabled = true;

  constructor(
    control: PanelControl,
    accent: number,
    private readonly onIntent: (intent: ControlIntent) => void,
  ) {
    this.control = control;
    this.accent = accent;

    this.container.addChild(this.box, this.glyph);

    const label = new Text({
      text: control.label,
      style: new TextStyle({
        fill: COLORS.text,
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        wordWrap: true,
        wordWrapWidth: W - 60,
      }),
    });
    label.anchor.set(0, 0);
    label.position.set(-W / 2 + 50, -H / 2 + 8);
    this.container.addChild(label);

    this.valueText = new Text({
      text: '',
      style: new TextStyle({
        fill: COLORS.muted,
        fontSize: 11,
        fontFamily: 'system-ui, sans-serif',
      }),
    });
    this.valueText.anchor.set(0, 1);
    this.valueText.position.set(-W / 2 + 50, H / 2 - 8);
    this.container.addChild(this.valueText);

    this.setupInteraction();
    this.redraw();
  }

  setAccent(accent: number): void {
    this.accent = accent;
    this.redraw();
  }

  /** Atualiza o valor exibido (vem do PanelState). */
  setValue(value: number): void {
    this.value = value;
    this.redraw();
  }

  /** Habilita/desabilita conforme o intertravamento (Sprint 5). */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.container.alpha = enabled ? 1 : 0.45;
    this.container.cursor = enabled ? 'pointer' : 'not-allowed';
    this.redraw();
  }

  /** Pisca em vermelho ao tentar acionar um comando bloqueado. */
  flashBlocked(): void {
    this.box
      .clear()
      .roundRect(-W / 2, -H / 2, W, H, 12)
      .fill(COLORS.box)
      .stroke({ width: 2.5, color: COLORS.danger });
    window.setTimeout(() => this.redraw(), 320);
  }

  private setupInteraction(): void {
    const c = this.control;
    if (c.kind === 'gauge' || c.kind === 'indicator') {
      this.container.eventMode = 'none';
      return;
    }
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    // hitArea explícita: sem ela o Container não recebe o clique de forma
    // confiável no PixiJS v8 (os filhos Graphics não viram área de toque do pai).
    this.container.hitArea = new Rectangle(-W / 2, -H / 2, W, H);

    if (c.kind === 'lever') {
      // Alavanca de 3 posições: clique cicla SOLTAR(-1) → NEUTRO(0) → RECOLHER(1).
      this.container.on('pointertap', () => {
        if (!this.enabled) return;
        const next = this.value >= 1 ? -1 : this.value < 0 ? 0 : 1;
        this.onIntent({ kind: 'set', id: c.id, value: next });
      });
    } else {
      // button / selector: alterna 0/1.
      this.container.on('pointertap', () => {
        if (!this.enabled) return;
        this.onIntent({ kind: 'toggle', id: c.id });
      });
    }
  }

  private redraw(): void {
    const c = this.control;
    const active = this.value >= 0.5 || this.value <= -0.5;

    this.box
      .clear()
      .roundRect(-W / 2, -H / 2, W, H, 12)
      .fill(active ? COLORS.boxActive : COLORS.box)
      .stroke({ width: 1.5, color: active ? this.accent : COLORS.border });

    this.glyph.clear();
    this.glyph.position.set(-W / 2 + 24, 0);
    drawGlyph(this.glyph, c, this.value, this.accent);

    this.valueText.text = this.valueLabel();
  }

  private valueLabel(): string {
    const c = this.control;
    switch (c.kind) {
      case 'lever':
        return LEVER_LABELS[Math.round(this.value)] ?? 'NEUTRO';
      case 'button':
      case 'selector':
        return this.value >= 0.5 ? 'LIGADO' : 'DESLIGADO';
      case 'gauge':
        return `${Math.round(this.value * 100)}%`;
      case 'indicator':
        return this.value >= 0.5 ? 'OK' : '—';
    }
  }
}

function drawGlyph(g: Graphics, control: PanelControl, value: number, accent: number): void {
  const on = value >= 0.5;
  switch (control.kind) {
    case 'lever': {
      // Base + haste inclinada conforme a posição (-1..1).
      const angle = value * 0.5; // rad
      g.roundRect(-10, 14, 20, 6, 3).fill(0x2a3542);
      const tipX = Math.sin(angle) * 22;
      const tipY = 14 - Math.cos(angle) * 24;
      g.moveTo(0, 16).lineTo(tipX, tipY).stroke({ width: 5, color: accent });
      g.circle(tipX, tipY, 7).fill(COLORS.text);
      break;
    }
    case 'button':
      g.circle(0, 0, 13)
        .fill(control.id === 'emergency_stop' ? COLORS.danger : on ? accent : 0x35424f)
        .stroke({ width: 2, color: on ? COLORS.text : COLORS.border });
      break;
    case 'selector':
      g.circle(0, 0, 13).stroke({ width: 3, color: on ? accent : COLORS.border });
      g.moveTo(0, 0)
        .lineTo(Math.sin(on ? 0.7 : -0.7) * 11, -Math.cos(on ? 0.7 : -0.7) * 11)
        .stroke({ width: 3, color: COLORS.text });
      break;
    case 'gauge': {
      // Arco de 0..1.
      g.circle(0, 0, 15).stroke({ width: 3, color: 0x2a3542 });
      const a0 = Math.PI * 0.75;
      const a1 = a0 + Math.PI * 1.5 * Math.max(0, Math.min(1, value));
      g.arc(0, 0, 15, a0, a1).stroke({ width: 3, color: accent });
      const ang = a1;
      g.moveTo(0, 0).lineTo(Math.cos(ang) * 11, Math.sin(ang) * 11).stroke({
        width: 2,
        color: COLORS.text,
      });
      break;
    }
    case 'indicator':
      g.circle(0, 0, 11)
        .fill(on ? COLORS.ok : 0x35424f)
        .stroke({ width: 2, color: on ? COLORS.text : COLORS.border });
      break;
  }
}
