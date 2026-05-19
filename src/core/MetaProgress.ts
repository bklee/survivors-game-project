const STORAGE_KEY = 'survivors_meta_progress_v1';

export interface MetaProgressData {
    essence: number;
    unlockedCharacters: string[];
    discoveredSynergies: string[];
    skillTree: { combat: number; survival: number; discovery: number };
    relicSlots: number;
}

const STARTER_CHARACTERS = ['knight', 'wizard', 'elf', 'dwarf'];

const DEFAULT: MetaProgressData = {
    essence: 0,
    unlockedCharacters: [...STARTER_CHARACTERS],
    discoveredSynergies: [],
    skillTree: { combat: 0, survival: 0, discovery: 0 },
    relicSlots: 3,
};

// 기존 세이브에서 누락된 starter 를 자동 보강 — dwarf 가 starter 로 승격된 이후 마이그레이션.
function ensureStarters(list: string[]): string[] {
    const out = [...list];
    for (const c of STARTER_CHARACTERS) {
        if (!out.includes(c)) out.push(c);
    }
    return out;
}

export const MetaProgress = {
    load(): MetaProgressData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return {
                    ...DEFAULT,
                    unlockedCharacters: [...DEFAULT.unlockedCharacters],
                    discoveredSynergies: [...DEFAULT.discoveredSynergies],
                    skillTree: { ...DEFAULT.skillTree },
                };
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT,
                ...parsed,
                unlockedCharacters: ensureStarters(
                    parsed.unlockedCharacters ?? DEFAULT.unlockedCharacters,
                ),
                skillTree: { ...DEFAULT.skillTree, ...(parsed.skillTree ?? {}) },
            };
        } catch {
            return {
                ...DEFAULT,
                unlockedCharacters: [...DEFAULT.unlockedCharacters],
                discoveredSynergies: [...DEFAULT.discoveredSynergies],
                skillTree: { ...DEFAULT.skillTree },
            };
        }
    },

    save(data: MetaProgressData): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    addEssence(amount: number): void {
        const data = this.load();
        data.essence += amount;
        this.save(data);
    },

    unlockCharacter(id: string, cost: number): boolean {
        const data = this.load();
        if (data.unlockedCharacters.includes(id)) return false;
        if (data.essence < cost) return false;
        data.essence -= cost;
        data.unlockedCharacters.push(id);
        this.save(data);
        return true;
    },

    discoverSynergy(id: string): void {
        const data = this.load();
        if (data.discoveredSynergies.includes(id)) return;
        data.discoveredSynergies.push(id);
        data.essence += 50;
        this.save(data);
    },

    upgradeSkillTree(branch: 'combat' | 'survival' | 'discovery', cost: number): boolean {
        const data = this.load();
        if (data.skillTree[branch] >= 10) return false;
        if (data.essence < cost) return false;
        data.essence -= cost;
        data.skillTree[branch] += 1;
        this.save(data);
        return true;
    },

    expandRelicSlots(cost: number): boolean {
        const data = this.load();
        if (data.relicSlots >= 5) return false;
        if (data.essence < cost) return false;
        data.essence -= cost;
        data.relicSlots += 1;
        this.save(data);
        return true;
    },
};
