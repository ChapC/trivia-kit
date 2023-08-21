import React, { ReactNode, useState } from 'react';
import s from './ScreenControl.module.css';
import { ActiveFourChoice, ActiveReveal, ActiveState, Activities, ActivityType, GameCommand, GameConnection, GameState, MediaActivity, MediaListActivity, ActiveMediaList, PlaybackEffectAction, Effect, EffectType } from 'triviakit-common';
import Toggle from './ToggleSwitch';
import BackIcon from '../icons/back.svg';
import { Activity, FourChoiceActivity, MediaType, RevealActivity } from 'triviakit-common/dist/Media';
import PlayIcon from '../icons/play.svg';
import ReplayIcon from '../icons/replay.svg';
import PauseIcon from '../icons/pause.svg';

export type ScreenControlProps = {
    game?: GameState,
    send: GameConnection['sendCommand'],
    activities: Activities
}
export default function ScreenControl(props: ScreenControlProps) {
    const { game, activities, send } = props;
    const [ navigatedActId, setNavigatedActId ] = useState<Activity['id'] | null>(null);
    const selectedActivity = game?.active.activity || (navigatedActId ? activities[navigatedActId] : null);
    const aState = game?.active.state;

    function sendActivity(id: string | number | null, state?: ActiveState) {
        send(GameCommand.SetActivity, {
            activityId: id, state
        });
    }

    function updateActivityState(activityId: string | number, state?: ActiveState) {
        sendActivity(activityId, state);
    }

    function sendMediaEffect(forActivity: string | number, action: PlaybackEffectAction) {
        send(GameCommand.SendEffect, {
            effect: {
                type: EffectType.PlaybackEffect,
                action, targetActivityId: forActivity,
                parentActivityId: (selectedActivity?.parentId || selectedActivity?.id)
            }
        });
    }

    function onBack() {
        if (selectedActivity && selectedActivity.id === game?.active.activity?.id) {
            sendActivity(null);
        }
        setNavigatedActId(null);
    }

    let buttons: ReactNode[] = [];
    if (selectedActivity) {
        buttons.push((
            <div key={'back'} className={s.touch + ' ' + s.rectangle + ' ' + s.touchEffect}
                style={{ justifyContent: 'space-evenly' }}
                onClick={onBack}>
                <img src={BackIcon} className={s.smallIcon} />
                <p>{ selectedActivity.id === game?.active.activity?.id ? 'Close activity' : 'Back'}</p>
            </div>
        ));

        switch (selectedActivity.type) {
            case ActivityType.FourChoice:
                let fourAct = (selectedActivity as FourChoiceActivity);
                let fourState = aState as ActiveFourChoice | undefined;
                for (let o of ['a', 'b', 'c', 'd']) {
                    let option = o as 'a' | 'b' | 'c' | 'd';
                    function onOptionStateChange(nestedActivityId: string | number, state?: ActiveState) {
                        if (state?.type === ActivityType.FourChoice) return;
                        let mergedState: ActiveFourChoice = { 
                            type: ActivityType.FourChoice, 
                            a: fourState?.a, b: fourState?.b,
                            c: fourState?.c, d: fourState?.d,
                        };
                        mergedState[option] = state;
                        updateActivityState(fourAct.id, mergedState); 
                    }
                    buttons.push((
                        <div key={selectedActivity.id + 'media' + option} className={s.touch + ' ' + s.rectangle}>
                            <ActivityControl act={fourAct[option]} actState={fourState ? fourState[option] : undefined} 
                                onStateChange={onOptionStateChange} onMediaAction={sendMediaEffect} />
                        </div>
                    ));
                }
                break;
            case ActivityType.MediaList:
                let listAct = (selectedActivity as MediaListActivity);
                let actState = aState as ActiveMediaList | undefined;
                for (let i = 0; i < listAct.items.length; i++) {
                    let item = listAct.items[i];
                    function onMediaSelected() {
                        let newListState: ActiveMediaList = {
                            type: ActivityType.MediaList,
                            activeIndex: i
                        };
                        updateActivityState(listAct.id, newListState);
                    }
                    buttons.push((
                        <div key={selectedActivity.id + item.id.toString()} className={s.touch + ' ' + s.rectangle}
                            style={(actState && actState.activeIndex === i) ? { backgroundColor: 'green' } : {}}>
                            <ActivityControl act={item} actState={undefined} 
                                onStateChange={onMediaSelected} onMediaAction={sendMediaEffect} />
                        </div>
                    ));
                }
                break;
            case ActivityType.Reveal:
            case MediaType.Image:
            case MediaType.Audio:
            case MediaType.Video:
            case MediaType.Text:
                buttons.push((
                    <div key={selectedActivity.id + 'media'} className={s.touch + ' ' + s.rectangle}>
                        <ActivityControl act={selectedActivity} actState={aState} 
                            onStateChange={updateActivityState} onMediaAction={sendMediaEffect} />
                    </div>
                ));
                break;
            default: 
                buttons.push((
                    <div key={selectedActivity['id'] + 'media'} className={s.touch + ' ' + s.rectangle}>
                        <p style={{ color: 'red' }}>Unknown activity {selectedActivity['type']}</p>
                    </div>
                ));
        }
    } else {
        for (let activityName of Object.keys(activities)) {
            buttons.push((
                <div key={activityName} className={s.touch + ' ' + s.touchEffect + ' ' + s.square}
                    onClick={() => setNavigatedActId(activityName)}>
                    <p>{activityName}</p>
                </div>
            ));
        }
    }
    
    let buzzersOn = game?.buzzers.enabled || false;
    return (
        <div className={s.root}>
            <div className={s.aList}>
                {buttons}
            </div>
            <div className={s.buzzers}>
                <Toggle on={buzzersOn} 
                    onClick={() => send(GameCommand.EnableBuzzers, { enabled: !buzzersOn })}
                />
                <p>Buzzers {buzzersOn ? ' on' : ' off'}</p>
                <button onClick={() => send(GameCommand.ResetBuzzers)}>Reset</button>
            </div>
        </div>
    )
}

