import React, { ReactNode, useContext, useState, useEffect, useRef } from 'react';
import {
    GameState, ActivityType, MediaType, MediaActivity, ActiveReveal, RevealActivity,
    FourChoiceActivity, ActiveFourChoice, ActiveState, OtherActivity, Activity,
    MediaTypeSet, MediaListActivity, ActiveMediaList, MediaFit, PlaybackEffectAction, BuzzerState
} from 'triviakit-common';
import s from './QuestionContent.module.css';
import { Visibility } from './App';
import { useMediaEffect, useBuzzedIn } from './GameStateHooks';
import PauseIcon from '../icons/pause.svg';

export type QuestionContentProps = {
    active?: GameState['active'],
    vis: Visibility
}
export default function QuestionContent(props: QuestionContentProps) {
    const { active } = props;

    let content: ReactNode = null;
    switch (active?.activity?.type) {
        case ActivityType.FourChoice:
            content = (<FourChoiceContent
                act={active.activity as FourChoiceActivity}
                state={active.state as ActiveFourChoice | undefined}
                vis={props.vis} />);
            break;
        case ActivityType.MediaList:
            let actList = active.activity as MediaListActivity;
            let listState = active.state as ActiveMediaList | undefined;
            if (listState) {
                content = (<SingleDisplayActivityContent
                    act={actList.items[listState.activeIndex]}
                    state={undefined}
                    vis={props.vis} />);
            }
            break;
        case ActivityType.Reveal:
        case MediaType.Text:
        case MediaType.Video:
        case MediaType.Image:
        case MediaType.Audio:
            content = (<SingleDisplayActivityContent
                act={active.activity as MediaActivity | RevealActivity}
                state={active.state as ActiveReveal | undefined}
                vis={props.vis} />);
    }

    return (
        <div className={s.root}>
            {content}
        </div>
    )
}
type ActivityRendererProps = { m: MediaActivity, vis: Visibility };
type ActivityRenderer = (props: ActivityRendererProps) => ReactNode;

const fourChoiceBorder = '5px solid white';
function FourChoiceContent(props: { act: FourChoiceActivity, state?: ActiveFourChoice, vis: Visibility }) {
    if (!isSingleDisplayable(props.act.a)) return;
    if (!isSingleDisplayable(props.act.b)) return;
    if (!isSingleDisplayable(props.act.c)) return;
    if (!isSingleDisplayable(props.act.d)) return;
    return (
        <div className={s.fourChoiceRoot}>
            <div style={{ borderRight: fourChoiceBorder, borderBottom: fourChoiceBorder }}>
                <SingleDisplayActivityContent
                    act={props.act.a}
                    state={props.state?.a}
                    vis={props.vis} />
                <div className={s.choiceLabel}>
                    <p>A</p>
                </div>
            </div>
            <div style={{ borderLeft: fourChoiceBorder, borderBottom: fourChoiceBorder }}>
                <SingleDisplayActivityContent
                    act={props.act.b}
                    state={props.state?.b}
                    vis={props.vis} />
                <div className={s.choiceLabel}>
                    <p>B</p>
                </div>
            </div>
            <div style={{ borderRight: fourChoiceBorder, borderTop: fourChoiceBorder }}>
                <SingleDisplayActivityContent
                    act={props.act.c}
                    state={props.state?.c}
                    vis={props.vis} />
                <div className={s.choiceLabel}>
                    <p>C</p>
                </div>
            </div>
            <div style={{ borderLeft: fourChoiceBorder, borderTop: fourChoiceBorder }}>
                <SingleDisplayActivityContent
                    act={props.act.d}
                    state={props.state?.d}
                    vis={props.vis} />
                <div className={s.choiceLabel}>
                    <p>D</p>
                </div>
            </div>
        </div>
    )
}

function isSingleDisplayable(a: Activity): a is MediaActivity | RevealActivity {
    return MediaTypeSet.has(a.type as any) || a.type === ActivityType.Reveal;
}

type SingleDisplayActivityContentProps = {
    act: MediaActivity | RevealActivity, state?: ActiveState, vis: Visibility
}
function SingleDisplayActivityContent(props: SingleDisplayActivityContentProps) {
    switch (props.act.type) {
        case ActivityType.Reveal:
            let showAnswer = (props.state && (props.state as ActiveReveal).showAnswer) || false;
            let revealed = showAnswer && props.act ? props.act.answer : props.act.question;
            return <MediaActivityContent m={revealed} vis={props.vis} />;
        default:
            return <MediaActivityContent m={props.act} vis={props.vis} />;
    }
}

