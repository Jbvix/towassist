// GET /api/health — verificação simples de saúde do BFF e da config.

import { JSON_HEADERS } from './lib/grok.ts';

export default async function handler(): Promise<Response> {
  const configured = Boolean(process.env.XAI_API_KEY);
  return new Response(
    JSON.stringify({ ok: true, xaiConfigured: configured, ts: Date.now() }),
    { status: 200, headers: JSON_HEADERS },
  );
}
