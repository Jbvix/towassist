import type { EquipmentId } from '@shared/types/equipment.ts';
import type { InterlockRuleset } from '@/interlock/types.ts';
import { kraaijveldRules } from '@/interlock/rules/kraaijveld.rules.ts';
import { ibercisaRules } from '@/interlock/rules/ibercisa.rules.ts';

const rulesets: Record<EquipmentId, InterlockRuleset> = {
  kraaijveld: kraaijveldRules,
  ibercisa: ibercisaRules,
};

export function getRuleset(id: EquipmentId): InterlockRuleset {
  return rulesets[id];
}
