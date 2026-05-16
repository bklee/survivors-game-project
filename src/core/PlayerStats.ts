export const globalStats = {
    damageMult: 1,
    moveSpeedMult: 1,
    cooldownMult: 1,
    pickupRadiusMult: 1,
    bonusMaxHp: 0,
    mana: { current: 100, max: 100 },
    currentStage: 1,
    currentLevel: 1,
    coinMult: 1,
    manaRegenMult: 1,
};

import { MetaProgress } from './MetaProgress';
import { SKILL_TREE } from '../constants/SkillTreeConfig';

export function applySkillTreeBonuses(): void {
    const tree = MetaProgress.load().skillTree;
    for (const branch of ['combat', 'survival', 'discovery'] as const) {
        const level = tree[branch];
        SKILL_TREE.filter((n) => n.branch === branch && n.level <= level).forEach((n) => n.apply());
    }
}
