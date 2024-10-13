"use strict";
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('idiom-dictionary');
const path = require("node:path");
const fs = require("node:fs").promises;

exports.name = 'idiom-dictionary';
exports.inject = {
  optional: ['puppeteer'],
};
exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>成语查询插件使用示例</title>
<style>
.example-container {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #FFF2E2; /* 浅橙色背景 */
}
.example-heading {
    color: #333; /* 深色文本，适合浅背景 */
}
.example-text {
    font-size: 16px;
    color: #666; /* 深色文本，适合浅背景 */
}
.example-box {
    background-color: #6E7B6C; /* 深灰绿色背景 */
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.example-content {
    margin-top: 20px;
    border-left: 4px solid #333333;
    padding-left: 16px;
}
.example-link, .example-box .example-heading, .example-box .example-text {
    color: #FFFFFF; /* 白色系文字，用于深色背景 */
}
</style>
</head>
<body>
<div class="example-box example-container">
    <h2 class="example-heading">成语查询交互示例</h2>
    <p class="example-text">了解更多信息，请访问 <a href="https://www.npmjs.com/package/koishi-plugin-idiom-dictionary" target="_blank" class="example-link">成语字典查询插件页面</a>。</p>
    <div class="example-content">
        <h3 class="example-heading">示例1：直接查询</h3>
        <p class="example-text"><strong>输入：</strong>成语查询 一帆风顺</p>
        <p class="example-text"><strong>输出：</strong>“一帆风顺”
        一帆风顺，常用汉语成语，读音是（yī fán fēng shùn ）。ABCD式组合，紧缩式结构，一帆风顺意思是：船满帆；一路顺风行驶。比喻境遇非常顺利；没有任何阻碍、挫折。出自唐・孟郊《送崔爽之湖南》。一般作谓语、定语、宾语，含褒义。</p>
    </div>
    <div class="example-content">
        <h3 class="example-heading">示例2：模糊查询</h3>
        <p class="example-text"><strong>输入：</strong>成语查询 ?帆??</p>
        <p class="example-text"><strong>输出：</strong></p>
        <p>“?帆??”的搜索结果：</p>
        <p>一帆风顺  yī fán fēng shùn</p>
        <p>布帆无恙  bù fán wú yàng</p>
        <p>一帆顺风  yī fān shùn fēng</p>
        <p>千帆竞发  qiān fāng jìng fā</p>
        <p>. . . </p>
    </div>
    <p>近义词、反义词查询不支持模糊查询。</p>
</div>
</body>
</html>

`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        Maximumidiom: koishi_1.Schema.number().description('返回`成语`的最大数量限制').default(10),
        MaximumnearSynonyms: koishi_1.Schema.number().description('返回`近义词`的最大数量限制').default(5),
        imagifyoutput: koishi_1.Schema.boolean().description("图片输出模式 `需要puppeteer服务`").default(false),
        consoleinfo: koishi_1.Schema.boolean().description("日志调试模式").default(false),
    }).description('基础设置'),
]);



async function apply(ctx , Config) {
  var zh_CN_default = { 
    commands: { 
      "成语查询": { 
            description: "成语查询", 
            messages: {
              "not_four_word": "请输入四字成语哦，未知的字可以用【？】代替。",
              "not_found_idiom": "未找到成语释义。",
              "try_failed": "查询失败，请稍后再试。",
              "idiom_result": "的搜索结果："
            }          
      },
      "近义词查询": { 
            description: "近义词查询", 
            messages: {
              "Incomplete_input": "输入内容不完整哦~",
              "not_found_word": "未找到匹配的",
              "try_failed": "查询失败，请稍后再试。",
              "translation_failed": "翻译失败，请稍后再试。"
        }
    },
    "反义词查询": { 
            description: "反义词查询", 
            messages: {
              "Incomplete_input": "输入内容不完整哦~",
              "not_found_word": "未找到匹配的",
              "try_failed": "查询失败，请稍后再试。",
              "translation_failed": "翻译失败，请稍后再试。"
      }
    } 
  } 
};
ctx.i18n.define("zh-CN", zh_CN_default);

ctx.command('成语查询 <idiom>')
    .action(async ({ session }, idiom) => {
        if (!idiom || idiom.length === 0) {
            await session.send(Config.helptip);
            return;
        }
        if (idiom.length != 4) {
            await session.send(session.text(".not_four_word"));
            return;
        }
        if (!idiom.includes('?') && !idiom.includes('？')) {
          // 不包含问号，直接查询成语释义
          const url = `https://www.hanyuguoxue.com/chengyu/search?words=${encodeURIComponent(idiom)}`;
          try {
            const response = await ctx.http.get(url);
            const match = response.match(/<meta content="([^"]+)" name="description">/);
            if (match && match[1]) {
              const definition = match[1];
              //await session.send(`“${idiom}”\n${definition}`);
              if (Config.imagifyoutput) {
                const imageBuffer = await HTMLtoPNG(idiom, definition, 0);
                await session.send(koishi_1.h.image(imageBuffer, `image/png`));
              } else {
                  await session.send(`“${idiom}”\n${definition}`);
              }
            } else {
              await session.send(session.text(".not_found_idiom"));
            }
          } catch (error) {
            logger.error(error);
            await session.send(session.text(".try_faild"));
          }          
        } else {
        let idiomString = '';
        for (let i = 0; i < idiom.length; i++) {
          if (idiom[i] === '?' || idiom[i] === '？') {
            // 检查当前未知字之后是否有已知字
            let hasKnownCharAfter = false;
            for (let j = i + 1; j < idiom.length; j++) {
              if (idiom[j] !== '?' && idiom[j] !== '？') {
                hasKnownCharAfter = true;
                break;
              }
            }
            // 如果当前位置是未知字，且其之后有已知字，则用'?'，否则用'*'
            idiomString += hasKnownCharAfter ? '?' : '*';
          } else {
            idiomString += idiom[i];
          }
        }
        //await session.send('正在查询成语...请耐心等待\~');
        const url = `https://www.hanyuguoxue.com/chengyu/search?words=${encodeURIComponent(idiomString)}`;
        // 从配置中获取最大返回数量
        const maxResults = Config.Maximumidiom;
        try {
            const response = await ctx.http.get(url);
            const matches = response.match(/<div class="title">[\s\S]*?<\/div>/g);
            if (matches && matches.length > 0) {
                // 使用配置的最大返回数量限制结果
                let results = matches.slice(0, maxResults).map(match => {
                    const titleMatch = match.match(/title="([^"]+)">/);
                    const pinyinMatch = match.match(/<span class="pinyin">([^<]+)<\/span>/);
                    return `${titleMatch[1]}  ${pinyinMatch[1]}`;
                }).join('\n');

                //await session.send(`“${idiom}” 的搜索结果：\n${results}`);
                if (Config.imagifyoutput) {
                  const imageBuffer = await HTMLtoPNG(idiom, results, 1);
                  await session.send(koishi_1.h.image(imageBuffer, `image/png`));
                } else {
                    await session.send(`“${idiom}” ${session.text(".idiom_result")}\n${results}`);
                }
            } else {
                await session.send(session.text(".not_found_idiom"));
            }
        } catch (error) {
            logger.error(error);
            await session.send(session.text(".try_failed"));
        }

      }
    });



