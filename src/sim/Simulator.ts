// Engine de simulação 2D (PixiJS). Painel interativo com seções agrupadas.
// A INTERAÇÃO usa hit-testing no canvas (evento DOM 'click'), que é robusto e
// independente das particularidades do sistema de eventos do PixiJS.

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EquipmentDefinition, EquipmentId, PanelControl } from '@shared/types/equipment.ts';
import { PanelState, type PanelValues } from '@/sim/state.ts';
import { ControlNode, NODE_W, NODE_H, type ControlIntent } from '@/sim/components/ControlNode.ts';
import { InterlockEngine } from '@/interlock/InterlockEngine.ts';
import { getRuleset } from '@/interlock/rules/index.ts';
import type { InterlockEvaluation } from '@/interlock/types.ts';

/** Rótulos legíveis dos grupos funcionais. */
const GROUP_TITLES: Record<string, string> = {
  energia: 'ENERGIA & SEGURANÇA',
  comando: 'COMANDO',
  instrumentacao: 'INSTRUMENTAÇÃO',
};
const GROUP_ORDER = ['energia', 'comando', 'instrumentacao'];

/** Retângulo de toque de um controle, em coordenadas lógicas (CSS px). */
interface HitRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Simulator {
  private readonly app = new Application();
  private panel: Container | null = null;
  private nodes = new Map<string, ControlNode>();
  private hitRects: HitRect[] = [];
  private currentDef: EquipmentDefinition | null = null;
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
  /** Notificado ao passar o mouse sobre um controle (tooltip). null = saiu. */
  onHover: ((info: { label: string; hint: string; x: number; y: number } | null) => void) | null =
    null;

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

    // Interação robusta: clique no canvas (DOM) + hit-testing manual.
    this.app.canvas.style.touchAction = 'manipulation';
    this.app.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.app.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
    this.app.canvas.addEventListener('mouseleave', () => this.onHover?.(null));

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
    this.currentDef = def;

    this.interlock = new InterlockEngine(getRuleset(def.meta.id as EquipmentId));

    this.state = new PanelState(def);
    this.state.subscribe((values) => {
      this.applyValues(values);
      this.applyInterlock(values);
      this.onStateChange?.(values);
    });

