import { Context, h } from 'koishi';
interface Attributes {
    [key: string]: string | number | boolean;
}
export declare class Tag {
    tag: string;
    parent: Tag;
    private children;
    private attributes;
    private innerText;
    constructor(tag: string);
    child(tag: string): Tag;
    attr(attributes: Attributes): this;
    data(innerText: string): this;
    line(x1: number, y1: number, x2: number, y2: number, attr?: Attributes): this;
    circle(cx: number, cy: number, r: number, attr?: Attributes): this;
    rect(x1: number, y1: number, x2: number, y2: number, attr?: Attributes): this;
    text(text: string, x: number, y: number, attr?: Attributes): this;
    g(attr?: Attributes): Tag;
    get outer(): string;
    get inner(): string;
}
export interface ViewBox {
    left?: number;
    right?: number;
    top?: number;
    bottom: number;
}
export interface SVGOptions {
    size?: number;
    width?: number;
    height?: number;
    magnif?: number;
    viewBox?: ViewBox;
    viewSize?: number;
}
export declare class SVG extends Tag {
    view: ViewBox;
    width: number;
    height: number;
    constructor(options?: SVGOptions);
    fill(color: string): this;
    render(ctx: Context): Promise<h>;
}
export {};
