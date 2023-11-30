export type Activities = {
    [id: number | string]: Activity
}

export type Activity = MediaActivity | OtherActivity;
export type ActivityBase = {
    id: number | string;
    parentId?: number | string;
    type: MediaType | ActivityType;
}

export function isActivityBase(obj: any): obj is ActivityBase {
    return obj !== undefined 
            && (typeof obj.id === 'number' || typeof obj.id === 'string')
}

export enum MediaType {
    Image = 'img',
    Audio = 'audio',
    Video = 'video',
    Text = 'txt'
}
export const MediaTypeSet = new Set(Object.values(MediaType));

export enum MediaFit {
    Cover = 'cover',
    Contain = 'contain'
}
export interface MediaActivity extends ActivityBase {
    type: MediaType,
    file: string,
    fit?: MediaFit,
    autoPlay?: boolean,
    /**
     * (Optional) Automatically pause playback at one or more times, specified in seconds.
     */
    pauseAt?: number | number[]
}

export enum ActivityType {
    Reveal = 'reveal',
    FourChoice = '4 choice',
    MediaList = 'media list'
}
export const ActivityTypeSet = new Set(Object.values(ActivityType));

export interface OtherActivity extends ActivityBase {
    type: ActivityType
}

export interface RevealActivity extends OtherActivity {
    type: ActivityType.Reveal,
    question: MediaActivity,
    answer: MediaActivity
}

type NotFourChoice = Exclude<Activity, FourChoiceActivity>;
export interface FourChoiceActivity extends OtherActivity {
    type: ActivityType.FourChoice,
    a: NotFourChoice, b: NotFourChoice,
    c: NotFourChoice, d: NotFourChoice
}

export interface MediaListActivity extends OtherActivity {
    type: ActivityType.MediaList,
    items: MediaActivity[]
}