import { Argv, Command, Context, Dict, Schema } from 'koishi';
declare module '@koishijs/console' {
    interface Events {
        'command/create'(name: string): void;
        'command/remove'(name: string): void;
        'command/update'(name: string, config: Pick<CommandState, 'config' | 'options'>): void;
        'command/teleport'(name: string, parent: string): void;
        'command/aliases'(name: string, aliases: Dict<Command.Alias>): void;
        'command/parse'(name: string, source: string): Argv;
    }
}
interface Override extends Partial<CommandState> {
    name?: string;
    create?: boolean;
}
declare const Override: Schema<Override>;
export interface CommandState {
    aliases: Dict<Command.Alias>;
    config: Command.Config;
    options: Dict<Argv.OptionDeclaration>;
}
export interface Snapshot {
    create?: boolean;
    pending?: string;
    command: Command;
    parent: Command;
    initial: CommandState;
    override: CommandState;
}
interface Config extends Override {
}
declare const Config: Schema<string | Config, Config>;
export interface CommandData {
    create: boolean;
    name: string;
    paths: string[];
    children: string[];
    initial: CommandState;
    override: CommandState;
}
export declare class CommandManager {
    private ctx;
    private config;
    static filter: boolean;
    static schema: Schema<Dict<string | Config>, Dict<Config>>;
    private _tasks;
    private _cache;
    private entry;
    private refresh;
    snapshots: Dict<Snapshot>;
    constructor(ctx: Context, config: Dict<Config>);
    init(command: Command): void;
    ensure(name: string, create?: boolean, patch?: boolean): Snapshot;
    _teleport(command: Command, parent?: Command): void;
    teleport(command: Command, name: string, write?: boolean): void;
    alias(command: Command, aliases: Dict<Command.Alias>, write?: boolean): void;
    update(command: Command, data: Pick<CommandState, 'config' | 'options'>, write?: boolean): void;
    create(name: string): void;
    remove(name: string): void;
    accept(target: Command, override: Override, patch?: boolean): void;
    write(...commands: Command[]): void;
    installWebUI(): void;
}
export default CommandManager;
