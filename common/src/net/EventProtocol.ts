import { Effect } from "../Effect"
import { GameState } from "../GameState"
import { Activities } from "../Media"

export enum EventMessageType {
    GameState = 0,
    Heartbeat = 1,
    Activities = 2,
    Effect = 3
}
export type GameStateMessage = {
    time: number,
    type: EventMessageType.GameState,
    state: GameState
}

export type HeartbeatMessage = {
    time: number,
    type: EventMessageType.Heartbeat
}

export type ActivitiesMessage = {
    time: number,
    type: EventMessageType.Activities,
    activities: Activities
}

export type EffectMessage = {
    time: number,
    type: EventMessageType.Effect,
    effect: Effect
}

export type EventMessage = 
    GameStateMessage |
    HeartbeatMessage |
    ActivitiesMessage |
    EffectMessage
;

export function isEventMessage(obj: any): obj is EventMessage {
    return (typeof obj.type) === 'number' 
           && (typeof obj.time) === 'number' 
           && obj.type in EventMessageType;
}