export enum Element {
    FIRE = 'FIRE',
    ICE = 'ICE',
    LIGHTNING = 'LIGHTNING',
    POISON = 'POISON',
}

export type Recipe = {
    ingredients: Element[];
    resultSpellId: string;
};

export class AlchemySystem {
    private queue: Element[] = [];
    private maxQueueSize: number = 4;

    private recipes: Recipe[] = [
        { ingredients: [Element.FIRE, Element.FIRE], resultSpellId: 'fireball' },
        { ingredients: [Element.ICE, Element.ICE], resultSpellId: 'ice_nova' },
        { ingredients: [Element.FIRE, Element.POISON], resultSpellId: 'explosive_gas' },
    ];

    public addElement(el: Element) {
        if (this.queue.length >= this.maxQueueSize) {
            this.queue.shift(); // Remove oldest
        }
        this.queue.push(el);
        this.triggerUIUpdate();
    }

    public getQueue(): Element[] {
        return [...this.queue];
    }

    public triggerCombo(): string | null {
        // Attempt to match from largest sequence first (or exact match)
        const currentComboStr = this.queue.sort().join(',');

        let matchedSpell: string | null = null;

        for (const recipe of this.recipes) {
            const recipeStr = [...recipe.ingredients].sort().join(',');
            if (recipeStr === currentComboStr) {
                matchedSpell = recipe.resultSpellId;
                break;
            }
        }

        // Clear queue after trigger combo attempt
        this.queue = [];
        this.triggerUIUpdate();

        if (matchedSpell) {
            console.log(`Successfully casted ${matchedSpell}!`);
            return matchedSpell;
        } else {
            console.log(`Combo failed. Backfire!`);
            return 'backfire';
        }
    }

    private triggerUIUpdate() {
        // dispatch event to Phaser or UI layer
        window.dispatchEvent(new CustomEvent('alchemyQueueUpdated', { detail: this.queue }));
    }
}
