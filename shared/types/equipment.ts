// Modelo de equipamento (guincho de manobra). Compartilhado entre frontend e BFF.

/** Identificador das duas telas/equipamentos alternáveis. */
export type EquipmentId = 'kraaijveld' | 'ibercisa';

/** Tipo de controle exibido no painel de comando. */
export type ControlKind = 'lever' | 'button' | 'gauge' | 'indicator' | 'selector';

/** Definição de um controle do painel (origem: data/<eq>/panel.json). */
export interface PanelControl {
  /** Chave única do controle dentro do painel. */
  id: string;
  kind: ControlKind;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** Grupo funcional para organização visual (ex.: "energia", "comando", "instrumentacao"). */
  group?: string;
  /** Posição relativa no painel (0..1) — usada apenas se não houver grupos. */
  x?: number;
  y?: number;
  /** Descrição/ajuda (origem: manual). Opcional. */
  hint?: string;
}

/** Metadados e parâmetros do guincho (origem: data/<eq>/meta.json). */
export interface EquipmentMeta {
  id: EquipmentId;
  /** Nome de exibição, ex.: "KRAAIJVELD". */
  name: string;
  /** Modelo/fabricante resumido. */
  model: string;
  /** Cor de acento da tela (tema visual). */
  accent: string;
  /** Caminho do manual de referência (em docs/manuais/). */
  manual: string;
  /** Resumo curto do equipamento. */
  summary: string;
}

/** Definição completa de uma tela/equipamento. */
export interface EquipmentDefinition {
  meta: EquipmentMeta;
  controls: PanelControl[];
}
