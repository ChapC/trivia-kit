import { Activity, ActivityType, ActivityTypeSet } from "./Media"

export type GameState = {
    players: {
        [id: number]: Player
    },
    buzzers: {
        enabled: boolean,
        state?: BuzzerState
    },
    active: { 
        activity?: Activity,
        state?: ActiveState
    }
}

export interface ActiveStateBase {
    type: ActivityType;
}

export function isActiveStateBase(obj: any): obj is ActiveStateBase {
    return typeof obj.type === 'string' && ActivityTypeSet.has(obj.type);
}

export interface ActiveReveal extends ActiveStateBase {
    type: ActivityType.Reveal;
    showAnswer: boolean;
}

type NotFourChoice = Exclude<ActiveState, ActiveFourChoice>;
export interface ActiveFourChoice extends ActiveStateBase {
    type: ActivityType.FourChoice;
    a?: NotFourChoice;
    b?: NotFourChoice;
    c?: NotFourChoice;
    d?: NotFourChoice;
}

export interface ActiveMediaList extends ActiveStateBase {
    type: ActivityType.MediaList;
    activeIndex: number
}

export type ActiveState =  
    | ActiveReveal
    | ActiveFourChoice
    | ActiveMediaList
;

export type Player = {
    id: number,
    name: string,
    imgUrl: string
}
export type BuzzerState = { playerId: number, time?: number }[];
