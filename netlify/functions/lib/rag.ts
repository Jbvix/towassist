// RAG sobre os manuais via xAI Collections.
// A busca usa a XAI_API_KEY normal em POST /v1/documents/search.
// Os IDs das collections (um por equipamento) vêm das variáveis de ambiente,
// preenchidas após a ingestão (scripts/build-collections.ts).
//
// Degrada com elegância: se a collection do equipamento não estiver configurada,
// devolve string vazia e o KRATOS responde sem citações de manual.

import type { EquipmentId } from '../../../shared/types/equipment.ts';
import { requireApiKey } from './grok.ts';

const SEARCH_URL = 'https://api.x.ai/v1/documents/search';

/** ID da collection de cada equipamento (configurado no painel do Netlify). */
export function collectionIdFor(equipment: EquipmentId): string | null {
  const map: Record<EquipmentId, string | undefined> = {
    kraaijveld: process.env.XAI_COLLECTION_KRAAIJVELD,
    ibercisa: process.env.XAI_COLLECTION_IBERCISA,
  };
  return map[equipment] ?? null;
}

interface SearchChunk {
  content?: string;
  text?: string;
  chunk_content?: string;
  chunk?: { content?: string; text?: string };
  score?: number;
}

/** Extrai o texto de um trecho, tolerando variações do payload da xAI. */
function chunkText(c: SearchChunk): string {
  return (
    c.content ??
    c.text ??
    c.chunk_content ??
    c.chunk?.content ??
    c.chunk?.text ??
    ''
  ).trim();
}

/**
 * Busca trechos relevantes do manual do equipamento.
 * Retorna um bloco de contexto pronto para o prompt (ou '' se indisponível).
 */
export async function retrieveManualContext(
  equipment: EquipmentId,
  query: string,
  limit = 6,
): Promise<string> {
  const collectionId = collectionIdFor(equipment);
  if (!collectionId) return '';

  const apiKey = requireApiKey();
  let res: Response;
  try {
    res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        source: { collection_ids: [collectionId] },
        limit,
      }),
    });
  } catch {
    return ''; // rede indisponível: segue sem RAG
  }

  if (!res.ok) return '';

  const data = (await res.json().catch(() => null)) as
    | { results?: SearchChunk[]; chunks?: SearchChunk[]; data?: SearchChunk[] }
    | null;
  const chunks = data?.results ?? data?.chunks ?? data?.data ?? [];
  const snippets = chunks
    .map(chunkText)
    .filter(Boolean)
    .slice(0, limit);

  if (snippets.length === 0) return '';

  return (
    'TRECHOS DO MANUAL DO EQUIPAMENTO (fonte oficial — baseie a resposta nestes ' +
    'trechos e, ao usá-los, sinalize com "📖 (manual)"):\n' +
    snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')
  );
}
