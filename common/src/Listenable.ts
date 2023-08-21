export default abstract class Listenable<TEvents extends Events>{
    private eventToIdsMap = new Map<keyof TEvents, number[]>();
    private idToCallbackMap = new Map<number, { event: keyof TEvents, callback: (data: TEvents[any]) => void }>();
    private idCounter = 0;

    public listen<Event extends keyof TEvents>(event: Event, callback: (data: TEvents[Event]) => void): number {
        let id = this.idCounter++;

        let ids = this.eventToIdsMap.get(event);
        if (ids == undefined) {
            let list: number[] = [];
            this.eventToIdsMap.set(event, list);
            ids = list;
        }
        ids.push(id);
        this.idToCallbackMap.set(id, { event, callback });

        return id;
    }

    public unlisten(callbackId: number | null | undefined) {
        if (callbackId === null || callbackId === undefined) return;
        let e = this.idToCallbackMap.get(callbackId);
        if (e) {
            let list = this.eventToIdsMap.get(e.event);
            if (list) {
                let i = list.findIndex(id => id === callbackId);
                if (i !== -1) list.splice(i, 1);
            }
            this.idToCallbackMap.delete(callbackId);
        }
    }

    protected trigger<Event extends keyof TEvents>(event: Event, data: TEvents[Event]) {
        let ids = this.eventToIdsMap.get(event);
        if (!ids) return;
        for (let callbackId of ids) {
            this.idToCallbackMap.get(callbackId)?.callback(data);
        }
    }
}

type Events = {
    [id: number | string]: any
}