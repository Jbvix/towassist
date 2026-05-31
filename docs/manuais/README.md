# Manuais dos equipamentos

Esta pasta concentra os **manuais dos fabricantes** dos guinchos de manobra
**KRAAIJVELD** e **IBERCISA**. Eles são a **fonte de verdade** do projeto: toda
regra de intertravamento, sequência de operação, parâmetro de simulação e
resposta do assistente deve ser rastreável a um trecho de manual.

## Organização

```
docs/manuais/
├── kraaijveld/    # Manuais, esquemas e folhas de dados do KRAAIJVELD
└── ibercisa/      # Manuais, esquemas e folhas de dados do IBERCISA
```

## Observações importantes

- **Confidencialidade / versionamento:** por padrão, arquivos `.pdf` desta pasta
  são **ignorados pelo Git** (ver `.gitignore`) para evitar versionar documentos
  potencialmente confidenciais ou pesados. Caso o cliente autorize versioná-los,
  basta ajustar o `.gitignore`.
- **Formatos úteis para o RAG (Sprint 6):** além do PDF original, versões em
  texto/markdown facilitam a indexação. Se possível, fornecer também:
  - esquemas elétricos/hidráulicos do painel;
  - tabela de condições de intertravamento;
  - sequências de partida, operação e parada.

## Status (Sprint 1)

> ⚠️ **Pendência:** o usuário indicou que adicionou a documentação dos
> equipamentos. Assim que confirmada a localização e o formato dos arquivos,
> esta seção será atualizada com o inventário (lista de manuais, versões e a
> que equipamento pertencem), e os dados técnicos serão extraídos nos sprints
> de simulação (4), intertravamento (5) e RAG (6).
