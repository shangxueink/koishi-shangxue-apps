import { DataService } from '@koishijs/console';
import { Command, Context, Dict } from 'koishi';
import { CommandManager, CommandState } from '.';
declare module '@koishijs/console' {
    namespace Console {
        interface Services {
            commands: CommandProvider;
        }
    }
    interface Events {
        'command/create'(name: string): void;
        'command/remove'(name: string): void;
        'command/update'(name: string, config: Pick<CommandState, 'config' | 'options'>): void;
        'command/teleport'(name: string, parent: string): void;
        'command/aliases'(name: string, aliases: Dict<Command.Alias>): void;
    }
}
export interface CommandData {
    create: boolean;
    name: string;
    paths: string[];
    children: CommandData[];
    initial: CommandState;
    override: CommandState;
}
export default class CommandProvider extends DataService<CommandData[]> {
    private manager;
    cached: CommandData[];
    update: () => void;
    constructor(ctx: Context, manager: CommandManager);
    get(forced?: boolean): Promise<CommandData[]>;
    traverse(commands: Command[]): CommandData[];
}
