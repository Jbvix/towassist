// Tipos mínimos dos eventos da xAI Realtime Voice usados pelo cliente.
// Referência completa: docs/03-AGENTE-VOZ-KRATOS.md (§6) e docs.x.ai.

export interface RealtimeServerEvent {
  type: string;
  // Campos variam por tipo; tratados de forma defensiva no cliente.
  delta?: string;
  transcript?: string;
  session?: { id?: string; model?: string };
  response?: { id?: string };
  usage?: { total_tokens?: number };
  code?: string;
  message?: string;
}
