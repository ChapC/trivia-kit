import { ActiveFourChoice, ActiveState, ActivityType, ActiveStateBase, ActiveReveal, ActiveMediaList } from "triviakit-common";

export default function validateActiveState(state: ActiveStateBase): ActiveState {
    switch (state.type) {
        case ActivityType.FourChoice:
            let s: ActiveFourChoice = { type: ActivityType.FourChoice };
            if (typeof (state as any).a === 'object') {
                let cState = validateActiveState((state as any).a);
                if (cState.type !== ActivityType.FourChoice) {
                    s.a = cState;
                }
            }
            if (typeof (state as any).b === 'object') {
                let cState = validateActiveState((state as any).b);
                if (cState.type !== ActivityType.FourChoice) {
                    s.b = cState;
                }
            }
            if (typeof (state as any).c === 'object') {
                let cState = validateActiveState((state as any).c);
                if (cState.type !== ActivityType.FourChoice) {
                    s.c = cState;
                }
            }
            if (typeof (state as any).d === 'object') {
                let cState = validateActiveState((state as any).d);
                if (cState.type !== ActivityType.FourChoice) {
                    s.d = cState;
                }
            }
            return s;
        case ActivityType.Reveal:
            let r: ActiveReveal = { type: ActivityType.Reveal, showAnswer: false };
            if (typeof (state as any).showAnswer === 'boolean') {
                r.showAnswer = (state as any).showAnswer;
            } else {
                throw Error("ActiveState for Reveal activities must include 'showAnswer'");
            }
            return r;
        case ActivityType.MediaList:
            let l: ActiveMediaList = { type: ActivityType.MediaList, activeIndex: 0 };
            if (typeof (state as any).activeIndex === 'number') {
                l.activeIndex = (state as any).activeIndex;
            } else {
                throw Error("ActiveState fro MediaList activities must include 'activeIndex'");
            }
            return l;
        default:
            throw Error(`Unsupported activity type ${state.type}`);
    }
}

export function activeStateEquals(a: ActiveState, b: ActiveState): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
        case ActivityType.FourChoice:
            let b4 = b as ActiveFourChoice;
            return (
                fourChoiceOptionEquals(a, b4, 'a') &&
                fourChoiceOptionEquals(a, b4, 'b') &&
                fourChoiceOptionEquals(a, b4, 'c') &&
                fourChoiceOptionEquals(a, b4, 'd')
            );
        case ActivityType.Reveal:
            return a.showAnswer === (b as ActiveReveal).showAnswer;
        case ActivityType.MediaList:
            return a.activeIndex === (b as ActiveMediaList).activeIndex;
    }
}

function fourChoiceOptionEquals(a: ActiveFourChoice, b: ActiveFourChoice, option: 'a' | 'b' | 'c' | 'd'): boolean {
        let aType = typeof a[option];
        return (
            aType === typeof b[option] &&
            (aType !== 'undefined' ? activeStateEquals(a[option]!, b[option]!) : true)
        );
}