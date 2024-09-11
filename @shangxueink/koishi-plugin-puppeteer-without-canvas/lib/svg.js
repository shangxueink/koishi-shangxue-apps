"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVG = exports.Tag = void 0;
const koishi_1 = require("koishi");
function hyphenate(source) {
    const result = {};
    for (const key in source) {
        result[key.replace(/[A-Z]/g, str => '-' + str.toLowerCase())] = source[key];
    }
    return result;
}
function escapeHtml(source) {
    return source
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
class Tag {
    tag;
    parent;
    children = [];
    attributes = {};
    innerText = '';
    constructor(tag) {
        this.tag = tag;
    }
    child(tag) {
        const child = new Tag(tag);
        child.parent = this;
        this.children.push(child);
        return child;
    }
    attr(attributes) {
        this.attributes = {
            ...this.attributes,
            ...attributes,
        };
        return this;
    }
    data(innerText) {
        this.innerText = innerText;
        return this;
    }
    line(x1, y1, x2, y2, attr = {}) {
        this.child('line').attr({ ...hyphenate(attr), x1, y1, x2, y2 });
        return this;
    }
    circle(cx, cy, r, attr = {}) {
        this.child('circle').attr({ ...hyphenate(attr), cx, cy, r });
        return this;
    }
    rect(x1, y1, x2, y2, attr = {}) {
        this.child('rect').attr({ ...hyphenate(attr), x: x1, y: y1, width: y2 - y1, height: x2 - x1 });
        return this;
    }
    text(text, x, y, attr = {}) {
        this.child('text').attr({ ...hyphenate(attr), x, y }).data(text);
        return this;
    }
    g(attr = {}) {
        return this.child('g').attr(hyphenate(attr));
    }
    get outer() {
        const attrText = Object.keys(this.attributes)
            .map(key => ` ${key}="${escapeHtml(String(this.attributes[key]))}"`)
            .join('');
        return `<${this.tag}${attrText}>${this.inner}</${this.tag}>`;
    }
    get inner() {
        return this.children.length
            ? this.children.map(child => child.outer).join('')
            : this.innerText;
    }
}
exports.Tag = Tag;
class SVG extends Tag {
    view;
    width;
    height;
    constructor(options = {}) {
        super('svg');
        const { size = 200, viewSize = size, width = size, height = size } = options;
        this.width = width;
        this.height = height;
        const ratio = viewSize / size;
        const { left = 0, top = 0, bottom = height * ratio, right = width * ratio } = options.viewBox || {};
        this.view = { left, bottom, top, right };
        this.attr({
            width,
            height,
            viewBox: `${left} ${top} ${right} ${bottom}`,
            xmlns: 'http://www.w3.org/2000/svg',
            version: '1.1',
        });
    }
    fill(color) {
        this.rect(this.view.top, this.view.left, this.view.bottom, this.view.right, { style: `fill: ${color}` });
        return this;
    }
    async render(ctx) {
        const page = await ctx.puppeteer.page();
        await page.setContent(this.outer);
        const buffer = await page.screenshot({
            clip: {
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
            },
        });
        page.close();
        return koishi_1.h.image(buffer, 'image/png');
    }
}
exports.SVG = SVG;
//# sourceMappingURL=svg.js.map