type ActiveControlProps = {
    act: Activity, actState: ActiveState | undefined, 
    onStateChange: (id: string | number,  state?: ActiveState) => void,
    onMediaAction: (id: string | number, action: PlaybackEffectAction) => void
};
function ActivityControl(props: ActiveControlProps) {
    const { act, actState, onStateChange, onMediaAction } = props;

    function showActivity() {
        onStateChange(act.parentId || act.id);
    }

    function playMedia() {
        showActivity();
        onMediaAction(act.id, PlaybackEffectAction.Play);
    }

    function restartMedia() {
        showActivity();
        onMediaAction(act.id, PlaybackEffectAction.Restart);
    }

    function pauseMedia() {
        showActivity();
        onMediaAction(act.id, PlaybackEffectAction.Pause);
    }

    const [confirmReveal, setConfirmReveal] = useState<number | null>(null);

    switch (act.type) {
        case MediaType.Text:
            return (
                <div className={s.touchEffect + ' ' + s.fillCenter} onClick={showActivity}>
                    <p>Text ({fileName(act.file)})</p>
                </div>
            );
        case MediaType.Image:
            return (
                <div className={s.touchEffect + ' ' + s.fillCenter} onClick={showActivity}>
                    <p>Image ({fileName(act.file)})</p>
                </div>
            );
        case MediaType.Audio:
        case MediaType.Video:
            return (
                <div className={s.media + ' ' + s.fillCenter}>
                    <div className={s.mediaName} onClick={showActivity}>
                        <p>{fileName(act.file)}</p>
                    </div>
                    <div className={s.mediaButtons}>
                        <img className={s.mediaBtn + ' ' + s.touchEffect} src={PlayIcon} onClick={playMedia} />
                        <div className={s.divider} />
                        <img className={s.mediaBtn + ' ' + s.touchEffect} src={PauseIcon} onClick={pauseMedia} />
                        <div className={s.divider} />
                        <img className={s.mediaBtn + ' ' + s.touchEffect} src={ReplayIcon} onClick={restartMedia} />
                    </div>
                </div>
            );
        case ActivityType.Reveal:
            let leftNode: ReactNode;
            let rightNode: ReactNode;
            function revealClicked(id: string | number, showAnswer: boolean) {
                if (showAnswer) {
                    if (confirmReveal === null) {
                        setConfirmReveal(window.setTimeout(() => setConfirmReveal(null), 1000));
                        return;
                    } else {
                        window.clearTimeout(confirmReveal);
                        setConfirmReveal(null);
                    }
                }
                onStateChange(id, { showAnswer, type: ActivityType.Reveal });
            }
            if (!actState || !(actState as ActiveReveal).showAnswer) {
                leftNode = (
                    <div className={s.revealOpen}>
                        <ActivityControl 
                            act={(act as RevealActivity).question} actState={actState}
                            onStateChange={(id) => revealClicked(id, false)}
                            onMediaAction={onMediaAction}
                        />
                    </div>
                );
                rightNode = (
                    <div className={s.revealClosed} onClick={() => revealClicked(act.id, true)}>
                        <p>{ !confirmReveal ? 'Reveal answer' : 'Tap again' }</p>
                    </div>
                );
            } else {
                leftNode = (
                    <div className={s.revealClosed} onClick={() => revealClicked(act.id, false)}>
                        <p>Show question</p>
                    </div>
                );
                rightNode = (
                    <div className={s.revealOpen}>
                        <ActivityControl 
                            act={(act as RevealActivity).answer} actState={actState}
                            onStateChange={(id) => revealClicked(id, true)}
                            onMediaAction={onMediaAction}
                        />
                    </div>
                );
            }

            return (
                <>
                    {leftNode}
                    <div className={s.divider}></div>
                    {rightNode}
                </>
            )
    }
}

function fileName(f: string): string {
    let s = f.split('/');
    if (s.length > 0) {
        return s[s.length - 1];
    } else {
        return f;
    }
}