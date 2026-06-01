// Painel de simulação: cabeçalho com metadados do equipamento + canvas PixiJS.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';
import type { PanelStore } from '@/app/PanelStore.ts';
import { Simulator } from '@/sim/Simulator.ts';
import { InterlockPanel } from '@/ui/InterlockPanel.ts';

type SimTab = 'energia' | 'operacao' | 'intertravamento';

export class SimPanel {
  readonly el: HTMLElement;
  private readonly metaEl: HTMLDivElement;
  private readonly tabsEl: HTMLDivElement;
  private readonly canvasHost: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private readonly tooltipEl: HTMLDivElement;
  private readonly guideEl: HTMLDivElement;
  private readonly stageEl: HTMLDivElement;
  private readonly sim = new Simulator();
  private readonly interlockPanel = new InterlockPanel();
  private readonly tabButtons = new Map<SimTab, HTMLButtonElement>();
  private activeTab: SimTab = 'energia';
  /** Resumo do intertravamento, mostrado no rótulo da aba. */
  private interlockSummary = '';
  private ready = false;
  private toastTimer: number | null = null;

  constructor(
    private readonly screens: ScreenManager,
    private readonly panelStore: PanelStore,
  ) {
    this.el = document.createElement('section');
    this.el.className = 'sim-panel';

    this.metaEl = document.createElement('div');
    this.metaEl.className = 'sim-panel__meta';

    // Abas: Energia · Operação · Intertravamento.
    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'sim-tabs';
    this.tabsEl.setAttribute('role', 'tablist');
    const tabDefs: Array<[SimTab, string]> = [
      ['energia', '1 · Energia'],
      ['operacao', '2 · Operação'],
      ['intertravamento', '3 · Intertravamento'],
    ];
    for (const [tab, label] of tabDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sim-tabs__btn';
      btn.setAttribute('role', 'tab');
      btn.textContent = label;
      btn.addEventListener('click', () => this.setTab(tab));
      this.tabButtons.set(tab, btn);
      this.tabsEl.appendChild(btn);
    }

    this.canvasHost = document.createElement('div');
    this.canvasHost.className = 'sim-panel__canvas';

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'sim-panel__toast';
    this.toastEl.hidden = true;

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'sim-panel__tooltip';
    this.tooltipEl.hidden = true;

    this.guideEl = document.createElement('div');
    this.guideEl.className = 'sim-panel__guide';
    this.guideEl.hidden = true;

    // Overlays transitórios que ficam SOBRE o canvas (toast, tooltip).
    this.canvasHost.append(this.toastEl, this.tooltipEl);

    // Stage: alterna entre o canvas (abas 1 e 2) e o intertravamento (aba 3).
    this.stageEl = document.createElement('div');
    this.stageEl.className = 'sim-panel__stage';
    this.stageEl.append(this.canvasHost, this.interlockPanel.el);

    // Ordem em fluxo: meta → abas → guia → stage.
    this.el.append(this.metaEl, this.tabsEl, this.guideEl, this.stageEl);

    // Repassa o estado do painel ao store (consumido pelo chat do KRATOS)
    // e destaca visualmente quando o sistema fica "Pronto p/ Operar".
    this.sim.onStateChange = (values) => {
      this.panelStore.update(values);
      const ready = (values['status_ready'] ?? 0) >= 0.5;
      this.el.classList.toggle('sim-panel--ready', ready);
    };
    // Atualiza o painel de intertravamento e o resumo na aba.
    this.sim.onInterlock = (evaluation) => {
      this.interlockPanel.update(evaluation);
      const controls = Object.values(evaluation.controls);
      const ok = controls.filter((c) => c.allowed).length;
      const blocked = controls.length - ok;
      this.interlockSummary = blocked > 0 ? `${blocked}!` : '✓';
      this.refreshTabLabels();
    };
    // Mostra o motivo quando um comando é bloqueado.
    this.sim.onBlocked = (_id, label, reasons) => this.showBlockedToast(label, reasons);
    // Tooltip ao passar o mouse sobre um controle.
    this.sim.onHover = (info) => this.showTooltip(info);
    // Partida assistida: mostra o próximo passo.
    this.sim.onStartup = (result) => {
      if (!result.next) {
        this.guideEl.innerHTML =
          '<span class="sim-panel__guide-badge">✓</span>' +
          '<span>Sequência de partida concluída — sistema operacional.</span>';
        this.guideEl.classList.add('sim-panel__guide--done');
      } else {
        const passo = result.index > 0 ? `Passo ${result.index}/${result.total} · ` : '';
        this.guideEl.classList.remove('sim-panel__guide--done');
        this.guideEl.innerHTML =
          '<span class="sim-panel__guide-badge">KRATOS</span>' +
          `<span>${passo}${result.next.instruction}</span>`;
      }
      this.guideEl.hidden = false;
    };

    this.applyTab();
  }

