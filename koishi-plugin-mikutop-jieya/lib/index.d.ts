import { Context, Schema } from 'koishi';
import { DataService } from '@koishijs/plugin-console';
declare module '@koishijs/plugin-console' {
    namespace Console {
        interface Services {
            iframe: IFrameService;
        }
    }
}
declare class IFrameService extends DataService<IFrameService.Route[]> {
    private config;
    constructor(ctx: Context, config: IFrameService.Config);
    get(forced?: boolean): Promise<IFrameService.Route[]>;
}
declare namespace IFrameService {
    interface Route {
        name: string;
        desc?: string;
        path: string;
        link: string;
        order?: number;
    }
    const Route: Schema<Route>;
    interface Config {
        routes: Route[];
    }
    const Config: Schema<Config>;
}
export default IFrameService;
