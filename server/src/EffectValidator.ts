import { Effect, EffectBase, EffectType, EffectTypeSet, PlaybackEffect, PlaybackEffectAction } from "triviakit-common";
import Game from "./Game";

export default function validateEffect(obj: any, game: Game): Effect {
    if (!isEffectBase(obj)) throw Error("No EffectType specified");

    switch (obj.type) {
        case EffectType.PlaybackEffect:
            let p = obj as any;
            if (typeof p.action !== 'number' || !(p.action in PlaybackEffectAction)) {
                throw Error("PlaybackEffect must have an 'action' property containing a PlaybackEffectAction");
            }
            if (typeof p.targetActivityId !== 'string' && typeof p.targetActivityId !== 'number') {
                throw Error("PlaybackEffect must have targetActivityId");
            }
            if (game.activities[p.parentActivityId || p.targetActivityId] === undefined) {
                throw Error(`No activity found for PlaybackEffect targeting ${p.targetActivityId}`);
            }
            let pEffect: PlaybackEffect = {
                type: EffectType.PlaybackEffect,
                action: p.action, targetActivityId: p.targetActivityId
            };
            return pEffect;
        default:
            throw Error(`Unsupported EffectType ${obj.type}`);
    }
}

function isEffectBase(obj: any): obj is EffectBase {
    return (typeof obj.type === 'number') && EffectTypeSet.has(obj.type);
}