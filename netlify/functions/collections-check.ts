// GET /api/collections-check — diagnóstico do RAG (Collections da xAI).
// Relata se os IDs de collection estão configurados e se a busca responde,
// sem expor a XAI_API_KEY. Útil para validar a ativação do RAG.

import { collectionIdFor } from './lib/rag.ts';
import { requireApiKey, JSON_HEADERS } from './lib/grok.ts';

const SEARCH_URL = 'https://api.x.ai/v1/documents/search';

async function probe(collectionId: string): Promise<{ ok: boolean; detail: string }> {
  // Query realista (termos típicos dos manuais) em vez de "teste".
  const query = 'freio tambor pressão hidráulica operação guincho';
  let res: Response;
  try {
    res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${requireApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, source: { collection_ids: [collectionId] }, limit: 5 }),
    });
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'rede' };
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { ok: false, detail: `busca respondeu ${res.status}: ${t.slice(0, 160)}` };
  }
  const data = (await res.json().catch(() => null)) as
    | { results?: Array<{ content?: string; text?: string }>; chunks?: Array<{ content?: string; text?: string }> }
    | null;
  const items = data?.results ?? data?.chunks ?? [];
  const sample = (items[0]?.content ?? items[0]?.text ?? '').slice(0, 120);
  return {
    ok: true,
    detail:
      `busca ok — ${items.length} trecho(s)` + (sample ? ` · amostra: "${sample}…"` : ' (vazio)'),
  };
}

export default async function handler(): Promise<Response> {
  const k = collectionIdFor('kraaijveld');
  const i = collectionIdFor('ibercisa');

  const result: Record<string, unknown> = {
    configured: { kraaijveld: Boolean(k), ibercisa: Boolean(i) },
  };

  if (process.env.XAI_API_KEY) {
    if (k) result.kraaijveld = await probe(k);
    if (i) result.ibercisa = await probe(i);
  } else {
    result.note = 'XAI_API_KEY não configurada.';
  }

  if (!k && !i) {
    result.hint =
      'Nenhuma collection configurada. Rode scripts/build-collections.ts e defina ' +
      'XAI_COLLECTION_KRAAIJVELD / XAI_COLLECTION_IBERCISA no Netlify.';
  }

  return new Response(JSON.stringify(result, null, 2), { status: 200, headers: JSON_HEADERS });
}
