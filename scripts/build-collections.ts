// Ingestão dos manuais nas Collections da xAI (executar UMA vez, localmente).
//
// Para cada equipamento: cria (ou reutiliza) uma collection e faz upload do PDF
// do manual. A xAI faz parse/OCR/embeddings no servidor — funciona inclusive
// para o manual do KRAAIJVELD, que é um PDF escaneado (sem camada de texto).
//
// Uso (Node 22+ roda .ts diretamente):
//   export XAI_MANAGEMENT_API_KEY="..."   # chave de MANAGEMENT (não a de chat)
//   node --experimental-strip-types scripts/build-collections.ts
//
// Opcional: definir XAI_EMBEDDING_MODEL para fixar o modelo de embedding;
// se não definido, usa o padrão da conta (recomendado).
//
// Ao final, imprime os IDs das collections (e o status do processamento).
// Copie-os para o painel do Netlify:
//   XAI_COLLECTION_KRAAIJVELD=...
//   XAI_COLLECTION_IBERCISA=...

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const MGMT = 'https://management-api.x.ai/v1';

interface ManualSpec {
  key: 'KRAAIJVELD' | 'IBERCISA';
  collectionName: string;
  pdfPath: string;
}

const MANUALS: ManualSpec[] = [
  {
    key: 'KRAAIJVELD',
    collectionName: 'TowAssist — KRAAIJVELD (2500P)',
    pdfPath: 'docs/manuais/kraaijveld/Users Manual - 2500P.pdf',
  },
  {
    key: 'IBERCISA',
    collectionName: 'TowAssist — IBERCISA (Arcimbaldo)',
    pdfPath: 'docs/manuais/ibercisa/MR-MAN-H 70 100-64 - Instruction & Maintenance Book - Arcimbaldo.pdf',
  },
];

function requireKey(): string {
  const k = process.env.XAI_MANAGEMENT_API_KEY;
  if (!k) {
    console.error('Defina XAI_MANAGEMENT_API_KEY (chave de Management, não a de chat).');
    console.error('Crie/gerencie em: https://console.x.ai → API Keys (Management).');
    process.exit(1);
  }
  return k;
}

const auth = (key: string) => ({ Authorization: `Bearer ${key}` });

/** Reutiliza uma collection existente pelo nome, ou retorna null. */
async function findCollection(key: string, name: string): Promise<string | null> {
  const res = await fetch(`${MGMT}/collections`, { headers: auth(key) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    collections?: Array<{ collection_id?: string; id?: string; collection_name?: string; name?: string }>;
  };
  const found = (data.collections ?? []).find(
    (c) => (c.collection_name ?? c.name) === name,
  );
  return found?.collection_id ?? found?.id ?? null;
}

async function createCollection(key: string, name: string): Promise<string> {
  // Por padrão envia só o nome (a xAI usa o modelo de embedding padrão).
  // Só inclui index_configuration se XAI_EMBEDDING_MODEL for definido.
  const body: Record<string, unknown> = { collection_name: name };
  const model = process.env.XAI_EMBEDDING_MODEL;
  if (model) body.index_configuration = { model_name: model };

  const res = await fetch(`${MGMT}/collections`, {
    method: 'POST',
    headers: { ...auth(key), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createCollection ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { collection_id?: string; id?: string };
  const id = data.collection_id ?? data.id;
  if (!id) throw new Error(`Resposta sem collection_id: ${JSON.stringify(data)}`);
  return id;
}

async function uploadDocument(key: string, collectionId: string, pdfPath: string): Promise<void> {
  const bytes = await readFile(pdfPath);
  const form = new FormData();
  const name = basename(pdfPath);
  form.append('name', name);
  form.append('content_type', 'application/pdf');
  form.append('data', new Blob([bytes], { type: 'application/pdf' }), name);

  const res = await fetch(`${MGMT}/collections/${collectionId}/documents`, {
    method: 'POST',
    headers: auth(key),
    body: form,
  });
  if (!res.ok) throw new Error(`uploadDocument ${res.status}: ${await res.text()}`);
}

/** Lê o status de processamento dos documentos da collection. */
async function documentsStatus(key: string, collectionId: string): Promise<string> {
  const res = await fetch(`${MGMT}/collections/${collectionId}/documents`, { headers: auth(key) });
  if (!res.ok) return `desconhecido (${res.status})`;
  const data = (await res.json()) as {
    documents?: Array<{ processing_status?: string; name?: string }>;
  };
  const docs = data.documents ?? [];
  if (docs.length === 0) return 'sem documentos';
  return docs.map((d) => `${d.name ?? '?'}: ${d.processing_status ?? '?'}`).join('; ');
}

async function main(): Promise<void> {
  const key = requireKey();
  const results: Partial<Record<ManualSpec['key'], string>> = {};
  let failures = 0;

  for (const m of MANUALS) {
    try {
      process.stdout.write(`\n[${m.key}] localizando/criando collection… `);
      let id = await findCollection(key, m.collectionName);
      if (id) {
        console.log(`reutilizando (${id})`);
      } else {
        id = await createCollection(key, m.collectionName);
        console.log(`criada (${id})`);
      }

      process.stdout.write(`[${m.key}] enviando ${basename(m.pdfPath)}… `);
      await uploadDocument(key, id, m.pdfPath);
      console.log('upload ok');

      const status = await documentsStatus(key, id);
      console.log(`[${m.key}] status: ${status}`);
      results[m.key] = id;
    } catch (err) {
      failures++;
      console.error(`\n[${m.key}] FALHOU: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\n=== Configure no painel do Netlify (Environment variables) ===');
  console.log(`XAI_COLLECTION_KRAAIJVELD=${results.KRAAIJVELD ?? ''}`);
  console.log(`XAI_COLLECTION_IBERCISA=${results.IBERCISA ?? ''}`);
  console.log(
    '\nO parse/OCR/embeddings roda no servidor da xAI (assíncrono). Reexecute este ' +
      'script para reconferir o status; aguarde "complete" antes de esperar respostas com citações.',
  );
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\nFalha na ingestão:', err instanceof Error ? err.message : err);
  process.exit(1);
});
