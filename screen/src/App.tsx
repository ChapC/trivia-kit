import React, { useEffect, useRef, useState, createContext } from 'react';
import s from './App.module.css';
import emojis from './Emojis';
import BuzzersSidebar from './BuzzersSidebar';
import BuzzersSlideIn from './BuzzersSlideIn.module.css';
import { CSSTransition } from 'react-transition-group';
import { BuzzerState, GEvent, GameConnection, GameState, } from 'triviakit-common';
import QuestionContent from './QuestionContent';
import QCardIn from './QCardIn.module.css';

const SERVER_PORT = 8334;
export enum Visibility {
    OnScreen, Transitioning, OffScreen
}
export default function App() {
    const conn = useRef<GameConnection | null>(null);
    const [ game, setGame ] = useState<GameState>();

    const [ qCardVis, setQCardVis ] = useState<Visibility>(Visibility.OffScreen);
    const [ showQCard, setShowQCard ] = useState<boolean>(false);

    const lastActiveRef = useRef<GameState['active'] | null>(null);
    const [ currentActive, setCurrentActive ] = useState<GameState['active']>({});

    function onGameChanged(newState: GameState) {
        let newActive = newState.active;
        let lastActive = lastActiveRef.current;
        if (newActive.activity?.id !== lastActive?.activity?.id) {
            // New activity
            if (lastActive?.activity) {
                // Need to transition this card out before changing activity
                setShowQCard(false);
            } else {
                setShowQCard(true);
                setCurrentActive(newActive);
            }
        } else if (newActive.activity) {
            // Same activity
            setCurrentActive(newActive);
        }
        setGame(newState);
        lastActiveRef.current = newState.active;
    }

    if (!showQCard && qCardVis === Visibility.OffScreen && game?.active.activity && currentActive.activity && 
        game.active.activity.id !== currentActive.activity.id) {
            // There's a new activity to show
            setShowQCard(true);
            setCurrentActive(game.active);
    }

    useEffect(function connect() {
        let host = window.location.hostname;
        conn.current = new GameConnection(`ws://${host}:${SERVER_PORT}/ws`);
        conn.current.listen(GEvent.GameState, onGameChanged);

        return () => {
            conn.current?.close()
        }
    }, []);


    const qCardNode = useRef(null);
    const showBuzzers = game?.buzzers.enabled || false;
    const buzzSideNode = useRef(null);
    return (
        <div className={s.root}>
            <div className={s.bg + ' ' + s.zigZag}></div>
            <div className={s.qContainer}>
                <div className={s.qBuzzerGap} style={showBuzzers ? {} : { width: 0 }}></div>
                <CSSTransition in={showQCard} nodeRef={qCardNode} timeout={750}
                    classNames={{...QCardIn}} mountOnEnter unmountOnExit
                    onEntering={() => setQCardVis(Visibility.Transitioning)} onExiting={() => setQCardVis(Visibility.Transitioning)}
                    onEntered={() => setQCardVis(Visibility.OnScreen)} onExited={() => setQCardVis(Visibility.OffScreen)}>
                    <div className={s.qCard} ref={qCardNode}>
                        <GameConnectionContext.Provider value={conn.current}>
                            <QuestionContent active={currentActive} vis={qCardVis} />
                        </GameConnectionContext.Provider>
                    </div>
                </CSSTransition>
            </div>
            <CSSTransition in={showBuzzers} nodeRef={buzzSideNode} timeout={750} classNames={{...BuzzersSlideIn}} mountOnEnter>
                <div ref={buzzSideNode} className={s.pContainer}>
                    <BuzzersSidebar players={game?.players} buzzers={game?.buzzers.state} playAudio={showBuzzers} />
                </div>
            </CSSTransition>
        </div>
    );
}
export const GameConnectionContext = createContext<GameConnection | null>(null);

function RandomEmoji(props: { style?: React.CSSProperties }) {
    let i = Math.floor(Math.random() * emojis.length);
    return (
        <p className={s.bgEmoji} style={props.style}>{emojis[i]}</p>
    )
}