// Integração com a API do xAI Grok (chat, compatível com OpenAI) e com a
// Realtime Voice (cunhagem de token efêmero). A XAI_API_KEY só existe aqui,
// no servidor — nunca é enviada ao navegador.

const XAI_BASE = 'https://api.x.ai/v1';

export interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Lê a chave do ambiente do Netlify ou lança erro claro. */
export function requireApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error('XAI_API_KEY não configurada nas variáveis de ambiente do Netlify.');
  }
  return key;
}

/** Chama o chat do Grok e devolve o texto da resposta. */
export async function grokChat(messages: GrokChatMessage[]): Promise<string> {
  const apiKey = requireApiKey();
  // Modelo configurável no painel do Netlify (XAI_MODEL). Default atual;
  // 'grok-beta' foi descontinuado pela xAI.
  const model = process.env.XAI_MODEL || 'grok-2-latest';

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`xAI Grok respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

/** Cunha um token efêmero para a Realtime Voice API. */
export async function mintRealtimeToken(
  expiresInSeconds = 300,
): Promise<{ value: string; expires_at: number }> {
  const apiKey = requireApiKey();

  const res = await fetch(`${XAI_BASE}/realtime/client_secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expires_after: { seconds: expiresInSeconds } }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`xAI Realtime respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }

  return (await res.json()) as { value: string; expires_at: number };
}

/** Cabeçalhos JSON padrão das respostas. */
export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
