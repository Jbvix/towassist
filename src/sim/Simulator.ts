// Engine de simulação 2D (PixiJS). Sprint 4: painel interativo.
// Desenha os controles a partir dos dados, aceita interação do usuário,
// mantém o PanelState e anima os mostradores via ticker.

import { Application, Container } from 'pixi.js';
import type { EquipmentDefinition } from '@shared/types/equipment.ts';
import { PanelState, type PanelValues } from '@/sim/state.ts';
import { ControlNode, type ControlIntent } from '@/sim/components/ControlNode.ts';

export class Simulator {
  private readonly app = new Application();
  private panel: Container | null = null;
  private nodes = new Map<string, ControlNode>();
  private state: PanelState | null = null;
  private accent = 0x2f9e8f;
  private resizeObserver: ResizeObserver | null = null;
  private initialized = false;
  private lastTime = 0;

  /** Notificado quando o estado do painel muda (para contexto do KRATOS). */
  onStateChange: ((values: PanelValues) => void) | null = null;

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

    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(host);

    this.lastTime = performance.now();
    this.app.ticker.add(() => this.update());
  }

  /** Carrega/desenha o painel de um equipamento e (re)cria o estado. */
  render(def: EquipmentDefinition): void {
    if (!this.initialized) return;
    this.accent = cssColorToHex(def.meta.accent, 0x2f9e8f);

    if (this.panel) {
      this.app.stage.removeChild(this.panel);
      this.panel.destroy({ children: true });
    }
    this.panel = new Container();
    this.app.stage.addChild(this.panel);
    this.nodes.clear();

    this.state = new PanelState(def);
    this.state.subscribe((values) => {
      this.applyValues(values);
      this.onStateChange?.(values);
    });

    for (const control of def.controls) {
      const node = new ControlNode(control, this.accent, (intent) => this.handleIntent(intent));
      this.nodes.set(control.id, node);
      this.panel.addChild(node.container);
    }
    this.layout();
  }

  /** Estado atual do painel (para enviar ao assistente). */
  get panelValues(): PanelValues {
    return this.state?.snapshot ?? {};
  }

  private handleIntent(intent: ControlIntent): void {
    if (!this.state) return;
    if (intent.kind === 'toggle') {
      const next = this.state.get(intent.id) >= 0.5 ? 0 : 1;
      this.state.set(intent.id, next);
    } else {
      this.state.set(intent.id, intent.value);
    }
  }

  private applyValues(values: PanelValues): void {
    for (const [id, node] of this.nodes) {
      node.setValue(values[id] ?? 0);
    }
  }

  private update(): void {
    if (!this.state) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.state.tick(dt);
  }

  private layout(): void {
    if (!this.panel) return;
    const { width, height } = this.app.renderer;
    const margin = 100;
    for (const node of this.nodes.values()) {
      const c = node.control;
      node.container.position.set(
        margin + c.x * (width - margin * 2),
        margin + c.y * (height - margin * 2),
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

/** Converte "#rrggbb" em número hex; usa fallback se inválido. */
function cssColorToHex(css: string, fallback: number): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(css.trim());
  return m ? parseInt(m[1], 16) : fallback;
}
