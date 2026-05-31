// Ingestão dos manuais nas Collections da xAI (executar UMA vez, localmente).
//
// Para cada equipamento: cria uma collection e faz upload do PDF do manual.
// A xAI faz o parse/OCR/embeddings no servidor — funciona inclusive para o
// manual do KRAAIJVELD, que é um PDF escaneado (sem camada de texto).
//
// Uso:
//   export XAI_MANAGEMENT_API_KEY="..."   # chave de MANAGEMENT (não a de chat)
//   node --experimental-strip-types scripts/build-collections.ts
//   # (Node 22+: roda .ts diretamente)
//
// Ao final, imprime os IDs das collections. Copie-os para o painel do Netlify:
//   XAI_COLLECTION_KRAAIJVELD=...
//   XAI_COLLECTION_IBERCISA=...

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const MGMT = 'https://management-api.x.ai/v1';

interface ManualSpec {
  equipment: string;
  collectionName: string;
  pdfPath: string;
}

const MANUALS: ManualSpec[] = [
  {
    equipment: 'KRAAIJVELD',
    collectionName: 'TowAssist — KRAAIJVELD (2500P)',
    pdfPath: 'docs/manuais/kraaijveld/Users Manual - 2500P.pdf',
  },
  {
    equipment: 'IBERCISA',
    collectionName: 'TowAssist — IBERCISA (Arcimbaldo)',
    pdfPath: 'docs/manuais/ibercisa/MR-MAN-H 70 100-64 - Instruction & Maintenance Book - Arcimbaldo.pdf',
  },
];

function requireKey(): string {
  const k = process.env.XAI_MANAGEMENT_API_KEY;
  if (!k) {
    console.error('Defina XAI_MANAGEMENT_API_KEY (chave de Management, não a de chat).');
    process.exit(1);
  }
  return k;
}

async function createCollection(key: string, name: string): Promise<string> {
  const res = await fetch(`${MGMT}/collections`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection_name: name,
      index_configuration: { model_name: 'grok-embedding-small' },
    }),
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
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`uploadDocument ${res.status}: ${await res.text()}`);
}

async function main(): Promise<void> {
  const key = requireKey();
  const results: Record<string, string> = {};

  for (const m of MANUALS) {
    process.stdout.write(`\n[${m.equipment}] criando collection… `);
    const id = await createCollection(key, m.collectionName);
    console.log(`ok (${id})`);
    process.stdout.write(`[${m.equipment}] enviando ${basename(m.pdfPath)}… `);
    await uploadDocument(key, id, m.pdfPath);
    console.log('ok (processamento assíncrono no servidor)');
    results[m.equipment] = id;
  }

  console.log('\n=== Configure no painel do Netlify (Environment variables) ===');
  console.log(`XAI_COLLECTION_KRAAIJVELD=${results['KRAAIJVELD'] ?? ''}`);
  console.log(`XAI_COLLECTION_IBERCISA=${results['IBERCISA'] ?? ''}`);
  console.log(
    '\nO parse/OCR/embeddings roda no servidor da xAI; aguarde o status "complete"' +
      ' (GET /v1/collections/{id}/documents/{file_id}) antes de esperar respostas com citações.',
  );
}

main().catch((err) => {
  console.error('\nFalha na ingestão:', err instanceof Error ? err.message : err);
  process.exit(1);
});
