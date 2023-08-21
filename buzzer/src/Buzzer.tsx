import React from 'react';
import LightningIcon from '../icons/lightning.svg';
import s from './Buzzer.module.css';
import { GameState } from 'triviakit-common';

export type BuzzerProps = {
    game?: GameState | null,
    buzzedIn?: number | null
}
export default function Buzzer(props: BuzzerProps) {
    const { game, buzzedIn } = props;

    let txt = '', bStyle = '';
    if (game?.buzzers.enabled) {
        if (buzzedIn) {
            txt = `You buzzed in ${buzzedIn}${ordinal(buzzedIn)}`;
            bStyle = 'buzzerActivated';
        } else {
            txt = 'Tap to buzz in';
            bStyle = 'buzzerReady';
        }
    } else {
        txt = 'Buzzers are disabled';
        bStyle = 'buzzerOff';
    }
    return (
        <div className={s.buzzer + ' ' + s[bStyle]}>
            <img src={LightningIcon} draggable={false} />
            <p>{txt}</p>
        </div>

    )
}

function ordinal(n: number): string {
    let ord = 'th';
  
    if (n % 10 == 1 && n % 100 != 11)
    {
      ord = 'st';
    }
    else if (n % 10 == 2 && n % 100 != 12)
    {
      ord = 'nd';
    }
    else if (n % 10 == 3 && n % 100 != 13)
    {
      ord = 'rd';
    }
  
    return ord;
  }
  