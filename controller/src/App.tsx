import React, { useRef, useState, useEffect } from 'react';
import s from './App.module.css';
import ScreenControl from './ScreenControl';
import Scorer from './Scorer';
import { Activities, GEvent, GameConnection, GameState, } from 'triviakit-common';

const SERVER_PORT = 8334;
export default function App() {
    const conn = useRef<GameConnection>();
    const [ game, setGame ] = useState<GameState>();
    const [ activities, setActivities ] = useState<Activities>({});

    useEffect(function connect() {
        let host = window.location.hostname;
        conn.current = new GameConnection(`ws://${host}:${SERVER_PORT}/ws`);
        conn.current.listen(GEvent.GameState, setGame);
        conn.current.listen(GEvent.Activities, setActivities);

        return () => {
            conn.current?.close()
        }
    }, []);

    const [ rootHeight, setRootHeight ] = useState<number>(window.innerHeight);
    useEffect(function size() {
        const obs = new ResizeObserver(entries => {
            setRootHeight(window.innerHeight);
        });
        obs.observe(document.body);
        return () => {
            obs.disconnect();
        }
    }, []);

    return (
        <div className={s.root} style={{ height: rootHeight }}>
            <div>
                <ScreenControl game={game} activities={activities} send={conn.current ? (c, d) => conn.current?.sendCommand(c, d) : () => {}} />
            </div>
            {/* <div style={{ borderLeft: '1px solid white'}}>
                <Scorer game={game} />
            </div> */}
        </div>
    );
}
