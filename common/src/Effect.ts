/**
 * A one-off event/effect/action indicating something is happening right now.
 * This won't be stored in state anywhere.
 */
export interface EffectBase {
    type: EffectType;
}

export enum EffectType {
    PlaybackEffect = 0
}
export const EffectTypeSet = new Set(Object.values(EffectType));

export enum PlaybackEffectAction {
    Play = 0, Pause = 1,
    Restart = 2
}
export interface PlaybackEffect extends EffectBase {
    type: EffectType.PlaybackEffect;
    action: PlaybackEffectAction;
    targetActivityId: string | number;
    parentActivityId?: string | number;
}

export type Effect = PlaybackEffect;
