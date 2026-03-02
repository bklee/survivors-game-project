// using simple localStorage wrapped to simulate indexedDB style async
export type PlayerData = {
    coins: number;
    unlockedSpells: string[];
    skillTreeNodes: string[];
};

export class SaveSystem {
    private static DB_NAME = 'AlchemistsNight_PlayerData';

    public static async save(data: PlayerData): Promise<void> {
        return new Promise((resolve) => {
            try {
                const serialized = JSON.stringify(data);
                localStorage.setItem(this.DB_NAME, serialized);
                resolve();
            } catch (e) {
                console.error('Failed to save data', e);
                resolve(); // resolve anyway to avoid breaking Promise chains
            }
        });
    }

    public static async load(): Promise<PlayerData> {
        return new Promise((resolve) => {
            try {
                const data = localStorage.getItem(this.DB_NAME);
                if (data) {
                    resolve(JSON.parse(data));
                } else {
                    resolve(this.getDefaultData());
                }
            } catch (e) {
                console.error('Failed to load data', e);
                resolve(this.getDefaultData());
            }
        });
    }

    private static getDefaultData(): PlayerData {
        return {
            coins: 0,
            unlockedSpells: ['fireball'],
            skillTreeNodes: [],
        };
    }
}
