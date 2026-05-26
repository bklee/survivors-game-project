import { I18nString } from '../i18n/I18n';

export interface CharacterData {
    name: string;
    id: string;
    description?: I18nString;
    unlockCost?: number;
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
        },
    },
    WIZARD: {
        name: 'Wizard',
        id: 'wizard',
        baseStats: { health: 80, speed: 120, damage: 1.5, mana: 100 },
        frames: {
            idle: { x: 128, y: 132, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 132, w: 16, h: 28, count: 4 },
        },
    },
    ELF: {
        name: 'Elf',
        id: 'elf',
        baseStats: { health: 100, speed: 180, damage: 1.1, mana: 80 },
        frames: {
            idle: { x: 128, y: 4, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 4, w: 16, h: 28, count: 4 },
        },
    },
    DWARF: {
        name: 'Dwarf',
        id: 'dwarf',
        description: {
            ko: '단단한 광부. 큰 검을 휘두른다.',
            en: 'Sturdy miner. Swings a heavy blade.',
        },
        // 기본 캐릭터 — unlockCost 없음 (starter)
        baseStats: { health: 180, speed: 80, damage: 1.5, mana: 0 },
        // dwarf 전용 standalone 스프라이트(dwarf_idle_f*/dwarf_run_f*) 사용.
        // frames 좌표는 charTypeId=6 분기에서 무시됨 (RenderSystem 참고).
        frames: {
            idle: { x: 128, y: 68, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 68, w: 16, h: 28, count: 4 },
        },
    },
    DRUID: {
        name: 'Druid',
        id: 'druid',
        description: {
            ko: '자연의 술사. 가시 덩굴 발사.',
            en: 'Nature druid. Fires thorn vines.',
        },
        unlockCost: 3000,
        baseStats: { health: 90, speed: 105, damage: 1.2, mana: 100 },
        frames: {
            idle: { x: 128, y: 132, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 132, w: 16, h: 28, count: 4 },
        },
    },
    LIZARD: {
        name: 'Lizard',
        id: 'lizard',
        description: {
            ko: '도마뱀 전사. 푸른 마법탄 발사.',
            en: 'Lizard warrior. Fires azure magic bolts.',
        },
        unlockCost: 5000,
        baseStats: { health: 100, speed: 95, damage: 1.0, mana: 80 },
        frames: {
            idle: { x: 128, y: 196, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 196, w: 16, h: 28, count: 4 },
        },
    },
    NECROMANCER: {
        name: 'Necromancer',
        id: 'necromancer',
        description: {
            ko: '어둠의 마법사. 소울 볼트 발사.',
            en: 'Dark mage. Fires soul bolts.',
        },
        unlockCost: 7500,
        baseStats: { health: 80, speed: 110, damage: 1.4, mana: 120 },
        frames: {
            idle: { x: 128, y: 132, w: 16, h: 28, count: 4 },
            run: { x: 192, y: 132, w: 16, h: 28, count: 4 },
        },
    },
};

export const BACKGROUND_FLOOR = { x: 16, y: 64, w: 16, h: 16 };
