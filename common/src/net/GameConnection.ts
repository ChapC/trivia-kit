import { Effect } from "../Effect";
import { GameState } from "../GameState";
import Listenable from "../Listenable";
import { Activities } from "../Media";
import { CommandMessage, GameCommand } from "./CommandProtocol";
import { EventMessageType, isEventMessage } from "./EventProtocol";

export enum GEvent {
    Connected = 0,
    Connecting = 1,
    Disconnected = 2,
    GameState = 3,
    Activities = 4,
    Effect = 5,
}
export type GameEventData = {
    [GEvent.Connected]: null,
    [GEvent.Connecting]: null,
    [GEvent.Disconnected]: null,
    [GEvent.GameState]: GameState,
    [GEvent.Activities]: Activities,
    [GEvent.Effect]: Effect
}
const HEARTBEAT_TIMEOUT = 5000;
export default class GameConnection extends Listenable<GameEventData> {
    private ws: WebSocket | null = null;

    constructor(private url: string) {
        super();
        this.tryConnect();
    }

    private tryConnect() {
        console.info(`[GameConnection] Attempting connection to server at ${this.url}`);
        this.ws = new WebSocket(this.url);
        this.ws.addEventListener('open', (ev) => {
            console.info(`[GameConnection] Connected to server`);
            this.reconnectDelay = 0;
            this.heartbeat();
            this.trigger(GEvent.Connected, null);
        });
        this.ws.addEventListener('message', (ev) => {
            try {
                let json = JSON.parse(ev.data);
                this.handleMessage(json);
            } catch (err) {
                console.error('[GameConnection] Received malformed JSON', err);
                // TODO Request gamestate, in case we're out of sync
            }
        });
        this.ws.addEventListener('error', (ev) => {
            console.error('[GameConnection] Socket error', ev);
            this.onDisconnect();
        });
        this.ws.addEventListener('close', (ev) => {
            console.info('[GameConnection] Socket closed', ev);
        });
    }

    private reconnectDelay = 0;
    private onDisconnect() {
        this.trigger(GEvent.Disconnected, null);
        this.ws?.close();
        clearTimeout(this.heartbeatTimeout);
        setTimeout(() => {
            if (this.reconnectDelay < 5000) this.reconnectDelay += 1000;
            this.tryConnect();
        }, this.reconnectDelay);
    }

    private heartbeatTimeout: number | undefined;
    private heartbeat() {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = window.setTimeout(() => {
            console.error('[GameConnection] Missed heartbeat, closing socket');
            this.onDisconnect();
        }, HEARTBEAT_TIMEOUT);
    }
    private lastGameStateTime: number | null = null;

    private handleMessage(data: any) {
        if (!isEventMessage(data)) return;
        switch (data.type) {
            case EventMessageType.Heartbeat:
                this.heartbeat();
                break;
            case EventMessageType.GameState:
                if (data.time >= (this.lastGameStateTime || 0)) {
                    this.lastGameStateTime = data.time;
                    this.trigger(GEvent.GameState, data.state);
                }
                break;
            case EventMessageType.Activities:
                this.trigger(GEvent.Activities, data.activities);
                break;
            case EventMessageType.Effect:
                this.trigger(GEvent.Effect, data.effect);
                break;
        }
    }

    public sendCommand(command: GameCommand, data?: CommandMessage['data']) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws?.send(JSON.stringify({
                command, data
            }));
        }
    }

    public close() {
        this.ws?.close();
    }
}