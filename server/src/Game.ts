import { ActiveState, Activities, Activity, isActiveStateBase, BuzzerState, SomeCommandMessage, GameCommand, GameState, Player, Listenable } from "triviakit-common";
import validateActiveState, { activeStateEquals } from "./ActiveStateValidator";

export enum GameEvent {
    StateChanged = 0
}
type GameEventData = {
    [GameEvent.StateChanged]: GameState
}
export default class Game extends Listenable<GameEventData> {
    private playerIdCounter = 0;
    private players: Map<number, Player> = new Map();
    private score: Map<number, number> = new Map();

    private buzzersOn = false;
    private buzzedIn: Set<number> = new Set();
    private buzzes: BuzzerState = [];

    public activities: Activities = {};
    private currentActivity: Activity | null = null;
    private activityState: ActiveState | null = null;

    public setActivity(activityId: string | number | null, state?: ActiveState) {
        let changed = false;
        if (activityId === null) {
            if (this.currentActivity === null) return;
            this.currentActivity = null;
            this.activityState = null;
            changed = true;
        } else {
            let a = this.activities[activityId];
            if (!a) {
                console.warn(`Received setActivity with unknown id ${activityId}`);
                return;
            }

            if (state) {
                if (a.type !== state.type) {
                    console.warn(`Received setActivity with state type mismatch (${a.type} != ${state.type})`);
                    return;
                }
                if (!this.activityState || !activeStateEquals(state, this.activityState)) {
                    this.activityState = state;
                    changed = true;
                }
            } else {
                if (this.activityState) {
                    this.activityState = null;
                    changed = true;
                }
            }

            if (!this.currentActivity || this.currentActivity.id !== activityId) {
                this.currentActivity = a;
                changed = true;
            }
        }

        if (changed) this.notifyStateChanged();
    }

    public addPlayer(name: string, imgUrl: string, initialScore?: number): Player {
        let id = this.playerIdCounter++;
        let p: Player = {
            name, imgUrl, id
        };

        this.players.set(id, p);
        this.score.set(id, initialScore || 0);

        return p;
    }

    public buzzIn(playerId: number) {
        if (!this.buzzersOn) return;
        if (this.buzzedIn.has(playerId)) return;
        if (!this.players.has(playerId)) { 
            console.warn(`Received buzz for unknown player id ${playerId}`);
            return;
        }

        console.info(`BuzzIn ${this.players.get(playerId)?.name}`);
        this.buzzes.push({
            playerId,
            time: Date.now()
        });
        this.buzzedIn.add(playerId);
        this.notifyStateChanged();
    }

    public enableBuzzers(enabled: boolean) {
        if (this.buzzersOn !== enabled) {
            this.buzzersOn = enabled;
            this.notifyStateChanged();
        }
    }

    public resetBuzzers() {
        if (this.buzzes.length > 0) {
            this.buzzes = [];
            this.buzzedIn.clear();
            this.notifyStateChanged();
        }
    }

    private notifyStateChanged() {
        this.trigger(GameEvent.StateChanged, this.getState());
    }

    public getState(): GameState {
        return {
            players: Object.fromEntries(this.players),
            buzzers: {
                enabled: this.buzzersOn,
                state: this.buzzersOn ? [ ...this.buzzes ] : undefined
            },
            active: {
                activity: this.currentActivity || undefined,
                state: this.activityState || undefined
            }
        }
    }
}

export function applyGameCommand(game: Game, msg: SomeCommandMessage, isHost: boolean) {
    switch (msg.command) {
        case GameCommand.Buzz:
            if (msg.data && typeof msg.data.playerId === 'number') {
                game.buzzIn(msg.data.playerId);
            }
            break;
        case GameCommand.EnableBuzzers:
            if (isHost && msg.data && typeof msg.data.enabled === 'boolean') {
                game.enableBuzzers(msg.data.enabled);
            }
            break;
        case GameCommand.ResetBuzzers:
            if (isHost) {
                game.resetBuzzers();
            }
            break;
        case GameCommand.SetActivity:
            if (isHost && msg.data && typeof msg.data.activityId !== 'undefined') {
                if (typeof msg.data.state === 'undefined') {
                    game.setActivity(msg.data.activityId);
                } else if (typeof msg.data.state === 'object' && isActiveStateBase(msg.data.state)) {
                    try {
                        game.setActivity(
                            msg.data.activityId, 
                            validateActiveState(msg.data.state)
                        );
                    } catch (err) {
                        console.warn('Dropping SetActivity command - state failed to validate', err);
                    }
                }
            }
            break;
    }
}

export type GameSettings = {
    game: {
        activities: string,
        players: { name: string, img: string }[]
    }
}
export function isGameSettings(obj: any): obj is GameSettings {
    return typeof obj.game === 'object'
        && typeof obj.game.players === 'object' && typeof obj.game.players.length === 'number'
    ;
}