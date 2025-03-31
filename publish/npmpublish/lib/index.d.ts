import { Schema, Logger } from "koishi";
export declare const reusable = true;
export declare const name = "preview-help";
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const logger: Logger;
export declare const usage: string;
export declare const Config: Schema<Schemastery.ObjectS<{
    command: Schema<string, string>;
    rendering: Schema<string, string>;
    helpmode: Schema<"1.1" | "1.2" | "2.1" | "2.2" | "3" | "3.2", "1.1" | "1.2" | "2.1" | "2.2" | "3" | "3.2">;
}> | Schemastery.ObjectS<{
    fontEnabled: Schema<boolean, boolean>;
    fontURL: Schema<string, string>;
}> | Schemastery.ObjectS<{
    staticHelp: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    screenshotquality: Schema<number, number>;
    tempPNG: Schema<boolean, boolean>;
    isfigure: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    loggerinfo: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"1.1", "1.1">;
    help_text: Schema<string, string>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"1.2", "1.2">;
    help_URL: Schema<string, string>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"2.1", "2.1">;
    background_URL: Schema<string, string>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"2.2", "2.2">;
    background_URL: Schema<string, string>;
    help_text: Schema<string, string>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"3", "3">;
    background_URL: Schema<string, string>;
    help_text_json_path: Schema<string, string>;
}> | Schemastery.ObjectS<{
    helpmode: Schema<"3.2", "3.2">;
    background_URL: Schema<string, string>;
    help_text_json: Schema<string, string>;
}>, {
    command: string;
    rendering: string;
    helpmode: "1.1" | "1.2" | "2.1" | "2.2" | "3" | "3.2";
} & import("cosmokit").Dict & {
    fontEnabled: boolean;
    fontURL: string;
} & ({
    staticHelp: boolean;
} & {
    screenshotquality: number;
    tempPNG: boolean;
    isfigure: boolean;
} & ({
    loggerinfo: boolean;
} & (Schemastery.ObjectT<{
    helpmode: Schema<"1.1", "1.1">;
    help_text: Schema<string, string>;
}> | Schemastery.ObjectT<{
    helpmode: Schema<"1.2", "1.2">;
    help_URL: Schema<string, string>;
}> | Schemastery.ObjectT<{
    helpmode: Schema<"2.1", "2.1">;
    background_URL: Schema<string, string>;
}> | Schemastery.ObjectT<{
    helpmode: Schema<"2.2", "2.2">;
    background_URL: Schema<string, string>;
    help_text: Schema<string, string>;
}> | Schemastery.ObjectT<{
    helpmode: Schema<"3", "3">;
    background_URL: Schema<string, string>;
    help_text_json_path: Schema<string, string>;
}> | Schemastery.ObjectT<{
    helpmode: Schema<"3.2", "3.2">;
    background_URL: Schema<string, string>;
    help_text_json: Schema<string, string>;
}>)))>;
export declare function apply(ctx: any, config: any): void;
