"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const path = require("node:path");
const { Schema, Logger, h } = require("koishi");
const fs = require("node:fs").promises;
const logger = new Logger('lexicon-era-shift');

exports.name = 'lexicon-era-shift';
exports.inject = ['puppeteer'];
exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
</head>
<body>
<h2>词语新解</h2>
<p>使用命令 <strong>词语新解</strong> 或其别名 <strong>成语新解</strong>，可以自动生成随机的词语新解。例如：</p>
<code>词语新解</code>
<p>当然，你也可以在聊天中使用命令 <strong>词语新解 &lt;词语&gt; &lt;解释&gt;</strong> 或其别名 <strong>成语新解</strong> 来请求生成图片。例如：</p>
<code>词语新解 坚韧不拔 牙齿又硬又有韧性，确实不好拔！</code>
<p>如果词语超过6个字符，插件将提示错误。</p>
</body>
</html>
`;
exports.Config = Schema.object({
    consoleinfo: Schema.boolean().description("日志调试模式").default(false),
});
function apply(ctx, Config) {
    async function getRandomLexicon() {
        const filePath = path.join(__dirname, 'LexiconEraShift.json');
        const fileContent = await fs.readFile(filePath, { encoding: 'utf-8' });
        const lexicons = JSON.parse(fileContent);
        const randomIndex = Math.floor(Math.random() * lexicons.length);
        return lexicons[randomIndex];
    }
    async function generateHandlePinyinsImage(words, paraphrase) {
        const browser = ctx.puppeteer.browser;
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        await page.setViewport({ width: 750, height: 250, deviceScaleFactor: 1 });
        const filePath = path.join(__dirname, 'newword.html');
        let htmlContent = await fs.readFile(filePath, { encoding: 'utf-8' });
        // 动态HTML
        const wordHtml = words.split('').map(char => `
<div class="word" data-v-1ac9b022>
<span class="line" data-v-1ac9b022></span>
<span class="line" data-v-1ac9b022></span>
<span class="text" data-v-1ac9b022>${char}</span>
</div>
`).join('');

        htmlContent = htmlContent.replace('<!--词语-->', wordHtml);
        htmlContent = htmlContent.replace('<!--词语的释义-->', paraphrase);
        await page.setContent(htmlContent, { waitUntil: 'load' });
        const imageBuffer = await page.screenshot({ fullPage: true, type: 'png' });
        await page.close();
        await context.close();
        if (Config.consoleinfo) {
            logger.error(`\n词语: ${words}\n词语的释义: ${paraphrase}`);
        }
        return imageBuffer;
    }

    ctx.command('词语新解 <wordtextinput:text>')
        .alias('成语新解')
        .action(async ({ session }, wordtextinput) => {
            let words, paraphrase;

            if (!wordtextinput || wordtextinput.trim() === '') {
                // 未输入任何内容，从JSON文件中获取随机词语和释义
                const { lexicon, meaning } = await getRandomLexicon();
                words = lexicon;
                paraphrase = meaning;
            } else {
                const wordtextinputs = wordtextinput.split(/\s+/);
                words = wordtextinputs.shift();
                paraphrase = wordtextinputs.join(' ');
            }

            if (words.length > 6) {
                return '词语应不超过6个字符。';
            }

            const imageBuffer = await generateHandlePinyinsImage(words, paraphrase);
            await session.send(h.image(imageBuffer, `image/png`))
            return;
        });

}

exports.apply = apply;
