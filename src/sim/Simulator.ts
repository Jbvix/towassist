// Engine de simulação 2D (PixiJS). Sprint 4: painel interativo.
// Desenha os controles a partir dos dados, aceita interação do usuário,
// mantém o PanelState e anima os mostradores via ticker.

import { Application, Container } from 'pixi.js';
import type { EquipmentDefinition, EquipmentId } from '@shared/types/equipment.ts';
import { PanelState, type PanelValues } from '@/sim/state.ts';
import { ControlNode, type ControlIntent } from '@/sim/components/ControlNode.ts';
import { InterlockEngine } from '@/interlock/InterlockEngine.ts';
import { getRuleset } from '@/interlock/rules/index.ts';
import type { InterlockEvaluation } from '@/interlock/types.ts';

export class Simulator {
  private readonly app = new Application();
  private panel: Container | null = null;
  private nodes = new Map<string, ControlNode>();
  private state: PanelState | null = null;
  private interlock: InterlockEngine | null = null;
  private accent = 0x2f9e8f;
  private resizeObserver: ResizeObserver | null = null;
  private initialized = false;
  private lastTime = 0;

  /** Notificado quando o estado do painel muda (para contexto do KRATOS). */
  onStateChange: ((values: PanelValues) => void) | null = null;
  /** Notificado com a avaliação do intertravamento (para o InterlockPanel). */
  onInterlock: ((evaluation: InterlockEvaluation) => void) | null = null;
  /** Notificado quando um comando é bloqueado pelo intertravamento. */
  onBlocked: ((controlId: string, label: string, reasons: string[]) => void) | null = null;

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

    this.interlock = new InterlockEngine(getRuleset(def.meta.id as EquipmentId));

    this.state = new PanelState(def);
    this.state.subscribe((values) => {
      this.applyValues(values);
      this.applyInterlock(values);
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
    const current = this.state.get(intent.id);
    const next =
      intent.kind === 'toggle' ? (current >= 0.5 ? 0 : 1) : intent.value;

    // Desligar / voltar ao neutro é sempre permitido (segurança).
    // Acionar (ligar / sair do neutro) passa pelo intertravamento.
    const isActivation = Math.abs(next) > Math.abs(current);
    if (isActivation && this.interlock && !this.interlock.isAllowed(intent.id, this.state.snapshot)) {
      const blockedBy = this.interlock.evaluate(this.state.snapshot).controls[intent.id]?.blockedBy ?? [];
      const node = this.nodes.get(intent.id);
      node?.flashBlocked();
      this.onBlocked?.(intent.id, node?.control.label ?? intent.id, blockedBy);
      return;
    }

    this.state.set(intent.id, next);
  }

  private applyValues(values: PanelValues): void {
    for (const [id, node] of this.nodes) {
      node.setValue(values[id] ?? 0);
    }
  }

  /** Reavalia o intertravamento e atualiza o estado visual dos controles. */
  private applyInterlock(values: PanelValues): void {
    if (!this.interlock) return;
    const evalResult = this.interlock.evaluate(values);
    for (const [id, node] of this.nodes) {
      const ev = evalResult.controls[id];
      // Um controle bloqueado só fica "desabilitado" quando está desligado;
      // se já estiver acionado, mantém-se habilitado para poder ser desligado.
      const isOn = Math.abs(values[id] ?? 0) >= 0.5;
      const enabled = !ev || ev.allowed || isOn;
      node.setEnabled(enabled);
    }
    this.onInterlock?.(evalResult);
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

    // Canvas de projeto virtual: os controles (160x70) são posicionados num
    // espaço fixo e o painel inteiro é escalado para caber na tela (desktop
    // ou celular), sem sobreposição. Margem proporcional ao menor lado.
    const DESIGN_W = 1000;
    const DESIGN_H = 720;
    const margin = 110;

    for (const node of this.nodes.values()) {
      const c = node.control;
      node.container.position.set(
        margin + c.x * (DESIGN_W - margin * 2),
        margin + c.y * (DESIGN_H - margin * 2),
      );
    }

    // Escala "contain": cabe tudo, mantém proporção; centraliza.
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    this.panel.scale.set(scale);
    this.panel.position.set(
      (width - DESIGN_W * scale) / 2,
      (height - DESIGN_H * scale) / 2,
    );
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
