import React, { useRef, useEffect } from "react"
import s from './PlayerBuzzer.module.css';
import LightningIcon from '../../icons/lightning.svg';
import { CSSTransition } from 'react-transition-group';
import FillIn from './FillIn.module.css';
import BoltIn from './BoltIn.module.css';
import NumberIn from './NumberIn.module.css';

export default function PlayerBuzzer(props: { img: string, height?: string, buzzedIn?: boolean, buzzedNumber?: number }) {
    const fillRef = useRef(null);
    const boltRef = useRef(null);
    const buzzNumRef = useRef(null);

    return (
            <div className={s.root} style={{ height: props.height || '10vh' }}>
                <div className={s.content}>
                    <img className={s.profilePic} src={props.img}>
                    </img>
                    <div className={s.boltContainer}>
                        <CSSTransition nodeRef={boltRef} timeout={250} classNames={{...BoltIn}} in={props.buzzedIn === true} mountOnEnter>
                            <img ref={boltRef} className={s.buzzedBolt} src={LightningIcon} />
                        </CSSTransition>
                        <CSSTransition nodeRef={buzzNumRef} timeout={250} classNames={{...NumberIn}} 
                            in={props.buzzedIn === true && props.buzzedNumber !== undefined} mountOnEnter>
                            <div ref={buzzNumRef} className={s.buzzedNumber}>
                                <p>{props.buzzedNumber}</p>
                            </div>
                        </CSSTransition>
                    </div>
                </div>
                <CSSTransition nodeRef={fillRef} timeout={250} classNames={{...FillIn}} in={props.buzzedIn === true} mountOnEnter>
                    <div ref={fillRef} className={s.buzzedFill} ></div>
                </CSSTransition>
            </div>
    )
}