function MediaActivityContent(props: ActivityRendererProps) {
    const { m, vis } = props;

    let autoPlay = m.autoPlay !== undefined ? m.autoPlay : true;
    let fit = m.fit || 'cover';

    const [mediaPlaying, setMediaPlaying] = useState<boolean>(false);
    const [effectStatus, setEffectStatus] = useState<PlaybackEffectAction.Play | PlaybackEffectAction.Pause>();
    const [playKey, setPlayKey] = useState<number>(0);
    useMediaEffect(effect => {
        if (effect.targetActivityId === m.id || effect.parentActivityId === m.id) {
            if (effect.action === PlaybackEffectAction.Restart) {
                setPlayKey(playKey + 1);
                setEffectStatus(PlaybackEffectAction.Play);
            } else {
                if (effect.action === PlaybackEffectAction.Play && !mediaPlaying) {
                    setPlayKey(playKey + 1);
                }
                setEffectStatus(effect.action);
            }
        }
    });

    useBuzzedIn(function onBuzzedIn() {
        setEffectStatus(PlaybackEffectAction.Pause);
    });

    const playing = vis === Visibility.OnScreen && (
        (effectStatus === undefined && autoPlay) ||
        (effectStatus !== undefined && effectStatus === PlaybackEffectAction.Play)
    );

    let content = null;
    let pauseable = false;

    switch (m.type) {
        case MediaType.Text:
            content = <TitleText textUrl={m.file} />
            break;
        case MediaType.Video:
            content = <VideoContent url={m.file} objectFit={fit}
                onStart={() => setMediaPlaying(true)} onEnd={() => setMediaPlaying(false)}
                playing={playing} playKey={playKey} key={m.id} />
            pauseable = true;
            break;
        case MediaType.Image:
            content = <ImageContent url={m.file} objectFit={fit} />
            break;
        case MediaType.Audio:
            content = <AudioContent url={m.file} objectFit={fit}
                onStart={() => setMediaPlaying(true)} onEnd={() => setMediaPlaying(false)}
                playing={playing} playKey={playKey} />
            pauseable = true;
            break;
    }


    if (pauseable) {
        return (
        <div className={s.pauseWrapper}>
            {content}
            <div className={s.pauseOverlay} style={effectStatus !== PlaybackEffectAction.Pause ? { display: 'none '} : {}}>
                <img src={PauseIcon} />
            </div>
        </div>
    )} else {
        return content;
    }
}

type PlayableContentProps = {
    url: string, playing: boolean, objectFit: string, playKey: number,
    onStart: () => void, onEnd: () => void
};
function usePlayback(playerRef: React.RefObject<HTMLMediaElement>, props: PlayableContentProps) {
    const { playing, playKey, onStart, onEnd, url } = props;

    const [mediaPlaying, setMediaPlaying] = useState<boolean>(false);
    useEffect(function listen() {
        function onPlaying() {
            setMediaPlaying(true);
            onStart();
        }
        function onEnded() {
            setMediaPlaying(false);
            onEnd();
        }

        if (playerRef.current) {
            playerRef.current.addEventListener('playing', onPlaying);
            playerRef.current.addEventListener('ended', onEnded);
        }

        return () => {
            playerRef.current?.removeEventListener('playing', onPlaying);
            playerRef.current?.removeEventListener('ended', onEnded);
        }
    }, [playerRef.current]);

    useEffect(function playback() {
        if (playerRef.current) {
            if (playing) {
                playerRef.current.play().catch(err => {
                    console.warn('Question media playback error', err);
                    window.addEventListener('click', () => playerRef.current?.play(), { once: true });
                });
            } else {
                playerRef.current.pause();
            }
        }
    }, [playKey, playing, playerRef.current, url ]);

    useEffect(function restart() {
        if (playerRef.current) {
            playerRef.current.currentTime = 0;
        }
    }, [playKey]);

    return mediaPlaying;
}

function VideoContent(props: PlayableContentProps) {
    const vidRef = useRef<HTMLVideoElement>(null);
    usePlayback(vidRef, props);

    return (
        <video ref={vidRef} className={s.qVideo} src={props.url} style={{ objectFit: props.objectFit as any }} />
    )
}

function AudioContent(props: PlayableContentProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const mediaPlaying = usePlayback(audioRef, props);

    let style = {};
    if (!props.playing || !mediaPlaying) {
        style = { filter: 'grayscale(1)' };
    }
    return (
        <div className={s.qAudio} style={style}>
            <AudioIcon />
            <audio ref={audioRef} src={props.url} />
        </div>
    )

}

function ImageContent(props: { url: string, objectFit: string }) {
    return (
        <img className={s.qImage} src={props.url} style={{ objectFit: props.objectFit as any }} />
    )
}

function TitleText(props: { textUrl: string }) {
    const [text, setText] = useState<string>();

    useEffect(function fetchFile() {
        fetch(props.textUrl)
            .then(async res => {
                if (res.ok) {
                    setText(await res.text());
                } else {
                    console.error(`Error response fetching question text content ${res.status} ${res.statusText}`, res);
                }
            })
            .catch(err => console.error('Failed to fetch question text content', err));
    }, [props.textUrl]);

    return (
        <div className={s.bigText}>
            {text && <p dangerouslySetInnerHTML={{ __html: text }}></p>}
        </div>
    )
}

function AudioIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 25" x="0px" y="0px">
            <g>
                <g>
                    <g>
                        <rect x="25.47" width="2" height="23.67" />
                        <rect x="21.22" y="4.76" width="2" height="14.15" />
                        <rect x="16.98" y="6.53" width="2" height="10.61" />
                        <rect x="12.73" y="5.47" width="2" height="12.73" />
                        <rect x="8.49" y="3.35" width="2" height="16.98" />
                        <rect x="4.25" y="2.29" width="2" height="19.1" />
                        <rect y="6.53" width="2" height="10.61" />
                        <rect x="30.78" y="5.47" width="2" height="12.73" />
                        <rect x="35.02" y="3.35" width="2" height="16.98" />
                        <rect x="39.27" y="6.53" width="2" height="10.61" />
                        <rect x="43.51" y="2.29" width="2" height="19.1" />
                        <rect x="47.75" y="3.35" width="2" height="16.98" />
                        <rect x="52" y="5.47" width="2" height="12.73" />
                    </g>
                </g>
            </g>
        </svg>
    )
}