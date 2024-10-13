var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  SVG: () => SVG,
  Tag: () => Tag,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_puppeteer_core = __toESM(require("puppeteer-core"));
var import_puppeteer_finder = __toESM(require("puppeteer-finder"));
var import_koishi3 = require("koishi");

// src/svg.ts
var import_koishi = require("koishi");
function hyphenate(source) {
  const result = {};
  for (const key in source) {
    result[key.replace(/[A-Z]/g, (str) => "-" + str.toLowerCase())] = source[key];
  }
  return result;
}
__name(hyphenate, "hyphenate");
function escapeHtml(source) {
  return source.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeHtml, "escapeHtml");
var Tag = class _Tag {
  constructor(tag) {
    this.tag = tag;
  }
  static {
    __name(this, "Tag");
  }
  parent;
  children = [];
  attributes = {};
  innerText = "";
  child(tag) {
    const child = new _Tag(tag);
    child.parent = this;
    this.children.push(child);
    return child;
  }
  attr(attributes) {
    this.attributes = {
      ...this.attributes,
      ...attributes
    };
    return this;
  }
  data(innerText) {
    this.innerText = innerText;
    return this;
  }
  line(x1, y1, x2, y2, attr = {}) {
    this.child("line").attr({ ...hyphenate(attr), x1, y1, x2, y2 });
    return this;
  }
  circle(cx, cy, r, attr = {}) {
    this.child("circle").attr({ ...hyphenate(attr), cx, cy, r });
    return this;
  }
  rect(x1, y1, x2, y2, attr = {}) {
    this.child("rect").attr({ ...hyphenate(attr), x: x1, y: y1, width: y2 - y1, height: x2 - x1 });
    return this;
  }
  text(text, x, y, attr = {}) {
    this.child("text").attr({ ...hyphenate(attr), x, y }).data(text);
    return this;
  }
  g(attr = {}) {
    return this.child("g").attr(hyphenate(attr));
  }
  get outer() {
    const attrText = Object.keys(this.attributes).map((key) => ` ${key}="${escapeHtml(String(this.attributes[key]))}"`).join("");
    return `<${this.tag}${attrText}>${this.inner}</${this.tag}>`;
  }
  get inner() {
    return this.children.length ? this.children.map((child) => child.outer).join("") : this.innerText;
  }
};
var SVG = class extends Tag {
  static {
    __name(this, "SVG");
  }
  view;
  width;
  height;
  constructor(options = {}) {
    super("svg");
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
      xmlns: "http://www.w3.org/2000/svg",
      version: "1.1"
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
        height: this.height
      }
    });
    page.close();
    return import_koishi.h.image(buffer, "image/png");
  }
};


