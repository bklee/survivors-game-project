import { defineQuery } from 'bitecs';
import { Position, Velocity, Player } from '../components';
import { world } from '../core/World';

// For simplicity, a very basic player state
export enum PlayerCharacter {
    RABBIT, // bunny hop
    BEAR, // dance range attack
    PANDA, // rolling dash
}

const playerQuery = defineQuery([Position, Velocity, Player]);

export class PlayerSystem {
    private character: PlayerCharacter = PlayerCharacter.RABBIT;

    // Some internal timer tracking
    private stateTime: number = 0;

    public update(dt: number) {
        this.stateTime += dt;
        const ents = playerQuery(world);

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];

            // Movement logic varies based on character
            switch (this.character) {
                case PlayerCharacter.RABBIT:
                    // Hop via sin wave over y offset
                    break;
                case PlayerCharacter.BEAR:
                    // Periodically freeze to 'dance' and attack
                    break;
                case PlayerCharacter.PANDA:
                    // Increase speed and modify sprite to roll temporarily when dashing
                    break;
            }
        }
    }
}
