import { Effect } from "../Effect"
import { ActiveState } from "../GameState"

export enum GameCommand {
    Buzz = 0,
    // Host only
    ResetBuzzers = 1,
    EnableBuzzers = 2,
    SetActivity = 3,
    // --
    SendEffect = 4
}

type CommandMessage0 = {
    command: GameCommand.ResetBuzzers,
    data: undefined
}

type CommandMessage1 = {
    command: GameCommand.EnableBuzzers,
    data: {
        enabled: boolean
    }
}

type CommandMessage2 = {
    command: GameCommand.Buzz,
    data: {
        playerId: number
    }
}

type CommandMessage3 = {
    command: GameCommand.SetActivity,
    data: {
        activityId: number | string | null,
        state?: ActiveState
    }
}

type CommandMessage4 = {
    command: GameCommand.SendEffect,
    data: {
        effect: Effect
    }
}

export type CommandMessage = 
    CommandMessage0 |
    CommandMessage1 |
    CommandMessage2 |
    CommandMessage3 |
    CommandMessage4
;

export type SomeCommandMessage = {
    command: GameCommand;
    data: any;
}

export function isCommandMessage(obj: any): obj is SomeCommandMessage {
    return typeof obj.command === 'number' && obj.command in GameCommand;
}