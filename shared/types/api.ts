// Contrato das rotas do BFF (Netlify Functions). Implementação no Sprint 3.

import type { EquipmentId } from './equipment.ts';

/** Contexto da tela ativa enviado ao assistente KRATOS. */
export interface ScreenContext {
  equipment: EquipmentId;
  /** Estado resumido do painel/interlock (preenchido a partir do Sprint 4/5). */
  panelState?: Record<string, string | number | boolean>;
}

/** POST /api/chat — pergunta por texto ao KRATOS (xAI Grok). */
export interface ChatRequest {
  message: string;
  context: ScreenContext;
}

export interface ChatResponse {
  reply: string;
}

/** POST /api/realtime — cunha um token efêmero de voz (xAI Realtime). */
export interface RealtimeTokenResponse {
  value: string;
  expires_at: number;
}
