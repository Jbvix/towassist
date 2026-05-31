# Manuais dos equipamentos

Esta pasta concentra os **manuais dos fabricantes** dos guinchos de manobra
**KRAAIJVELD** e **IBERCISA**. Eles são a **fonte de verdade** do projeto: toda
regra de intertravamento, sequência de operação, parâmetro de simulação e
resposta do assistente deve ser rastreável a um trecho de manual.

## Organização

```
docs/manuais/
├── kraaijveld/    # Manuais, esquemas e folhas de dados do KRAAIJVELD
│   └── Users Manual - 2500P.pdf
└── ibercisa/      # Manuais, esquemas e folhas de dados do IBERCISA
    └── MR-MAN-H 70 100-64 - Instruction & Maintenance Book - Arcimbaldo.pdf
```

## Inventário atual

| Equipamento (tela) | Arquivo | Tamanho |
|--------------------|---------|---------|
| **KRAAIJVELD** | `kraaijveld/Users Manual - 2500P.pdf` | ~21 MB |
| **IBERCISA**   | `ibercisa/MR-MAN-H 70 100-64 - Instruction & Maintenance Book - Arcimbaldo.pdf` | ~25 MB |

## Observações importantes

- **Versionamento:** por decisão do projeto, os PDFs dos manuais **são
  versionados** nestas pastas (o `.gitignore` foi ajustado para permitir).
- **Formatos úteis para o RAG (Sprint 6):** além do PDF original, versões em
  texto/markdown facilitam a indexação. Se possível, fornecer também:
  - esquemas elétricos/hidráulicos do painel;
  - tabela de condições de intertravamento;
  - sequências de partida, operação e parada.

## Status (Sprint 1)

> ✅ Manuais recebidos e organizados (ver inventário acima). Os dados técnicos
> (layout do painel, condições de intertravamento, sequências de operação) serão
> extraídos destes manuais nos sprints de simulação (4), intertravamento (5) e
> RAG (6).
>
> ℹ️ Ferramentas de leitura de PDF (poppler/`pdftotext`) não estão instaladas no
> ambiente atual; a extração de texto para o RAG será configurada no Sprint 6.
