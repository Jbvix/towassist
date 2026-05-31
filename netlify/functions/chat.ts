// POST /api/chat — pergunta por texto ao KRATOS (xAI Grok).
// Body: { message: string, context: { equipment, panelState? } }
// Resposta: { reply: string }

import type { ChatRequest, ChatResponse } from '../../shared/types/api.ts';
import { buildKratosInstructions } from '../../shared/prompts/kratos.pt.ts';
import { grokChat, JSON_HEADERS } from './lib/grok.ts';
import { retrieveManualContext } from './lib/rag.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const message = body?.message?.trim();
  const equipment = body?.context?.equipment;
  if (!message || !equipment) {
    return json({ error: 'Campos "message" e "context.equipment" são obrigatórios.' }, 400);
  }

  const system = buildKratosInstructions(equipment);
  const panelState = body.context.panelState;
  const stateNote = panelState
    ? `\nEstado atual do painel (${equipment}): ${JSON.stringify(panelState)}.`
    : '';

  // RAG: recupera trechos do manual do equipamento (vazio se não configurado).
  const manualContext = await retrieveManualContext(equipment, message);
  const ragNote = manualContext ? `\n\n${manualContext}` : '';

  try {
    const reply = await grokChat([
      { role: 'system', content: system + stateNote + ragNote },
      { role: 'user', content: message },
    ]);
    const payload: ChatResponse = { reply };
    return json(payload, 200);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Erro desconhecido.';
    return json({ error: detail }, 502);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
