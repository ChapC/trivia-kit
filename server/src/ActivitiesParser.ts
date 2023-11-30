import { existsSync, readdirSync } from "fs";
import { Activities, MediaType, ActivityType, MediaActivity, Activity,  FourChoiceActivity, MediaListActivity, RevealActivity, MediaFit } from "triviakit-common";
import YAML from 'yaml';
import path from 'path';
import { MEDIA_HOME } from ".";

const ActivityTypeValues = new Set(Object.values(ActivityType));
const MediaTypeValues = new Set(Object.values(MediaType));
export default function parseActivities(yaml: string, mediaUrlRoot: string): Activities {
  let root = YAML.parse(yaml);
  let activities: Activities = {};

  let name = undefined;
  if (typeof root.name === 'string') {
    name = root.name;
  }

  if (!root.activities) throw Error('Must have an "activities" entry at the top level');
  let aKeys = Object.keys(root.activities);
  if (aKeys.length === 0) throw Error('Must have at least one activity');

  for (let id of aKeys) {
    let aObj = root.activities[id];
    try {
        activities[id] = validateActivity(id, aObj, mediaUrlRoot, id);
    } catch (err) {
        console.warn(err);
    }
  }

  return activities;
}

function validateActivity(id: number | string, obj: any, mediaUrlRoot: string, topLevelParentId: number | string): Activity {
    if (typeof obj.file === 'string') {
        let media = validateMediaActivity(id, obj.file, obj, mediaUrlRoot);
        return media;
    } else if (ActivityTypeValues.has(obj.type)) {
        switch (obj.type) {
            case ActivityType.Reveal:
                if (typeof obj.question !== 'object' || typeof obj.answer !== 'object') {
                    throw Error(`[${id}] Reveal questions must have 'question' and 'answer' properties`);
                }

                let q = validateActivity(id + '-q', obj.question, mediaUrlRoot, topLevelParentId);
                q.parentId = topLevelParentId;
                let ans = validateActivity(id + '-ans', obj.answer, mediaUrlRoot, topLevelParentId);
                ans.parentId = topLevelParentId;
                if (!activityIsMedia(q) || !activityIsMedia(ans)) {
                    throw Error(`[${id}] Reveal 'question' and 'answer' activities must be MediaActivities (link to a file)`);
                }
                let reveal: RevealActivity = {
                    id, type: ActivityType.Reveal,
                    question: q, answer: ans
                };
                return reveal;
            case ActivityType.MediaList:
                let items = [];
                if (typeof obj.itemsFolder === 'string') {
                    let c = new Intl.Collator([], { numeric: true });
                    items.push(...readdirSync(path.join(MEDIA_HOME, obj.itemsFolder)).map(f => obj.itemsFolder + '/' + f).sort((a, b) => c.compare(a, b)));
                }
                if (typeof obj.items !== 'object' && !Array.isArray(obj.items)) {
                    if (items.length === 0) throw Error(`[${id}] MediaList activities must have an array property 'items'`);
                } else {
                    items.push(...obj.items);
                }
                let medias: MediaActivity[] = [];
                for (let i = 0; i < items.length; i++) {
                    let file = items[i];
                    if (typeof file === 'string') {
                        medias.push(validateMediaActivity(`${id}-${i}`, file, obj, mediaUrlRoot));
                    } else {
                        throw Error(`[${id}] All items in MediaList activities must be file paths`);
                    }
                }
                let list: MediaListActivity = {
                    id: id,
                    type: ActivityType.MediaList,
                    items: medias
                };
                return list;
            case ActivityType.FourChoice:
                if (typeof obj.a === 'object' && typeof obj.b === 'object' && 
                    typeof obj.c === 'object' && typeof obj.d === 'object') {
                        let fourChoice: FourChoiceActivity = {
                            id, type: ActivityType.FourChoice,
                            a: validateActivity(id + '-a', obj.a, mediaUrlRoot, topLevelParentId),
                            b: validateActivity(id + '-b', obj.b, mediaUrlRoot, topLevelParentId),
                            c: validateActivity(id + '-c', obj.c, mediaUrlRoot, topLevelParentId),
                            d: validateActivity(id + '-d', obj.d, mediaUrlRoot, topLevelParentId)
                        };
                        fourChoice.a.parentId = topLevelParentId;
                        fourChoice.b.parentId = topLevelParentId;
                        fourChoice.c.parentId = topLevelParentId;
                        fourChoice.d.parentId = topLevelParentId;
                        return fourChoice;
                    } else {
                        throw Error(`[${id}] 4 choice questions must have abcd properties`);
                    }
            default:
                throw Error(`[${id}] Unsupported other activity type ${obj.type}`);
        }
    } else {
      throw Error(`[${id}] Unsupported activity type ${obj.type}`);
    }
}

function activityIsMedia(a: Activity): a is MediaActivity {
    return typeof (a as any).file === 'string' && MediaTypeValues.has(a.type as any);
}

function validateMediaActivity(id: number | string, file: string, obj: any, mediaUrlRoot: string): MediaActivity {
    let split = file.split('.');
    if (split.length === 0) throw Error(`[${id}] Invalid file path - no extension`);
    let ext = split[split.length - 1].trim().toLowerCase();
    let mediaType: MediaType;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'avif'].includes(ext)) {
        mediaType = MediaType.Image;
    } else if (['mp4', 'mov'].includes(ext)) {
        mediaType = MediaType.Video;
    } else if (ext === 'txt') {
        mediaType = MediaType.Text;
    } else if (['mp3', 'aac', 'wav'].includes(ext)) {
        mediaType = MediaType.Audio;
    } else {
        throw Error(`[${id}] Unsupported media extension ${ext}`);
    }

    if (!existsSync(path.join(MEDIA_HOME, file))) {
        console.warn(`[${id}] WARN Media not found (${file})`);
    }

    let fit = undefined;
    if (typeof obj.fit === 'string' && (obj.fit === MediaFit.Contain || obj.fit === MediaFit.Cover)) {
        fit = obj.fit;
    }

    let autoPlay = true;
    if (typeof obj.autoPlay === 'boolean') {
        autoPlay = obj.autoPlay;
    }

    let pauseAt = undefined;
    if (typeof obj.pauseAt === 'number') {
        pauseAt = obj.pauseAt;
    } else if (typeof obj.pauseAt === 'object' && typeof obj.pauseAt.length === 'number') {
        if (obj.pauseAt.length > 0) {
            let pauseAtList = obj.pauseAt as any[];
            if (pauseAtList.every(o => typeof o === 'number')) {
                pauseAt = obj.pauseAt;
            } else {
                throw Error(`[${id}] Unsupported type encountered in pauseAt list. All list elements must be numbers.`);
            }
        }
    } else if (typeof obj.pauseAt !== 'undefined') {
        throw Error(`[${id}] Unsupported type '${typeof obj.pauseAt}' for pauseAt property. Must be number or list of numbers.`);
    }

    return {
        id, file: mediaUrlRoot + file,
        type: mediaType,
        fit, autoPlay, pauseAt
    }
}