ctx.command('近义词查询 <word>')
.action(async ({ session }, word) => {
  await queryWord(word, session, 'synonyms');
});

ctx.command('反义词查询 <word>')
.action(async ({ session }, word) => {
  await queryWord(word, session, 'antonyms');
});
// 通用的`近义词查询` 反义词查询` 查询函数
async function queryWord(word, session, type) {
  if (!word || word.length === 0 || word.includes('?') || word.includes('？')) {
      await session.send(session.text(".Incomplete_input"));
      return;
  }
  const baseUrl = 'https://www.hanyuguoxue.com';
  const path = type === 'synonyms' ? '/jinyici/search' : '/fanyici/search';
  const url = `${baseUrl}${path}?words=${encodeURIComponent(word)}`;

  try {
      const response = await ctx.http.get(url);
      const regex = /<li>.*?<h3><a[^>]+title=[^>]+>(.*?)<\/a><\/h3>.*?<p class=pinyin>(.*?)<\/p>.*?<p class=summary>(.*?)<\/p>.*?<\/li>/gs;
      const matches = [...response.matchAll(regex)];
      const maxResults = Config.MaximumnearSynonyms;

      if (matches.length > 0) {
          let results = matches.slice(0, maxResults).map(match => {
              const title = match[1];
              const pinyin = match[2];
              const summary = match[3].replace(/<span class=more>[\s\S]*?<\/span>/, '').trim(); // 移除查看详情链接
              return `${title} (${pinyin}): ${summary}\n`;
          }).join('\n');

          if (Config.imagifyoutput) {
              const imageBuffer = await HTMLtoPNG(word, results, type === 'synonyms' ? 2 : 3);
              await session.send(koishi_1.h.image(imageBuffer, `image/png`));
          } else {
              await session.send(`${type === 'synonyms' ? '近义词' : '反义词'} [${word}] 查询结果：\n${results}`);
          }
      } else {
          await session.send(`${session.text(".not_found_word")}${type === 'synonyms' ? '近义词' : '反义词'}。`);
      }
  } catch (error) {
      logger.error(error);
      await session.send(session.text(".try_failed"));
  }
}

// 根据replaceTitle参数动态替换HTML中的标题
function replaceHtmlTitle(htmlContent, replaceTitle) {
  const titles = {
      0: "【释义】",
      1: "【成语结果】",
      2: "【近义词查询结果】",
      3: "【反义词查询结果】"
  };
  return htmlContent.replace(/\\3010\\91ca\\4e49\\3011/g, titles[replaceTitle]);
}

async function HTMLtoPNG(words, paraphrase, replaceTitle = 0) {
      const browser = ctx.puppeteer.browser;
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: 750, height: 250, deviceScaleFactor: 1 });
      const filePath = path.join(__dirname,'newword.html');
      let htmlContent = await fs.readFile(filePath, { encoding: 'utf-8' });
      // 动态HTML
      const wordHtml = words.split('').map(char => (char === '?' || char === '？') ? ' ' : char).map(char => `
      <div class="word" data-v-1ac9b022>
          <span class="line" data-v-1ac9b022></span>
          <span class="line" data-v-1ac9b022></span>
          <span class="text" data-v-1ac9b022>${char}</span>
      </div>
      `).join('');
      htmlContent = replaceHtmlTitle(htmlContent, replaceTitle);
      // 处理释义，添加换行
      const paraphraseHtml = paraphrase.split('\n').map(line => `<div>${line}</div>`).join('<br>');
      htmlContent = htmlContent.replace('<!--词语-->', wordHtml);
      htmlContent = htmlContent.replace('<!--词语的释义-->', paraphraseHtml);
      await page.setContent(htmlContent, { waitUntil: 'load' });
      const imageBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      await page.close();
      await context.close();
      if (Config.consoleinfo) {
          logger.error(`\n${words}：\n ${paraphrase}`);
      }
      return imageBuffer;
    }
}

exports.apply = apply;
