import { Session, segment } from 'koishi';
import { type Config } from './index';
interface EventData {
    id: string;
    message: segment[];
}
export declare const SessionEventManagerMap: Map<string, SessionEventManager>;
export declare class SessionEventManager {
    private eventSource;
    private timeout;
    private session;
    private id;
    constructor(session: Session, id: string, timeout: number, config: Config);
    handleEvent(event: EventData, config: Config): void;
    private createEventTimeoutObservable;
    private destroyEventSource;
    triggerEvent(event: EventData): void;
}
export {};