// src/index.ts
var import_path2 = require("path");
var import_url2 = require("url");
var Puppeteer = class extends import_koishi3.Service {
  constructor(ctx, config) {
    super(ctx, "puppeteer");
    this.config = config;
  }
  static {
    __name(this, "Puppeteer");
  }
  static [import_koishi3.Service.provide] = "puppeteer";
  static inject = ["http"];
  browser;
  executable;
  async start() {
    let { executablePath } = this.config;
    if (!executablePath) {
      this.logger.info("chrome executable found at %c", executablePath = (0, import_puppeteer_finder.default)());
    }
    const { proxyAgent } = this.ctx.http.config;
    const args = this.config.args || [];
    if (proxyAgent && !args.some((arg) => arg.startsWith("--proxy-server"))) {
      args.push(`--proxy-server=${proxyAgent}`);
    }
    this.browser = await import_puppeteer_core.default.launch({
      ...this.config,
      executablePath,
      args
    });
    this.logger.debug("browser launched");
    const transformStyle = /* @__PURE__ */ __name((source, base = {}) => {
      return Object.entries({ ...base, ...source }).map(([key, value]) => {
        return `${(0, import_koishi3.hyphenate)(key)}: ${Array.isArray(value) ? value.join(", ") : value}`;
      }).join("; ");
    }, "transformStyle");
    this.ctx.component("html", async (attrs, children, session) => {
      const head = [];
      const transform = /* @__PURE__ */ __name((element) => {
        if (element.type === "head") {
          head.push(...element.children);
          return;
        }
        const attrs2 = { ...element.attrs };
        if (typeof attrs2.style === "object") {
          attrs2.style = transformStyle(attrs2.style);
        }
        return (0, import_koishi3.h)(element.type, attrs2, element.children.map(transform).filter(Boolean));
      }, "transform");
      const page = await this.page();
      try {
        if (attrs.src) {
          await page.goto(attrs.src);
        } else {
          await page.goto((0, import_url2.pathToFileURL)((0, import_path2.resolve)(__dirname, "../index.html")).href);
          const bodyStyle = typeof attrs.style === "object" ? transformStyle({ display: "inline-block" }, attrs.style) : ["display: inline-block", attrs.style].filter(Boolean).join("; ");
          const content = children.map(transform).filter(Boolean).join("");
          const lang = attrs.lang ? ` lang="${attrs.lang}"` : "";
          await page.setContent(`<html${lang}>
            <head>${head.join("")}</head>
            <body style="${bodyStyle}">${content}</body>
          </html>`);
        }
        await page.waitForNetworkIdle({
          timeout: attrs.timeout ? +attrs.timeout : void 0
        });
        const body = await page.$(attrs.selector || "body");
        const clip = await body.boundingBox();
        const screenshot = await page.screenshot({ clip });
        return import_koishi3.h.image(screenshot, "image/png");
      } finally {
        await page?.close();
      }
    });
  }
  async stop() {
    await this.browser?.close();
  }
  page = /* @__PURE__ */ __name(() => this.browser.newPage(), "page");
  svg = /* @__PURE__ */ __name((options) => new SVG(options), "svg");
  render = /* @__PURE__ */ __name(async (content, callback) => {
    const page = await this.page();
    await page.goto((0, import_url2.pathToFileURL)((0, import_path2.resolve)(__dirname, "../index.html")).href);
    if (content) await page.setContent(content);
    callback ||= /* @__PURE__ */ __name(async (_, next) => page.$("body").then(next), "callback");
    const output = await callback(page, async (handle) => {
      const clip = handle ? await handle.boundingBox() : null;
      const buffer = await page.screenshot({ clip });
      return import_koishi3.h.image(buffer, "image/png").toString();
    });
    page.close();
    return output;
  }, "render");
};
((Puppeteer2) => {
  Puppeteer2.filter = false;
  Puppeteer2.Config = import_koishi3.Schema.intersect([
    import_koishi3.Schema.object({
      executablePath: import_koishi3.Schema.string().description("可执行文件的路径。缺省时将自动从系统中寻找。"),
      headless: import_koishi3.Schema.boolean().description("是否开启[无头模式](https://developer.chrome.com/blog/headless-chrome/)。").default(true),
      args: import_koishi3.Schema.array(String).description("额外的浏览器参数。Chromium 参数可以参考[这个页面](https://peter.sh/experiments/chromium-command-line-switches/)。").default(process.getuid?.() === 0 ? ["--no-sandbox"] : [])
    }).description("启动设置"),
    import_koishi3.Schema.object({
      defaultViewport: import_koishi3.Schema.object({
        width: import_koishi3.Schema.natural().description("默认的视图宽度。").default(1280),
        height: import_koishi3.Schema.natural().description("默认的视图高度。").default(768),
        deviceScaleFactor: import_koishi3.Schema.number().min(0).description("默认的设备缩放比率。").default(2)
      }),
      ignoreHTTPSErrors: import_koishi3.Schema.boolean().description("在导航时忽略 HTTPS 错误。").default(false)
    }).description("浏览器设置")
  ]);
})(Puppeteer || (Puppeteer = {}));
var src_default = Puppeteer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SVG,
  Tag
});
//# sourceMappingURL=index.js.map
