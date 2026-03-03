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
        { ingredients: [Element.ICE, Element.LIGHTNING], resultSpellId: 'superconduct' },
        { ingredients: [Element.FIRE, Element.ICE], resultSpellId: 'water_steam' },
        { ingredients: [Element.POISON, Element.POISON], resultSpellId: 'toxic_cloud' },
        { ingredients: [Element.FIRE, Element.LIGHTNING], resultSpellId: 'plasma_arc' },
        { ingredients: [Element.ICE, Element.POISON], resultSpellId: 'venom_frost' },
        { ingredients: [Element.FIRE, Element.ICE, Element.LIGHTNING], resultSpellId: 'thermal_shock' },
        { ingredients: [Element.FIRE, Element.ICE, Element.POISON], resultSpellId: 'corrosive_steam' },
        { ingredients: [Element.FIRE, Element.ICE, Element.LIGHTNING, Element.POISON], resultSpellId: 'nightfall_elixir' },
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
        const matchedSpell = this.findBestMatchingRecipe();

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

    private findBestMatchingRecipe(): string | null {
        if (this.queue.length === 0) {
            return null;
        }

        const queueCount = this.toCountMap(this.queue);
        let bestMatch: Recipe | null = null;

        for (const recipe of this.recipes) {
            const recipeCount = this.toCountMap(recipe.ingredients);
            if (!this.canCraftFromQueue(queueCount, recipeCount)) {
                continue;
            }

            if (!bestMatch || recipe.ingredients.length > bestMatch.ingredients.length) {
                bestMatch = recipe;
            }
        }

        return bestMatch ? bestMatch.resultSpellId : null;
    }

    private toCountMap(elements: Element[]): Map<Element, number> {
        const countMap = new Map<Element, number>();
        for (const element of elements) {
            countMap.set(element, (countMap.get(element) ?? 0) + 1);
        }

        return countMap;
    }

    private canCraftFromQueue(queueCount: Map<Element, number>, recipeCount: Map<Element, number>): boolean {
        for (const [element, neededCount] of recipeCount) {
            if ((queueCount.get(element) ?? 0) < neededCount) {
                return false;
            }
        }

        return true;
    }
}
