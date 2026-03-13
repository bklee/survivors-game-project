export interface CharacterData {
    name: string;
    id: string;
    baseStats: {
        health: number;
        speed: number;
        damage: number;
        mana: number;
    };
    frames: {
        idle: { x: number; y: number; w: number; h: number; count: number };
        run: { x: number; y: number; w: number; h: number; count: number };
    };
}

export const CHARACTERS: Record<string, CharacterData> = {
    KNIGHT: {
        name: 'Knight',
        id: 'knight',
        baseStats: { health: 120, speed: 100, damage: 1.2, mana: 0 },
        frames: {
            idle: { x: 128, y: 68, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 68, w: 16, h: 28, count: 4 },
        }
    },
    WIZARD: {
        name: 'Wizard',
        id: 'wizard',
        baseStats: { health: 80, speed: 120, damage: 1.5, mana: 100 },
        frames: {
            idle: { x: 128, y: 132, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 132, w: 16, h: 28, count: 4 },
        }
    },
    ELF: {
        name: 'Elf',
        id: 'elf',
        baseStats: { health: 100, speed: 180, damage: 1.1, mana: 80 },
        frames: {
            idle: { x: 128, y: 4, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 4, w: 16, h: 28, count: 4 },
        }
    }
};

export const BACKGROUND_FLOOR = { x: 16, y: 64, w: 16, h: 16 };
