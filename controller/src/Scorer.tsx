import React, { ReactNode, useState } from 'react';
import s from './Scorer.module.css';
import { GameState, Player } from 'triviakit-common';

export type ScorerProps = {
    game?: GameState
}
enum ScoreOp {
    Add, Subtract, Set
}
export default function Scorer(props: ScorerProps) {
    const { game } = props;
    const [ selectedPlayer, setSelectedPlayer ] = useState<number | null>(1);
    const [ selectedOp, setSelectedOp ] = useState<ScoreOp | null>(ScoreOp.Set);

    let squares: ReactNode[] = [];
    if (game) {
        if (selectedPlayer === null) {
            squares = Object.values(game.players).map(p => (
                <div className={s.square} onClick={() => setSelectedPlayer(p.id)} key={p.id}>
                    <p>{p.name}</p>
                </div>
            ));
        } else if (selectedOp === null) {
            squares.push(
                <div className={s.square + ' ' + s.op} onClick={() => setSelectedOp(ScoreOp.Add)} 
                    key='add'
                    style={{ backgroundColor: 'rgb(45, 173, 49)' }}>
                    <p>+</p>
                </div>
            );
            squares.push(
                <div className={s.square + ' ' + s.op} onClick={() => setSelectedOp(ScoreOp.Subtract)}
                    key='sub'
                    style={{ backgroundColor: 'rgb(198, 50, 50)' }}>
                    <p>-</p>
                </div>
            );
            squares.push(
                <div className={s.square + ' ' + s.op} onClick={() => setSelectedOp(ScoreOp.Set)}
                    key='set'
                    style={{ backgroundColor: 'rgb(36, 109, 200)' }}>
                    <p>=</p>
                </div>
            );
        } else {
            if (selectedOp === ScoreOp.Set) {
                squares.push(
                    <div className={s.square + ' ' + s.set} 
                        key='box'>
                        <input type='text' autoFocus />
                        <button>Set</button>
                    </div>
                );
            } else {
                squares = [5, 10, 20, 40, 80].map(v => (
                    <div className={s.square + ' ' + s.score} onClick={() => { setSelectedOp(null); setSelectedPlayer(null); }}
                        key={v}>
                        <p>{v}</p>
                    </div>
                ));
            }
        }
    }

    return (
        <div className={s.root}>
            <div className={s.grid}>
                {squares}
            </div>
            <div className={s.footer}>

            </div>
        </div>
    )
}