import React, { useEffect, useRef, useState } from 'react';
import s from './App.module.css';
import { GameConnection, GEvent, GameCommand, Player, GameState } from 'triviakit-common';
import Buzzer from './Buzzer';
import PlayerSelect from './PlayerSelect';

const SERVER_PORT = 8334;
const SavedPlayerIDKey = 'buzzer-SavedID';
enum Connection {
    Disconnected = 'Disconnected',
    Connecting = 'Connecting...',
    Connected = 'Connected'
}

const connectionColour = {
    [Connection.Disconnected]: 'red',
    [Connection.Connecting]: 'red',
    [Connection.Connected]: 'yellowgreen'
}

export default function App() {
    const conn = useRef<GameConnection | null>(null);
    const [connection, setConnection] = useState<Connection>(Connection.Disconnected);
    const [game, setGame] = useState<GameState | null>(null);
    const [myPlayerId, setMyPlayerId] = useState<number | null>(null);

    useEffect(function connect() {
        let host = window.location.hostname;
        conn.current = new GameConnection(`ws://${host}:${SERVER_PORT}/ws`);
        conn.current.listen(GEvent.Connected, () => setConnection(Connection.Connected));
        conn.current.listen(GEvent.Connecting, () => setConnection(Connection.Connecting));
        conn.current.listen(GEvent.Disconnected, () => setConnection(Connection.Disconnected));
        conn.current.listen(GEvent.GameState, setGame);

        return () => {
            conn.current?.close()
        }
    }, []);

    if (game && myPlayerId !== null && game.players[myPlayerId] == undefined) {
        setMyPlayerId(null);
        return;
    }

    useEffect(function savedPlayerId() {
        let savedId = localStorage.getItem(SavedPlayerIDKey);
        if (savedId) {
            try {
                setMyPlayerId(parseInt(savedId));
            } catch (err) {
                console.error('Failed to load saved playerID', err);
                localStorage.removeItem(SavedPlayerIDKey);
            }
        }
    }, []);

    function selectPlayer(playerId: number) {
        localStorage.setItem(SavedPlayerIDKey, playerId.toString());
        setMyPlayerId(playerId);
    }

    function buzzIn() {
        if (connection !== Connection.Connected || myPlayerId === null) return;
        conn.current!.sendCommand(GameCommand.Buzz, {
            playerId: myPlayerId
        });
    }

    let playerImgSrc = myPlayerId !== null && game ? game.players[myPlayerId].imgUrl : '';
    let buzzedIn = null;
    if (game && game.buzzers.enabled && myPlayerId !== null) {
        let i = game.buzzers.state?.findIndex(s => s.playerId === myPlayerId);
        if (i !== undefined && i > -1) {
            buzzedIn = i + 1;
        }
    }

    const imgLongPress = useRef<number>();
    function imgDown(ev: React.BaseSyntheticEvent) {
        ev.preventDefault();
        ev.stopPropagation();
        window.clearTimeout(imgLongPress.current);
        imgLongPress.current = window.setTimeout(() => {
            localStorage.removeItem(SavedPlayerIDKey);
            setMyPlayerId(null);
        }, 2000);
    }

    function imgUp() {
        window.clearTimeout(imgLongPress.current);
    }

    return (
        <div className={s.root}>
            {
                myPlayerId === null ?
                    (
                        <PlayerSelect game={game} onSelect={selectPlayer} />
                    ) : (
                        <>
                            <div className={s.header}>
                                <div className={s.netStatus}>
                                    <div className={s.netBlip}
                                        style={{
                                            backgroundColor: connectionColour[connection]
                                        }}></div>
                                    <p style={connection === Connection.Disconnected ? { color: 'red' } : {}}>{connection}</p>
                                </div>
                                <img className={s.profilePic} src={playerImgSrc}
                                    onPointerDown={imgDown}
                                    onPointerUp={imgUp} 
                                    onPointerCancel={imgUp} 
                                    onContextMenu={ev => ev.preventDefault()}></img>
                            </div>
                            <div className={s.buzzerArea} onPointerDown={buzzIn}>
                                <Buzzer game={game} buzzedIn={buzzedIn} />
                            </div>
                        </>
                    )
            }
        </div>
    );
}