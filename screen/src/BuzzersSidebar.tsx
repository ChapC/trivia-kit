import React, { useRef, useEffect } from "react";
import PlayerBuzzer from "./PlayerBuzzer/PlayerBuzzer";
import s from './BuzzersSidebar.module.css';
import { BuzzerState, Player } from "triviakit-common";
import BuzzerAudioSrc from "../audio/buzzer.wav";

export type BuzzersSidebarProps = {
    players?: {[id: number]: Player},
    playAudio?: boolean,
    buzzers?: BuzzerState
}
export default function BuzzersSidebar(p: BuzzersSidebarProps) {
    const playersList = p.players ? Object.values(p.players) : [];
    const audioCtxRef = useRef(new AudioContext());
    const buzzerAudioRef = useRef<AudioBuffer | null>(null);
    const lastBuzzerState = useRef<BuzzerState | undefined>(p.buzzers);

    useEffect(function fetchAudio() {
        fetch(BuzzerAudioSrc)
        .then(r => r.arrayBuffer())
        .then(b => audioCtxRef.current.decodeAudioData(b))
        .then(b => {
            buzzerAudioRef.current = b;
        });
    }, []);

    useEffect(function playAudio() {
        if (p.playAudio && p.buzzers && buzzerAudioRef.current) {
            for (let buzz of p.buzzers) {
                if (lastBuzzerState.current !== undefined) {
                    if (lastBuzzerState.current.findIndex(b => b.playerId === buzz.playerId) !== -1) {
                        continue;
                    }
                }

                let source = audioCtxRef.current.createBufferSource();
                source.buffer = buzzerAudioRef.current;
                source.connect(audioCtxRef.current.destination);
                source.onended = () => source.disconnect();
                source.start(0);
            }
        }
        lastBuzzerState.current = p.buzzers;
    }, [ p.buzzers ]);

    let listOrder: number[] = [];
    let isBuzzed = new Set<number>();
    let defaultOrderPlayers = [ ...playersList ];
    if (p.buzzers) {
        for (let buzzed of p.buzzers) {
            let i = defaultOrderPlayers.findIndex(d => d.id === buzzed.playerId);
            if (i === -1) continue;
            defaultOrderPlayers.splice(i, 1);
            listOrder.push(buzzed.playerId);
            isBuzzed.add(buzzed.playerId);
        }
    }
    listOrder.push(...defaultOrderPlayers.map(p => p.id));

    let buzzerVh = Math.min(85 / playersList.length, 18);
    let listVh = 100;
    let marginVh = 2;
    let listMiddleVh = listVh / 2 - buzzerVh / 2;
    let middleI = (playersList.length - 1) / 2;

    let items: any = [];
    for (let player of playersList) {
        let i = listOrder.findIndex(id => id === player.id);
        let offsetI = i - middleI;
        let top = listMiddleVh + (offsetI * buzzerVh);
        
        let m = marginVh * Math.abs(offsetI);
        if (offsetI < 0) {
            top -= m;
        } else if (offsetI > 0) {
            top += m;
        }

        items.push(
            <div key={player.id} className={s.li} style={{ 
                transform: `translateY(${top}vh)`,
                zIndex: (playersList.length - i)
            }}>
                <PlayerBuzzer buzzedIn={isBuzzed.has(player.id)} 
                    buzzedNumber={i + 1}
                    img={player.imgUrl} height={buzzerVh + 'vh'} />
            </div>
        );
    }

    return (
        <div className={s.root}>
            {items}
        </div>
    )
}

/**
 * Ensure there are at least `required` audio sources ready to play `audio` in `array`.
 */
function ensureAudioSources(audio: AudioBuffer, ctx: AudioContext, array: AudioBufferSourceNode[], required: number) {
    if (array.length >= required) return;
    for (let i = 0; i < required - array.length; i++) {
        let source = ctx.createBufferSource();
        source.buffer = audio;
        source.connect(ctx.destination);
        array.push(source);
    }
}