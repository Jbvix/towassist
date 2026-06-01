// GET /api/voice-check — diagnóstico da Realtime Voice.
// Tenta cunhar um token efêmero e relata o resultado de forma legível,
// sem expor a XAI_API_KEY. Útil para validar se a chave tem o endpoint Voice.

import { mintRealtimeToken, JSON_HEADERS } from './lib/grok.ts';

export default async function handler(): Promise<Response> {
  const configured = Boolean(process.env.XAI_API_KEY);
  if (!configured) {
    return json({ ok: false, step: 'env', detail: 'XAI_API_KEY não configurada.' }, 200);
  }

  try {
    const token = await mintRealtimeToken(60);
    return json(
      {
        ok: true,
        step: 'mint',
        tokenPrefix: token.value.slice(0, 8) + '…',
        expires_at: token.expires_at,
        detail: 'Token de voz cunhado com sucesso — a Realtime Voice está acessível.',
      },
      200,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Erro desconhecido.';
    return json({ ok: false, step: 'mint', detail }, 200);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });
}
