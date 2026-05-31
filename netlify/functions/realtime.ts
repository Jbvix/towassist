// POST /api/realtime — cunha um token efêmero para a xAI Realtime Voice.
// O navegador usa o token como subprotocol (xai-client-secret.<token>);
// a XAI_API_KEY nunca sai do servidor.

import type { RealtimeTokenResponse } from '../../shared/types/api.ts';
import { mintRealtimeToken, JSON_HEADERS } from './lib/grok.ts';
import { collectionIdFor } from './lib/rag.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  try {
    const token = await mintRealtimeToken(300);
    const collections: Record<string, string> = {};
    const k = collectionIdFor('kraaijveld');
    const i = collectionIdFor('ibercisa');
    if (k) collections.kraaijveld = k;
    if (i) collections.ibercisa = i;

    const payload: RealtimeTokenResponse = {
      value: token.value,
      expires_at: token.expires_at,
      collections,
    };
    return json(payload, 200);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Erro desconhecido.';
    return json({ error: detail }, 502);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
