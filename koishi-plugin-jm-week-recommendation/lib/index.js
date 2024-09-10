"use strict";
const koishi_1 = require("koishi");
const jmData = require('./book-data.json');
const logger = new koishi_1.Logger('jm-week-recommendation');
exports.Config = koishi_1.Schema.intersect([
  koishi_1.Schema.object({
    imageMode: koishi_1.Schema.boolean().default(false).description('开启后发送封面,需要确保可以访问[JmComic网站](https://18comic.vip/)'),
  }).description('图片设置'),
]);
exports.name = "jm-week-recommendation";
exports.usage = `
<p>本插件目前收集了 JmComic 平台在 <a href="https://discord.gg/V74p7HM" target="_blank">Discord 频道</a> 内官方公布的周排行推荐书籍。</p>
<p>收录信息已更新至 2024/7/20-2024/7/26 刊。</p>
<p>为了获得最佳使用体验，我们强烈建议所有用户在启用 <code>imageMode</code> 配置项以发送封面图片之前，仔细阅读以下说明：</p>

<h2>\`imageMode\` 配置项使用说明</h2>
<p>在插件的配置文件中，默认 \`imageMode\` 选项设置为 <code>false</code>。</p>
<p><strong>在启用此功能前，务必确认您的网络环境能够访问 <a href="https://18comic.vip/" target="_blank">https://18comic.vip/</a>。</strong></p>
<p>我们强烈建议用户在启用 <code>imageMode</code> 前，能够仔细阅读本文档，了解相关内容。</p>
<p><strong>特别提醒：启用后，书籍封面图片可能包含成人内容或其他敏感元素，用户需要对此给予充分的注意。</strong></p>

<h2>版权与免责声明</h2>
<p>本插件所收集和展示的所有书籍信息及封面图片来源于 JmComic 平台，其版权均归原作者及平台所有。本插件仅用于推广阅读和分享知识，不对任何法律责任承担。</p>

<h2>使用提醒</h2>
<p>在分享书籍信息时，请用户充分考虑所在群组和平台的适宜性，严格遵守相关法律法规，尊重版权，文明分享。</p>


`;



// 从 JSONObject 中获取书籍名称的数组
const jmImageUrls = jmData.jmImageUrls || [];



// 随机获取书籍
function randomImageUrl(imageUrls) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return "目前没有书籍可供推荐";
  }
  return imageUrls[Math.floor(Math.random() * imageUrls.length)];
}

// 搜索书籍
function bookSearch(imageUrls, keyword) {
  if (!Array.isArray(imageUrls)) {
    return "书籍数据格式错误";
  }
  const searchResults = imageUrls.filter(url => url.includes(keyword));
  if (searchResults.length === 0) {
    return "没有相关书籍哦~";
  } else {
    const randomBook = searchResults[Math.floor(Math.random() * searchResults.length)];
    return `查到${searchResults.length}本相关书籍\n一个相关的随机书名：${randomBook}`;
  }
}

function getCoverImageUrl(outputtext) {
  // 从 outputtext 末尾提取最多10个字符
  const lastTenChars = outputtext.slice(-10);
  const regex = /(\d+)/;
  const match = lastTenChars.match(regex);
  if (!match) {
    logger.error('未能匹配书号');
    return null;
  }
  const bookId = match[1];
  /*
  https://cdn-msp3.18comic-deadp.club/media/albums/557521_3x4.jpg //  这个好像国内可以用
  https://cdn-msp.18comic-ff7rebirth.art/media/albums/557521_3x4.jpg  //  这个好像国内用不了
  */
  const imageUrl = `https://cdn-msp3.18comic-deadp.club/media/albums/${bookId}_3x4.jpg`;
  return imageUrl;
}


function apply(ctx, config) {
  ctx.command('jm-book')
  ctx.command('jm-book/random-jm-book', '随机推荐JM平台的书籍')
    .alias('一本好书')
    //.action(async () => {
    .action(async ({ session }) => {
      const outputText = randomImageUrl(jmImageUrls);
      const imageUrl = getCoverImageUrl(outputText);
      if (config.imageMode && imageUrl) {
        // 发送图片
        await session.send(koishi_1.h.text(`品鉴好书，也要注意身体哦~\n\n${outputText}\n`) + koishi_1.h.image(imageUrl))
        return;
      } else {
        // 仅发送文本消息
        await session.send(koishi_1.h.text(`品鉴好书，也要注意身体哦~\n\n${randomImageUrl(jmImageUrls)}\n`))
        return;
      }

    });

  ctx.command('jm-book/jm-book-search <keyword>', '通过关键字搜索JM平台的书籍')
    .alias('好书搜索')
    //.action(async ({ meta }, keyword) => {
    .action(async ({ session }, keyword) => {
      // 进行书籍搜索
      const searchResult = bookSearch(jmImageUrls, keyword);
      if (searchResult.startsWith("没有相关书籍哦\~")) {
        // 如果没有找到书籍，直接返回结果
        return searchResult;
      } else {
        // 如果配置为显示图片
        if (config.imageMode) {
          const outputText = searchResult.split('\n')[1];
          const imageUrl = getCoverImageUrl(outputText);
          if (imageUrl) {
            await session.send(koishi_1.h.text(`${searchResult}\n\n品鉴好书，也要注意身体哦\~\n`) + koishi_1.h.image(imageUrl))
            return;
          }
        }
        // 如果配置为不显示图片或未找到封面图片，仅发送文本消息
        await session.send(koishi_1.h.text(`${searchResult}\n\n品鉴好书，也要注意身体哦\~`))
        return;
      }
    });

}

exports.apply = apply;