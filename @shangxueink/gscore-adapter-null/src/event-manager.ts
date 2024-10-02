import { Session, segment } from 'koishi';
import { Subject, timer, Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { logger, type Config } from './index';
// 创建一个带有标识符的事件源
interface EventData {
    id: string;
    message: segment[];
}

export const SessionEventManagerMap = new Map<string, SessionEventManager>();

export class SessionEventManager {
    private eventSource = new Subject<EventData>();

    private timeout!: number;

    private session!: Session;

    private id!: string;

    constructor(session: Session, id: string, timeout = 120000, config: Config) {
        this.session = session;
        this.timeout = timeout;
        this.id = id;
        SessionEventManagerMap.set(id, this);
        this.eventSource.subscribe((event) => {
            this.handleEvent(event, config);
        });
    }

    // 处理事件的逻辑
    handleEvent(event: EventData, config: Config) {
        if (config.dev) logger.info(`Received event with ID: ${event.id}, message: ${event.message}`);
        this.session.send(event.message);
        // 在有效时间内进行相应处理
        this.createEventTimeoutObservable(event.id).subscribe(() => {
            if (config.dev) logger.info(`Event with ID ${event.id} has expired.`);
            this.destroyEventSource();
        });
    }
    private createEventTimeoutObservable(eventId: string): Observable<0> {
        return timer(this.timeout).pipe(takeUntil(this.eventSource.pipe(filter((e) => e.id === eventId))));
    }

    private destroyEventSource() {
        this.eventSource.complete();
        SessionEventManagerMap.delete(this.id);
    }

    // 手动触发事件
    triggerEvent(event: EventData) {
        this.eventSource.next(event);
    }
}
