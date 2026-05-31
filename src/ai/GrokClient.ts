// Cliente de chat por texto: fala com a Netlify Function /api/chat.

import type { ChatResponse, ScreenContext } from '@shared/types/api.ts';

export async function sendChat(
  message: string,
  context: ScreenContext,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Falha ${res.status} ao consultar o KRATOS.`);
  }

  const data = (await res.json()) as ChatResponse;
  return data.reply;
}
