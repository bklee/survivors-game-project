export interface CharacterData {
    name: string;
    id: string;
    baseStats: {
        health: number;
        speed: number;
        damage: number;
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
        baseStats: { health: 120, speed: 180, damage: 1.2 },
        frames: {
            idle: { x: 128, y: 100, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 100, w: 16, h: 28, count: 4 },
        }
    },
    WIZARD: {
        name: 'Wizard',
        id: 'wizard',
        baseStats: { health: 80, speed: 200, damage: 1.5 },
        frames: {
            idle: { x: 128, y: 164, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 164, w: 16, h: 28, count: 4 },
        }
    },
    ELF: {
        name: 'Elf',
        id: 'elf',
        baseStats: { health: 100, speed: 220, damage: 1.1 },
        frames: {
            idle: { x: 128, y: 36, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 36, w: 16, h: 28, count: 4 },
        }
    }
};

export const BACKGROUND_FLOOR = { x: 16, y: 64, w: 16, h: 16 };