    for (const control of def.controls) {
      const node = new ControlNode(control, this.accent);
      this.nodes.set(control.id, node);
    }
    this.layout();
  }

  /** Estado atual do painel (para enviar ao assistente). */
  get panelValues(): PanelValues {
    return this.state?.snapshot ?? {};
  }

  /** Clique no canvas → encontra o controle sob o cursor e o aciona. */
  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.app.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Procura de cima para baixo (último desenhado primeiro não importa: sem sobreposição).
    for (const r of this.hitRects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const node = this.nodes.get(r.id);
        if (!node || !node.isInteractive || !node.isEnabled) return;
        const intent: ControlIntent =
          node.control.kind === 'lever'
            ? { kind: 'set', id: r.id, value: cycleLever(node.currentValue) }
            : { kind: 'toggle', id: r.id };
        this.handleIntent(intent);
        return;
      }
    }
  }

  /** Mouse sobre o canvas → tooltip + cursor de ponteiro nos controles. */
  private handleCanvasHover(e: MouseEvent): void {
    const rect = this.app.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const r of this.hitRects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const node = this.nodes.get(r.id);
        if (node?.control.hint) {
          this.app.canvas.style.cursor = node.isInteractive ? 'pointer' : 'default';
          this.onHover?.({
            label: node.control.label,
            hint: node.control.hint,
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
      }
    }
    this.app.canvas.style.cursor = 'default';
    this.onHover?.(null);
  }

  private handleIntent(intent: ControlIntent): void {
    if (!this.state) return;
    const current = this.state.get(intent.id);
    const next = intent.kind === 'toggle' ? (current >= 0.5 ? 0 : 1) : intent.value;

    // Desligar / voltar ao neutro é sempre permitido (segurança).
    // Acionar (ligar / sair do neutro) passa pelo intertravamento.
    const isActivation = Math.abs(next) > Math.abs(current);
    if (
      isActivation &&
      this.interlock &&
      !this.interlock.isAllowed(intent.id, this.state.snapshot)
    ) {
      const blockedBy =
        this.interlock.evaluate(this.state.snapshot).controls[intent.id]?.blockedBy ?? [];
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
    if (!this.panel || !this.currentDef) return;
    const panel = this.panel;
    // Coordenadas lógicas (CSS px) — casam com o clique DOM (getBoundingClientRect).
    const { width, height } = this.app.renderer.screen;

    const CELL_W = 184;
    const CELL_H = 96;
    const COL_GAP = 18;
    const ROW_GAP = 16;
    const PAD = 26;
    const TITLE_H = 30;
    const SECTION_GAP = 26;
    const OUTER = 36;

    const groups = this.groupControls(this.currentDef.controls);
    const portrait = height > width * 1.15;
    const maxCols = portrait ? 2 : 3;

    panel.removeChildren();
    // Posições dos nós no espaço de projeto (antes da escala/translação).
    const placed: Array<{ id: string; nx: number; ny: number }> = [];

    let y = OUTER;
    let designW = 0;

    for (const [group, controls] of groups) {
      const cols = Math.min(maxCols, controls.length);
      const rows = Math.ceil(controls.length / cols);
      const innerW = cols * CELL_W + (cols - 1) * COL_GAP;
      const innerH = rows * CELL_H + (rows - 1) * ROW_GAP;
      const sectionW = innerW + PAD * 2;
      const sectionH = TITLE_H + innerH + PAD * 2;
      designW = Math.max(designW, sectionW + OUTER * 2);

      const frame = new Graphics()
        .roundRect(OUTER, y, sectionW, sectionH, 16)
        .fill({ color: 0x0e141b, alpha: 0.6 })
        .stroke({ width: 1, color: 0x223040 });
      panel.addChild(frame);

      const title = new Text({
        text: GROUP_TITLES[group] ?? group.toUpperCase(),
        style: new TextStyle({
          fill: 0x9fb0c0,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 1.5,
          fontFamily: 'system-ui, sans-serif',
        }),
      });
      title.position.set(OUTER + PAD, y + PAD - 6);
      panel.addChild(title);

      controls.forEach((control, i) => {
        const node = this.nodes.get(control.id);
        if (!node) return;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = OUTER + PAD + col * (CELL_W + COL_GAP) + CELL_W / 2;
        const cy = y + TITLE_H + PAD + row * (CELL_H + ROW_GAP) + CELL_H / 2;
        node.container.position.set(cx, cy);
        panel.addChild(node.container);
        placed.push({ id: control.id, nx: cx, ny: cy });
      });

      y += sectionH + SECTION_GAP;
    }

    const designH = y - SECTION_GAP + OUTER;

    const scale = Math.min(width / designW, height / designH, 1.15);
    const ox = Math.max(0, (width - designW * scale) / 2);
    const oy = Math.max(0, (height - designH * scale) / 2);
    panel.scale.set(scale);
    panel.position.set(ox, oy);

    // Recalcula os retângulos de toque em coordenadas de tela (CSS px).
    const halfW = (NODE_W / 2) * scale;
    const halfH = (NODE_H / 2) * scale;
    this.hitRects = placed.map((p) => ({
      id: p.id,
      x: ox + p.nx * scale - halfW,
      y: oy + p.ny * scale - halfH,
      w: halfW * 2,
      h: halfH * 2,
    }));
  }

  /** Agrupa os controles por `group`, na ordem canônica; sem grupo vai por último. */
  private groupControls(controls: PanelControl[]): Array<[string, PanelControl[]]> {
    const byGroup = new Map<string, PanelControl[]>();
    for (const c of controls) {
      const g = c.group ?? 'outros';
      const arr = byGroup.get(g) ?? [];
      arr.push(c);
      byGroup.set(g, arr);
    }
    const ordered: Array<[string, PanelControl[]]> = [];
    for (const g of GROUP_ORDER) {
      const arr = byGroup.get(g);
      if (arr) {
        ordered.push([g, arr]);
        byGroup.delete(g);
      }
    }
    for (const [g, arr] of byGroup) ordered.push([g, arr]);
    return ordered;
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

function cycleLever(value: number): number {
  // SOLTAR(-1) → NEUTRO(0) → RECOLHER(1) → SOLTAR(-1)...
  return value >= 1 ? -1 : value < 0 ? 0 : 1;
}

/** Converte "#rrggbb" em número hex; usa fallback se inválido. */
function cssColorToHex(css: string, fallback: number): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(css.trim());
  return m ? parseInt(m[1], 16) : fallback;
}
