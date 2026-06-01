// Engine de simulação 2D (PixiJS). Sprint 4: painel interativo.
// Desenha os controles a partir dos dados, aceita interação do usuário,
// mantém o PanelState e anima os mostradores via ticker.

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EquipmentDefinition, EquipmentId, PanelControl } from '@shared/types/equipment.ts';
import { PanelState, type PanelValues } from '@/sim/state.ts';
import { ControlNode, type ControlIntent } from '@/sim/components/ControlNode.ts';
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

export class Simulator {
  private readonly app = new Application();
  private panel: Container | null = null;
  private nodes = new Map<string, ControlNode>();
  private currentDef: EquipmentDefinition | null = null;
  private state: PanelState | null = null;
  private interlock: InterlockEngine | null = null;
  private accent = 0x2f9e8f;
  private resizeObserver: ResizeObserver | null = null;
  private initialized = false;
  private lastTime = 0;
  /** Anti-duplicação: ignora acionamentos repetidos do mesmo controle em poucos ms. */
  private lastIntentAt = new Map<string, number>();
  /** Diagnóstico: identifica esta instância e quantas vezes renderizou. */
  private readonly instanceId = ++Simulator.instances;
  private renderCount = 0;
  private static instances = 0;

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

    // Habilita o sistema de eventos a partir do stage (sem isto, no PixiJS v8
    // o hit-testing não começa e os controles não recebem clique).
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(host);

    this.lastTime = performance.now();
    this.app.ticker.add(() => this.update());
  }

  /** Carrega/desenha o painel de um equipamento e (re)cria o estado. */
  render(def: EquipmentDefinition): void {
    if (!this.initialized) return;
    console.debug(
      `[TowAssist] Simulator#${this.instanceId} render #${++this.renderCount} (${def.meta.id})`,
    );
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
      const node = new ControlNode(control, this.accent, (intent) => this.handleIntent(intent));
      this.nodes.set(control.id, node);
    }
    this.layout();
  }

  /** Estado atual do painel (para enviar ao assistente). */
  get panelValues(): PanelValues {
    return this.state?.snapshot ?? {};
  }

  private handleIntent(intent: ControlIntent): void {
    if (!this.state) return;

    // Guard anti-duplicação: alguns ambientes (touch/trackpad) entregam o
    // evento de ponteiro duas vezes, o que faria ligar e desligar no mesmo
    // instante. Ignora um segundo acionamento do mesmo controle em < 280 ms.
    const now = performance.now();
    const last = this.lastIntentAt.get(intent.id) ?? 0;
    const dt = now - last;
    if (dt < 280) {
      console.debug('[TowAssist] intent IGNORADO (duplo)', intent.id, 'dt=', Math.round(dt), 'ms');
      return;
    }
    this.lastIntentAt.set(intent.id, now);

    const current = this.state.get(intent.id);
    const next =
      intent.kind === 'toggle' ? (current >= 0.5 ? 0 : 1) : intent.value;
    console.debug(
      `[TowAssist] intent ${intent.id}: ${current} -> ${next}  (sim#${this.instanceId})`,
    );

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
    if (!this.panel || !this.currentDef) return;
    const panel = this.panel;
    const { width, height } = this.app.renderer;

    // --- Geometria de projeto (virtual), escalada para caber na tela ---
    const CELL_W = 184; // largura do controle + respiro
    const CELL_H = 96;
    const COL_GAP = 18;
    const ROW_GAP = 16;
    const PAD = 26; // padding interno da seção
    const TITLE_H = 30;
    const SECTION_GAP = 26;
    const OUTER = 36;

    // Agrupa os controles preservando a ordem dos dados.
    const groups = this.groupControls(this.currentDef.controls);

    // Número de colunas por seção: adapta ao formato da viewport.
    const portrait = height > width * 1.15;
    const maxCols = portrait ? 2 : 3;

    // Limpa qualquer decoração anterior e re-popula (frames + títulos + nós).
    panel.removeChildren();

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

      // Moldura da seção.
      const frame = new Graphics()
        .roundRect(OUTER, y, sectionW, sectionH, 16)
        .fill({ color: 0x0e141b, alpha: 0.6 })
        .stroke({ width: 1, color: 0x223040 });
      panel.addChild(frame);

      // Título da seção.
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

      // Controles em grade dentro da seção.
      controls.forEach((control, i) => {
        const node = this.nodes.get(control.id);
        if (!node) return;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = OUTER + PAD + col * (CELL_W + COL_GAP) + CELL_W / 2;
        const cy = y + TITLE_H + PAD + row * (CELL_H + ROW_GAP) + CELL_H / 2;
        node.container.position.set(cx, cy);
        panel.addChild(node.container);
      });

      y += sectionH + SECTION_GAP;
    }

    const designH = y - SECTION_GAP + OUTER;

    // Escala "contain": cabe tudo, mantém proporção; centraliza.
    const scale = Math.min(width / designW, height / designH, 1.15);
    panel.scale.set(scale);
    panel.position.set(
      Math.max(0, (width - designW * scale) / 2),
      Math.max(0, (height - designH * scale) / 2),
    );
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

/** Converte "#rrggbb" em número hex; usa fallback se inválido. */
function cssColorToHex(css: string, fallback: number): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(css.trim());
  return m ? parseInt(m[1], 16) : fallback;
}
