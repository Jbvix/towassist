# TowAssist — Guia de Implantação (Netlify)

> Como publicar o TowAssist no Netlify e ativar o assistente KRATOS (chat + voz)
> e o RAG dos manuais. A `XAI_API_KEY` fica **somente** no servidor.

---

## 1. Pré-requisitos

- Conta no **Netlify** com o repositório `jbvix/towassist` conectado.
- **Chave xAI** com acesso a chat e à Realtime Voice (`console.x.ai`).
- (Opcional, para RAG) **Chave de Management** da xAI, usada uma única vez na
  ingestão dos manuais.

---

## 2. Build no Netlify

O `netlify.toml` já define tudo:

```toml
[build]
  command   = "npm run build"     # tsc --noEmit + vite build
  publish   = "dist"
  functions = "netlify/functions"
```

- Frontend estático → `dist/` (servido pela CDN).
- Functions (BFF) → `netlify/functions/` (esbuild nativo de TS).
- Redirect `/api/*` → `/.netlify/functions/:splat` e fallback de SPA.

Ao conectar o repo, o Netlify detecta o `netlify.toml` automaticamente. Nenhuma
configuração de build manual é necessária.

---

## 3. Variáveis de ambiente

Em **Site settings → Environment variables**, configure:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `XAI_API_KEY` | ✅ | Chave xAI (chat + cunhagem de token de voz). |
| `XAI_MODEL` | ⛅ | Modelo de chat (ex.: `grok-2-latest`, `grok-4`). Default: `grok-2-latest`. |
| `XAI_COLLECTION_KRAAIJVELD` | ⛅ | ID da Collection do manual KRAAIJVELD (RAG). |
| `XAI_COLLECTION_IBERCISA` | ⛅ | ID da Collection do manual IBERCISA (RAG). |

> Sem as variáveis de Collection, o KRATOS funciona normalmente, apenas **sem
> citar os manuais**. A `XAI_MANAGEMENT_API_KEY` **não** deve ficar no Netlify —
> é usada só localmente na ingestão.

---

## 4. (Opcional) Ativar o RAG dos manuais

Execute **uma vez**, localmente, com a chave de Management:

```bash
export XAI_MANAGEMENT_API_KEY="..."
node --experimental-strip-types scripts/build-collections.ts
```

O script cria uma Collection por equipamento, envia o PDF (a xAI faz
parse/OCR/embeddings no servidor — necessário porque o manual do KRAAIJVELD é
escaneado) e imprime os IDs. Copie-os para `XAI_COLLECTION_*` no Netlify.

Aguarde o processamento (`processing_status: complete`) antes de esperar
respostas com citações.

---

## 5. Voz (xAI Realtime)

- A voz só está disponível na região **`us-east-1`** da xAI.
- O navegador nunca recebe a `XAI_API_KEY`: a Function `/api/realtime` cunha um
  **token efêmero** (300 s) e o browser conecta com `xai-client-secret.<token>`.
- O microfone exige **HTTPS** (atendido pelo Netlify) e permissão do usuário.

---

## 6. Desenvolvimento local

```bash
npm install
npm run dev        # só frontend (http://localhost:5173)

# Com o BFF (chat/voz):
export XAI_API_KEY="xai-..."
npx netlify dev    # frontend + /api/* (Functions)
```

Testes e verificação:

```bash
npm test           # testes (intertravamento + estado do painel)
npm run build      # typecheck + build de produção
```

---

## 7. Checklist de go-live

- [ ] Repositório conectado ao Netlify; build verde.
- [ ] `XAI_API_KEY` configurada; `XAI_MODEL` compatível com a conta.
- [ ] `/api/health` retorna `{ ok: true, xaiConfigured: true }`.
- [ ] Chat de texto responde como KRATOS.
- [ ] Voz conecta (permitir microfone) e interrompe corretamente.
- [ ] (Se RAG) Collections `complete` e IDs nas variáveis; respostas citam o manual.
- [ ] Testado em Chrome e Safari (warmup de áudio).