  /** Troca a aba ativa e atualiza a simulação/visibilidade. */
  setTab(tab: SimTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.applyTab();
  }

  private applyTab(): void {
    const tab = this.activeTab;
    // Botões.
    for (const [t, btn] of this.tabButtons) {
      btn.setAttribute('aria-selected', String(t === tab));
      btn.classList.toggle('sim-tabs__btn--active', t === tab);
    }
    // Conteúdo: canvas (energia/operação) vs. lista de intertravamento.
    const showCanvas = tab === 'energia' || tab === 'operacao';
    this.canvasHost.style.display = showCanvas ? '' : 'none';
    this.interlockPanel.el.style.display = tab === 'intertravamento' ? '' : 'none';
    this.guideEl.style.display = showCanvas ? '' : 'none';
    this.el.classList.toggle('sim-panel--interlock', tab === 'intertravamento');

    if (showCanvas) this.sim.setTab(tab);
    this.refreshTabLabels();
  }

  private refreshTabLabels(): void {
    const interBtn = this.tabButtons.get('intertravamento');
    if (interBtn && this.interlockSummary) {
      interBtn.innerHTML = `3 · Intertravamento <span class="sim-tabs__badge">${this.interlockSummary}</span>`;
    }
  }

  private showTooltip(
    info: { label: string; hint: string; x: number; y: number } | null,
  ): void {
    if (!info) {
      this.tooltipEl.hidden = true;
      return;
    }
    this.tooltipEl.innerHTML = `<strong>${info.label}</strong><span>${info.hint}</span>`;
    const host = this.canvasHost.getBoundingClientRect();
    // Posiciona próximo ao cursor, dentro do host.
    const x = info.x - host.left + 14;
    const y = info.y - host.top + 14;
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.hidden = false;
  }

  /** Inicializa o PixiJS e passa a reagir à troca de telas. */
  async start(): Promise<void> {
    await this.sim.init(this.canvasHost);
    this.ready = true;
    this.screens.subscribe((active) => this.render(active));
  }

  private render(active: EquipmentId): void {
    const def = getEquipment(active);
    this.el.style.setProperty('--accent', def.meta.accent);

    this.metaEl.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = 'sim-panel__dot';
    const label = document.createElement('span');
    label.textContent = `${def.meta.name} · ${def.meta.model} — painel de comando (simulação)`;
    this.metaEl.append(dot, label);

    // Rótulos legíveis para o painel de intertravamento.
    const labels: Record<string, string> = {};
    for (const c of def.controls) labels[c.id] = c.label;
    this.interlockPanel.setLabels(labels);

    if (this.ready) this.sim.render(def);
  }

  private showBlockedToast(label: string, reasons: string[]): void {
    const why = reasons.length ? ` Falta: ${reasons.join('; ')}.` : '';
    this.toastEl.textContent = `🔒 "${label}" bloqueado pelo intertravamento.${why}`;
    this.toastEl.hidden = false;
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.hidden = true;
    }, 4000);
  }

  destroy(): void {
    this.sim.destroy();
  }
}
