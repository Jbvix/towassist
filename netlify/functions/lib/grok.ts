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

/**
 * Chama o Grok via Responses API (/v1/responses) e devolve o texto.
 * O modelo é configurável (XAI_MODEL); default conforme a conta do cliente.
 */
export async function grokChat(messages: GrokChatMessage[]): Promise<string> {
  const apiKey = requireApiKey();
  const model = process.env.XAI_MODEL || 'grok-4.20-0309-non-reasoning';

  // Responses API: 'instructions' = system; 'input' = mensagens do usuário.
  const instructions = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const input = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body = JSON.stringify({
    model,
    instructions: instructions || undefined,
    input,
  });

  // Em caso de 429 (capacidade/limite) ou 5xx, tenta novamente com backoff.
  const MAX_TRIES = 3;
  let res!: Response;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    res = await fetch(`${XAI_BASE}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (res.ok) break;
    if (res.status !== 429 && res.status < 500) break; // erro não-transitório
    if (attempt === MAX_TRIES - 1) break;

    // Respeita Retry-After se enviado; senão backoff 1s, 2s.
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        'O assistente está com alta demanda no momento (limite da API atingido). ' +
          'Aguarde alguns instantes e tente novamente.',
      );
    }
    const detail = await res.text().catch(() => '');
    throw new Error(`xAI Grok respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as ResponsesPayload;
  return extractResponseText(data);
}

/** Forma (parcial) da resposta da Responses API da xAI. */
interface ResponsesPayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

/** Extrai o texto da resposta, tolerando as variações do payload. */
function extractResponseText(data: ResponsesPayload): string {
  // Atalho fornecido por alguns SDKs/respostas.
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  // Caminho geral: concatena os textos dos itens de mensagem.
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    for (const c of item.content ?? []) {
      if (typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('').trim();
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
