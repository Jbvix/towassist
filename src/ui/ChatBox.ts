// Caixa de chat do KRATOS: texto + (placeholder de) voz.
// No Sprint 2 a UI é funcional, mas as respostas são simuladas localmente —
// a integração real com xAI Grok / Realtime Voice entra no Sprint 3.

import type { EquipmentId } from '@shared/types/equipment.ts';
import { getEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';

type Role = 'user' | 'assistant' | 'system';

export class ChatBox {
  readonly el: HTMLElement;
  private readonly messagesEl: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly micBtn: HTMLButtonElement;

  constructor(private readonly screens: ScreenManager) {
    this.el = document.createElement('section');
    this.el.className = 'chat';

    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'chat__header';
    header.innerHTML = `
      <div class="chat__avatar" aria-hidden="true">K</div>
      <div>
        <div class="chat__title">KRATOS</div>
        <div class="chat__subtitle">Chefe de Máquinas — assistente de operação</div>
      </div>`;

    // Mensagens
    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'chat__messages';

    // Composer
    const composer = document.createElement('form');
    composer.className = 'chat__composer';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Pergunte ao KRATOS…';
    this.input.setAttribute('aria-label', 'Mensagem para o KRATOS');

    const sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.className = 'chat__btn';
    sendBtn.textContent = 'Enviar';

    this.micBtn = document.createElement('button');
    this.micBtn.type = 'button';
    this.micBtn.className = 'chat__btn chat__btn--mic';
    this.micBtn.textContent = '🎙️';
    this.micBtn.setAttribute('aria-label', 'Falar com o KRATOS (em breve)');
    this.micBtn.setAttribute('aria-pressed', 'false');
    this.micBtn.title = 'Voz via xAI Realtime — disponível no Sprint 3';

    composer.append(this.input, sendBtn, this.micBtn);
    this.el.append(header, this.messagesEl, composer);

    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });
    this.micBtn.addEventListener('click', () => this.handleMicPlaceholder());

    // Mensagem de boas-vindas e reação à troca de tela
    this.screens.subscribe((active) => this.announceScreen(active));
  }

  private handleSend(): void {
    const text = this.input.value.trim();
    if (!text) return;
    this.addMessage('user', text);
    this.input.value = '';

    // Placeholder de resposta (Sprint 3 fará a chamada real ao BFF).
    const eq = getEquipment(this.screens.current);
    window.setTimeout(() => {
      this.addMessage(
        'assistant',
        `Recebido. Estamos no painel do ${eq.meta.name}. A resposta com base no ` +
          `manual será fornecida quando a integração com o xAI Grok estiver ativa (Sprint 3).`,
      );
    }, 350);
  }

  private handleMicPlaceholder(): void {
    this.addMessage(
      'system',
      'A conversa por voz (xAI Realtime Voice) será habilitada no Sprint 3.',
    );
  }

  private announceScreen(active: EquipmentId): void {
    const eq = getEquipment(active);
    this.addMessage('system', `Tela ativa: ${eq.meta.name} — ${eq.meta.model}.`);
  }

  private addMessage(role: Role, text: string): void {
    const msg = document.createElement('div');
    msg.className = `msg msg--${role}`;

    const roleEl = document.createElement('div');
    roleEl.className = 'msg__role';
    roleEl.textContent =
      role === 'user' ? 'Você' : role === 'assistant' ? 'KRATOS' : 'Sistema';

    const textEl = document.createElement('div');
    textEl.className = 'msg__text';
    textEl.textContent = text;

    msg.append(roleEl, textEl);
    this.messagesEl.appendChild(msg);
    this.messagesEl.scrollTo({ top: this.messagesEl.scrollHeight, behavior: 'smooth' });
  }
}
