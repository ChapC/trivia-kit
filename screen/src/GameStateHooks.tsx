import { useEffect, useContext, useRef } from 'react';
import { GameConnectionContext } from './App';
import { Effect, GEvent, GameState } from 'triviakit-common';

export function useMediaEffect(callback: (effect: Effect) => void) {
    const conn = useContext(GameConnectionContext);
    useEffect(function sub(){
        const c = conn?.listen(GEvent.Effect, callback);
        return () => conn?.unlisten(c);
    });
}

export function useBuzzedIn(onBuzz: (state: GameState['buzzers']['state']) => void) {
    const conn = useContext(GameConnectionContext);
    const lastBuzzerState = useRef<GameState['buzzers']['state']>();

    useEffect(function sub() {
        const c = conn?.listen(GEvent.GameState, (game) => {
            if (game.buzzers.enabled && game.buzzers.state && game.buzzers.state.length > 0) {
                if (!lastBuzzerState.current 
                    || lastBuzzerState.current.join() !== game.buzzers.state.join()) {
                    onBuzz(game.buzzers.state);
                }
            }
            lastBuzzerState.current = game.buzzers.state;
        });
        return () => conn?.unlisten(c);
    });
}