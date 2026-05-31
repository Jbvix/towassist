// Carrega as definições dos equipamentos a partir dos arquivos de dados.
// Trocar de equipamento = trocar de configuração (sem mexer no código).

import type {
  EquipmentDefinition,
  EquipmentId,
  EquipmentMeta,
  PanelControl,
} from '@shared/types/equipment.ts';

import kraaijveldMeta from './kraaijveld/meta.json';
import kraaijveldPanel from './kraaijveld/panel.json';
import ibercisaMeta from './ibercisa/meta.json';
import ibercisaPanel from './ibercisa/panel.json';

const definitions: Record<EquipmentId, EquipmentDefinition> = {
  kraaijveld: {
    meta: kraaijveldMeta as EquipmentMeta,
    controls: kraaijveldPanel.controls as PanelControl[],
  },
  ibercisa: {
    meta: ibercisaMeta as EquipmentMeta,
    controls: ibercisaPanel.controls as PanelControl[],
  },
};

/** Ordem de exibição das telas. */
export const EQUIPMENT_ORDER: EquipmentId[] = ['kraaijveld', 'ibercisa'];

export function getEquipment(id: EquipmentId): EquipmentDefinition {
  return definitions[id];
}

export function getAllEquipment(): EquipmentDefinition[] {
  return EQUIPMENT_ORDER.map(getEquipment);
}
