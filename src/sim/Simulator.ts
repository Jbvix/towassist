// Engine de simulação 2D (PixiJS). No Sprint 2 desenha um painel-base a partir
// dos dados do equipamento (placeholders dos controles). A interatividade e o
// intertravamento entram nos Sprints 4 e 5.

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EquipmentDefinition, PanelControl } from '@shared/types/equipment.ts';

export class Simulator {
  private readonly app = new Application();
  private panel: Container | null = null;
  private accent = 0x2f9e8f;
  private resizeObserver: ResizeObserver | null = null;
  private initialized = false;

  /** Inicializa o PixiJS dentro do contêiner informado. */
  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      background: 0x0a0e12,
      antialias: true,
      resizeTo: host,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    host.appendChild(this.app.canvas);
    this.initialized = true;

    // Redesenha quando o contêiner muda de tamanho.
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(host);
  }

  /** Carrega/desenha o painel de um equipamento. */
  render(def: EquipmentDefinition): void {
    if (!this.initialized) return;
    this.accent = cssColorToHex(def.meta.accent, 0x2f9e8f);

    if (this.panel) {
      this.app.stage.removeChild(this.panel);
      this.panel.destroy({ children: true });
    }
    this.panel = new Container();
    this.app.stage.addChild(this.panel);

    for (const control of def.controls) {
      this.panel.addChild(this.buildControl(control));
    }
    this.layout();
  }

  private buildControl(control: PanelControl): Container {
    const node = new Container();
    (node as Container & { __control?: PanelControl }).__control = control;

    const w = 150;
    const h = 64;

    const box = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 10)
      .fill(0x141a21)
      .stroke({ width: 1.5, color: 0x2a3542 });
    node.addChild(box);

    // Glifo simples por tipo de controle.
    const glyph = new Graphics();
    drawGlyph(glyph, control, this.accent);
    glyph.position.set(-w / 2 + 22, 0);
    node.addChild(glyph);

    const label = new Text({
      text: control.label,
      style: new TextStyle({
        fill: 0xe7edf3,
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        wordWrap: true,
        wordWrapWidth: w - 54,
      }),
    });
    label.anchor.set(0, 0.5);
    label.position.set(-w / 2 + 44, 0);
    node.addChild(label);

    return node;
  }

  /** Posiciona os controles conforme suas coordenadas relativas (0..1). */
  private layout(): void {
    if (!this.panel) return;
    const { width, height } = this.app.renderer;
    const margin = 90;
    for (const child of this.panel.children) {
      const control = (child as Container & { __control?: PanelControl }).__control;
      if (!control) continue;
      child.position.set(
        margin + control.x * (width - margin * 2),
        margin + control.y * (height - margin * 2),
      );
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.initialized) {
      this.app.destroy(true, { children: true });
      this.initialized = false;
    }
  }
}

function drawGlyph(g: Graphics, control: PanelControl, accent: number): void {
  switch (control.kind) {
    case 'lever':
      g.roundRect(-3, -16, 6, 32, 3).fill(accent);
      g.circle(0, -16, 7).fill(0xe7edf3);
      break;
    case 'button':
      g.circle(0, 0, 12).fill(control.id === 'emergency_stop' ? 0xd8503f : accent);
      break;
    case 'gauge':
      g.circle(0, 0, 13).stroke({ width: 3, color: accent });
      g.moveTo(0, 0).lineTo(8, -6).stroke({ width: 2, color: 0xe7edf3 });
      break;
    case 'indicator':
      g.circle(0, 0, 9).fill(accent).stroke({ width: 2, color: 0xe7edf3 });
      break;
    case 'selector':
      g.circle(0, 0, 12).stroke({ width: 3, color: accent });
      g.moveTo(0, 0).lineTo(0, -10).stroke({ width: 3, color: 0xe7edf3 });
      break;
  }
}

/** Converte "#rrggbb" em número hex; usa fallback se inválido. */
function cssColorToHex(css: string, fallback: number): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(css.trim());
  return m ? parseInt(m[1], 16) : fallback;
}
