"use strict";
const koishi = require("koishi");

exports.name = "genshin-date";
exports.usage = "/*原神老黄历*/获得原神今日的黄历，包含宜/忌事件，很简单的插件，开箱即用。";

async function apply(ctx) {

  ctx.command("genshin-date")
     .alias('原神黄历')
     .action(async ({session}) => {
    const url = 'https://api.xingzhige.com/API/yshl/';
    return sendImageByAPI(session, url);
  });

  async function sendImageByAPI(session, apiUrl) {
    try {
        return koishi.h.image(apiUrl);
    } catch (error) {
        ctx.logger.error('Failed to send image:', error);
        await session.send('图片发送失败，请检查日志。');
    }
  }
}
exports.apply = apply;
