// Nó visual de um controle do painel (PixiJS).
// Renderiza a "caixa" + glifo conforme o tipo e o valor atual.
// A INTERAÇÃO é tratada pelo Simulator via hit-testing no canvas (DOM),
// que é mais confiável que os eventos federados do PixiJS neste contexto.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { PanelControl } from '@shared/types/equipment.ts';
import { LEVER_LABELS } from '@/sim/state.ts';

const W = 160;
const H = 70;
/** Dimensões da caixa do controle (para hit-testing no Simulator). */
export const NODE_W = W;
export const NODE_H = H;

const COLORS = {
  box: 0x141a21,
  boxActive: 0x1c2530,
  border: 0x2a3542,
  text: 0xe7edf3,
  muted: 0x9fb0c0,
  danger: 0xd8503f,
  ok: 0x3fb37a,
};

/** Intenção de mudança (o estado real é aplicado pelo Simulator). */
export type ControlIntent =
  | { kind: 'toggle'; id: string }
  | { kind: 'set'; id: string; value: number };

export class ControlNode {
  readonly container = new Container();
  readonly control: PanelControl;

  private readonly ring = new Graphics();
  private readonly box = new Graphics();
  private readonly glyph = new Graphics();
  private readonly valueText: Text;
  private accent: number;
  private value = 0;
  private enabled = true;
  private highlighted = false;
  private pulse = 0;

  constructor(control: PanelControl, accent: number) {
    this.control = control;
    this.accent = accent;

    // ring fica atrás da caixa (destaque da partida assistida).
    this.container.addChild(this.ring, this.box, this.glyph);

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

    this.redraw();
  }

  /** Valor atual (para o Simulator computar o próximo estado da alavanca). */
  get currentValue(): number {
    return this.value;
  }

  /** Se o controle aceita acionamento no momento (intertravamento). */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Se é um controle acionável (não um mostrador). */
  get isInteractive(): boolean {
    return this.control.kind !== 'gauge' && this.control.kind !== 'indicator';
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

  /** Habilita/desabilita conforme o intertravamento. */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.container.alpha = enabled ? 1 : 0.45;
    this.redraw();
  }

  /** Marca como próximo passo da partida assistida (anel pulsante). */
  setHighlight(on: boolean): void {
    if (this.highlighted === on) return;
    this.highlighted = on;
    if (!on) this.ring.clear();
  }

  /** Anima o anel de destaque (chamado pelo ticker). */
  tickHighlight(deltaSec: number): void {
    if (!this.highlighted) return;
    this.pulse += deltaSec * 3;
    const a = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(this.pulse));
    const pad = 4 + 2 * (0.5 + 0.5 * Math.sin(this.pulse));
    this.ring
      .clear()
      .roundRect(-W / 2 - pad, -H / 2 - pad, W + pad * 2, H + pad * 2, 16)
      .stroke({ width: 2.5, color: this.accent, alpha: a });
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
      const angle = value * 0.5;
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
      const R = 17;
      const A0 = Math.PI * 0.75; // início (135°)
      const SPAN = Math.PI * 1.5; // 270° de varredura
      const v = Math.max(0, Math.min(1, value));

      // Trilho de fundo.
      g.arc(0, 0, R, A0, A0 + SPAN).stroke({ width: 3, color: 0x2a3542 });
      // Zona de alerta (últimos 20% da escala) em vermelho translúcido.
      g.arc(0, 0, R, A0 + SPAN * 0.8, A0 + SPAN).stroke({ width: 3, color: 0x8a3a30 });
      // Arco preenchido até o valor.
      g.arc(0, 0, R, A0, A0 + SPAN * v).stroke({
        width: 3,
        color: v >= 0.8 ? COLORS.danger : accent,
      });
      // Marcações (5 ticks: 0,25,50,75,100%).
      for (let i = 0; i <= 4; i++) {
        const a = A0 + SPAN * (i / 4);
        const r0 = R - 3;
        const r1 = R + 3;
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
          .lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
          .stroke({ width: 1.5, color: COLORS.muted });
      }
      // Ponteiro.
      const an = A0 + SPAN * v;
      g.moveTo(0, 0).lineTo(Math.cos(an) * (R - 4), Math.sin(an) * (R - 4)).stroke({
        width: 2.5,
        color: COLORS.text,
      });
      g.circle(0, 0, 2.5).fill(COLORS.text);
      break;
    }
    case 'indicator':
      g.circle(0, 0, 11)
        .fill(on ? COLORS.ok : 0x35424f)
        .stroke({ width: 2, color: on ? COLORS.text : COLORS.border });
      break;
  }
}
