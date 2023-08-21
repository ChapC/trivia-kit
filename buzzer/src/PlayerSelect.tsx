import React from 'react';
import { GameState } from 'triviakit-common';
import s from './PlayerSelect.module.css';

export type PlayerSelectProps = {
    game?: GameState | null,
    onSelect?: (playerId: number) => void
}
export default function PlayerSelect(props: PlayerSelectProps) {
    const { game, onSelect } = props;

    let players = null;
    if (game && game.players) {
        players = Object.values(game.players).map(p => (
            <div className={s.playerItem} key={p.id} onClick={() => onSelect ? onSelect(p.id) : {}}>
                <img src={p.imgUrl} />
                <p>{p.name}</p>
            </div>
        ));
    }

    return (
        <div className={s.root}>
            <h1>{game ? 'whomst the fuck??' : '?'}</h1>
            { game && (
                <div className={s.list}>
                    {players}
                </div>
            )}
        </div>
    )
}