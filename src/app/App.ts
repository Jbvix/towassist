// Monta a aplicação: cabeçalho + alternador de telas, painel de simulação e chat.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getEquipment } from '@/data/index.ts';
import { ScreenManager } from '@/app/ScreenManager.ts';
import { PanelStore } from '@/app/PanelStore.ts';
import { ScreenSwitcher } from '@/ui/ScreenSwitcher.ts';
import { SimPanel } from '@/ui/SimPanel.ts';
import { ChatBox } from '@/ui/ChatBox.ts';

export class App {
  private readonly screens = new ScreenManager();
  private readonly panelStore = new PanelStore();
  private readonly simPanel: SimPanel;
  private chat: ChatBox | null = null;

  constructor(private readonly root: HTMLElement) {
    this.simPanel = new SimPanel(this.screens, this.panelStore);
    this.build();
    // Aplica o tema da tela ativa na raiz (cor de acento).
    this.screens.subscribe((active) => this.applyTheme(active));
    // Libera microfone/WebSocket ao sair da página.
    window.addEventListener('beforeunload', () => this.destroy());
  }

  destroy(): void {
    this.chat?.destroy();
    this.simPanel.destroy();
  }

  async start(): Promise<void> {
    await this.simPanel.start();
  }

  private build(): void {
    // Cabeçalho
    const header = document.createElement('header');
    header.className = 'app-header';

    const title = document.createElement('div');
    title.className = 'app-title';
    title.innerHTML =
      '<h1 class="app-title__name">TowAssist</h1><span>Guinchos de Manobra · KRATOS</span>';

    const switcher = new ScreenSwitcher(this.screens);
    header.append(title, switcher.el);

    // Corpo: simulação + chat
    const body = document.createElement('main');
    body.className = 'app-body';
    this.chat = new ChatBox(this.screens, this.panelStore);
    body.append(this.simPanel.el, this.chat.el);

    this.root.append(header, body);
  }

  private applyTheme(active: EquipmentId): void {
    const def = getEquipment(active);
    this.root.style.setProperty('--accent', def.meta.accent);
  }
}
